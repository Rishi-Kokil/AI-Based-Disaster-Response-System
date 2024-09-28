// Load environment variables from .env file
import dotenv from 'dotenv';
import express from 'express';
import ee from '@google/earthengine';
import privateKey from './ee-rishikokil-eb013fb59d0f.json' assert { type: 'json' }; // Adjust the path as necessary

dotenv.config({ path: '../../.env' }); // Adjust the path relative to your script location

const app = express();
const port = 5000;

// Middleware to handle JSON requests
app.use(express.json());

// Initialize Earth Engine client
const initializeEE = () => {
  return new Promise((resolve, reject) => {
    ee.data.authenticateViaPrivateKey(privateKey, () => {
      console.log('Earth Engine client authenticated.');
      ee.initialize(null, null, () => {
        console.log('Earth Engine client initialized.');
        resolve();
      }, (e) => {
        console.error('Initialization error: ', e);
        reject(e);
      });
    }, (e) => {
      console.error('Authentication error: ', e);
      reject(e);
    });
  });
};

// Flood mapping endpoint
const floodMapping = async (req, res) => {
  try {
    const geometry = ee.Geometry.Point([106.8456, -6.2088]); // Jakarta example

    const sarBefore = ee.ImageCollection('COPERNICUS/S1_GRD')
      .filterDate('2019-12-20', '2019-12-29')
      .filterBounds(geometry)
      .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))
      .filter(ee.Filter.eq('instrumentMode', 'IW'))
      .filter(ee.Filter.eq('orbitProperties_pass', 'ASCENDING'))
      .select('VV')
      .map(img => img.focalMean(30, 'square', 'meters').copyProperties(img, img.propertyNames()));

    const sarAfter = ee.ImageCollection('COPERNICUS/S1_GRD')
      .filterDate('2020-01-01', '2020-02-01')
      .filterBounds(geometry)
      .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))
      .filter(ee.Filter.eq('instrumentMode', 'IW'))
      .filter(ee.Filter.eq('orbitProperties_pass', 'ASCENDING'))
      .select('VV')
      .map(img => img.focalMean(30, 'square', 'meters').copyProperties(img, img.propertyNames()));

    const floodedRegion = sarAfter
      .mosaic()
      .subtract(sarBefore.mosaic())
      .gt(1.5); // Example threshold for flood detection

    floodedRegion.getMap({ min: 0, max: 1 }, map => {
      res.json(map);
    });
  } catch (error) {
    console.error('Error processing flood mapping: ', error);
    res.status(500).send('Error processing flood mapping');
  }
};

// Start the server and initialize Earth Engine
initializeEE()
  .then(() => {
    app.get('/flood-mapping', floodMapping);
    
    app.listen(port, () => {
      console.log(`Server running on http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error('Failed to initialize Earth Engine: ', error);
  });
