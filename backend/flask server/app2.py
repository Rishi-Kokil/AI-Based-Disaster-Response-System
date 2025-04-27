import os
import requests
import random

# Configuration
API_URL = 'http://localhost:3000/user/upload-disaster-report'  # Change if hosted elsewhere
JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2ODBlMGM1YjZjOWI0OGMwOGFlZmViYTkiLCJlbWFpbCI6ImlsaGFtc3llZEBnbWFpbC5jb20iLCJuYW1lIjoiSWxoYW0iLCJpYXQiOjE3NDU3NjUwMzcsImV4cCI6MTc0NTg1MTQzN30.JsoxZNkTa19XoGGy3A0JTDK2wInjZKttUMGbqxx3s3A'  # <-- put your valid JWT token here
IMAGES_FOLDER = 'flood_images'  # Folder containing images

# Predefined descriptions, severities, and base location (Indonesia - Jakarta)
image_data = [
    {"description": '''The image presents an aerial view of a flooded town, with houses and buildings submerged in a muddy brown water. The water covers the streets, houses, and surrounding areas, creating a scene of devastation. The houses are of varying sizes and shapes, with some having red roofs. The floodwater appears to be moving rapidly, covering the entire town.

In addition to the houses, there are several trees scattered throughout the scene, some of which are partially submerged in the water. The image captures the extent of the flooding, with the water reaching up to the roofs of the houses and even reaching the ground. ''', "severity": "High"},
    {"description": '''The image depicts a red car partially submerged in a flooded area. The car is positioned in the center of the scene, with its front facing the viewer. The water surrounding the car is murky and brown, indicating a muddy or dirty environment. In the background, a large white structure, possibly a greenhouse or a building, is visible. The car appears to be stuck in the floodwater, with its front end submerged up to the waterline.''', "severity": "High"},
    {"description": ''' The image depicts a blue Metro bus partially submerged in a flooded highway. The bus is positioned on the left side of the road, with its front end submerged up to the roof. The bus is facing towards the right side of the image, and its back end is also visible. The highway is filled with water, stretching from the left to the right side of the image. In the background, a concrete overpass is visible, and a few cars can be seen driving on the flooded road. The scene is illuminated by streetlights, and the surrounding area is lush with trees.''', "severity": "Medium"},
    {"description": ''' The image captures a town situated near a river that has overflowed its banks, submerging the surrounding area. The river's water level is high, reaching up to the roofs of the houses and buildings. The houses and buildings are partially submerged in the water, with some showing signs of damage. The scene is dominated by a mix of white, gray, and brown buildings, with some trees scattered throughout the area. The river appears to be a fast-moving, turbulent body of water, adding to the sense of urgency and chaos in the image.''', "severity": "High"},
    {"description": '''The image depicts a wet, dark gray paved path winding through a lush, green landscape. The path is bordered by a grassy area on one side and a fence on the other. A person can be seen walking along the path, adding a sense of movement to the scene. The wet path reflects the surrounding greenery, creating a mirror-like effect. In the distance, a house is visible, partially obscured by the trees. The sky overhead is overcast, casting a soft, diffused light over the scene. ''', "severity": "Not A Natural Disaster"},
    {"description": ''' The image shows a group of people aboard a small boat navigating through a flooded area. The boat is filled with people, including adults and children, who are seated on the wooden deck. The water surrounding the boat is knee-deep, indicating a significant flood. The scene is set against a backdrop of houses and trees, with some of the houses partially submerged in the water. The sky is overcast, casting a gloomy atmosphere over the entire scene.''', "severity": "Medium"},
    {"description": ''' The image captures a group of people navigating through a flooded area. They are wearing life jackets and carrying a large inflatable raft, which appears to be a makeshift boat, to help them cross the water. The raft is being pulled by a group of men, with one man holding a cell phone, possibly communicating with someone. The surrounding area is filled with houses and trees, creating a contrast between the natural and man-made elements. The sky is overcast, casting a gloomy atmosphere over the scene. The water is murky and brown, indicating the floodwater.''', "severity": "High"},
    {"description": ''' The image depicts a muddy, unpaved road with several potholes scattered across its surface. The potholes vary in size and shape, with some being larger and more irregular, while others are smaller and more circular. The road is bordered by a grassy area on the left side, and the ground around the potholes is covered in rocks and dirt. The lighting in the image is bright, possibly indicating sunlight, and casts shadows on the road and potholes, adding depth to the scene.''', "severity": "Not A Natural Disaster"},
]

# Base location (Jakarta, Indonesia)
base_latitude = -6.2088
base_longitude = 106.8456

# Function to slightly modify location (within ~1 km range)
def randomize_location(lat, lon):
    lat_offset = random.uniform(-0.01, 0.01)  # Slightly larger to simulate more spread
    lon_offset = random.uniform(-0.01, 0.01)
    return round(lat + lat_offset, 6), round(lon + lon_offset, 6)

# Get all image files
image_files = sorted([
    f for f in os.listdir(IMAGES_FOLDER) 
    if f.lower().endswith(('.png', '.jpg', '.jpeg'))
])

# Sanity check
if len(image_files) != len(image_data):
    print("Warning: Number of images and number of data entries don't match!")

# Upload each image
for idx, image_name in enumerate(image_files):
    print(f"Uploading {image_name}...")
    
    # Prepare data
    lat, lon = randomize_location(base_latitude, base_longitude)
    data = {
        'type': 'image',
        'description': image_data[idx]['description'],
        'severity': image_data[idx]['severity'],
        'latitude': str(lat),
        'longitude': str(lon),
    }
    
    files = {
        'file': open(os.path.join(IMAGES_FOLDER, image_name), 'rb')
    }
    
    headers = {
        'Authorization': f'Bearer {JWT_TOKEN}'
    }
    
    # Send POST request
    response = requests.post(API_URL, data=data, files=files, headers=headers)
    
    # Handle response
    if response.status_code == 201:
        print(f"✅ Successfully uploaded {image_name}")
    else:
        print(f"❌ Failed to upload {image_name}: {response.status_code} {response.text}")

print("All uploads done!")
