from flask import Flask, request, jsonify
import cv2
import numpy as np
from skimage import measure
from skimage.filters import threshold_otsu
import matplotlib
matplotlib.use('Agg')  # Set backend before importing pyplot
import matplotlib.pyplot as plt
import base64
from io import BytesIO
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route('/contour/image', methods=['POST'])
def process_image():
    try:
        # Get and validate request data
        data = request.get_json()
        if not data or 'image' not in data:
            return jsonify({"error": "Missing image data"}), 400

        # Extract base64 string (handle data URI if present)
        image_data = data['image'].split(',')[-1]  # Remove data URI prefix if exists
        try:
            image_bytes = base64.b64decode(image_data)
        except base64.binascii.Error:
            return jsonify({"error": "Invalid base64 encoding"}), 400

        # Decode image
        image_np = np.frombuffer(image_bytes, dtype=np.uint8)
        image = cv2.imdecode(image_np, cv2.IMREAD_COLOR)
        if image is None:
            return jsonify({"error": "Invalid image format"}), 400

        # Convert the image to grayscale
        gray_image = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

        # Apply Otsu's thresholding
        thresh = threshold_otsu(gray_image)
        binary_image = gray_image > thresh

        # Find contours
        contours = measure.find_contours(binary_image, 0.8)
        if not contours:
            return jsonify({"error": "No contours found"}), 400

        # Sort contours by x-coordinate
        contours = sorted(contours, key=lambda ctr: np.mean(ctr[:, 1]))

        # Process contours and calculate intensities
        contour_values = []
        for contour in contours:
            rr, cc = np.array(contour, dtype=int).T
            if rr.size == 0 or cc.size == 0:
                continue  # Skip empty contours
            
            try:
                mean_val = np.mean(image[rr, cc, 0])  # Red channel
                contour_values.append((contour, mean_val))
            except IndexError:
                continue  # Handle potential edge cases

        # Sort by intensity
        contour_values.sort(key=lambda x: x[1], reverse=True)

        # Visualization setup
        fig, ax = plt.subplots()
        ax.imshow(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))
        
        # Arrow drawing parameters
        distance_threshold = 250
        scale_factor = 0.2

        # Draw arrows between contours
        for i in range(len(contour_values) - 1):
            (contour1, val1), (contour2, val2) = contour_values[i], contour_values[i + 1]
            
            try:
                # Get leftmost points
                point1 = contour1[np.argmin(contour1[:, 1])]
                point2 = contour2[np.argmin(contour2[:, 1])]
                
                cx1, cy1 = point1[1], point1[0]
                cx2, cy2 = point2[1], point2[0]
                
                distance = np.sqrt((cx2 - cx1)**2 + (cy2 - cy1)**2)
                if distance <= distance_threshold:
                    dx = (cx2 - cx1) * scale_factor
                    dy = (cy2 - cy1) * scale_factor
                    ax.arrow(cx1, cy1, dx, dy, head_width=5, head_length=5, fc='green', ec='green')
            except (IndexError, ValueError):
                continue  # Skip invalid contour points

        # Save to buffer
        buf = BytesIO()
        plt.savefig(buf, format='png', bbox_inches='tight', pad_inches=0)
        buf.seek(0)
        processed_image_data = base64.b64encode(buf.read()).decode('utf-8')
        buf.close()
        plt.close()  # Important for memory management

        return jsonify({'processed_image': f"data:image/png;base64,{processed_image_data}"})

    except Exception as e:
        app.logger.error(f"Processing error: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)