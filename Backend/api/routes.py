from flask import Blueprint, jsonify, request, session
from flask_cors import cross_origin
import pickle
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from firebase_admin import auth
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from auth.gmail_auth import create_gmail_service, get_gmail_messages
from mail_processor.analyzer import process_email
from mail_processor.fetcher import connect_to_mail, parse_email
from model.models import load_model
from database.mongodb import get_last_processed_time, update_last_processed_time, save_email_to_db, email_exist
import logging
from dotenv import load_dotenv
load_dotenv()

routes_bp = Blueprint('routes', __name__)

# Load AI/ML model and vectorizer
model, vectorizer = load_model()

# Google OAuth2 Configuration
CLIENT_SECRETS_FILE = os.getenv("CREDENTIAL_PATH")
SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"]
REDIRECT_URI = "http://localhost:5173/dashboard"

logging.basicConfig(level=logging.INFO)

# Routes
@routes_bp.route('/')
def index():
    return jsonify({"message": "Welcome to Phishing Detection API!"})

@routes_bp.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "Healthy"}), 200

@routes_bp.route("/emails/analyze", methods=["POST"])
@cross_origin()
def analyze_emails():
    """
    Endpoint to analyze emails for phishing.
    Expects email credentials or a token to connect to a mail server.
    """
    try:
        # Validate request payload
        data = request.get_json()
        email = data.get("email")
        password = data.get("password")
        email_limit = data.get("limit", 10)  # Optional parameter to control email fetch limit

        if not email or not password:
            return jsonify({"message": "Email and password are required."}), 400

        # Get last processed time from the database
        last_processed_time = get_last_processed_time()
        if last_processed_time:
            logging.info(f"Last processed email timestamp: {last_processed_time}")
        else:
            logging.info("No previous processed time found. Analyzing all emails.")

        # Connect to the mail server
        mail = connect_to_mail(email, password)
        if not mail:
            return jsonify({"message": "Failed to connect to mail server. Check credentials."}), 401

        # Fetch recent emails
        status, messages = mail.search(None, "ALL")
        if status != "OK":
            raise Exception("Failed to search emails in the inbox.")

        email_ids = messages[0].split()[-email_limit:]  # Limit email fetch
        if not email_ids:
            logging.info("No emails found to process.")
            return jsonify({"emails": []}), 200

        # Process emails
        results = []
        for email_id in email_ids:
            try:
                status, msg_data = mail.fetch(email_id, "(RFC822)")
                if status != "OK":
                    logging.warning(f"Failed to fetch email with ID {email_id}")
                    continue

                raw_email = msg_data[0][1]
                email_content = parse_email(raw_email)

                # Add email_id to content
                email_id_str = email_id.decode('utf-8')
                email_content['email_id'] = email_id_str
                
                if email_exist(email_content['email_id'], source="imap"):  # Check for duplicates in 'imap_emails' collection
                     logging.info(f"Duplicate email detected, email_id: {email_id_str}")
                     continue  # Skip processing this email

        # Process the email and save it
                email_content['is_phishing'] = process_email(email_content['email_id'], email_content, model, vectorizer)
        
        # Save the processed email
                save_status = save_email_to_db(email_content, source="imap")
                if save_status:
                    logging.info(f"Email saved in collection 'imap_emails' with ID: {email_content['email_id']}")

            except Exception as e:
                logging.error(f"Error processing email ID {email_id}: {e}")

                # Check and convert email timestamp to ISO 8601
                email_timestamp = email_content.get("timestamp")
                if email_timestamp:
                    try:
                        if isinstance(email_timestamp, str):
                            try:
                                # First try parsing as ISO format
                                email_datetime = datetime.fromisoformat(email_timestamp)
                            except ValueError:
                                # Fallback to email date parsing
                                email_datetime = parsedate_to_datetime(email_timestamp)
                        else:
                            email_datetime = email_timestamp
                        # Ensure timezone info
                        if email_datetime.tzinfo is None:
                            email_datetime = email_datetime.replace(tzinfo=timezone.utc)

                        email_iso_timestamp = email_datetime.isoformat()
                        email_content["timestamp"] = email_iso_timestamp

                        # Skip emails processed before the last timestamp
                        if last_processed_time:
                            last_processed_datetime = datetime.fromisoformat(last_processed_time)
                            if email_datetime <= last_processed_datetime:
                                logging.debug(f"Skipping already processed email: {email_iso_timestamp}")
                                continue
                    except Exception as e:
                        logging.warning(f"Failed to parse timestamp: {email_timestamp}. Error: {e}")
                        continue

                # Analyze the email for phishing
                email_content['is_phishing'] = process_email(email_content['email_id'], email_content, model, vectorizer)

                # Save the processed email
                save_status = save_email_to_db(email_content, source="imap")
                if save_status:
                    results.append(email_content)

            except Exception as e:
                logging.error(f"Error processing email ID {email_id}: {e}")

        # Update the last processed time
        if results:
            latest_email_time = max(
                [email["timestamp"] for email in results if "timestamp" in email]
            )
            update_last_processed_time(latest_email_time)

        return jsonify({"emails": results}), 200

    except Exception as e:
        logging.error(f"Error in /emails/analyze: {e}")
        return jsonify({"message": "An error occurred while analyzing emails."}), 500

 

