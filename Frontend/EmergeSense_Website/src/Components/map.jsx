import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

const MapComponent = () => {
  const [mapData, setMapData] = useState(null);
  useEffect
  useEffect(() => { 
    const fetchMapData = async () => {
      try {
        // Fetch map data from your backend API
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
        <MapContainer center={[-6.2088, 106.8456]} zoom={10} style={{ height: '500px', width: '100%' }}>
          <TileLayer
            url={mapData.urlFormat}
            attribution="&copy; <a href=&quot;https://earthengine.google.com/&quot;>Google Earth Engine</a> contributors"
          />
        </MapContainer>
      ) : (
        <p>Loading map...</p>
      )}
    </div>
  );
};

export default MapComponent;

