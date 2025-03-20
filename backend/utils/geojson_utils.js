import {logger} from './logger.js';

export const isValidGeoJSON = (geometry) => {
    logger.debug('Validating GeoJSON geometry');
    const valid = geometry?.type === 'Polygon' &&
        Array.isArray(geometry.coordinates) &&
        geometry.coordinates[0].every(coord =>
            coord.length === 2 &&
            typeof coord[0] === 'number' &&
            typeof coord[1] === 'number'
        );

    if (!valid) logger.warn('Invalid GeoJSON structure detected');
    return valid;
};

export const calculateBbox = (geometry) => {
    logger.debug('Calculating bounding box');
    const coords = geometry.coordinates[0];
    let minLon = Infinity, minLat = Infinity, maxLon = -Infinity, maxLat = -Infinity;

    for (const [lon, lat] of coords) {
        minLon = Math.min(minLon, lon);
        minLat = Math.min(minLat, lat);
        maxLon = Math.max(maxLon, lon);
        maxLat = Math.max(maxLat, lat);
    }

    logger.debug(`Bounding box calculated: [${minLon}, ${minLat}, ${maxLon}, ${maxLat}]`);
    return [minLon, minLat, maxLon, maxLat];
};