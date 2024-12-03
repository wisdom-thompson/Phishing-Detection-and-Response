from flask import Blueprint, jsonify, request, redirect, session
from flask_cors import cross_origin
from datetime import datetime, timezone
from mail_processor.fetcher import connect_to_mail, parse_email
from mail_processor.analyzer import process_email
from model.models import load_model
from database.mongodb import get_last_processed_time, update_last_processed_time
import logging
import google_auth_oauthlib.flow
from dotenv import load_dotenv
import os

load_dotenv()

routes_bp = Blueprint('routes', __name__)
model, vectorizer = load_model()

# Google OAuth2 Configuration
CLIENT_SECRETS_FILE = "CREDENTIAL_PATH"

print(f"Using credentials file at: {CLIENT_SECRETS_FILE}")
SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"]
REDIRECT_URI = "http://localhost:5173/dashboard"

@routes_bp.route('/')
def index():
    return jsonify({"message": "Welcome to Phishing Detection API!"})

@routes_bp.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "Healthy"}), 200

@routes_bp.route('/auth/login', methods=['POST'])
@cross_origin()
def login():
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        
        # Try to connect to mail server
        mail = connect_to_mail(email, password)
        if mail:
            mail.logout()
            return jsonify({"message": "Authentication successful"}), 200
        return jsonify({"message": "Authentication failed"}), 401
    except Exception as e:
        logging.error(f"Login error: {e}")
        return jsonify({"message": "Authentication failed"}), 401

@routes_bp.route('/emails/analyze', methods=['POST'])
@cross_origin()
def analyze_emails():
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        
        # Get last processed time
        last_processed_time = get_last_processed_time()
        if not last_processed_time:
            logging.info("No last processed time found, will process all emails")
        else:
            logging.info(f"Last processed time: {last_processed_time}")

        # Connect to mail server
        mail = connect_to_mail(email, password)
        if not mail:
            return jsonify({"message": "Failed to connect to mail server"}), 401

        # Fetch latest emails
        status, messages = mail.search(None, 'ALL')
        if status != 'OK':
            mail.logout()
            logging.error("Failed to search emails")
            return jsonify({"message": "Failed to fetch emails"}), 500

        email_ids = messages[0].split()[-10:]  # Get last 10 emails
        if not email_ids:
            logging.warning("No emails found in the inbox.")
            return jsonify({"emails": []}), 200

        results = []
        new_emails_processed = False

        for email_id in email_ids:
            status, msg_data = mail.fetch(email_id, '(RFC822)')
            if status == 'OK':
                raw_email = msg_data[0][1]
                email_content = parse_email(raw_email)
                
                # Check if email is newer than last processed time
                email_timestamp = email_content.get('timestamp')
                if email_timestamp and last_processed_time:
                    try:
                        from email.utils import parsedate_to_datetime
                        email_datetime = parsedate_to_datetime(email_timestamp)
                        if email_datetime <= last_processed_time:
                            logging.debug(f"Skipping already processed email from {email_timestamp}")
                            continue
                    except (ValueError, TypeError, AttributeError) as e:
                        logging.error(f"Error parsing email timestamp: {e}")
                        continue

                # Process new email for phishing detection
                is_phishing = process_email(email_id.decode(), email_content, model, vectorizer)
                new_emails_processed = True
                
                results.append({
                    "email_id": email_id.decode(),
                    "subject": email_content.get('subject'),
                    "sender": email_content.get('sender'),
                    "senderIP": email_content.get('ip'),
                    "timestamp": email_timestamp,
                    "body": email_content.get('body'),
                    "is_phishing": is_phishing
                })

        # Update last processed time only if new emails were processed
        if new_emails_processed:
            update_last_processed_time(datetime.now(timezone.utc))
            logging.info("Updated last processed time after analyzing new emails")

        mail.logout()
        return jsonify({"emails": results}), 200

    except Exception as e:
        logging.error(f"Analysis error: {e}")
        return jsonify({"message": "Failed to analyze emails"}), 500

# Google OAuth2 Routes
@routes_bp.route('/auth/google', methods=['GET'])
def google_login():
    try:
        flow = google_auth_oauthlib.flow.Flow.from_client_secrets_file(
            CLIENT_SECRETS_FILE, scopes=SCOPES
        )
        flow.redirect_uri = REDIRECT_URI

        authorization_url, state = flow.authorization_url(
            access_type="offline", include_granted_scopes="true"
        )
        session["state"] = state
        return jsonify({"url": authorization_url})
    except Exception as e:
        logging.error(f"Google login error: {e}")
        return jsonify({"message": "Google login failed"}), 500

@routes_bp.route('/auth/callback', methods=['GET'])
def google_callback():
    try:
        state = session["state"]
        flow = google_auth_oauthlib.flow.Flow.from_client_secrets_file(
            CLIENT_SECRETS_FILE, scopes=SCOPES, state=state
        )
        flow.redirect_uri = REDIRECT_URI

        flow.fetch_token(authorization_response=request.url)
        credentials = flow.credentials
        session["credentials"] = credentials_to_dict(credentials)
        return jsonify({"message": "Google authentication successful"}), 200
    except Exception as e:
        logging.error(f"Google callback error: {e}")
        return jsonify({"message": "Google authentication failed"}), 500

def credentials_to_dict(credentials):
    return {
        "token": credentials.token,
        "refresh_token": credentials.refresh_token,
        "token_uri": credentials.token_uri,
        "client_id": credentials.client_id,
        "client_secret": credentials.client_secret,
        "scopes": credentials.scopes,
    }
