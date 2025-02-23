from kombu import Queue, Exchange
from celery import Celery
import logging
from transformers import AutoTokenizer, AutoModelForCausalLM
import torch
import os

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Celery app for the LLM microservice
app = Celery(
    'llm_microservice',
    broker='pyamqp://guest@rabbitmq//',  # RabbitMQ broker URL
    backend='rpc://'  # Optional: Use if you need result storage
)

# Configure Queues and Exchanges
app.conf.task_queues = [
    Queue('tweet.processed',
          exchange=Exchange('llm_exchange', type='direct'),  # Exchange for LLM Microservice
          routing_key='tweet.processed')
]

# Default Exchange and Routing Key
app.conf.task_default_exchange = 'llm_exchange'
app.conf.task_default_routing_key = 'tweet.processed'

@app.task(name='process_llm_task')
def process_llm_task(processed_tweet):
    """
    Task to process tweets received from the preprocessing worker.
    For now, log the received data to the console.
    """
    try:
        logger.info("Received processed tweet:")
        logger.info(f"Post ID: {processed_tweet.get('post_id')}")
        logger.info(f"Original Text: {processed_tweet.get('original_text')}")
        logger.info(f"Processed Text: {processed_tweet.get('post_body')}")
        logger.info(f"Spelling Correction Output: {processed_tweet.get('spelling_correction_output')}")
        logger.info(f"Location: {processed_tweet.get('location')}")
        logger.info(f"Processing Status: {processed_tweet.get('processing_status')}")
    except Exception as e:
        logger.error(f"Error processing tweet: {str(e)}")
        raise e

if __name__ == '__main__':
    # Start the Celery worker for the LLM microservice
    logger.info("Starting LLM microservice worker...")
    app.worker_main(argv=['worker', '--loglevel=info'])