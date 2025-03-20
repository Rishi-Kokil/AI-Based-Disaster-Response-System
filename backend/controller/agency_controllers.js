import { Agency } from '../model/Agency.js';
import ee from '@google/earthengine';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../model/user_model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const privateKeyPath = path.resolve(__dirname, '../privateKey.json');
console.log('Private key path:', privateKeyPath);
const privateKey = JSON.parse(fs.readFileSync(privateKeyPath, 'utf-8'));
let isEEInitialized = false;

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
    console.error('Failed to initialize Google Earth Engine:', error);
});

const agencyController = {
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
            return res.status(503).json({ 
                error: 'Earth Engine not available',
                details: 'Service temporarily unavailable'
            });
        }
        next();
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
                .filterDate('2019-12-20', '2019-12-29')
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
