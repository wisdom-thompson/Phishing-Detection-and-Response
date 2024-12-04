from flask import Blueprint, jsonify, request, redirect, session
from flask_cors import cross_origin
import pickle
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from firebase_admin import auth
from datetime import datetime, timezone
from mail_processor.fetcher import connect_to_mail, parse_email
from mail_processor.analyzer import process_email
from model.models import load_model
from database.mongodb import (
    get_last_processed_time,
    update_last_processed_time,
    save_email_to_db
)
import logging
import google_auth_oauthlib.flow
from dotenv import load_dotenv
import os
import base64
from googleapiclient.discovery import build

# Load environment variables
load_dotenv()

# Define Blueprint for routes
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

@routes_bp.route('/auth/login', methods=['POST'])
@cross_origin()
def login():
    """Authenticate user credentials with the mail server."""
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password', '')
        
        # If no password, assume Google authentication
        if not password:
            return jsonify({"message": "Authentication successful"}), 200
            
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
    """Analyze emails for phishing detection."""
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password', '')
        id_token = request.headers.get('Authorization', '').replace('Bearer ', '')
        
        results = []
        is_google_auth = bool(id_token)
        
        if is_google_auth:
            try:
                # Verify Firebase ID token for Google auth
                decoded_token = auth.verify_id_token(id_token)
                if decoded_token['email'] != email:
                    return jsonify({"message": "Email mismatch in token"}), 401
                    
                # Use Gmail API
                credentials = None
                if os.path.exists('token.pickle'):
                    with open('token.pickle', 'rb') as token:
                        credentials = pickle.load(token)
                
                if not credentials or not credentials.valid:
                    if credentials and credentials.expired and credentials.refresh_token:
                        credentials.refresh(Request())
                    else:
                        flow = InstalledAppFlow.from_client_secrets_file(
                            CLIENT_SECRETS_FILE, SCOPES)
                        credentials = flow.run_local_server(port=0)
                        with open('token.pickle', 'wb') as token:
                            pickle.dump(credentials, token)
                
                gmail_service = build('gmail', 'v1', credentials=credentials)
                messages = gmail_service.users().messages().list(userId='me', maxResults=10).execute().get('messages', [])
                
                for message in messages:
                    msg = gmail_service.users().messages().get(userId='me', id=message['id'], format='full').execute()
                    email_content = parse_gmail_message(msg)
                    
                    # Analyze email content
                    is_phishing = process_email(message['id'], email_content, model, vectorizer)
                    
                    results.append({
                        "email_id": message['id'],
                        "subject": email_content.get('subject', ''),
                        "sender": email_content.get('sender', ''),
                        "timestamp": email_content.get('timestamp', ''),
                        "body": email_content.get('body', ''),
                        "is_phishing": is_phishing
                    })
                    
            except Exception as e:
                logging.error(f"Google auth error: {e}")
                return jsonify({"message": "Failed to fetch emails from Gmail"}), 500
                
        else:
            # Regular email authentication
            if not password:
                return jsonify({"message": "Password required for non-Google authentication"}), 400
                
            mail = connect_to_mail(email, password)
            if not mail:
                return jsonify({"message": "Failed to connect to mail server"}), 401
            
            try:
                # Fetch the last 10 emails
                status, messages = mail.search(None, 'ALL')
                if status != 'OK':
                    raise Exception("Failed to search emails")
                
                email_ids = messages[0].split()[-10:]
                
                for email_id in email_ids:
                    status, msg_data = mail.fetch(email_id, '(RFC822)')
                    if status == 'OK':
                        raw_email = msg_data[0][1]
                        email_content = parse_email(raw_email)
                        
                        # Analyze email content
                        is_phishing = process_email(email_id.decode(), email_content, model, vectorizer)
                        
                        results.append({
                            "email_id": email_id.decode(),
                            "subject": email_content.get('subject', ''),
                            "sender": email_content.get('sender', ''),
                            "timestamp": email_content.get('timestamp', ''),
                            "body": email_content.get('body', ''),
                            "is_phishing": is_phishing
                        })
                
            finally:
                mail.logout()
        
        # Store results in database
        for result in results:
            save_email_to_db(result)
            
        return jsonify({"emails": results}), 200
            
        # For Google-authenticated users, use Gmail API
        credentials = None
        if os.path.exists('token.pickle'):
            with open('token.pickle', 'rb') as token:
                credentials = pickle.load(token)
                
        if not credentials or not credentials.valid:
            if credentials and credentials.expired and credentials.refresh_token:
                credentials.refresh(Request())
            else:
                flow = InstalledAppFlow.from_client_secrets_file(
                    CLIENT_SECRETS_FILE, SCOPES)
                credentials = flow.run_local_server(port=0)
                
            with open('token.pickle', 'wb') as token:
                pickle.dump(credentials, token)
                
            credentials = session['credentials']
            # Use Gmail API to fetch emails
            gmail_service = build('gmail', 'v1', credentials=credentials)
            results = gmail_service.users().messages().list(userId='me', maxResults=10).execute()
            messages = results.get('messages', [])
            
            email_results = []
            for message in messages:
                msg = gmail_service.users().messages().get(userId='me', id=message['id'], format='full').execute()
                email_content = {
                    'subject': '',
                    'sender': '',
                    'body': '',
                    'timestamp': ''
                }
                
                # Extract email details
                headers = msg['payload']['headers']
                for header in headers:
                    if header['name'] == 'Subject':
                        email_content['subject'] = header['value']
                    elif header['name'] == 'From':
                        email_content['sender'] = header['value']
                    elif header['name'] == 'Date':
                        email_content['timestamp'] = header['value']
                
                # Get email body
                if 'parts' in msg['payload']:
                    for part in msg['payload']['parts']:
                        if part['mimeType'] == 'text/plain':
                            email_content['body'] = base64.urlsafe_b64decode(part['body']['data']).decode()
                            break
                
                # Analyze the email
                is_phishing = process_email(message['id'], email_content, model, vectorizer)
                
                email_results.append({
                    "email_id": message['id'],
                    "subject": email_content['subject'],
                    "sender": email_content['sender'],
                    "timestamp": email_content['timestamp'],
                    "body": email_content['body'],
                    "is_phishing": is_phishing
                })
            
            return jsonify({"emails": email_results}), 200
            
        # Handle regular email authentication
        password = data.get('password', '')
        if password:  # Regular email authentication
            last_processed_time = get_last_processed_time()
            logging.info(f"Last processed time: {last_processed_time}")

            mail = connect_to_mail(email, password)
            if not mail:
                return jsonify({"message": "Failed to connect to mail server"}), 401

        # Fetch the last 10 emails
        status, messages = mail.search(None, 'ALL')
        if status != 'OK':
            logging.error("Failed to search emails")
            mail.logout()
            return jsonify({"message": "Failed to fetch emails"}), 500

        email_ids = messages[0].split()[-10:]  # Last 10 emails
        if not email_ids:
            logging.info("No emails found in the inbox.")
            return jsonify({"emails": []}), 200

        results = []
        new_emails_processed = False

        for email_id in email_ids:
            status, msg_data = mail.fetch(email_id, '(RFC822)')
            if status == 'OK':
                raw_email = msg_data[0][1]
                email_content = parse_email(raw_email)

                # Check email timestamp
                email_timestamp = email_content.get('timestamp')
                if email_timestamp and last_processed_time:
                    from email.utils import parsedate_to_datetime
                    try:
                        email_datetime = parsedate_to_datetime(email_timestamp)
                        if email_datetime <= last_processed_time:
                            logging.debug(f"Skipping already processed email: {email_timestamp}")
                            continue
                    except Exception as e:
                        logging.error(f"Error parsing email timestamp: {e}")
                        continue

                # Analyze email content
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

        if new_emails_processed:
            update_last_processed_time(datetime.now(timezone.utc))
            logging.info("Updated last processed time.")

        mail.logout()
        return jsonify({"emails": results}), 200

    except Exception as e:
        logging.error(f"Error analyzing emails: {e}")
        return jsonify({"message": "Failed to analyze emails"}), 500

