import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const MapComponent = () => {
  const [mapData, setMapData] = useState(null);
  const [coordinates, setCoordinates] = useState({ latitude: null, longitude: null });
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    // Fetch the coordinates from the backend Flask app
    fetch('http://localhost:5050/coordinates')
      .then(response => response.json())  // Make sure to return the parsed JSON
      .then(data => {
        console.log('Fetched coordinates:', data); // Log the fetched data for debugging
        setCoordinates(data);  // Set the coordinates in the state
      })
      .catch(error => console.error('Error fetching coordinates:', error));
  }, []);

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
      {/* Check if coordinates are loaded */}
      {coordinates.latitude && coordinates.longitude && mapData ? (
        <div>
          {/* Render the map using Leaflet */}
          <MapContainer
            center={[coordinates.latitude, coordinates.longitude]} // Center the map at the fetched coordinates
            zoom={13}
            style={{ height: '400px', width: '100%' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; <a href=&quot;https://www.openstreetmap.org/copyright&quot;>OpenStreetMap</a> contributors"
            />
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              opacity={opacity}
            />
            <TileLayer
              url={mapData.urlFormat}
              opacity={opacity} // Set the opacity of the tile layer
              attribution="&copy; <a href=&quot;https://earthengine.google.com/&quot;>Google Earth Engine</a> contributors"
            />
            {/* Marker to show the location */}
            <Marker position={[coordinates.latitude, coordinates.longitude]}>
              <Popup>
                Latitude: {coordinates.latitude}, Longitude: {coordinates.longitude}
              </Popup>
            </Marker>
          </MapContainer>

          {/* Slider to control opacity of the map tiles */}
          <div style={{ margin: '10px' }}>
            <label htmlFor="opacitySlider">Opacity: {opacity}</label>
            <input
              type="range"
              id="opacitySlider"
              min="0"
              max="1"
              step="0.1"
              value={opacity}
              onChange={(e) => setOpacity(parseFloat(e.target.value))}  // Update the opacity state
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
