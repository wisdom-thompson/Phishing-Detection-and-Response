import email
from pymongo import MongoClient, ReturnDocument
from datetime import datetime, timezone
import logging
from config.mailserver import Config
from dateutil import parser

# Initialize MongoDB client and database with error handling
try:
    logging.info(
        f"Attempting to connect to MongoDB with URI: {Config.MONGODB_URI}")
    client = MongoClient(Config.MONGODB_URI, serverSelectionTimeoutMS=5000)
    # Test the connection
    client.admin.command('ping')
    logging.info("Successfully connected to MongoDB")
except Exception as e:
    logging.error(f"Failed to connect to MongoDB: {e}")
    logging.error(f"Please check your MONGODB_URI: {Config.MONGODB_URI}")
    raise

db = client['phishing_detection']


def email_exist(source=None) -> set:
    """
    Retrieve all processed email IDs from the specified or all collections.
    Returns a set of email IDs.
    """
    try:
        logging.info(f"Received 'source' argument: {source}")
        collections = []
        if source == "gmail":
            collections = [db['gmail_emails']]
        elif source == "imap":
            collections = [db['imap_emails']]
        else:
            collections = [db['gmail_emails'], db['imap_emails']]

        email_ids = set()
        for collection in collections:
            # Fetch only the email_id field
            processed_emails = collection.find({}, {"email_id": 1})
            email_ids.update(email['email_id']
                             for email in processed_emails if 'email_id' in email)

        logging.info(
            f"Retrieved {len(email_ids)} processed email IDs from source(s): {source or 'all'}")
        return email_ids

    except Exception as e:
        logging.error(f"Error retrieving processed email IDs: {str(e)}")
        return set()


def save_email_to_db(email_content, source="Unknown"):
    try:
        # Validate input structure
        if not isinstance(email_content, dict):
            logging.error(
                f"Invalid email content format: {type(email_content)}. Expected dict.")
            return False

        # Validate required fields
        if not email_content.get('email_id') or not email_content.get('sender'):
            logging.error("Missing required fields: 'email_id' or 'sender'.")
            return False

        # Determine the collection name dynamically based on the source
        collection_name = f"{source.lower()}_emails" if source.lower() in [
            "gmail", "imap"] else "emails"

        # Check if the email already exists before saving
        existing_email = db[collection_name].find_one(
            {"email_id": email_content.get('email_id')})
        if existing_email:
            logging.info(
                f"Duplicate email detected, email_id: {email_content.get('email_id')}")

            # Optionally, update existing document (uncomment if needed)
            db[collection_name].update_one(
                {"email_id": email_content.get('email_id')}, {"$set": email_content})

            # Return the updated email to ensure the frontend can access it
            return email_content  # Ensure the updated email is returned, not False

        # Prepare the email document if it's a new email
        email_document = {
            'email_id': email_content.get('email_id'),
            'subject': email_content.get('subject', 'No Subject'),
            'sender': email_content.get('sender'),
            'body': email_content.get('body', ''),
            'timestamp': email_content.get('timestamp'),
            'urls': email_content.get('urls', []),
            'is_phishing': email_content.get('is_phishing', False),
            'source': source,
            # ISO 8601 format with UTC timezone
            'received_at': datetime.now(timezone.utc).isoformat()
        }

        # Save to the appropriate collection
        collection = db[collection_name]
        result = collection.insert_one(email_document)
        logging.info(
            f"Email saved in collection '{collection_name}' with ID: {result.inserted_id}")

        # Return the saved email document so it can be fetched by the frontend
        return email_document

    except Exception as e:
        logging.error(
            f"Error saving email to DB: {e}, email content: {email_content}")
        return False


def get_last_processed_time(source='imap'):
    """Retrieve the last processed time from the database for a specific source."""
    try:
        # Use source to differentiate between IMAP and Gmail
        result = db['settings'].find_one({"_id": f"last_processed_time_{source}"}, {
                                         "last_processed_time": 1})

        if result and 'last_processed_time' in result:
            try:
                # Parse the ISO timestamp and ensure UTC timezone
                timestamp = datetime.fromisoformat(
                    result['last_processed_time'])
                if timestamp.tzinfo is None:
                    timestamp = timestamp.replace(tzinfo=timezone.utc)
                return timestamp.isoformat()
            except ValueError:
                logging.error(
                    f"Invalid timestamp format in database for {source}: {result['last_processed_time']}")
                return None
        else:
            logging.warning(
                f"No last processed time found in the database for {source}.")
            return None
    except Exception as e:
        logging.error(
            f"Error retrieving last processed time for {source}: {str(e)}")
        return None


def update_last_processed_time(timestamp, source='imap'):
    """Update the last processed time in the database for a specific source."""
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
                logging.error(
                    f"Invalid timestamp format provided for {source}: {timestamp}. Error: {e}")
                return None
        else:
            logging.error(
                f"Invalid timestamp type for {source}: {type(timestamp)}. Expected datetime or ISO 8601 string.")
            return None

        # Update the database using the source to differentiate
        result = db['settings'].find_one_and_update(
            {"_id": f"last_processed_time_{source}"},
            {"$set": {"last_processed_time": iso_timestamp}},
            upsert=True,
            return_document=ReturnDocument.AFTER
        )

        if result:
            previous_timestamp = result.get("last_processed_time")
            logging.info(
                f"Updated last processed time for {source} from {previous_timestamp} to {iso_timestamp}")
            return iso_timestamp
        else:
            logging.warning(
                f"Failed to update last processed time for {source}.")
            return None
    except Exception as e:
        logging.error(
            f"Error updating last processed time for {source}: {str(e)}")
        return None
