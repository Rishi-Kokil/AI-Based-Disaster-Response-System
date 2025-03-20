import axios from 'axios';
import {logger} from '../utils/logger.js';
import { calculateBbox } from '../utils/geojson_utils.js';

let accessToken = null;
let tokenExpiresAt = 0;

export class CopernicusService {
  constructor(clientId, clientSecret) {
    this.CLIENT_ID = clientId;
    this.CLIENT_SECRET = clientSecret;
  }

  async getAccessToken() {
    if (accessToken && Date.now() < tokenExpiresAt) {
      logger.debug('Using cached access token');
      return accessToken;
    }

    logger.info('Requesting new Copernicus access token');
    
    try {
      const response = await axios.post(
        'https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token',
        new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: this.CLIENT_ID,
          client_secret: this.CLIENT_SECRET,
          include_client_id: 'true',
        }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );

      const { access_token, expires_in } = response.data;
      accessToken = access_token;
      tokenExpiresAt = Date.now() + expires_in * 1000;
      logger.info('New access token obtained successfully');
      return accessToken;
    } catch (error) {
      logger.error('Access token request failed', { error: error.response?.data || error.message });
      throw error;
    }
  }

  async checkDataAvailability(token, geometry, date) {
    logger.info('Checking data availability', { date });
    
    try {
      const bbox = calculateBbox(geometry);
      const response = await axios.post(
        'https://sh.dataspace.copernicus.eu/api/v1/catalog/1.0.0/search',
        {
          bbox,
          datetime: `${date}T00:00:00Z/${date}T23:59:59Z`,
          collections: ['sentinel-1-grd'],
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      logger.debug(`Found ${response.data.features.length} features`);
      return response.data.features.length > 0;
    } catch (error) {
      logger.error('Data availability check failed', { error: error.response?.data || error.message });
      throw error;
    }
  }

  async processPolarization(token, geometry, date, band) {
    logger.info(`Processing polarization for band ${band}`, { date });
    
    const evalscript = `...`; // Keep your existing evalscript

    try {
      const response = await axios.post(
        'https://sh.dataspace.copernicus.eu/api/v1/process',
        { /* request body */ },
        { /* headers */ }
      );

      logger.debug(`Process response received for ${band}`, {
        status: response.status,
        headers: response.headers
      });

      return Buffer.from(response.data);
    } catch (error) {
      logger.error(`Polarization processing failed for ${band}`, { error });
      throw error;
    }
  }
}