@routes_bp.route('/auth/google', methods=['GET'])
def google_login():
    """Initiate Google OAuth2 login."""
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
    """Handle Google OAuth2 callback."""
    try:
        state = session.get("state")
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
    """Convert Google OAuth2 credentials to dictionary."""
    return {
        "token": credentials.token,
        "refresh_token": credentials.refresh_token,
        "token_uri": credentials.token_uri,
        "client_id": credentials.client_id,
        "client_secret": credentials.client_secret,
        "scopes": credentials.scopes,
    }

def parse_gmail_message(msg):
    """Parse Gmail API message into email content."""
    email_content = {
        'subject': '',
        'sender': '',
        'body': '',
        'timestamp': ''
    }
    
    # Extract headers
    headers = msg['payload']['headers']
    for header in headers:
        name = header['name'].lower()
        if name == 'subject':
            email_content['subject'] = header['value']
        elif name == 'from':
            email_content['sender'] = header['value']
        elif name == 'date':
            email_content['timestamp'] = header['value']
    
    # Extract body
    if 'parts' in msg['payload']:
        for part in msg['payload']['parts']:
            if part['mimeType'] == 'text/plain':
                try:
                    data = part['body'].get('data', '')
                    if data:
                        email_content['body'] = base64.urlsafe_b64decode(data).decode()
                        break
                except Exception as e:
                    logging.error(f"Error decoding email body: {e}")
    elif 'body' in msg['payload']:
        try:
            data = msg['payload']['body'].get('data', '')
            if data:
                email_content['body'] = base64.urlsafe_b64decode(data).decode()
        except Exception as e:
            logging.error(f"Error decoding email body: {e}")
    
    return email_content
