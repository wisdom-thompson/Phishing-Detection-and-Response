import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from model.models import is_phishing_email
from database.mongodb import save_email_to_db, db
from utils.utils import extract_urls

logging.basicConfig(level=logging.INFO)

def process_email(
    email_id: str, 
    email_content: Dict[str, Any], 
    model, 
    vectorizer
) -> Optional[bool]:
    """Analyze email content and save details to the database."""
    try:
        logging.debug(f"Processing email ID: {email_id}")
        logging.debug(f"Email content received: {email_content}")

        if not isinstance(email_content, dict):
            logging.error("Email content must be a dictionary.")
            return None

        sender = email_content.get('sender')
        timestamp = email_content.get('timestamp')
        body = email_content.get('body')

        if not sender or not timestamp:
            logging.error("Email content missing required fields: sender or timestamp.")
            return None

        if not isinstance(body, str):
            logging.error(f"Invalid email body: {body}")
            return None

        if not model or not vectorizer:
            logging.error("Model and vectorizer must be properly initialized.")
            return None

        is_phishing = is_phishing_email(email_content, model, vectorizer)
        email_content.update({
            'is_phishing': is_phishing,
            'urls': extract_urls(body),
            'email_id': email_id
        })

        source = email_content.get('source', 'imap')
        collection_name = "imap_emails" if source.lower() == "imap" else "gmail_emails"
        logging.debug(f"Saving email to collection: {collection_name}")
        save_email_to_db(email_content, source)

        logging.info(f"Email {email_id} processed. Result: {'Phishing' if is_phishing else 'Safe'}.")
        return is_phishing

    except Exception as e:
        logging.exception(f"Failed to process email {email_id}: {e}")
        return False


def should_process_email(received_time: datetime, last_processed_time: datetime) -> bool:
    """Determine if an email should be processed based on its received time."""
    try:
        # Ensure received_time is timezone-aware, if not, make it UTC
        if received_time.tzinfo is None:
            received_time = received_time.replace(tzinfo=timezone.utc)

        # Check if the email is newer than the last processed time
        return last_processed_time <= received_time <= datetime.now(timezone.utc)
    except (ValueError, TypeError):
        # Ignore invalid date formats for seamless operation
        logging.debug(f"Skipping email due to invalid date format: {received_time}")
        return False

def get_processed_email_ids(collection_name="email_id") -> set:
    """Retrieve already processed email IDs from MongoDB."""
    try:
        collection = db[collection_name]
        
        processed_emails = collection.find({}, {"email_id": 1})
        return {email['email_id'] for email in processed_emails if 'email_id' in email}
    except Exception as e:
        logging.error(f"Error fetching processed email IDs from '{collection_name}' collection: {e}")
        return set()
