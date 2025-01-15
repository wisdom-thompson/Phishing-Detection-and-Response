from pymongo import MongoClient, ReturnDocument
from datetime import datetime, timezone
import logging
from config.mailserver import Config
from dateutil import parser

# Initialize MongoDB client and database
client = MongoClient(Config.MONGODB_URI)
db = client['phishing_detection']

import logging

def email_exists(email_id: str, source=None) -> bool:
    """Check if an email exists in the specified or all collections."""
    try:
        collections = []
        if source == "gmail":
            collections = [db['gmail_emails']]
        elif source == "imap":
            collections = [db['imap_emails']]
        else:
            collections = [db['gmail_emails'], db['imap_emails']]

        for collection in collections:
            if collection.find_one({"email_id": email_id}):
                return True

        return False
    except Exception as e:
        logging.error(f"Error checking email existence: {str(e)}")
        return False

def save_email_to_db(email_content, source="Unknown"):
    try:
        # Validate input structure
        if not isinstance(email_content, dict):
            logging.error(f"Invalid email content format: {type(email_content)}. Expected dict.")
            return False

        # Validate required fields
        if not email_content.get('email_id') or not email_content.get('sender'):
            logging.error("Missing required fields: 'email_id' or 'sender'.")
            return False

        # Determine the collection name dynamically based on the source
        collection_name = f"{source.lower()}_emails" if source.lower() in ["gmail", "imap"] else "emails"

        # Prepare the email document
        email_document = {
            'email_id': email_content.get('email_id'),
            'subject': email_content.get('subject', 'No Subject'),
            'sender': email_content.get('sender'),
            'body': email_content.get('body', ''),
            'timestamp': email_content.get('timestamp'),
            'urls': email_content.get('urls', []),
            'is_phishing': email_content.get('is_phishing', False),
            'source': source,
            'received_at': datetime.now(timezone.utc).isoformat()  # ISO 8601 format with UTC timezone
        }

        # Save to the appropriate collection
        collection = db[collection_name]
        result = collection.insert_one(email_document)
        logging.info(f"Email saved in collection '{collection_name}' with ID: {result.inserted_id}")
        return True
    except Exception as e:
        logging.error(f"Error saving email to DB: {e}, email content: {email_content}")
        return False



def get_last_processed_time():
    """Retrieve the last processed time from the database."""
    try:
        result = db['settings'].find_one({"_id": "last_processed_time"}, {"last_processed_time": 1})
        if result and 'last_processed_time' in result:
            try:
                # Parse the ISO timestamp and ensure UTC timezone
                timestamp = datetime.fromisoformat(result['last_processed_time'])
                if timestamp.tzinfo is None:
                    timestamp = timestamp.replace(tzinfo=timezone.utc)
                return timestamp.isoformat()
            except ValueError:
                logging.error(f"Invalid timestamp format in database: {result['last_processed_time']}")
                return None
        else:
            logging.warning("No last processed time found in the database.")
            return None
    except Exception as e:
        logging.error(f"Error retrieving last processed time: {str(e)}")
        return None


def update_last_processed_time(timestamp):
    """Update the last processed time in the database."""
    try:
        # Validate and convert timestamp to ISO format with UTC timezone
        if isinstance(timestamp, datetime):
            if timestamp.tzinfo is None:
                timestamp = timestamp.replace(tzinfo=timezone.utc)
            iso_timestamp = timestamp.astimezone(timezone.utc).isoformat()
        elif isinstance(timestamp, str):
            try:
                # Parse the string timestamp
                parsed = parser.parse(timestamp)
                if parsed.tzinfo is None:
                    parsed = parsed.replace(tzinfo=timezone.utc)
                iso_timestamp = parsed.astimezone(timezone.utc).isoformat()
            except ValueError as e:
                logging.error(f"Invalid timestamp format provided: {timestamp}. Error: {e}")
                return None
        else:
            logging.error(f"Invalid timestamp type: {type(timestamp)}. Expected datetime or ISO 8601 string.")
            return None

        # Update the database
        result = db['settings'].find_one_and_update(
            {"_id": "last_processed_time"},
            {"$set": {"last_processed_time": iso_timestamp}},
            upsert=True,
            return_document=ReturnDocument.AFTER
        )
        
        if result:
            previous_timestamp = result.get("last_processed_time")
            logging.info(f"Updated last processed time from {previous_timestamp} to {iso_timestamp}")
            return iso_timestamp
        else:
            logging.warning("Failed to update last processed time.")
            return None
    except Exception as e:
        logging.error(f"Error updating last processed time: {str(e)}")
        return None
