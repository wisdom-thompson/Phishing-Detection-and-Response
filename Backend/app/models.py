import pickle
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression

def train_and_save_model(training_data, labels):
    """Train an ML model and save it to disk."""
    vectorizer = TfidfVectorizer()
    X = vectorizer.fit_transform(training_data)

    model = LogisticRegression()
    model.fit(X, labels)

    # Save model and vectorizer to disk
    with open('models/model.pkl', 'wb') as model_file:
        pickle.dump(model, model_file)
    with open('models/tfidf_vectorizer.pkl', 'wb') as vectorizer_file:
        pickle.dump(vectorizer, vectorizer_file)

    return model, vectorizer

def load_model():
    """Load pre-trained model and vectorizer."""
    with open('models/model.pkl', 'rb') as model_file:
        model = pickle.load(model_file)
    with open('models/tfidf_vectorizer.pkl', 'rb') as vectorizer_file:
        vectorizer = pickle.load(vectorizer_file)
    
    return model, vectorizer
