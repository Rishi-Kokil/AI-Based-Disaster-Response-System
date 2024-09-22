from dotenv import load_dotenv
import os
from pathlib import Path
import requests
import json

# Locate the .env file and load env
env_path = Path(__file__).resolve().parents[3] / ".env"
load_dotenv(dotenv_path=env_path)

# Accessing Environment Variables
API_KEY_X = os.getenv("API_KEY_X")
API_KEY_SECRET_X = os.getenv("API_KEY_SECRET_X")  
BEARER_TOKEN_X = os.getenv("BEARER_TOKEN_X")
ACCESS_TOKEN_X = os.getenv("ACCESS_TOKEN_X")
ACCESS_TOKEN_SECRET_X = os.getenv("ACCESS_TOKEN_SECRET_X")

SEARCH_URL = "https://api.twitter.com/2/spaces/search"


# Utility Functions
def create_headers(bearer_token):
    headers = {
        "Authorization": "Bearer {}".format(bearer_token),
        "User-Agent": "v2SpacesSearchPython"
    }
    return headers

def connect_to_endpoint(url, headers, params):
    response = requests.request("GET", url, headers=headers, params=params)
    print(response.status_code)
    if response.status_code != 200:
        raise Exception(response.status_code, response.text)
    return response.json()


# Searching Tweets using Text
search_term = 'NBA'

# Optional params: host_ids,conversation_controls,created_at,creator_id,id,invited_user_ids,is_ticketed,lang,media_key,
# participants,scheduled_start,speaker_ids,started_at,state,title,updated_at

query_params = {'query': search_term, 'space.fields': 'title, created_at', 'expansions': 'creator_id'}


def main():
    headers = create_headers(BEARER_TOKEN_X)
    json_response = connect_to_endpoint(SEARCH_URL, headers, query_params)
    print(json.dumps(json_response, indent=4, sort_keys=True))


if __name__ == "__main__":
    main()

