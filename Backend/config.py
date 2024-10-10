import os

class Config:
    MAIL_SERVER = os.getenv('MAIL_SERVER', 'smtp.example.com')
    MAIL_USERNAME = os.getenv('MAIL_USERNAME', 'your_username')
    MAIL_PASSWORD = os.getenv('MAIL_PASSWORD', 'your_password')
    MONGO_URI = os.getenv('MONGODB_URI', 'mongodb://localhost:27017/yourdb')
    SECRET_KEY = os.getenv('SECRET_KEY', 'your_secret_key')