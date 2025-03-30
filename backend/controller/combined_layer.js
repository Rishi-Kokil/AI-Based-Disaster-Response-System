import ee from '@google/earthengine';

const generateCombinedLayer = async (geometry) => {
    const eeGeometry = ee.Geometry.Polygon([geometry.map(coord => [coord.lng, coord.lat])]);

    // Load CHIRPS Precipitation Data
    const dataset = ee.ImageCollection('UCSB-CHG/CHIRPS/DAILY')
        .filterDate('2018-05-01', '2018-05-03')
        .mean()
        .clip(eeGeometry);

    const precipitationVis = {
        min: 1,
        max: 17,
        palette: ['001137', '0aab1e', 'e7eb05', 'ff4a2d', 'e90000']
    };

    // Load SRTM Elevation Data for Contour Lines
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

    // Blend Both Layers Together
    const combinedImage = ee.ImageCollection([
        dataset.visualize(precipitationVis), 
        contourLineImage.visualize({ min: 0, max: 3500, palette: ['yellow', 'red'] })
    ]).mosaic();

    // Generate a URL for the combined image
    const combinedImageUrl = combinedImage.getThumbURL({
        region: eeGeometry,
        dimensions: 1024,
        format: 'png'
    });

    return combinedImageUrl;
};

export default generateCombinedLayer;
