from kombu import Queue, Exchange
import re
import spacy
from celery import Celery
from textblob import TextBlob
import logging

# Initialize NLP models
nlp = spacy.load("en_core_web_sm")
logger = logging.getLogger(__name__)

app = Celery(
    'preprocessing_worker',
    broker='pyamqp://guest@rabbitmq//',
    backend='rpc://'
)

# Configure Queues and Exchanges
app.conf.task_queues = [
    # Main Queue for Raw Tweets
    Queue('tweet.raw',
          exchange=Exchange('disaster_data', type='topic'),  # Match producer's exchange
          routing_key='tweet.raw',
          queue_arguments={
              'x-dead-letter-exchange': 'dlx_exchange',  # Exchange for Handling Dead Letters
              'x-dead-letter-routing-key': 'tweet.raw.dlq',  # Queue for Dead Letters
              'x-message-ttl': 86400000  # 1 Day in milliseconds for all DL messages
          }),
    # Dead Letter Queue for Raw Tweets
    Queue('tweet.raw.dlq',
          exchange=Exchange('dlx_exchange', type='direct'),
          routing_key='tweet.raw.dlq'),
    # Queue for Processed Tweets (to be consumed by LLM Microservice)
    Queue('tweet.processed',
          exchange=Exchange('llm_exchange', type='direct'),  # Exchange for LLM Microservice
          routing_key='tweet.processed')
]

# Default Exchange and Routing Key
app.conf.task_default_exchange = 'disaster_data'  # Match producer's exchange
app.conf.task_default_routing_key = 'tweet.raw'

# Retry Policy and DLQ Settings
app.conf.task_acks_late = True
app.conf.task_reject_on_worker_lost = True
app.conf.worker_prefetch_multiplier = 1  # Process one at a time for safety

# Regex patterns for PII detection
PII_PATTERNS = {
    'email': r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
    'phone': r'\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b',
    'credit_card': r'\b(?:\d[ -]*?){13,16}\b'
}

@app.task(
    name='preprocess_tweet',
    autoretry_for=(Exception,),
    retry_kwargs={'max_retries': 3, 'countdown': 30},
    retry_backoff=True,
    retry_jitter=True
)
def preprocess_tweet(tweet_data):
    try:
        logger.info(f"Processing tweet {tweet_data['post_id']}")

        # Remove PII from post body
        original_text = tweet_data['post_body']
        cleaned_text = clean_text(original_text)
        anonymized_text = remove_pii(cleaned_text)

        # Spelling correction
        blob = TextBlob(anonymized_text)
        spelling_correction_output = str(blob.correct())

        # Create processed payload
        processed_tweet = {
            **tweet_data,
            "post_body": anonymized_text,
            "spelling_correction_output": spelling_correction_output,
            "original_text": original_text,
            "processing_status": "success"
        }

        # Redact location
        processed_tweet['location'] = "REDACTED" if tweet_data.get('location') else None

        logger.info(f"Processed tweet {tweet_data['post_id']}")

        # Publish the processed tweet to the LLM microservice queue
        send_to_llm_microservice(processed_tweet)

        return processed_tweet

    except Exception as e:
        logger.error(f"Permanent failure for tweet {tweet_data['post_id']}: {str(e)}")
        raise e  # Will be moved to DLQ after retries


def send_to_llm_microservice(processed_tweet):
    """
    Publish the processed tweet to the LLM microservice queue.
    """
    # Use the configured exchange and routing key for the LLM microservice
    llm_exchange = Exchange('llm_exchange', type='direct')
    llm_queue = Queue('tweet.processed', exchange=llm_exchange, routing_key='tweet.processed')

    # Publish the message to the LLM queue
    with app.producer_or_acquire() as producer:
        producer.publish(
            processed_tweet,
            exchange=llm_exchange,
            routing_key='tweet.processed',
            declare=[llm_queue],  # Ensure the queue is declared before publishing
            serializer='json'
        )
        logger.info(f"Published processed tweet {processed_tweet['post_id']} to LLM microservice")


def remove_pii(text):
    """Remove Personally Identifiable Information from text"""
    for pattern_type, pattern in PII_PATTERNS.items():
        text = re.sub(pattern, f'[{pattern_type.upper()}_REMOVED]', text)

    doc = nlp(text)
    for ent in doc.ents:
        if ent.label_ in ['PERSON', 'GPE', 'LOC']:
            text = text.replace(ent.text, f'[{ent.label_}_REMOVED]')

    return text


def clean_text(text):
    """Basic text cleaning"""
    text = re.sub(r'http\S+|www\S+|https\S+', '', text, flags=re.MULTILINE)
    text = re.sub(r'[^a-zA-Z0-9\s.,!?]', '', text)
    text = text.lower()
    text = ' '.join(text.split())
    return text