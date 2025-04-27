# from flask import Flask, request, jsonify, send_from_directory
# import os
# import numpy as np
# import torch
# import tifffile
# import segmentation_models_pytorch as smp
# from skimage.util import view_as_windows
# import cv2
# import base64
# import rasterio
# from io import BytesIO
# import matplotlib.pyplot as plt
# import uuid

# # Initialize Flask app
# app = Flask(__name__)
# app.config['UPLOAD_FOLDER'] = 'uploads/'
# app.config['OUTPUT_FOLDER'] = 'output/'
# app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB limit

# # Global model instance
# flood_model = None
# device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

# # --------------------- Core Processing Functions ---------------------
# def s1_to_rgb(vv, vh):
#     """Convert VV/VH SAR data to RGB format"""
#     eps = 1e-8
#     ratio = np.clip(np.nan_to_num(vh / (vv + eps), 0, 1))
#     return np.stack((vv, vh, 1-ratio), axis=2)

# def load_flood_model():
#     """Load trained segmentation model"""
#     global flood_model
    
#     model = smp.DeepLabV3Plus(
#         encoder_name='mobilenet_v2',
#         encoder_weights=None,
#         in_channels=3,
#         classes=2
#     )
    
#     model_path = os.path.join(os.path.dirname(__file__), 'models/deeplab_model_mobilenet_v2_weights.pth')
#     model.load_state_dict(torch.load(model_path, map_location=device))
    
#     model.to(device)
#     model.eval()
#     return model

# def preprocess_tile(vv_tile, vh_tile):
#     """Prepare tile for model input with proper normalization"""
#     # Min-max normalization
#     vv_norm = (vv_tile - vv_tile.min()) / (vv_tile.ptp() + 1e-8)
#     vh_norm = (vh_tile - vh_tile.min()) / (vh_tile.ptp() + 1e-8)
    
#     # Convert to RGB
#     rgb = s1_to_rgb(vv_norm, vh_norm)
    
#     # MobileNetV2 normalization
#     mean = np.array([0.485, 0.456, 0.406])
#     std = np.array([0.229, 0.224, 0.225])
#     rgb = (rgb - mean) / std
    
#     # Resize and convert to tensor
#     rgb = cv2.resize(rgb, (256, 256))
#     return torch.tensor(rgb.transpose(2,0,1)).float().unsqueeze(0)

# def predict_tile(tile_tensor):
#     """Run model prediction on a single tile"""
#     with torch.no_grad():
#         tile_tensor = tile_tensor.to(device)
#         output = flood_model(tile_tensor)
#         return output.argmax(1).squeeze().cpu().numpy()

# def process_large_image(vv_path, vh_path, tile_size=256, overlap=32):
#     """Process large geotiff images using sliding window approach"""
#     # Read input arrays
#     vv = tifffile.imread(vv_path).astype(np.float32)
#     vh = tifffile.imread(vh_path).astype(np.float32)
    
#     # Validate inputs
#     if vv.shape != vh.shape:
#         raise ValueError("VV and VH arrays must have identical dimensions")
    
#     # Create padded versions
#     pad = overlap // 2
#     vv_padded = np.pad(vv, pad, mode='reflect')
#     vh_padded = np.pad(vh, pad, mode='reflect')
    
#     # Create sliding window view
#     window_shape = (tile_size, tile_size)
#     vv_tiles = view_as_windows(vv_padded, window_shape, tile_size-overlap)
#     vh_tiles = view_as_windows(vh_padded, window_shape, tile_size-overlap)
    
#     # Initialize output arrays
#     output = np.zeros_like(vv, dtype=np.float32)
#     counts = np.zeros_like(vv, dtype=np.float32)
    
#     # Process each tile
#     for i in range(vv_tiles.shape[0]):
#         for j in range(vv_tiles.shape[1]):
#             vv_tile = vv_tiles[i,j]
#             vh_tile = vh_tiles[i,j]
            
#             # Preprocess and predict
#             rgb_tensor = preprocess_tile(vv_tile, vh_tile)
#             pred = predict_tile(rgb_tensor)
            
#             # Calculate coordinates
#             y_start = i * (tile_size - overlap)
#             y_end = y_start + (tile_size - overlap)
#             x_start = j * (tile_size - overlap)
#             x_end = x_start + (tile_size - overlap)
            
#             # Accumulate predictions
#             output[y_start:y_end, x_start:x_end] += pred[pad:-pad, pad:-pad]
#             counts[y_start:y_end, x_start:x_end] += 1

#     # Normalize and return
#     return (output / counts).astype(np.uint8)


# # @app.route('/api/disaster-assessment', methods=['POST'])
# # def disaster_assessment():
# #     if 'image' not in request.files:
# #         return jsonify({'error': 'No image provided'}), 400

# #     try:
# #         image = Image.open(request.files['image'])
# #         initialize_models()
        
# #         enc_image = moondream_model.encode_image(image)
# #         description = moondream_model.answer_question(
# #             enc_image,
# #             "Describe this image in detail.",
# #             moondream_tokenizer
# #         )
        
# #         severity = gemini_llm.invoke([
# #             ("system", get_disaster_prompt()),
# #             ("human", f"Classify: {description}")
# #         ]).content
        
# #         return jsonify({
# #             'description': description,
# #             'severity': severity.replace('**', '').lower()
# #         })
        
