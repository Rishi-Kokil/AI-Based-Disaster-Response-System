import tweepy
import time
import json
import os
from datetime import datetime
from dotenv import load_dotenv
from celery import Celery
import pika
from X_token_manager import TokenManager, load_tokens_from_env

import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler("pipeline.log"),  # Logs to a file
        logging.StreamHandler()  # Logs to console
    ]
)

load_dotenv()

# Celery Worker setup
app = Celery('twitter_worker',
             broker='amqp://guest:guest@rabbitmq:5672//',
             backend='rpc://')

# RabbitMQ setup
RABBITMQ_HOST = os.getenv("RABBITMQ_HOST", "rabbitmq") 
EXCHANGE_NAME = "disaster_data"
EXCHANGE_TYPE = "topic" 


logging.info(f" Environement Variables Pulled Successfully - {RABBITMQ_HOST}")


tokens = load_tokens_from_env()
token_manager = TokenManager(tokens)

class RabbitMQProducer:
    def __init__(self):
        self.connection = pika.BlockingConnection(
            pika.ConnectionParameters(host=RABBITMQ_HOST)
        )
        self.channel = self.connection.channel()
        self.channel.exchange_declare(
            exchange=EXCHANGE_NAME,
            exchange_type=EXCHANGE_TYPE,
            durable=True
        )
        
    def publish(self, routing_key, data):
        self.channel.basic_publish(
            exchange=EXCHANGE_NAME,
            routing_key=routing_key,
            body=json.dumps(data),
            properties=pika.BasicProperties(
                delivery_mode=2
            )
        )
        
    def close(self):
        self.connection.close()

@app.task(name="fetch_disaster_tweets")
def fetch_disaster_tweets():
    producer = RabbitMQProducer()
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
            print("No tweets found.")
            return
        
        tweets, media, comments = process_response(response)

        for tweet in tweets:
            producer.publish("tweet.raw", tweet)    
        for media_item in media:
            producer.publish("tweet.media", media_item)
        for comment in comments:
            producer.publish("tweet.comment", comment)
            
    except tweepy.errors.TooManyRequests as e:
        print(f"Rate limit hit on token {current_token}")
        reset_time = int(e.response.headers.get("x-rate-limit-reset", time.time() + 900))
        token_manager.handle_rate_limit(reset_time)
        fetch_disaster_tweets.retry(countdown=reset_time - time.time() + 10)
    except Exception as e:
        print(f"Error fetching tweets: {str(e)}")
        fetch_disaster_tweets.retry(countdown=60)
    finally:
        producer.close()

def process_response(response):
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