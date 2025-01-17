from flask import Flask
from flask_cors import CORS
from api.routes import routes_bp
import logging

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

app.register_blueprint(routes_bp)

if __name__ == "__main__":
    app.run(debug=True) 
    
