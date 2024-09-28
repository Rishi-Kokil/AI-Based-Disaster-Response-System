import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

const MapComponent = () => {
  const [mapData, setMapData] = useState(null);
  const [opacity, setOpacity] = useState(0.5); // Initial opacity

  useEffect(() => {
    const fetchMapData = async () => {
      try {
        const response = await fetch('http://localhost:5000/flood-mapping');

        if (!response.ok) {
          throw new Error('Network response was not ok');
        }

        const data = await response.json();
        console.log(data);
        setMapData(data);

      } catch (err) {
        console.error('Error fetching map data:', err);
      }
    };

    fetchMapData();
  }, []);

  return (
    <div>
      {mapData ? (
        <div>
          <MapContainer center={[-6.2088, 106.8456]} zoom={10} style={{ height: '500px', width: '100%' }}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; <a href=&quot;https://www.openstreetmap.org/copyright&quot;>OpenStreetMap</a> contributors"
            />
            <TileLayer
              url={mapData.urlFormat}
              opacity={opacity} // Set the opacity of the tile layer
              attribution="&copy; <a href=&quot;https://earthengine.google.com/&quot;>Google Earth Engine</a> contributors"
            />
          </MapContainer>
          <div style={{ margin: '10px' }}>
            <label htmlFor="opacitySlider">Opacity: {opacity}</label>
            <input
              type="range"
              id="opacitySlider"
              min="0"
              max="1"
              step="0.1"
              value={opacity}
              onChange={(e) => setOpacity(parseFloat(e.target.value))} // Update opacity based on slider
            />
          </div>
        </div>
      ) : (
        <p>Loading map...</p>
      )}
    </div>
  );
};

export default MapComponent;
