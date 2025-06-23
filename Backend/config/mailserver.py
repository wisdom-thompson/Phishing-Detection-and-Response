# config/config.py
import os
from dotenv import load_dotenv
import logging

load_dotenv()


class Config:
    MAIL_SERVER = "mail.privateemail.com"
    MAIL_PORT = 993  # IMAP SSL port
    MAIL_USE_SSL = True
    MAIL_USE_TLS = False

    # Load MongoDB URI with debugging
    MONGODB_URI = os.getenv(
        'MONGODB_URI', 'mongodb://localhost:27017/phishing-detection')
    logging.info(f"Loaded MONGODB_URI: {MONGODB_URI}")

    # Debug settings
    DEBUG = True
    LOGGING_LEVEL = logging.DEBUG
