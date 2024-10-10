import imaplib
import email
from email.header import decode_header
import re
from urllib.parse import urlparse
from pymongo import MongoClient
from dotenv import load_dotenv
import os
import joblib  # Import joblib

load_dotenv()

# MongoDB connection
client = MongoClient(os.getenv('MONGODB_URI'))
db = client['phishing_detection']
email_collection = db['emails']

def load_model():
    """Load the pre-trained ML model and vectorizer using joblib."""
    model = joblib.load('model/model.joblib')
    vectorizer = joblib.load('model/tfidf_vectorizer.joblib')
    return model, vectorizer

def is_phishing_email(email_content, model, vectorizer):
    """Analyze email content using the ML model and return if it's phishing."""
    email_text = f"{email_content['subject']} {email_content['body']}"
    email_vector = vectorizer.transform([email_text])
    
    prediction = model.predict(email_vector)
    return prediction[0]  # Return 0 for non-phishing, 1 for phishing

def extract_urls(text):
    """Extract all URLs from a given text."""
    url_pattern = r'https?://(?:[-\w.]|(?:%[\da-fA-F]{2}))+' 
    return re.findall(url_pattern, text)

def save_email_to_db(email_content, is_phishing):
    """Save email details to MongoDB."""
    # Ensure `is_phishing` is converted to a native Python `int`
    email_data = {
        "sender": email_content['sender'],
        "subject": email_content['subject'],
        "body": email_content['body'],
        "urls": extract_urls(email_content['body']),
        "is_phishing": int(is_phishing)  # Convert np.int64 to Python int
    }
    email_collection.insert_one(email_data)  

def fetch_and_analyze_emails():
    """Fetch emails from the mail server, analyze them, and store the results."""
    
    # Connect to an IMAP mail server
    mail = imaplib.IMAP4_SSL(os.getenv('MAIL_SERVER'))
    mail.login(os.getenv('MAIL_USERNAME'), os.getenv('MAIL_PASSWORD'))
    
    # Select the mailbox (inbox)
    mail.select("inbox")
    
    # Search for all emails in the inbox
    status, messages = mail.search(None, 'ALL')
    
    # Convert the result to a list of email IDs
    email_ids = messages[0].split()

    model, vectorizer = load_model()
    results = []

    for email_id in email_ids:
        # Fetch the email by ID
        status, msg_data = mail.fetch(email_id, '(RFC822)')
        
        # Extract the message content
        for response_part in msg_data:
            if isinstance(response_part, tuple):
                # Parse the email content
                msg = email.message_from_bytes(response_part[1])
                
                # Decode the email subject
                subject, encoding = decode_header(msg["Subject"])[0]
                if isinstance(subject, bytes):
                    subject = subject.decode(encoding if encoding else 'utf-8')
                
                # Decode the sender's email address
                sender = msg.get("From")
                
                # Get the email body
                if msg.is_multipart():
                    for part in msg.walk():
                        if part.get_content_type() == "text/plain":
                            body = part.get_payload(decode=True).decode()
                            break
                else:
                    body = msg.get_payload(decode=True).decode()

                # Prepare email content for analysis
                email_content = {
                    "sender": sender,
                    "subject": subject,
                    "body": body
                }

                # Analyze if it's phishing
                is_phishing = is_phishing_email(email_content, model, vectorizer)
                
                # Save the email and analysis result to the database
                save_email_to_db(email_content, is_phishing)

                results.append({
                    "email": email_content,
                    "is_phishing": is_phishing
                })

    mail.logout()
    
    return results
