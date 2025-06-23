from flask import Flask
from flask_cors import CORS
from api.routes import routes_bp
import logging
from dotenv import load_dotenv
import os

load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('app.log')
    ]
)

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

app.config['SECRET_KEY'] = os.getenv('SECRET_KEY')

# Check if SECRET_KEY is missing
if not app.config['SECRET_KEY']:
    raise ValueError("SECRET_KEY is not set in the environment file.")

logging.basicConfig(level=logging.INFO)


app.register_blueprint(routes_bp)

if __name__ == "__main__":
    app.run(debug=True)
