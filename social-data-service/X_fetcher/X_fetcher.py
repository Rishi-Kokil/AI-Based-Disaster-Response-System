import tweepy
import time
import json
import os
from datetime import datetime
from dotenv import load_dotenv
from celery import Celery
from kombu import Connection, Exchange, Queue, Producer
from X_token_manager import TokenManager, load_tokens_from_env
import logging

# Logging configuration
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler("pipeline.log"),  # Logs to a file
        logging.StreamHandler()  # Logs to console
    ]
)

# Load environment variables
load_dotenv()

# Celery Worker setup
app = Celery('twitter_worker',
             broker='amqp://guest:guest@rabbitmq:5672//',
             backend='rpc://')

# RabbitMQ setup
RABBITMQ_HOST = os.getenv("RABBITMQ_HOST", "rabbitmq")
EXCHANGE_NAME = "disaster_data"
EXCHANGE_TYPE = "topic"

# Define RabbitMQ exchange and queues
disaster_exchange = Exchange(EXCHANGE_NAME, type=EXCHANGE_TYPE, durable=True)
raw_tweet_queue = Queue('tweet.raw', exchange=disaster_exchange, routing_key='tweet.raw', durable=True)
media_queue = Queue('tweet.media', exchange=disaster_exchange, routing_key='tweet.media', durable=True)
comment_queue = Queue('tweet.comment', exchange=disaster_exchange, routing_key='tweet.comment', durable=True)

logging.info(f"Environment Variables Pulled Successfully - {RABBITMQ_HOST}")

# Load tokens and initialize token manager
tokens = load_tokens_from_env()
token_manager = TokenManager(tokens)


@app.task(name="fetch_disaster_tweets")
def fetch_disaster_tweets():
    """
    Fetch disaster-related tweets from Twitter API and publish them to RabbitMQ queues.
    """
    # Initialize Kombu connection and producer
    with Connection(f'amqp://guest:guest@{RABBITMQ_HOST}:5672//') as conn:
        producer = Producer(conn)

        current_token = token_manager.get_current_token()
        keywords = [
            "earthquake", "shake", "seismic", "tremor", "flood", "water", "rain", "submerge",
            "deluge", "storm", "thunderstorm", "hurricane", "tornado", "twister", "fire",
            "wildfire", "blaze", "flames", "explosion", "crash", "accident", "shooting",
            "violence", "bomb", "building collapse"
        ]
        exclude_usernames = ["NDRFHQ", "04NDRF"]
        keywords_query = " OR ".join(keywords)
        exclude_query = " ".join([f"-from:{user}" for user in exclude_usernames])
        query = f"({keywords_query}) -is:retweet -is:reply {exclude_query}"
        tweet_fields = ["id", "author_id", "created_at", "text", "public_metrics", "conversation_id"]
        expansions = ["author_id", "attachments.media_keys"]
        media_fields = ["url", "preview_image_url", "type"]
        user_fields = ["location", "username"]

        try:
            # Attempt to fetch tweets from the Twitter API
            client = tweepy.Client(bearer_token=current_token)
            response = client.search_recent_tweets(
                query=query,
                max_results=100,
                tweet_fields=tweet_fields,
                user_fields=user_fields,
                expansions=expansions,
                media_fields=media_fields
            )

            if not response.data:
                logging.info("No tweets found from the Twitter API.")
                return

            # Process the API response
            tweets, media, comments = process_response(response)

            # Publish tweets, media, and comments to respective queues
            for tweet in tweets:
                producer.publish(tweet, exchange=disaster_exchange, routing_key='tweet.raw', declare=[raw_tweet_queue])

            for media_item in media:
                producer.publish(media_item, exchange=disaster_exchange, routing_key='tweet.media', declare=[media_queue])

            for comment in comments:
                producer.publish(comment, exchange=disaster_exchange, routing_key='tweet.comment', declare=[comment_queue])

            logging.info(f"Published {len(tweets)} tweets, {len(media)} media items, and {len(comments)} comments.")

        except Exception as e:
            logging.error(f"Error fetching tweets from the Twitter API: {str(e)}")

            # Fallback to dummy data
            try:
                logging.info("Fetching dummy data from dump.txt as a fallback...")
                tweets = []
                media = []
                comments = []

                with open("dump.txt", "r") as file:
                    for line in file:
                        # Parse each line as a JSON object
                        data = json.loads(line.strip())

                        # Categorize the data based on its structure
                        if "id" in data and "text" in data:  # Likely a tweet
                            tweets.append(data)
                        elif "media_key" in data:  # Likely media
                            media.append(data)
                        elif "tweet_id" in data:  # Likely a comment
                            comments.append(data)

                # Publish tweets, media, and comments to respective queues
                for tweet in tweets:
                    producer.publish(tweet, exchange=disaster_exchange, routing_key='tweet.raw', declare=[raw_tweet_queue])

                for media_item in media:
                    producer.publish(media_item, exchange=disaster_exchange, routing_key='tweet.media', declare=[media_queue])

                for comment in comments:
                    producer.publish(comment, exchange=disaster_exchange, routing_key='tweet.comment', declare=[comment_queue])

                logging.info(f"Published {len(tweets)} tweets, {len(media)} media items, and {len(comments)} comments from dummy data.")

            except Exception as fallback_error:
                logging.error(f"Error processing dummy data: {str(fallback_error)}")
                raise fallback_error  # Re-raise the error to trigger Celery retry


def process_response(response):
    """
    Process the Twitter API response and extract tweets, media, and comments.
    """
    tweets_data = []
    media_data = []
    comments_data = []

    if not response.data:
        return tweets_data, media_data, comments_data

    tweets = response.data
    users = {user.id: user for user in response.includes.get("users", [])}
    media_dict = {media.media_key: media for media in response.includes.get("media", [])}

    for tweet in tweets:
        # Process main tweet data
        user = users.get(tweet.author_id)
        tweet_data = {
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "username": user.username if user else "Unknown",
            "post_id": str(tweet.id),
            "conversation_id": str(tweet.conversation_id),
            "post_body": tweet.text,
            "date": tweet.created_at.strftime("%Y-%m-%d"),
            "likes": tweet.public_metrics.get("like_count", 0),
            "retweets": tweet.public_metrics.get("retweet_count", 0),
            "location": user.location if user and user.location else "Unknown",
            "url": f"https://twitter.com/{tweet.author_id}/status/{tweet.id}"
        }
        tweets_data.append(tweet_data)

        # Process media attachments only
        if hasattr(tweet, "attachments"):
            media_keys = tweet.attachments.media_keys if tweet.attachments else []
            for idx, media_key in enumerate(media_keys, 1):
                media = media_dict.get(media_key)
                if media:
                    media_info = {
                        "tweet_id": str(tweet.id),
                        "media_counter": idx,
                        "media_url": media.url or media.preview_image_url,
                        "media_type": media.type
                    }
                    media_data.append(media_info)

    return tweets_data, media_data, comments_data