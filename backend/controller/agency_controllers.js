import { Agency } from '../model/Agency.js';
import User from '../model/user_model.js';
import { CopernicusService } from '../services/copernicus_service.js';
import { EarthEngineService } from '../services/earth_engine_service.js';
import { isValidGeoJSON } from '../utils/geojson_utils.js';
import { saveImage } from '../utils/image_utils.js';
import { logger } from '../utils/logger.js';
import contourController from './contour_controller.js';
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import ee from '@google/earthengine';
import dotenv from 'dotenv';
import { Readable } from 'stream';
import axios from 'axios';

// Get current file's directory
const fileName = fileURLToPath(import.meta.url);
const dirName = path.dirname(fileName);

// Correct .env path (one level up)
dotenv.config({
    path: path.resolve(dirName, '../.env')
});

logger.info('Initializing Copernicus service', { clientId: process.env.CLIENT_ID });

const copernicusService = new CopernicusService(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET
);


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const earthEngineService = new EarthEngineService(
    JSON.parse(fs.readFileSync(
        path.resolve(__dirname, '../privateKey.json'),
        'utf-8'
    ))
);


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
            const token = await copernicusService.getAccessToken();

            // Verify data availability
            const hasData = await copernicusService.checkDataAvailability(token, geometry, targetDate);
            if (!hasData) {
                return res.status(404).json({ error: 'No dual-polarization (DV) data found' });
            }

            // Process VV and VH in parallel
            const [vvBuffer, vhBuffer] = await Promise.all([
                copernicusService.processPolarization(token, geometry, targetDate, 'VV'),
                copernicusService.processPolarization(token, geometry, targetDate, 'VH')
            ]);

            // After saving files
            const filePaths = await Promise.all([
                saveImage('VV', targetDate, vvBuffer),
                saveImage('VH', targetDate, vhBuffer)
            ]);

            console.log('File paths:', filePaths);

            // Convert buffers to Base64 strings
            const vvBase64 = vvBuffer.toString('base64');
            const vhBase64 = vhBuffer.toString('base64');



            // Send VV and VH streams directly to Flask API for processing

            const flaskResponse = await axios.post(
                'http://localhost:5000/api/flood-detection',
                { vv: vvBase64, vh: vhBase64 },
                { headers: { 'Content-Type': 'application/json' } }
            );
            res.json({
                ...flaskResponse.data,
                geometry,
                date: targetDate,
                source: 'Sentinel-1'
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


            const visParams = { min: 0, max: 1, palette: ['white', 'blue'] };
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
    floodDifferenceMapping : async (req, res) => {
        try {
            const { geometry: geo, date1, date2 } = req.body;
            const { coords } = geo; // Extract coordinates from frontend input

            // 1. Validate GeoJSON structure
            if (!isValidGeoJSON(geo)) {
                return res.status(400).json({ error: 'Valid GeoJSON Polygon required' });
            }
            if (!date1 || !date2) {
                return res.status(400).json({ error: 'Two dates (date1, date2) required' });
            }

            // 2. Convert to Earth Engine geometry with proper closure
            const eeCoords = coords.map(coord => [coord.lng, coord.lat]);
            // Ensure polygon closure (first === last coordinate)
            if (!eeCoords[0].every((val, idx) => val === eeCoords[eeCoords.length - 1][idx])) {
                eeCoords.push(eeCoords[0]);
            }
            const eeGeometry = ee.Geometry.Polygon([eeCoords]);

            // 3. Get access token
            const token = await copernicusService.getAccessToken();

            // 4. Process date ranges with proper date handling
            const processDate = async (targetDate) => {
                const parsedDate = new Date(targetDate);

                // Create date window (5 days before/after)
                const startDate = new Date(parsedDate);
                startDate.setDate(parsedDate.getDate() - 5);
                const endDate = new Date(parsedDate);
                endDate.setDate(parsedDate.getDate() + 5);

                // Check data availability using original GeoJSON
                const hasData = await copernicusService.checkDataAvailability(
                    token,
                    geo, // Send raw GeoJSON to service
                    startDate.toISOString().split('T')[0],
                    endDate.toISOString().split('T')[0]
                );
                if (!hasData) {
                    throw new Error(`No data available around ${targetDate}`);
                }

                // Create image collections
                const createCollection = (start, end) =>
                    ee.ImageCollection('COPERNICUS/S1_GRD')
                        .filterDate(ee.Date(start), ee.Date(end))
                        .filterBounds(eeGeometry)
                        .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))
                        .filter(ee.Filter.eq('orbitProperties_pass', 'ASCENDING'))
                        .filter(ee.Filter.eq('instrumentMode', 'IW'))
                        .select('VV')
                        .map(img => img.focalMean(30, 'square', 'meters'));

                // Use proper date objects
                const beforeColl = createCollection(
                    new Date(parsedDate.setDate(parsedDate.getDate() - 5)),
                    parsedDate
                );
                const afterColl = createCollection(
                    parsedDate,
                    new Date(parsedDate.setDate(parsedDate.getDate() + 5))
                );

                // Generate flood mask
                return afterColl.mosaic()
                    .subtract(beforeColl.mosaic())
                    .gt(1.5);
            };

            // 5. Generate flood maps
            const flood1 = await processDate(date1);
            const flood2 = await processDate(date2);

            // 6. Calculate overflow areas
            const overflow = flood2.and(flood1.not());

            // 7. Generate map URLs
            const getMapUrl = (image, palette) => {
                const mapId = image.visualize({
                    min: 0,
                    max: 1,
                    palette: palette,
                    format: 'png'
                }).getMapId({
                    region: eeGeometry,
                    dimensions: 1024
                });

                return `https://earthengine.googleapis.com/map/${mapId.mapid}/{z}/{x}/{y}?token=${mapId.token}`;
            };

            // 8. Convert EE geometry to GeoJSON for response
            const geoJSON = eeGeometry.toGeoJSONString();

            res.json({
                floodMap1: getMapUrl(flood1, ['#000000', '#4169E1']), // Blue
                floodMap2: getMapUrl(flood2, ['#000000', '#3CB371']), // Green
                overflowMap: getMapUrl(overflow, ['#000000', '#FF4500']), // Orange
                dates: { date1, date2 },
                geometry: JSON.parse(geoJSON), // Send valid GeoJSON
                parameters: {
                    polarization: 'VV',
                    thresholdUsed: 1.5,
                    dateWindowDays: 5,
                    resolution: '30m focal mean'
                }
            });

        } catch (error) {
            console.error('Flood comparison error:', error);
            res.status(500).json({
                error: 'Processing failed',
                details: error.message
            });
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