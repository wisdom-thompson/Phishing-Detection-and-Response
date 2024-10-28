from pymongo import MongoClient, ReturnDocument

from datetime import datetime
from config.config import Config
import logging

# Initialize MongoDB client and database
client = MongoClient(Config.MONGODB_URI)
db = client['phishing_detection']

import logging

def save_email_to_db(email_content):
    try:
        # Ensure that the content matches the expected structure
        if not isinstance(email_content, dict):
            logging.error(f"Invalid email content format: {type(email_content)}. Expected dict.")
            return
        
        # Define the required fields for validation
        required_fields = ['subject', 'body', 'sender', 'timestamp']  # Update this list based on your schema

        # Validate the presence of required fields
        missing_fields = [field for field in required_fields if field not in email_content]
        if missing_fields:
            logging.error(f"Missing required fields in email content: {', '.join(missing_fields)}")
            return

        # Insert the email content into the desired collection
        collection = db['emails']  # Make sure to define your collection name
        result = collection.insert_one(email_content)

        logging.info(f"Email saved to DB with ID: {result.inserted_id}, Subject: {email_content.get('subject', 'No Subject')}")
    except Exception as e:
        logging.error(f"Error saving email to database: {str(e)}")


def get_last_processed_time():
    """Retrieve the last processed time from the database."""
    try:
        result = db['settings'].find_one({"_id": "last_processed_time"}, {"last_processed_time": 1})
        if result and 'last_processed_time' in result:
            return datetime.fromisoformat(result['last_processed_time'])
        else:
            logging.warning("No last processed time found in the database.")
            return None
    except Exception as e:
        logging.error(f"Error retrieving last processed time: {str(e)}")
        return None

def update_last_processed_time(timestamp):
    """Update the last processed time in the database."""
    try:
        # Ensure the timestamp is in ISO format for storage
        iso_timestamp = timestamp.isoformat() if isinstance(timestamp, datetime) else timestamp

        result = db['settings'].find_one_and_update(
            {"_id": "last_processed_time"},
            {"$set": {"last_processed_time": iso_timestamp}},
            upsert=True,
            return_document=ReturnDocument.AFTER
        )
        
        if result:
            logging.info(f"Updated last processed time to: {iso_timestamp}")
            return iso_timestamp
        else:
            logging.warning("Failed to update last processed time.")
            return None
    except Exception as e:
        logging.error(f"Error updating last processed time: {str(e)}")
        return None