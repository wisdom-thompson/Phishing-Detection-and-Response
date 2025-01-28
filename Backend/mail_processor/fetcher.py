import imaplib
from email import policy, utils
import email
import logging
from dateutil import parser
from typing import Optional
from ssl import SSLError, create_default_context
from config.mailserver import Config 
from datetime import datetime, timezone 

def connect_to_mail(username: str, password: str) -> Optional[imaplib.IMAP4_SSL]:
    """
    Connect to the appropriate mail server using SSL.
    """
    try:
        # Extract email domain dynamically
        domain = username.split("@")[-1].lower()
        logging.info(f"Extracted domain: {domain}")

        # Dynamically map IMAP servers based on domain
        imap_servers = {
            "gmail.com": ("imap.gmail.com", 993),
            "outlook.com": ("imap-mail.outlook.com", 993),
            "yahoo.com": ("imap.mail.yahoo.com", 993),
            "privateemail.com": ("mail.privateemail.com", 993)
        }
        
        mail_server, mail_port = imap_servers.get(domain, (Config.MAIL_SERVER, Config.MAIL_PORT))
        if not mail_server:
            raise Exception(f"No IMAP server found for domain: {domain}")

        logging.info(f"Attempting connection to server: {mail_server} on port: {mail_port}")

        # Create an SSL connection
        try:
            context = create_default_context()
            mail = imaplib.IMAP4_SSL(mail_server, mail_port, ssl_context=context)
            logging.info("SSL connection established successfully.")
        except SSLError as ssl_err:
            logging.error(f"SSL connection error: {ssl_err}")
            raise Exception("Unable to establish a secure connection.")

        # Attempt to log in with provided credentials
        try:
            mail.login(username, password)
            logging.info("Login successful.")
        except imaplib.IMAP4.error as login_err:
            logging.error(f"Authentication failed: {login_err}")
            raise Exception("Invalid email or password.")

        # Select the inbox folder
        try:
            mail.select("inbox")
            logging.info("Inbox selected successfully.")
        except imaplib.IMAP4.error as select_err:
            logging.error(f"Failed to select inbox: {select_err}")
            raise Exception("Unable to access the inbox.")

        return mail  # Return the mail connection object

    except Exception as e:
        logging.error(f"Error connecting to mail server: {e}")
        return None
    # Return None if any failure occurs

def parse_email(raw_email):
    """Parse raw email bytes to extract essential information."""
    try:
        # Parse the raw email using the default policy
        msg = email.message_from_bytes(raw_email, policy=policy.default)

        # Extract email fields
        email_content = {
            'email_id': msg['Message-ID'],
            'subject': msg['subject'],
            'sender': msg['from'],
            'body': '',
            'timestamp': '',
        }

        # Extract and parse the timestamp (if available)
        timestamp = msg.get('Date')
        if timestamp:
            try:
                try:
                    # First try parsing as ISO format
                    parsed_timestamp = datetime.fromisoformat(timestamp)
                except ValueError:
                    # Fallback to email.utils parsing
                    parsed_timestamp = email.utils.parsedate_to_datetime(timestamp)
                
                # Ensure timezone info
                if parsed_timestamp.tzinfo is None:
                    parsed_timestamp = parsed_timestamp.replace(tzinfo=timezone.utc)
                else:
                    parsed_timestamp = parsed_timestamp.astimezone(timezone.utc)
                email_content['timestamp'] = parsed_timestamp.isoformat()
            except Exception as e:
                try:
                    # Fallback to dateutil parser if email.utils fails
                    parsed_timestamp = parser.parse(timestamp)
                    if parsed_timestamp.tzinfo is None:
                        parsed_timestamp = parsed_timestamp.replace(tzinfo=timezone.utc)
                    else:
                        parsed_timestamp = parsed_timestamp.astimezone(timezone.utc)
                    email_content['timestamp'] = parsed_timestamp.isoformat()
                except Exception as e:
                    logging.warning(f"Error parsing timestamp: {timestamp}. Error: {e}")
                    # Use current UTC time as fallback
                    email_content['timestamp'] = datetime.now(timezone.utc).isoformat()
        else:
            logging.warning(f"Email {email_content['subject']} has no timestamp.")

        # Handle multipart emails
        if msg.is_multipart():
            for part in msg.walk():
                content_disposition = str(part.get("Content-Disposition"))
                if 'attachment' not in content_disposition:
                    body_part = part.get_payload(decode=True)
                    if body_part:
                        email_content['body'] += body_part.decode(
                            part.get_content_charset() or 'utf-8', errors='ignore'
                        ) + '\n'
        else:
            # Handle single-part emails
            body_part = msg.get_payload(decode=True)
            if body_part:
                email_content['body'] += body_part.decode(
                    msg.get_content_charset() or 'utf-8', errors='ignore'
                )

        # Log a warning if the body is still empty
        if not email_content['body'].strip():
            logging.warning(f"Email {email_content['subject']} has no body content.")

        # Debug log to check parsed email content
        logging.debug(f"Parsed email content: {email_content}")
        return email_content

    except Exception as e:
        logging.error(f"Error parsing email: {e}")
        return {'subject': 'Error', 'body': '', 'sender': 'Unknown', 'timestamp': 'Unknown'}
