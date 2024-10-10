import logging
from flask import Flask
from app.routes import init_routes  # Ensure this import is correct
from app.utils import load_model, is_phishing_email, fetch_and_analyze_emails, save_email_to_db  # Corrected the import here
from dotenv import load_dotenv
import os

load_dotenv()  # Load environment variables

# Configure Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_app():
    app = Flask(__name__)

    # Load configurations
    app.config.from_object('config.Config')

    # Initialize routes
    init_routes(app)

    # Load model and vectorizer
    try:
        model, vectorizer = load_model()
        app.config['MODEL'] = model
        app.config['VECTORIZER'] = vectorizer
        logger.info("Model and vectorizer loaded successfully.")
    except Exception as e:
        logger.error(f"Failed to load model/vectorizer: {e}")
        raise

    return app

app = create_app()

if __name__ == "__main__":
    # Example: Fetch and process emails
    try:
        emails = fetch_and_analyze_emails()  # Corrected this function call
        logger.info("Emails processed and saved to the database.")
    except Exception as e:
        logger.error(f"Error processing emails: {e}")

    app.run(host="0.0.0.0", port=5000)
