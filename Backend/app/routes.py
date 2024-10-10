from flask import Blueprint, jsonify

routes_bp = Blueprint('routes', __name__)

def init_routes(app):
    app.register_blueprint(routes_bp)

@routes_bp.route('/')
def index():
    return jsonify({"message": "Welcome to Phishing Detection API!"})

@routes_bp.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "Healthy"}), 200