# #     except Exception as e:
# #         return jsonify({'error': str(e)}), 500

# # def get_disaster_prompt():
# #     return """ You are an expert in disaster assessment. You will receive AI-generated descriptions of images depicting natural disasters. "
# #         "Your task is to classify the disaster's severity based solely on the provided description. "
# #         "Categorize the disaster as either **'severe disaster'** or **'moderate disaster'** based on the following criteria:\n\n"
# #         "**Severe Disaster:** Involves large-scale destruction, significant infrastructure damage, numerous casualties, or catastrophic impact.\n\n"
# #         "**Moderate Disaster:** Involves localized damage, fewer casualties, and manageable destruction.\n\n"
# #         "If the description does not correspond to a natural disaster, return exactly: **'Not a Natural Disaster'** """

# def create_geotiff(prediction, reference_path, output_path):
#     """Create geotiff with spatial reference"""
#     with rasterio.open(reference_path) as src:
#         meta = src.meta.copy()
#         meta.update({
#             'dtype': 'uint8',
#             'count': 1,
#             'nodata': None
#         })
        
#         with rasterio.open(output_path, 'w', **meta) as dst:
#             dst.write(prediction, 1)

# def generate_visualization(vv, vh, prediction):
#     """Generate side-by-side visualization plot"""
#     fig = plt.figure(figsize=(24, 8))
    
#     # Original VV
#     plt.subplot(1, 3, 1)
#     plt.imshow(vv, cmap='gray', vmin=np.percentile(vv, 5), vmax=np.percentile(vv, 95))
#     plt.title('VV Backscatter')
    
#     # RGB Composite
#     plt.subplot(1, 3, 2)
#     vv_norm = (vv - vv.min()) / (vv.ptp() + 1e-8)
#     vh_norm = (vh - vh.min()) / (vh.ptp() + 1e-8)
#     plt.imshow(s1_to_rgb(vv_norm, vh_norm))
#     plt.title('SAR RGB Composite')
    
#     # Prediction
#     plt.subplot(1, 3, 3)
#     plt.imshow(prediction, cmap='viridis', vmin=0, vmax=1)
#     plt.title('Flood Prediction')
    
#     # Save to buffer
#     buf = BytesIO()
#     plt.savefig(buf, format='png', bbox_inches='tight')
#     plt.close(fig)
#     buf.seek(0)
#     return buf

# @app.route('/api/flood-detection', methods=['POST'])
# def flood_detection():
#     try:
#         # Initialize model if needed
#         global flood_model
#         if flood_model is None:
#             flood_model = load_flood_model()

#         # Create processing directories
#         process_id = str(uuid.uuid4())
#         upload_dir = os.path.join(app.config['UPLOAD_FOLDER'], process_id)
#         output_dir = os.path.join(app.config['OUTPUT_FOLDER'], process_id)
#         os.makedirs(upload_dir, exist_ok=True)
#         os.makedirs(output_dir, exist_ok=True)

#         # Save input files
#         data = request.json
#         vv_path = os.path.join(upload_dir, 'vv.tif')
#         vh_path = os.path.join(upload_dir, 'vh.tif')
        
#         with open(vv_path, 'wb') as f:
#             f.write(base64.b64decode(data['vv']))
#         with open(vh_path, 'wb') as f:
#             f.write(base64.b64decode(data['vh']))

#         # Process images
#         prediction = process_large_image(vv_path, vh_path)

#         # Save geotiff
#         geotiff_path = os.path.join(output_dir, 'prediction.tif')
#         create_geotiff(prediction, vv_path, geotiff_path)

#         # Generate visualization
#         vv_array = tifffile.imread(vv_path)
#         vh_array = tifffile.imread(vh_path)
#         viz_buffer = generate_visualization(vv_array, vh_array, prediction)

#         return jsonify({
#             'process_id': process_id,
#             'visualization': base64.b64encode(viz_buffer.getvalue()).decode('utf-8'),
#             'download': f"/api/download/{process_id}/prediction.tif"
#         })

#     except Exception as e:
#         return jsonify({'error': str(e)}), 500

# @app.route('/api/download/<process_id>/<filename>')
# def download_file(process_id, filename):
#     return send_from_directory(
#         os.path.join(app.config['OUTPUT_FOLDER'], process_id),
#         filename,
#         as_attachment=True
#     )

# if __name__ == '__main__':
#     os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
#     os.makedirs(app.config['OUTPUT_FOLDER'], exist_ok=True)
#     load_flood_model()
#     app.run(host='0.0.0.0', port=5000)

# if __name__ == '__main__':
#     os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
#     os.makedirs(app.config['OUTPUT_FOLDER'], exist_ok=True)
#     initialize_models()
#     app.run(host='0.0.0.0', port=5000)


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


# =======================Save the model in the initial run locally=======================

# model_id = "vikhyatk/moondream2"
# revision = "2024-08-26"
# save_directory = "./moondream_model"

# model = AutoModelForCausalLM.from_pretrained(
#     model_id, trust_remote_code=True, revision=revision
# )
# tokenizer = AutoTokenizer.from_pretrained(model_id, revision=revision)

# # Save locally
# model.save_pretrained(save_directory)
# tokenizer.save_pretrained(save_directory)

# =====================================================================================


