import time
import logging
import email
from datetime import datetime, timezone, timedelta
from email.utils import parsedate_to_datetime
from database.mongodb import get_last_processed_time, update_last_processed_time
from mail_processor.fetcher import connect_to_mail, parse_email
from mail_processor.analyzer import process_email, should_process_email, get_processed_email_ids
from model.models import load_model

# Configure logging
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(levelname)s - %(message)s')

def fetch_and_analyze_emails(model, vectorizer):
    mail = connect_to_mail()
    if not mail:
        logging.error("Failed to connect to the mail server.")
        return

    # Retrieve last processed time from MongoDB, or default to 2 hours ago
    last_processed_time = get_last_processed_time() or (datetime.now(timezone.utc) - timedelta(hours=2))
    processed_email_ids = set(get_processed_email_ids())  # Use a set for faster lookups

    while True:
        try:
            now = datetime.now(timezone.utc)
            status, messages = mail.search(None, 'ALL')
            if status != 'OK':
                logging.error("Error searching emails.")
                break

            email_ids = messages[0].split()

            for email_id in email_ids:
                email_id_decoded = email_id.decode()
                if email_id_decoded in processed_email_ids:
                    logging.debug(f"Skipping already processed email ID {email_id_decoded}.")
                    continue  # Skip already processed emails
                
                # Fetch the raw email content
                status, msg_data = mail.fetch(email_id, '(RFC822)')
                if status != 'OK':
                    logging.error(f"Error fetching email {email_id_decoded}.")
                    continue
                
                raw_email = msg_data[0][1]
                received_time_str = email.message_from_bytes(raw_email)['Date']
                
                if received_time_str:
                    try:
                        # Convert the received time string to datetime
                        received_time = parsedate_to_datetime(received_time_str).astimezone(timezone.utc)
                        if should_process_email(received_time, last_processed_time):
                            email_content = parse_email(raw_email)
                            
                            # Log the email content for debugging
                            logging.debug(f"Email content for ID {email_id_decoded}: {email_content}")

                            # Check for expected keys in the parsed email content
                            if 'subject' not in email_content or 'body' not in email_content:
                                logging.error(f"Email content is missing required keys: {email_content}")
                                continue  # Skip this email
                            
                            # Process the email if keys are present
                            is_phishing = process_email(email_id_decoded, email_content, model, vectorizer)
                            if is_phishing is not None:
                                logging.info(f"Email {email_id_decoded} processed: {'Phishing' if is_phishing else 'Safe'}.")
                                # Add the processed email ID to the set
                                processed_email_ids.add(email_id_decoded)
                        else:
                            logging.debug(f"Skipping email {email_id_decoded} as it was received before the last processed time.")
                    except Exception as e:
                        logging.error(f"Error processing email {email_id_decoded}: {e}")

            # Update the last processed time after processing emails
            update_last_processed_time(now.isoformat())
            time.sleep(5)

        except KeyboardInterrupt:
            logging.info("Stopping email fetch...")
            break
        except Exception as e:
            logging.error(f"Error in main loop: {e}")
            mail.logout()
            mail = connect_to_mail()
            time.sleep(10)

if __name__ == "__main__":
    model, vectorizer = load_model()
    fetch_and_analyze_emails(model, vectorizer)
