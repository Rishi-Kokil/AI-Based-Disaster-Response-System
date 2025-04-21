# EmergeSense : AI-Based Disaster Response System

## Video Demonstration
[Click here to watch the video demonstration](https://drive.google.com/file/d/1Veqk1EN-VPqluExcPH0QRofOuf7CrgO7/view?usp=sharing)

## Overview
The **AI-Based Disaster Response System** is an advanced platform designed to aid **disaster management agencies in monitoring, detecting, and responding to natural calamities in real-time**. By integrating data from multiple sources, including social media platforms, satellite imagery, and climate data, the system leverages AI-driven analytics to identify affected regions and generate effective, coordinated response strategies.

This project employs deep learning models for disaster detection and prediction, satellite imagery analysis via Google Earth Engine, and real-time data aggregation from various sources to assist disaster response teams with actionable insights. The system is implemented as a centralized web and mobile application for efficient data visualization and management.

## Key Features
- **Real-time Social Media Data Integration**:
  - Scrapes and analyzes posts from platforms like X (formerly Twitter) and Instagram.
  - Uses Natural Language Processing (NLP) models to detect disaster-related posts and extract geolocation data.
  
- **Satellite Imagery Analysis**:
  - Utilizes Google Earth Engine for near-real-time analysis of satellite images.
  - Detects flood-affected regions and visualizes changes over time using machine learning techniques.
  
- **Disaster Detection using Deep Learning**:
  - Employs deep learning models to predict affected areas based on historical disaster patterns and real-time data.
  - Custom-trained models to analyze satellite and climate data for flood detection, fire outbreaks, and other disasters.

- **Real-time Climate Data**:
  - Integrates real-time climate data from reliable weather data providers to enhance prediction accuracy.
  - Climate trends analysis to predict potential future disasters.

- **Response Generation and Coordination**:
  - Facilitates disaster response teams by providing insights into the most affected areas.
  - Automates the generation of response strategies based on the severity and location of disasters.
  
- **Centralized Dashboard for Data Visualization**:
  - A web and mobile application that consolidates all disaster-related data.
  - Interactive maps displaying real-time satellite imagery, social media activity, and identified disaster zones.
  - Dashboard supports responsive and role-based access for different stakeholders like rescue teams, government authorities, etc.

## Technology Stack
- **Frontend**:
  - [React](https://reactjs.org/) for the web application.
  - [Flutter](https://flutter.dev/) or React Native for the mobile application.
  
- **Backend**:
  - [Node.js](https://nodejs.org/) with [Express](https://expressjs.com/) for the backend server.
  - Integration with Google Earth Engine for satellite image analysis.
  - API integration with social media platforms (X, Instagram).
  - [Firebase](https://firebase.google.com/) for real-time database and authentication.

- **AI/ML**:
  - Deep learning models for disaster detection using frameworks like [TensorFlow](https://www.tensorflow.org/) or [PyTorch](https://pytorch.org/).
  - NLP models for social media data analysis using [Hugging Face Transformers](https://huggingface.co/transformers/).

- **Geospatial Analysis**:
  - [Google Earth Engine](https://earthengine.google.com/) for satellite imagery and environmental data.
  - Geospatial data visualization using libraries such as [Leaflet](https://leafletjs.com/) or [Mapbox](https://www.mapbox.com/).

## How It Works
1. **Data Collection**: The system scrapes social media platforms and ingests satellite and climate data.
2. **Data Processing**: AI models analyze the incoming data for disaster detection, geolocation extraction, and climate trend analysis.
3. **Visualization**: The processed data is visualized on the centralized dashboard (web and mobile apps).
4. **Response Coordination**: The system generates response strategies and provides actionable insights for disaster management teams.


# Setup

- **Navigate to the Project Directory**
   
   ```bash
   cd /path/to/your/project
   ```

## Installing Python Packages
   1. **Move to the Directory Data Analysis**
      ```bash
      cd Data-Analysis
      ```
   
   2. **Create a Virtual Environment**

      ```bash
      python -m venv venv
      ```

   3. **Activate the Virtual Environment**
   
      - On Windows:
      
        ```bash
        venv\Scripts\activate
        ```
   
      - On macOS/Linux:
      
        ```bash
        source venv/bin/activate
        ```

   4. **Install Required Libraries**

      After activating the virtual environment, install the necessary dependencies:
   
      ```bash
      pip install -r requirements.txt
      ```
## Starting our Website
1. **Navigate to the Website Directory**
   ```bash
   cd Frontend/EmergeSenseWebsite
   ```
2. **Install all the Dependencies**
   ```bash
   npm install
   ```
3. **Start the Development Server**
   ```bash
   npm run dev
   ```

## Disclaimer
This is an ongoing project and may contain missing files or incomplete information. Please note that certain features may not function as expected, and the project may be unstable or broken in its current state.
<br />
Additionally, this is not an open-source project. Unauthorized distribution or use of the project code or components is prohibited.
