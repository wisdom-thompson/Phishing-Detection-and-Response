from flask import Blueprint, jsonify, request, session
from flask_cors import cross_origin
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from auth.gmail_auth import create_gmail_service, get_gmail_messages
from mail_processor.analyzer import process_email
from mail_processor.fetcher import connect_to_mail, parse_email
from model.models import load_model
from database.mongodb import get_last_processed_time, update_last_processed_time, save_email_to_db, email_exists
import logging
from dotenv import load_dotenv
load_dotenv()

routes_bp = Blueprint('routes', __name__)
model, vectorizer = load_model()

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

    finally:
        # Cleanup resources
        if "mail" in locals() and mail:
            mail.logout()


@routes_bp.route('/emails/fetch', methods=['GET'])
@cross_origin()
def fetch_google_emails():
    try:
        # Retrieve Gmail token from query
        access_token = request.args.get('token')

        # Create Gmail service
        service = create_gmail_service(access_token)
        if not service:
            return jsonify({"message": "Failed to create Gmail service"}), 401

        # Fetch Gmail messages
        fetched_emails = get_gmail_messages(service)

        analyzed_emails = []
        for email in fetched_emails:
            if not email_exists(email['email_id'], source="gmail"):  # Avoid duplicate analysis
                email['is_phishing'] = process_email(email['email_id'], email, model, vectorizer)

                # Save analyzed Gmail email
                if save_email_to_db(email, source="gmail"):
                    analyzed_emails.append(email)

        return jsonify({"emails": analyzed_emails}), 200

    except TypeError as e:
        logging.error(f"TypeError in save_email_to_db: {e}")
        return jsonify({"message": f"Invalid arguments for save_email_to_db: {e}"}), 500

    except Exception as e:
        logging.error(f"Error fetching and analyzing Google emails: {e}")
        return jsonify({"message": "Failed to fetch and analyze emails"}), 500
        