
import dotenv from 'dotenv';
import express from 'express';
import ee from '@google/earthengine';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../model/user_model.js';

// Get the current file path and directory in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve the path to one level up from the current directory
const privateKeyPath = path.resolve(__dirname, '../privateKey.json');
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



export const checkGEEInitialized = (req, res, next) => {
    if (!isEEInitialized) {
        return res.status(500).json({ error: 'Google Earth Engine is not initialized.' });
    }
    next();
};


export const fetchFloodMapping = async (req, res) => {
    try {
        const { geometry } = req.body; // Receive the geometry coordinates from the frontend

        // Validate geometry input
        if (!geometry || !Array.isArray(geometry)) {
            return res.status(400).json({ error: "Invalid geometry provided" });
        }

        // Convert the received geometry to an Earth Engine Polygon
        const eeGeometry = ee.Geometry.Polygon([geometry]);

        // Load Sentinel-1 SAR images for the 'before' period
        const sarBefore = ee.ImageCollection('COPERNICUS/S1_GRD')
            .filterDate('2019-12-20', '2019-12-29')
            .filterBounds(eeGeometry)
            .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))
            .filter(ee.Filter.eq('instrumentMode', 'IW'))
            .filter(ee.Filter.eq('orbitProperties_pass', 'ASCENDING'))
            .select('VV')
            .map(img => img.focalMean(30, 'square', 'meters').copyProperties(img, img.propertyNames()));

        // Load Sentinel-1 SAR images for the 'after' period
        const sarAfter = ee.ImageCollection('COPERNICUS/S1_GRD')
            .filterDate('2020-01-01', '2020-02-01')
            .filterBounds(eeGeometry)
            .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))
            .filter(ee.Filter.eq('instrumentMode', 'IW'))
            .filter(ee.Filter.eq('orbitProperties_pass', 'ASCENDING'))
            .select('VV')
            .map(img => img.focalMean(30, 'square', 'meters').copyProperties(img, img.propertyNames()));

        // Calculate the difference to detect flooded regions
        const floodedRegion = sarAfter
            .mosaic()
            .subtract(sarBefore.mosaic())
            .gt(1.5); // Example threshold for flood detection

        // Generate the flood map visualization URL
        const floodMapUrl = floodedRegion.getThumbURL({
            min: 0,
            max: 1,
            region: eeGeometry,
            dimensions: 1024,
            format: 'png'
        });

        // Send the generated flood map URL as a response
        res.json({ floodMapUrl });
    } catch (error) {
        console.error('Error processing flood mapping:', error);
        res.status(500).json({ error: 'Error processing flood mapping' });
    }
};



export const fetchLocationMappings = async (req, res) => {
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