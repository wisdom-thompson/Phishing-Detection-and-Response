import joblib
import logging

def load_model():
    try:
        model = joblib.load('model/model.joblib')
        vectorizer = joblib.load('model/tfidf_vectorizer.joblib')
        logging.info("Model and vectorizer loaded successfully.")
        return model, vectorizer
    except Exception as e:
        logging.error(f"Error loading model: {e}")
        raise

def is_phishing_email(email_content, model, vectorizer):
    email_text = f"{email_content['subject']} {email_content['body']}"
    email_vector = vectorizer.transform([email_text])
    prediction = model.predict(email_vector)
    logging.debug(f"Email text: {email_text}")  
    logging.debug(f"Predicted class: {prediction[0]}")  
    
    return bool(prediction[0])
