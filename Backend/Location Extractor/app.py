from flask import Flask, jsonify
import PIL.Image
import PIL.ExifTags
from flask_cors import CORS  # Import the CORS package

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

@app.route('/coordinates', methods=['GET'])
def get_coordinates():
    img = PIL.Image.open('DSCN0012.jpg')
    exif = {
        PIL.ExifTags.TAGS[k]: v
        for k, v in img._getexif().items()
        if k in PIL.ExifTags.TAGS
    }

    gps_info = exif.get('GPSInfo')
    north = gps_info.get(2)
    east = gps_info.get(4)

    lat = ((((north[0]*60)+north[1])*60)+north[2])/60/60
    long = ((((east[0]*60)+east[1])*60)+east[2])/60/60

    return jsonify({'latitude': float(lat), 'longitude': float(long)})

if __name__ == '__main__':
    app.run(debug=True, port=5050)
