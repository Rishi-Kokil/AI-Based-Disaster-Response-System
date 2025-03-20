import ee from '@google/earthengine';

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

const contourController = {
    fetchContourLines: async (req, res) => {
        try {
            const { geometry } = req.body;
            if (!geometry || !geometry.coords || geometry.coords.length < 3) {
                return res.status(400).json({ error: "Invalid geometry" });
            }

            const contourLineUrl = await generateContourLines(geometry.coords);
            res.json({ contourLineUrl });
        } catch (error) {
            console.error('Error generating contour lines:', error);
            res.status(500).json({ error: 'Failed to generate contour lines' });
        }
    }
};

export default contourController;