import imaplib
from email.policy import default
import email
import logging
from typing import Optional, Union
from ssl import SSLError

from config.mailserver import Config



def connect_to_mail(username: str, password: str) -> Optional[imaplib.IMAP4_SSL]:
    try:
        # Log connection attempt
        logging.info(f"Attempting to connect to mail server for user: {username}")
        
        # Create SSL connection
        try:
            mail = imaplib.IMAP4_SSL(Config.MAIL_SERVER, Config.MAIL_PORT)
            logging.info("SSL connection established")
        except SSLError as ssl_err:
            logging.error(f"SSL Connection failed: {str(ssl_err)}")
            raise Exception(f"Failed to establish secure connection: {str(ssl_err)}")
        
        # Attempt login
        try:
            mail.login(username, password)
            logging.info("Login successful")
        except imaplib.IMAP4.error as login_err:
            logging.error(f"Login failed: {str(login_err)}")
            raise Exception(f"Login failed: {str(login_err)}")
        
        # Select inbox
        try:
            mail.select('inbox')
            logging.info("Inbox selected successfully")
        except imaplib.IMAP4.error as select_err:
            logging.error(f"Failed to select inbox: {str(select_err)}")
            raise Exception(f"Failed to access inbox: {str(select_err)}")
        
        return mail
        
    except Exception as e:
        logging.error(f"Mail connection error: {str(e)}")
        return None

def parse_email(raw_email):
    """Parse raw email bytes to extract essential information."""
    try:
        msg = email.message_from_bytes(raw_email, policy=default)
        email_content = {
            'email_id': msg['message-id'],
            'subject': msg['subject'],
            'sender': msg['from'],  # Changed to 'sender'
            'body': '',
            'timestamp': msg['Date'],  # Changed to 'timestamp'
        }

        # If the email is multipart
        if msg.is_multipart():
            for part in msg.walk():
                content_disposition = str(part.get("Content-Disposition"))
                if 'attachment' not in content_disposition:
                    body_part = part.get_payload(decode=True)
                    if body_part:
                        email_content['body'] += body_part.decode(part.get_content_charset() or 'utf-8', errors='ignore') + '\n'
        else:
            # Handle single-part emails
            body_part = msg.get_payload(decode=True)
            if body_part:
                email_content['body'] += body_part.decode(msg.get_content_charset() or 'utf-8', errors='ignore')

        # Log a warning if the body is still empty
        if not email_content['body'].strip():
            logging.warning(f"Email {email_content['subject']} has no body content.")

        # Debug log to check parsed email content
        logging.debug(f"Parsed email content: {email_content}")
        return email_content

    except Exception as e:
        logging.error(f"Error parsing email: {e}")
        return {'subject': 'Error', 'body': '', 'sender': 'Unknown', 'timestamp': 'Unknown'}  # Ensure to return the expected keys
