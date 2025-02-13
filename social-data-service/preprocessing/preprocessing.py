import re
import spacy
from celery import Celery
from textblob import TextBlob  # For spelling correction (optional)
import logging

# Initialize NLP models
nlp = spacy.load("en_core_web_sm")
logger = logging.getLogger(__name__)

app = Celery(
    'preprocessing_worker',
    broker='pyamqp://guest@rabbitmq//',
    backend='rpc://'
)

# Configure queue routing
app.conf.task_routes = {
    'preprocessing_worker.preprocess_tweet': {'queue': 'tweet.raw'}
}

# Regex patterns for PII detection
PII_PATTERNS = {
    'email': r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
    'phone': r'\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b',
    'credit_card': r'\b(?:\d[ -]*?){13,16}\b'
}

def remove_pii(text):
    """Remove Personally Identifiable Information from text"""
    # Remove patterns
    for pattern_type, pattern in PII_PATTERNS.items():
        text = re.sub(pattern, f'[{pattern_type.upper()}_REMOVED]', text)
    
    # Remove names and entities using spaCy
    doc = nlp(text)
    for ent in doc.ents:
        if ent.label_ in ['PERSON', 'GPE', 'LOC']:
            text = text.replace(ent.text, f'[{ent.label_}_REMOVED]')
    
    return text

def clean_text(text):
    """Basic text cleaning"""
    # Remove URLs
    text = re.sub(r'http\S+|www\S+|https\S+', '', text, flags=re.MULTILINE)
    # Remove special characters except basic punctuation
    text = re.sub(r'[^a-zA-Z0-9\s.,!?]', '', text)
    # Convert to lowercase
    text = text.lower()
    # Remove extra whitespace
    text = ' '.join(text.split())
    return text

@app.task(name='preprocess_tweet')
def preprocess_tweet(tweet_data):
    """Celery task to preprocess tweets"""
    try:
        logger.info(f"Processing tweet {tweet_data['post_id']}")
        
        # Remove PII from post body
        original_text = tweet_data['post_body']
        cleaned_text = clean_text(original_text)
        anonymized_text = remove_pii(cleaned_text)
        
        # Optional: Spelling correction
        blob = TextBlob(anonymized_text)
        spelling_correction_output = str(blob.correct())
        
        # Create processed payload
        processed_tweet = {
            **tweet_data,
            "post_body": anonymized_text,
            "spelling_correction_output" : spelling_correction_output, 
            "original_text": original_text,  # Optional: Keep original for audit
            "processing_status": "success"
        }
        
        # Remove location if present in original data
        processed_tweet['location'] = "REDACTED" if tweet_data.get('location') else None
        
        logger.info(f"Processed tweet {tweet_data['post_id']}")
        return processed_tweet
    
    except Exception as e:
        logger.error(f"Error processing tweet {tweet_data['post_id']}: {str(e)}")
        return {
            **tweet_data,
            "processing_status": "failed",
            "error": str(e)
        }