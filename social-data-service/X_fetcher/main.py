from flask import Flask, request, jsonify
from flask_cors import CORS  # Import CORS
from celery.result import AsyncResult
from X_fetcher import fetch_disaster_tweets
import os
import logging
import traceback

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Setup Logging
LOG_FILE = "pipeline.log"
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler(LOG_FILE),
        logging.StreamHandler()
    ]
)

def log_exception(e):
    """Logs exceptions with traceback."""
    logging.error(f"Exception: {str(e)}")
    logging.error(traceback.format_exc())

@app.route('/trigger', methods=['POST'])
def trigger_pipeline():
    """Triggers the Celery task for fetching disaster tweets."""
    logging.info("Received request to trigger the disaster tweet pipeline.")

    try:
        task = fetch_disaster_tweets.delay()
        logging.info(f"Task {task.id} started successfully.")

        return jsonify({
            "message": "Pipeline started successfully",
            "task_id": task.id,
            "status_endpoint": f"/task-status/{task.id}"
        }), 202

    except Exception as e:
        log_exception(e)
        return jsonify({"error": "Failed to start pipeline", "details": str(e)}), 500

@app.route('/task-status/<task_id>', methods=['GET'])
def get_task_status(task_id):
    """Fetches the status of a given Celery task."""
    logging.info(f"Checking status for task {task_id}")

    try:
        task = AsyncResult(task_id)
        response = {
            "task_id": task.id,
            "status": task.status,
            "result": task.result if task.ready() else None
        }
        logging.info(f"Task {task_id} status: {task.status}")

        return jsonify(response)

    except Exception as e:
        log_exception(e)
        return jsonify({"error": "Failed to fetch task status", "details": str(e)}), 500

@app.route('/health', methods=['GET'])
def health_check():
    """Checks the health status of the Flask service."""
    logging.info("Performing health check on Flask service.")

    try:
        # In production, replace with actual service checks
        response = {
            "status": "healthy",
            "services": {
                "message_queue": "connected",
                "twitter_api": "connected"
            }
        }
        logging.info("Health check passed.")

        return jsonify(response)

    except Exception as e:
        log_exception(e)
        return jsonify({"error": "Health check failed", "details": str(e)}), 500

@app.errorhandler(404)
def not_found_error(error):
    """Handles 404 errors."""
    logging.warning(f"404 Error: {request.path} not found")
    return jsonify({"error": "Endpoint not found"}), 404

@app.errorhandler(500)
def internal_server_error(error):
    """Handles 500 errors."""
    logging.error(f"500 Error: {str(error)}")
    return jsonify({"error": "Internal Server Error"}), 500

if __name__ == '__main__':
    try:
        port = int(os.getenv("FLASK_PORT", 5000))
        debug = os.getenv("FLASK_DEBUG", "false").lower() == "true"

        logging.info(f"Starting Flask server on port {port}, debug={debug}")
        app.run(host='0.0.0.0', port=port, debug=debug)

    except Exception as e:
        log_exception(e)
        raise  # Raise exception to prevent silent failure
