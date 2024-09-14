from dotenv import load_dotenv
import os
from pathlib import Path
import requests
import json

import tweepy
import pandas as pd

# Locate the .env file by navigating up the directory structure
env_path = Path(__file__).resolve().parents[3] / ".env"
print(env_path)

# Load the .env file
load_dotenv(dotenv_path=env_path)

# Accessing Environment Variables
API_KEY_X =  os.getenv("API_KEY_X")
API_KEY_SECRET_X = os.getenv("API_KEY_SECRET_X")  
BEARER_TOKEN_X = os.getenv("BEARER_TOKEN_X")
ACCESS_TOKEN_X = os.getenv("ACCESS_TOKEN_X")
ACCESS_TOKEN_SECRET_X = os.getenv("ACCESS_TOKEN_SECRET_X")

print(BEARER_TOKEN_X)

# # Twitter(X) API Authentication
# auth = tweepy.OAuth1UserHandler(
#     API_KEY_X, API_KEY_SECRET_X,
#     ACCESS_TOKEN_X, ACCESS_TOKEN_SECRET_X
# )

# # Instatiating the Tweepy API
# api = tweepy.API(auth, wait_on_rate_limit = True)

# search_query = "Earthquake"
# no_of_tweets = 1

# try :
#     tweets = api.search_tweets(q = search_query, lang = "en", count = no_of_tweets, tweet_mode = 'extended')

#     # Pulling some attributes from the tweet
#     attributes_container = [
#         [tweet.user.name, tweet.created_at, tweet.favourite_count, tweet.source, tweet.full_text] for tweet in tweets
#     ]

#     columns = ["User", "Date Created", "Number of Likes", "Source of Tweets", "Tweet"]

#     # Creating DataFrame
#     tweets_df = pd.DataFrame(attributes_container, columns=columns)
#     print(tweets_df)

# except BaseException as e:
#     print("Status Failed On ", str(e))



# Funtions
def create_url():
    tweet_fields = "tweet.fields=lang,author_id"
    # Tweet fields are adjustable.
    # Options include:
    # attachments, author_id, context_annotations,
    # conversation_id, created_at, entities, geo, id,
    # in_reply_to_user_id, lang, non_public_metrics, organic_metrics,
    # possibly_sensitive, promoted_metrics, public_metrics, referenced_tweets,
    # source, text, and withheld
    ids = "ids=1278747501642657792,1255542774432063488"
    # You can adjust ids to include a single Tweets.
    # Or you can add to up to 100 comma-separated IDs
    url = "https://api.twitter.com/2/tweets?{}&{}".format(ids, tweet_fields)
    return url

def bearer_oauth(r):
    """
    Method required by bearer token authentication.
    """

    r.headers["Authorization"] = f"Bearer {BEARER_TOKEN_X}"
    r.headers["User-Agent"] = "v2TweetLookupPython"
    return r

def connect_to_endpoint(url):
    response = requests.request("GET", url, auth=bearer_oauth)
    print(response.status_code)
    if response.status_code != 200:
        raise Exception(
            "Request returned an error: {} {}".format(
                response.status_code, response.text
            )
        )
    return response.json()

def main():
    url = create_url()
    print(url)
    json_response = connect_to_endpoint(url)
    print(json.dumps(json_response, indent=4, sort_keys=True))


if __name__ == "__main__":
    main()
