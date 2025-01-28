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

def get_gmail_messages(service):
    """
    Fetch Gmail messages using the Gmail API.
    """
    try:
        results = service.users().messages().list(userId="me", labelIds=["INBOX"]).execute()
        messages = results.get("messages", [])

        emails = []
        for msg in messages:
            msg_id = msg["id"]
            message = service.users().messages().get(userId="me", id=msg_id).execute()

            # Extract email details
            payload = message.get("payload", {})
            headers = {header["name"]: header["value"] for header in payload.get("headers", [])}
            
            # Decode email body
            body = ""
            if payload.get("body") and payload["body"].get("data"):
                # If body is directly available
                body = base64.urlsafe_b64decode(payload["body"]["data"]).decode("utf-8")
            elif payload.get("parts"):
                # If it's a multipart message, search for plain text part
                for part in payload["parts"]:
                    if part.get("mimeType") == "text/plain" and part.get("body") and part["body"].get("data"):
                        body = base64.urlsafe_b64decode(part["body"]["data"]).decode("utf-8")
                        break

            email_data = {
                "email_id": msg_id,
                "subject": headers.get("Subject", "No Subject"),
                "sender": headers.get("From", "Unknown Sender"),
                "timestamp": message.get("internalDate"),  # Unix timestamp
                "body": body,  # Decoded email body
            }

            # Convert timestamp to ISO format
            email_data["timestamp"] = datetime.fromtimestamp(
                int(email_data["timestamp"]) / 1000, tz=timezone.utc
            ).isoformat()

            emails.append(email_data)

        return emails
    except Exception as e:
        logging.error(f"Error fetching Gmail messages: {e}")
        return []