import { Agency } from '../model/Agency.js';
import User from '../model/user_model.js';
import { CopernicusService } from '../services/copernicus_service.js';
import { EarthEngineService } from '../services/earth_engine_service.js';
import { isValidGeoJSON } from '../utils/geojson_utils.js';
import { saveImage } from '../utils/image_utils.js';
import {logger} from '../utils/logger.js';
import contourController from './contour_controller.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ee from '@google/earthengine';

const copernicusService = new CopernicusService(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET
);


// Add these at the top of your file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Then create the EarthEngineService with correct path
const earthEngineService = new EarthEngineService(
    JSON.parse(fs.readFileSync(
        path.resolve(__dirname, '../privateKey.json'), 
        'utf-8'
    ))
);

// Initialize Earth Engine on startup
earthEngineService.initialize().catch(error => {
    logger.error('Earth Engine initialization failed', { error });
});
const agencyController = {
    fetchContourLines: contourController.fetchContourLines,
    createAgency: async (req, res) => {
        try {
            const agency = new Agency(req.body);
            await agency.save();
            res.status(201).json(agency);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    },
    getAgencies: async (req, res) => {
        try {
            const agencies = await Agency.find();
            res.status(200).json(agencies);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },
    getAgencyById: async (req, res) => {
        try {
            const agency = await Agency.findById(req.params.id);
            if (!agency) {
                return res.status(404).json({ error: 'Agency not found' });
            }
            res.status(200).json(agency);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },
    updateAgency: async (req, res) => {
        try {
            const agency = await Agency.findByIdAndUpdate(req.params.id, req.body, { new: true });
            if (!agency) {
                return res.status(404).json({ error: 'Agency not found' });
            }
            res.status(200).json(agency);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    },
    deleteAgency: async (req, res) => {
        try {
            const agency = await Agency.findByIdAndDelete(req.params.id);
            if (!agency) {
                return res.status(404).json({ error: 'Agency not found' });
            }
            res.status(200).json({ message: 'Agency deleted successfully' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },
    checkGEEInitialized: (req, res, next) => {
        if (!earthEngineService.isInitialized) {
            return res.status(500).json({ error: 'Google Earth Engine is not initialized.' });
        }
        console.log('Middleware checkGEEInitialized passed.');
        next();
    },
    getSentinel1VVVH: async (req, res) => {
        try {
            const { geometry, date } = req.body;
            if (!isValidGeoJSON(geometry)) {
                return res.status(400).json({ error: 'Valid GeoJSON Polygon required' });
            }

            const targetDate = date || new Date().toISOString().split('T')[0];
            const token = await getAccessToken();

            // Verify data availability
            const hasData = await checkDataAvailability(token, geometry, targetDate);
            if (!hasData) {
                return res.status(404).json({ error: 'No dual-polarization (DV) data found' });
            }

            // Process VV and VH in parallel
            const [vvBuffer, vhBuffer] = await Promise.all([
                processPolarization(token, geometry, targetDate, 'VV'),
                processPolarization(token, geometry, targetDate, 'VH')
            ]);

            // Save and return paths
            const filePaths = await Promise.all([
                saveImage('VV', targetDate, vvBuffer),
                saveImage('VH', targetDate, vhBuffer)
            ]);

            res.json({
                success: true,
                message: 'VV/VH images saved for flood model input',
                paths: filePaths
            });

        } catch (error) {
            console.error('Processing error:', error.message);
            res.status(500).json({
                error: 'Processing failed',
                details: error.response?.data?.error_description || error.message
            });
        }
    },

    fetchFloodMapping: async (req, res) => {

        try {
            const { geometry } = req.body;
            console.log('Received geometry:', geometry);


            if (!geometry || !geometry.coords || !Array.isArray(geometry.coords) || geometry.coords.length < 3) {
                return res.status(400).json({ error: "Invalid geometry provided" });
            }

            const { id, coords } = geometry;

            const eeGeometry = ee.Geometry.Polygon([coords.map(coord => [coord.lng, coord.lat])]);

            const sarBefore = ee.ImageCollection('COPERNICUS/S1_GRD')
                .filterDate('2018-12-20', '2019-12-29')
                .filterBounds(eeGeometry)
                .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))
                .filter(ee.Filter.eq('instrumentMode', 'IW'))
                .filter(ee.Filter.eq('orbitProperties_pass', 'ASCENDING'))
                .select('VV')
                .map(img => img.focalMean(30, 'square', 'meters').copyProperties(img, img.propertyNames()));


            const sarAfter = ee.ImageCollection('COPERNICUS/S1_GRD')
                .filterDate('2020-01-01', '2020-02-01')
                .filterBounds(eeGeometry)
                .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))
                .filter(ee.Filter.eq('instrumentMode', 'IW'))
                .filter(ee.Filter.eq('orbitProperties_pass', 'ASCENDING'))
                .select('VV')
                .map(img => img.focalMean(30, 'square', 'meters').copyProperties(img, img.propertyNames()));


            const floodedRegion = sarAfter
                .mosaic()
                .subtract(sarBefore.mosaic())
                .gt(1.5);


            const visParams = { min: 0, max: 1, palette: ['black', 'blue'] };
            const floodMapUrl = floodedRegion.visualize(visParams).getThumbURL({
                region: eeGeometry,
                dimensions: 1024,
                format: 'png'
            });


            res.json({ id, floodMapUrl });
        } catch (error) {
            console.log('Error processing flood mapping:', error);
            res.status(500).json({ error: 'Error processing flood mapping' });
        }
    },
    fetchLocationMappings: async (req, res) => {
        try {
            // Retrieve users and extract their location data
            const users = await User.find({});
            const locations = [];

            users.forEach(user => {
                user.uploads.forEach(upload => {
                    if (upload.location) {
                        locations.push({
                            location: upload.location,
                            severity: upload.severity
                        });
                    }
                });
            });

            res.json(locations); // Send all locations as a response
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
};

export default agencyController;