import os
import time
from threading import Lock
from dotenv import load_dotenv

load_dotenv()

class TokenManager:
    def __init__(self, tokens):
        if not tokens:
            raise ValueError("At least one bearer token is required")
        
        self.tokens = [{
            "value": token,
            "reset_time": None,
            "remaining": None
        } for token in tokens]
        
        self.current_index = 0
        self.lock = Lock()

    def get_current_token(self):
        with self.lock:
            return self.tokens[self.current_index]["value"]

    def handle_rate_limit(self, reset_timestamp):
        with self.lock:
            self.tokens[self.current_index]["reset_time"] = reset_timestamp
            original_index = self.current_index

        # Check tokens without holding the lock during sleep
        while True:
            with self.lock:
                self.current_index = (self.current_index + 1) % len(self.tokens)
                token = self.tokens[self.current_index]
                if token["reset_time"] is None or token["reset_time"] <= time.time():
                    return
                if self.current_index == original_index:
                    max_wait = max(t["reset_time"] for t in self.tokens) - time.time()
                    break

        if max_wait > 0:
            time.sleep(max_wait) 

def load_tokens_from_env():
    token_string = os.getenv("BEARER_TOKEN", "")
    return [t.strip() for t in token_string.split(",") if t.strip()]