@routes_bp.route('/emails/fetch', methods=['GET'])
@cross_origin()
def fetch_google_emails():
    """
    Endpoint to fetch and analyze Gmail emails for phishing.
    """
    try:
        # Retrieve Gmail token and email limit from query parameters
        access_token = request.args.get('token')
        email_limit = int(request.args.get('limit', 10))  # Optional parameter with default limit of 10

        if not access_token:
            return jsonify({"message": "Token is required"}), 400

        logging.info("Received token for Gmail email fetching.")

        # Create Gmail service
        service = create_gmail_service(access_token)
        if not service:
            return jsonify({"message": "Failed to create Gmail service"}), 401

        # Get last processed time and already processed email IDs for Gmail
        last_processed_time = get_last_processed_time(source="gmail")
        if last_processed_time:
            logging.info(f"Last processed Gmail email timestamp: {last_processed_time}")
        else:
            logging.info("No previous Gmail processed time found. Analyzing all emails.")

        processed_email_ids = email_exist("gmail")  # Fetch all processed Gmail email IDs
        logging.info(f"Found {len(processed_email_ids)} already processed Gmail email IDs.")

        # Fetch Gmail messages
        fetched_emails = get_gmail_messages(service)
        if not fetched_emails:
            logging.info("No Gmail emails fetched.")
            return jsonify({"emails": []}), 200

        # Limit the number of emails fetched
        fetched_emails = fetched_emails[:email_limit]
        logging.info(f"Fetched {len(fetched_emails)} emails from Gmail (limited to {email_limit}).")

        # Process emails
        analyzed_emails = []
        for email in fetched_emails:
            try:
                # Skip already processed emails by email_id
                if email['email_id'] in processed_email_ids:
                    logging.info(f"Skipping already processed email: {email['email_id']}")
                    continue

                # Parse and validate email timestamp
                email_timestamp = email.get("timestamp")
                if email_timestamp:
                    try:
                        if isinstance(email_timestamp, str):
                            email_datetime = datetime.fromisoformat(email_timestamp)
                        else:
                            email_datetime = email_timestamp

                        # Ensure timezone info
                        if email_datetime.tzinfo is None:
                            email_datetime = email_datetime.replace(tzinfo=timezone.utc)

                        # Skip emails processed before the last timestamp
                        if last_processed_time:
                            last_processed_datetime = datetime.fromisoformat(last_processed_time)
                            if email_datetime <= last_processed_datetime:
                                logging.debug(f"Skipping already processed email by timestamp: {email_timestamp}")
                                continue

                        # Update the email content with a normalized timestamp
                        email['timestamp'] = email_datetime.isoformat()
                    except Exception as e:
                        logging.warning(f"Failed to parse email timestamp: {email_timestamp}. Error: {e}")
                        continue

                # Ensure the email source is set to Gmail
                email['source'] = 'gmail'

                # Analyze the email for phishing
                email['is_phishing'] = process_email(email['email_id'], email, model, vectorizer)

                # Save the analyzed email to the database
                if save_email_to_db(email, source='gmail'):
                    analyzed_emails.append(email)

            except Exception as e:
                logging.error(f"Error processing Gmail email ID {email['email_id']}: {e}")

        # Update the last processed time after all emails are processed
        if analyzed_emails:
            latest_email_time = max(
                [email["timestamp"] for email in analyzed_emails if "timestamp" in email]
            )
            update_last_processed_time(latest_email_time, source="gmail")
            logging.info(f"Updated last processed Gmail email timestamp to: {latest_email_time}")

        return jsonify({"emails": analyzed_emails}), 200

    except Exception as e:
        logging.error(f"Error fetching and analyzing Gmail emails: {e}")
        return jsonify({"message": "Failed to fetch and analyze emails"}), 500
