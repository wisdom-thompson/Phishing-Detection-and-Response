import os
import re
import time
import email
import pytz
import joblib
import imaplib
from datetime import datetime, timedelta, timezone
from pymongo import MongoClient
from dotenv import load_dotenv
from email.header import decode_header
from email.utils import parsedate_to_datetime

# Load environment variables
load_dotenv()

# MongoDB connection
client = MongoClient(os.getenv('MONGODB_URI'))
db = client['phishing_detection']
email_collection = db['emails']

def load_model() -> tuple:
    """Load the pre-trained ML model and vectorizer using joblib."""
    model = joblib.load('model/model.joblib')
    vectorizer = joblib.load('model/tfidf_vectorizer.joblib')
    return model, vectorizer

def is_phishing_email(email_content: dict, model, vectorizer) -> bool:
    """Analyze email content using the ML model and return if it's phishing."""
    email_text = f"{email_content['subject']} {email_content['body']}"
    email_vector = vectorizer.transform([email_text])
    prediction = model.predict(email_vector)
    return bool(prediction[0])  # Convert prediction to boolean

def extract_urls(text: str) -> list:
    """Extract all URLs from a given text."""
    url_pattern = r'https?://(?:[-\w.]|(?:%[\da-fA-F]{2}))+' 
    return re.findall(url_pattern, text)

def save_email_to_db(email_content: dict, is_phishing: bool) -> None:
    """Save email details to MongoDB."""
    email_data = {
        "email_id": email_content['email_id'],
        "sender": email_content['sender'],
        "subject": email_content['subject'],
        "body": email_content['body'],
        "urls": extract_urls(email_content['body']),
        "is_phishing": is_phishing,
        "received_time": email_content['received_time'].isoformat()
    }
    email_collection.insert_one(email_data)

def fetch_and_analyze_emails() -> None:
    """Fetch emails from the mail server, analyze them, and store the results."""
    mail = imaplib.IMAP4_SSL(os.getenv('MAIL_SERVER'))
    mail.login(os.getenv('MAIL_USERNAME'), os.getenv('MAIL_PASSWORD'))
    mail.select("inbox")
    
    model, vectorizer = load_model()
    
    last_processed_time = db['settings'].find_one({"key": "last_processed_time"})
    if last_processed_time:
        last_processed_time = datetime.fromisoformat(last_processed_time["value"])
    else:
        last_processed_time = datetime.now(timezone.utc) - timedelta(days=1)

    try:
        while True:
            try:
                now = datetime.now(timezone.utc)
                status, messages = mail.search(None, 'ALL')
                if status != "OK":
                    raise Exception(f"Error searching for emails: {status}")

                email_ids = messages[0].split()

                for raw_email_id in email_ids:
                    process_email(mail, raw_email_id, model, vectorizer, last_processed_time)

                # Update last processed time
                db['settings'].update_one(
                    {"key": "last_processed_time"},
                    {"$set": {"value": now.isoformat()}},
                    upsert=True
                )

                time.sleep(5)  # Check for new emails every 5 seconds
                
            except imaplib.IMAP4.error as e:
                print(f"IMAP error: {e}")
                mail.logout()  # Logout before reconnecting
                mail = imaplib.IMAP4_SSL(os.getenv('MAIL_SERVER'))
                mail.login(os.getenv('MAIL_USERNAME'), os.getenv('MAIL_PASSWORD'))
                mail.select("inbox")
            except Exception as e:
                print(f"Error processing emails: {e}")
                time.sleep(10)

    finally:
        mail.logout()

def process_email(mail, raw_email_id: bytes, model, vectorizer, date_check_time: datetime = None) -> None:
    """Process a single email."""
    status, msg_data = mail.fetch(raw_email_id, '(RFC822)')
    
    for response_part in msg_data:
        if isinstance(response_part, tuple):
            msg = email.message_from_bytes(response_part[1])
            subject, encoding = decode_header(msg["Subject"])[0]
            if isinstance(subject, bytes):
                subject = subject.decode(encoding if encoding else 'utf-8')
            
            sender = msg.get("From")
            received_time = msg.get("Date")
            if received_time:
                received_time = parsedate_to_datetime(received_time).astimezone(pytz.utc)
            else:
                return  # Skip emails that do not have a valid Date header

            if date_check_time and received_time < date_check_time:
                return  # Skip emails older than the last check time

            if email_collection.find_one({"email_id": raw_email_id.decode('utf-8')}):
                print(f"Email from {sender} with subject '{subject}' has already been processed.")
                return
            
            if msg.is_multipart():
                for part in msg.walk():
                    if part.get_content_type() == "text/plain":
                        body = part.get_payload(decode=True).decode()
                        break
            else:
                body = msg.get_payload(decode=True).decode()

            email_content = {
                "email_id": raw_email_id.decode('utf-8'),
                "sender": sender,
                "subject": subject,
                "body": body,
                "received_time": received_time
            }

            is_phishing = is_phishing_email(email_content, model, vectorizer)
            save_email_to_db(email_content, is_phishing)

            print(f"Processed email from {sender} with subject '{subject}'. Is phishing: {is_phishing}")

if __name__ == "__main__":
    fetch_and_analyze_emails()
