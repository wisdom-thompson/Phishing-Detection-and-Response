import imaplib
from email.policy import default
import email
import logging
from typing import Optional, Union
from ssl import SSLError
from datetime import datetime, timezone

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
            mail.select('INBOX')  # Use uppercase INBOX for better compatibility
            logging.info("Inbox selected successfully")
        except imaplib.IMAP4.error as select_err:
            logging.error(f"Failed to select inbox: {str(select_err)}")
            raise Exception(f"Failed to access inbox: {str(select_err)}")
        
        return mail
        
    except Exception as e:
        logging.error(f"Mail connection error: {str(e)}")
        return None

def fetch_emails(mail, max_emails: int = 10) -> list:
    """Fetch recent emails from the mailbox."""
    try:
        # Search for all emails in inbox, ordered by date
        status, messages = mail.search(None, '(ALL)', 'REVERSE')  # Get newest first
        if status != 'OK':
            logging.error("Failed to search emails")
            return []

        email_ids = messages[0].split()
        if not email_ids:
            logging.info("No emails found in inbox")
            return []

        # Get the most recent emails
        recent_email_ids = email_ids[:max_emails]  # Take first N emails since they're newest
        
        emails = []
        for email_id in recent_email_ids:
            try:
                # Fetch email with specific parts we need
                status, msg_data = mail.fetch(email_id, '(RFC822)')
                if status != 'OK':
                    logging.error(f"Failed to fetch email ID {email_id}")
                    continue
                    
                if not msg_data or not msg_data[0]:
                    logging.warning(f"No data received for email ID {email_id}")
                    continue
                    
                raw_email = msg_data[0][1]
                email_content = parse_email(raw_email)
                
                if email_content and all(key in email_content for key in ['subject', 'sender', 'body', 'timestamp']):
                    email_content['email_id'] = email_id.decode()
                    emails.append(email_content)
                else:
                    logging.warning(f"Incomplete email content for ID {email_id}")
                    
            except Exception as e:
                logging.error(f"Error processing email ID {email_id}: {str(e)}")
                continue
                
        logging.info(f"Successfully fetched {len(emails)} emails")
        return emails
        
    except Exception as e:
        logging.error(f"Error fetching emails: {e}")
        return []

def parse_email(raw_email):
    """Parse raw email bytes to extract essential information."""
    try:
        msg = email.message_from_bytes(raw_email, policy=default)
        
        # Initialize email content with default values
        email_content = {
            'email_id': msg['message-id'] or '',
            'subject': msg['subject'] or 'No Subject',
            'sender': msg['from'] or 'Unknown Sender',
            'body': '',
            'timestamp': msg['date'] or datetime.now(timezone.utc).isoformat(),
        }

        # Extract body content
        if msg.is_multipart():
            for part in msg.walk():
                if part.get_content_type() == "text/plain":
                    try:
                        charset = part.get_content_charset() or 'utf-8'
                        payload = part.get_payload(decode=True)
                        if payload:
                            decoded_content = payload.decode(charset, errors='replace')
                            email_content['body'] += decoded_content + '\n'
                    except Exception as e:
                        logging.error(f"Error decoding multipart content: {str(e)}")
        else:
            try:
                charset = msg.get_content_charset() or 'utf-8'
                payload = msg.get_payload(decode=True)
                if payload:
                    email_content['body'] = payload.decode(charset, errors='replace')
            except Exception as e:
                logging.error(f"Error decoding single part content: {str(e)}")

        # Clean up body content
        email_content['body'] = email_content['body'].strip()
        
        # Validate content
        if not email_content['body']:
            logging.warning(f"Email '{email_content['subject']}' has no body content")
            email_content['body'] = '[No Content]'

        logging.debug(f"Successfully parsed email: {email_content['subject']}")
        return email_content

    except Exception as e:
        logging.error(f"Error parsing email: {str(e)}")
        return None

    except Exception as e:
        logging.error(f"Error parsing email: {e}")
        return {'subject': 'Error', 'body': '', 'sender': 'Unknown', 'timestamp': 'Unknown'}  # Ensure to return the expected keys
