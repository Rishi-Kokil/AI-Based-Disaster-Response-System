import ee from '@google/earthengine';
import axios from 'axios';

const generateContourLines = async (geometry) => {
    const eeGeometry = ee.Geometry.Polygon([geometry.map(coord => [coord.lng, coord.lat])]);
    const srtm = ee.Image('USGS/SRTMGL1_003');
    const lines = ee.List.sequence(0, 1000, 50);

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
    },
    fetchContourImage: async (req, res) => {
        try {
            const { geometry } = req.body;
            if (!geometry || !geometry.coords || geometry.coords.length < 3) {
                return res.status(400).json({ error: "Invalid geometry" });
            }

            // Generate Earth Engine image URL
            const contourLineUrl = await generateContourLines(geometry.coords);
            
            // Fetch the PNG image from EE
            // const imageResponse = await axios.get(contourLineUrl, {
            //     responseType: 'arraybuffer'
            // });

            // // Convert to base64 for Flask API
            // const imageBase64 = Buffer.from(imageResponse.data, 'binary').toString('base64');

            // // Send to Flask processing endpoint
            // const flaskResponse = await axios.post('http://localhost:5000/contour/image', {
            //     image: imageBase64
            // });

            // // Get processed image from Flask response
            // const processedImage = Buffer.from(flaskResponse.data.processed_image, 'base64');

            // // Send final image to client
            // res.set('Content-Type', 'image/png');
            // res.send(processedImage);

        } catch (error) {
            console.error('Error processing contour image:', error);
            res.status(500).json({ 
                error: 'Failed to process contour image',
                details: error.message 
            });
        }
    }
};

export default contourController;