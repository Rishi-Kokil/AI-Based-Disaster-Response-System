import { Agency } from '../model/Agency.js';
import ee from '@google/earthengine';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../model/user_model.js';
import dotenv from 'dotenv';
import axios from "axios";
import contourController from './contour_controller.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const privateKeyPath = path.resolve(__dirname, '../privateKey.json');
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;

const privateKey = JSON.parse(fs.readFileSync(privateKeyPath, 'utf-8'));
let isEEInitialized = false;

let accessToken = null;
let tokenExpiresAt = 0;

const getAccessToken = async () => {
    if (accessToken && Date.now() < tokenExpiresAt) return accessToken;

    console.log('Getting access token...');

    try {
        const response = await axios.post(
            'https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token',
            new URLSearchParams({
                grant_type: 'client_credentials',
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                include_client_id: 'true',
            }),
            {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            }
        );

        const { access_token, expires_in } = response.data;
        if (!access_token || typeof expires_in !== 'number') {
            throw new Error('Invalid token response');
        }

        accessToken = access_token;
        tokenExpiresAt = Date.now() + expires_in * 1000;
        return accessToken;
    } catch (error) {
        const errorMessage = error.response?.data?.error_description
            || error.message
            || 'Authentication failed';
        console.error('Error getting access token:', error.message);

        if (error.response?.status === 429) {
            console.warn('Rate limited. Retrying...');
            await new Promise(resolve => setTimeout(resolve, 5000));
            return getAccessToken(); // Retry once
        }

        throw new Error(errorMessage);
    }
};

// Validate GeoJSON geometry with coordinate order check
const isValidGeoJSON = (geometry) => {
    return geometry?.type === 'Polygon' &&
        Array.isArray(geometry.coordinates) &&
        geometry.coordinates[0].every(coord =>
            coord.length === 2 &&
            typeof coord[0] === 'number' && // Ensure longitude first
            typeof coord[1] === 'number'
        );
};

const calculateBbox = (geometry) => {
    const coords = geometry.coordinates[0]; // Extract the first ring of the polygon
    let minLon = Infinity, minLat = Infinity, maxLon = -Infinity, maxLat = -Infinity;

    for (const [lon, lat] of coords) {
        minLon = Math.min(minLon, lon);
        minLat = Math.min(minLat, lat);
        maxLon = Math.max(maxLon, lon);
        maxLat = Math.max(maxLat, lat);
    }

    return [minLon, minLat, maxLon, maxLat];
};


const checkDataAvailability = async (token, geometry, date) => {
    try {
        const bbox = calculateBbox(geometry); // Use validated bounding box

        const response = await axios.post(
            'https://sh.dataspace.copernicus.eu/api/v1/catalog/1.0.0/search',
            {
                bbox,
                datetime: `${date}T00:00:00Z/${date}T23:59:59Z`,
                collections: ['sentinel-1-grd'],
            },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        console.log('Data availability:', response.data);

        return response.data.features.length > 0;
    } catch (error) {
        console.error('Final filter error:', error.response?.data || error.message);
        throw new Error('Invalid filter syntax');
    }
};

const processPolarization = async (token, geometry, date, band) => {
    // Validate allowed bands
    if (!['VV', 'VH'].includes(band)) {
        throw new Error(`Invalid band: ${band}. Use "VV" or "VH".`);
    }

    const evalscript = `
      //VERSION=3
      function setup() {
        return {
          input: ["${band}"], // Remove "s1:" prefix
          output: { bands: 1, sampleType: "FLOAT32" }
        };
      }
      function evaluatePixel(sample) {
        return [sample.${band}]; // Access band directly
      }
    `;

    console.log('Processing:', band);

    try {
        const response = await axios.post(
            'https://sh.dataspace.copernicus.eu/api/v1/process',
            {
                input: {
                    bounds: { geometry, properties: { crs: "http://www.opengis.net/def/crs/EPSG/0/4326" } },
                    data: [{
                        type: "S1GRD",
                        dataFilter: {
                            timeRange: { from: `${date}T00:00:00Z`, to: `${date}T23:59:59Z` },
                            polarization: "DV",
                            acquisitionMode: "IW",
                            resolution: "HIGH" // Required for IW mode
                        },
                        processing: {
                            backCoeff: "GAMMA0_TERRAIN",
                            orthorectify: true, // Mandatory for GAMMA0_TERRAIN
                            demInstance: "COPERNICUS_30",
                            speckleFilter: { type: "LEE", windowSizeX: 5, windowSizeY: 5 }
                        }
                    }]
                },
                output: { width: 512, height: 512, format: "TIFF" },
                evalscript
            },
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                    Accept: "image/tiff"
                },
                responseType: "arraybuffer" // Ensure binary response handling
            }
        );

        console.log('Response:', response.status, response.headers);

        // Check for TIFF content type
        if (response.headers['content-type'] !== 'image/tiff') {
            throw new Error(`Unexpected response type: ${response.headers['content-type']}`);
        }

        return Buffer.from(response.data);

    } catch (error) {
        // Parse JSON errors
        let errorMessage;
        if (error.response?.data) {
            try {
                const errorData = JSON.parse(Buffer.from(error.response.data).toString());
                errorMessage = errorData.message || errorData.error;
            } catch {
                errorMessage = Buffer.from(error.response.data).toString();
            }
        } else {
            errorMessage = error.message;
        }
        console.error(`Process Error (${band}):`, errorMessage);
        throw new Error(`Failed to process ${band}`);
    }
};

// Save images with clear naming convention
const saveImage = async (band, date, buffer) => {
    const dir = path.join(__dirname, `../image_dump/${band}`);
    await fs.promises.mkdir(dir, { recursive: true }); // Use promises.mkdir
    const filename = `${date}_${band}_gamma0_terrain.tif`;
    const filePath = path.join(dir, filename);
    await fs.promises.writeFile(filePath, buffer); // Use promises.writeFile
    return filePath;
};


const initializeEE = () => {
    return new Promise((resolve, reject) => {
        ee.data.authenticateViaPrivateKey(privateKey, () => {
            console.log('Earth Engine client authenticated.');
            ee.initialize(null, null, () => {
                console.log('Earth Engine client initialized.');
                isEEInitialized = true;
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

// Initialize GEE when the server starts
initializeEE().catch(error => {
    console.error('Failed to initialize Google Earth Engine:', error.message);
});

const generateContourLines = async (geometry) => {
    const eeGeometry = ee.Geometry.Polygon([geometry.map(coord => [coord.lng, coord.lat])]);
    const srtm = ee.Image('USGS/SRTMGL1_003');
    const lines = ee.List.sequence(0, 5000, 100);

    const contourLines = lines.map(function(line) {
        const Dem_contour = srtm
            .convolve(ee.Kernel.gaussian(5, 3))
            .subtract(ee.Image.constant(line)).zeroCrossing()
            .multiply(ee.Image.constant(line)).toFloat();

        return Dem_contour.mask(Dem_contour);
    });

    const contourLineImage = ee.ImageCollection(contourLines).mosaic().clip(eeGeometry);

    const contourLineUrl = contourLineImage.getThumbURL({
        region: eeGeometry,
        dimensions: 1024,
        format: 'png',
        min: 0,
        max: 3500,
        palette: ['yellow', 'red']
    });

    return contourLineUrl;
};

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
        if (!isEEInitialized) {
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