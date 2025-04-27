from flask import Flask, request, jsonify
from transformers import AutoModelForCausalLM, AutoTokenizer
from PIL import Image
import os
from langchain_google_genai import ChatGoogleGenerativeAI
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize Gemini model
llm = ChatGoogleGenerativeAI(
    model="gemini-1.5-pro",
    temperature=0,
    max_tokens=None,
    timeout=None,
    max_retries=2,
)

def get_disaster_prompt():
    return (
        "You are an expert in disaster assessment. You will receive AI-generated descriptions of images depicting natural disasters. "
        "Your task is to classify the disaster's severity based solely on the provided description. "
        "Categorize the disaster as either **'severe disaster'** or **'moderate disaster'** based on the following criteria:\n\n"
        "**Severe Disaster:** Involves large-scale destruction, significant infrastructure damage, numerous casualties, or catastrophic impact (e.g., major earthquakes, hurricanes, massive floods, widespread wildfires, or landslides burying towns).\n\n"
        "**Moderate Disaster:** Involves localized damage, fewer casualties, and manageable destruction (e.g., minor floods, small-scale landslides, moderate storms, or controlled wildfires with limited spread).\n\n"
        "If the description does not correspond to a natural disaster, return exactly: **'Not a Natural Disaster'**.\n"
        "Do not provide explanations, probabilities, or any additional text—respond strictly with **'severe disaster'**, **'moderate disaster'**, or **'Not a Natural Disaster'**."
    )

def handle_gemini_call(description):
    system_message = get_disaster_prompt()
    
    messages = [
        ("system", system_message),
        ("human", f"Classify the following AI-generated disaster description as either 'severe disaster' or 'moderate disaster': {description}"),
    ]

    ai_msg = llm.invoke(messages)
    return ai_msg.content

# Initialize Flask app
app = Flask(__name__)

# =================== Directly Load Model from Hugging Face ===================

model = AutoModelForCausalLM.from_pretrained(
    "vikhyatk/moondream2",
    revision="2025-04-14",
    trust_remote_code=True,
    # device_map={"": "cuda"}  # Uncomment if you want to use GPU
)

# (Optional) Load tokenizer if needed (not used in this code, but for completeness)
tokenizer = AutoTokenizer.from_pretrained(
    "vikhyatk/moondream2",
    revision="2025-04-14",
)

# ==============================================================================

# Routes
@app.route('/process-image', methods=['POST'])
def process_image():
    if 'image' not in request.files:
        print("Image not found in request")
        return jsonify({'error': 'No image provided'}), 400

    image = Image.open(request.files['image'])
    
    try:
        # Generate image description using the model
        description = model.caption(image, length="normal")["caption"]

        # Call Gemini to predict severity
        severity = handle_gemini_call(description)

        return jsonify({
            'description': description,
            'severity': severity
        })
    except Exception as e:
        print(f"Error processing image: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/gemini-predict', methods=['POST'])
def gemini_predict():
    data = request.get_json()
    if not data or 'description' not in data:
        return jsonify({'error': 'No description provided'}), 400

    try:
        description = data['description']
        severity = handle_gemini_call(description)
        return jsonify({'severity': severity})
    except Exception as e:
        print(f"Error predicting severity: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
