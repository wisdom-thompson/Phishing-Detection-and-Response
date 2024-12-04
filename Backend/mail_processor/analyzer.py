import logging
from datetime import datetime, timezone
from model.models import is_phishing_email
from database.mongodb import save_email_to_db, db
from utils.utils import extract_urls

logging.basicConfig(level=logging.INFO)

def process_email(email_id, email_content, model, vectorizer):
    """Analyze and save email details."""
    if not email_content or not isinstance(email_content, dict):
        logging.error(f"Invalid email content for ID {email_id}")
        return False

    try:
        logging.debug(f"Processing email ID {email_id}")

        # Validate required fields
        required_fields = ['sender', 'subject', 'body', 'timestamp']
        if not all(field in email_content for field in required_fields):
            logging.error(f"Missing required fields in email {email_id}")
            return False

        # Clean and prepare content
        email_content['body'] = email_content['body'].strip()
        if not email_content['body']:
            logging.warning(f"Empty body in email {email_id}")
            return False
        
        # Check if the model and vectorizer are loaded
        if model is None or vectorizer is None:
            logging.error("Model or vectorizer is not loaded properly.")
            return None

        # Analyze the body content
        is_phishing = is_phishing_email(email_content, model, vectorizer)  # Use the entire email_content
        email_content['is_phishing'] = is_phishing
        email_content['urls'] = extract_urls(email_content['body'])  # Extract URLs from the body

        email_content['email_id'] = email_id  # Add email ID to content

        # Log the content before saving
        logging.debug(f"Saving email to database: {email_content}")
        save_email_to_db(email_content)  # Save the processed email to the database

        logging.info(f"Processed email {email_id}: {'Phishing' if is_phishing else 'Safe'}")
        return is_phishing
    except Exception as e:
        logging.error(f"Error processing email {email_id}: {e}")
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

def get_processed_email_ids() -> set:
    """Retrieve already processed email IDs from MongoDB."""
    try:
        processed_emails = db['emails'].find({}, {"email_id": 1})
        return {email['email_id'] for email in processed_emails if 'email_id' in email}
    except Exception as e:
        logging.error(f"Error fetching processed email IDs: {e}")
        return set()
