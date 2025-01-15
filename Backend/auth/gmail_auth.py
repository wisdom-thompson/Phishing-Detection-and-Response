import base64
import re
from datetime import datetime, timezone
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from google.auth.transport.requests import Request# Assuming you have this function to check for phishing emails
import logging
from typing import Optional, Dict
from database.mongodb import save_email_to_db  # Import the save function from mongodb.py

SCOPES = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.metadata',
    'https://www.googleapis.com/auth/gmail.labels'
]
CREDENTIALS_FILE = '/Backend/credentials.json'
TOKEN_PICKLE_FILE = 'token.pickle'

def create_gmail_service(access_token: str) -> Optional[object]:
    """Create Gmail API service using OAuth access token"""
    try:
        logging.info("Attempting to create Gmail service with token")
        credentials = Credentials(
            token=access_token,
            scopes=SCOPES
        )

        if credentials and credentials.expired and credentials.refresh_token:
            credentials.refresh(Request())
            logging.info("Refreshed expired Gmail credentials")

        service = build('gmail', 'v1', credentials=credentials)
        
        # Verify service by making a test API call
        try:
            service.users().getProfile(userId='me').execute()
            logging.info("Gmail API access verified successfully")
            return service
        except Exception as verify_error:
            error_details = str(verify_error)
            logging.error(f"Gmail API verification failed: {error_details}")
            if 'accessNotConfigured' in error_details:
                raise Exception("Gmail API is not enabled. Please enable it in Google Cloud Console.")
            elif 'invalid_grant' in error_details:
                raise Exception("Invalid or expired credentials. Please login again.")
            else:
                raise Exception(f"Gmail API access failed: {error_details}")
    except Exception as e:
        logging.error(f"Failed to create Gmail service: {str(e)}", exc_info=True)
        return None

def get_gmail_messages(service, max_results=50):
    """Fetch messages from Gmail and format them for database storage."""
    try:
        results = service.users().messages().list(
            userId='me',
            maxResults=max_results,
            q='is:unread in:inbox'  # Fetch unread inbox messages
        ).execute()

        messages = results.get('messages', [])
        email_list = []
        
        for message in messages:
            try:
                msg = service.users().messages().get(
                    userId='me', id=message['id'], format='full'
                ).execute()
                
                headers = msg['payload']['headers']
                subject = next((header['value'] for header in headers if header['name'].lower() == 'subject'), 'No Subject')
                sender = next((header['value'] for header in headers if header['name'].lower() == 'from'), 'Unknown Sender')
                
                # Extract email body
                body = ""
                for part in msg['payload'].get('parts', []):
                    if part['mimeType'] == 'text/plain':
                        body_data = part['body'].get('data', '')
                        body = base64.urlsafe_b64decode(body_data).decode('utf-8')
                        break
                body = body or "No body content found"

                # Convert timestamp to ISO format with UTC timezone
                timestamp = datetime.fromtimestamp(int(msg['internalDate']) / 1000, tz=timezone.utc).isoformat()

                # Extract URLs from the email body using regex
                urls = re.findall(r'(https?://\S+)', body)

                # Run phishing detection

                email_list.append({
                    'email_id': msg['id'],
                    'subject': subject,
                    'sender': sender,
                    'body': body,
                    'timestamp': timestamp,
                    'urls': urls
                })
            except Exception as msg_error:
                logging.error(f"Error processing message {message['id']}: {msg_error}")
                continue

        return email_list
    except Exception as e:
        logging.error(f"Error fetching Gmail messages: {e}")
        raise


