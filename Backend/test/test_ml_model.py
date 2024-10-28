import os
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, accuracy_score
import joblib

# Load the dataset
def load_data(filepath):
    return pd.read_csv('Enron.csv')

# Preprocess the dataset
def preprocess_data(data):
    # Assuming your dataset has 'body' for email content and 'label' for the target
    X = data['body']
    y = data['label']
    return X, y

# Train the model
def train_model(X_train, y_train):
    vectorizer = CountVectorizer()  
    X_train_vectorized = vectorizer.fit_transform(X_train)  

    model = RandomForestClassifier(n_estimators=100, random_state=42)  
    model.fit(X_train_vectorized, y_train)  

    return model, vectorizer

# Evaluate the model
def evaluate_model(model, vectorizer, X_test, y_test):
    X_test_vectorized = vectorizer.transform(X_test)  
    predictions = model.predict(X_test_vectorized)  

    print("Accuracy:", accuracy_score(y_test, predictions))  
    print(classification_report(y_test, predictions))  

# Save the model and vectorizer
def save_model(model, vectorizer, model_filename='model.joblib', vectorizer_filename='tfidf_vectorizer.joblib'):
    os.makedirs('model', exist_ok=True)
    
    model_path = os.path.join('model', model_filename)
    vectorizer_path = os.path.join('model', vectorizer_filename)

    joblib.dump(model, model_path)  
    joblib.dump(vectorizer, vectorizer_path)  
    print(f"Model and vectorizer saved successfully in the 'model' folder as '{model_filename}' and '{vectorizer_filename}'.")

if __name__ == "__main__":
    # Load and preprocess the data
    data = load_data('path/to/your/dataset.csv')  
    X, y = preprocess_data(data)

    # Split the dataset into training and testing sets
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    # Train the model
    model, vectorizer = train_model(X_train, y_train)

    # Evaluate the model
    evaluate_model(model, vectorizer, X_test, y_test)

    # Save the trained model and vectorizer
    save_model(model, vectorizer)
