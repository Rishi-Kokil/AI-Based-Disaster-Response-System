import React, { useState, useCallback, useRef } from 'react';
import { GoogleMap, Marker, Polygon, Polyline, InfoWindow, GroundOverlay, useJsApiLoader, OverlayView } from '@react-google-maps/api';

import React, { useState, useCallback, useEffect } from 'react';
import { GoogleMap, Marker, Polygon, Polyline, InfoWindow, GroundOverlay, useJsApiLoader } from '@react-google-maps/api';
import axios from 'axios';
import PolygonList from './PolygonList';
import LayerCheckbox from './LayerCheckBox';
import RescueMarker from './RescueMarker';

const initialCenter = { lat: -6.30, lng: 106.80 };
const GAS_ICON_URL = "https://cdn-icons-png.flaticon.com/512/5193/5193677.png";
const HOSPITAL_ICON_URL = "https://cdn-icons-png.flaticon.com/512/7928/7928713.png";

function MapContainer({
  rescueMarkers,
  setRescueMarkers,
}) {
const mapStyles = [
  { featureType: 'all', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ visibility: 'on' }] },
  { featureType: 'poi.medical', elementType: 'geometry', stylers: [{ visibility: 'on' }] },
  { featureType: 'poi.gas_station', elementType: 'geometry', stylers: [{ visibility: 'on' }] },
  { featureType: 'administrative', elementType: 'labels', stylers: [{ visibility: 'on' }] },
  { featureType: 'road', elementType: 'labels', stylers: [{ visibility: 'on' }] }
];

function MapContainer() {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: 'AIzaSyBzHWL78g-ZvWNYE3Bki8oi31Y-35ZwTZY',
    libraries: ['places'],
  });

  const [map, setMap] = useState(null);
  const mapRef = useRef(null);

  const [gasStations, setGasStations] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [showRescueMarkers, setShowRescueMarkers] = useState(true);

  const [showGasStations, setShowGasStations] = useState(true);
  const [showHospitals, setShowHospitals] = useState(true);
  const [locationMappings, setLocationMappings] = useState([]);
  const [showLocationMappings, setShowLocationMappings] = useState(false);

  const [drawingMode, setDrawingMode] = useState(false);
  const [currentPolygonCoords, setCurrentPolygonCoords] = useState([]);
  const [polygons, setPolygons] = useState([]);

  const [floodMappingOverlay, setFloodMappingOverlay] = useState(null);
  const [showFloodMappingOverlay, setShowFloodMappingOverlay] = useState(false);
  const [contourLinesOverlay, setContourLinesOverlay] = useState(null);
  const [showContourLinesOverlay, setShowContourLinesOverlay] = useState(false);

  const [selectedPlace, setSelectedPlace] = useState(null);
  const [activeMarker, setActiveMarker] = useState(null);
  const [showingInfoWindow, setShowingInfoWindow] = useState(false);

  const [isContourLoading, setIsContourLoading] = useState(false);

  useEffect(() => {
    return () => {
      setContourLinesOverlay(null);
      setShowContourLinesOverlay(false);
    };
  }, []);

  const fetchCountourMappings = async (polygon) => {
    try {
      const response = await axios.post('http://localhost:3000/agency/fetch-contour-image', {
        geometry: polygon,
      });
  
      if (Array.isArray(response.data)) {
        setLocationMappings(response.data);
        setShowLocationMappings(true);
      } else {
        console.error('Unexpected response format:', response.data);
      }
    } catch (error) {
      console.error('Error fetching location mappings:', error);
      throw error;
    }
  };

  const layerConfig = [
    { label: 'Gas Stations', state: showGasStations, setState: setShowGasStations },
    { label: 'Hospitals', state: showHospitals, setState: setShowHospitals },
    { label: 'Flood Mapping', state: showFloodMappingOverlay, setState: setShowFloodMappingOverlay },
    { label: 'Contour Lines', state: showContourLinesOverlay, setState: setShowContourLinesOverlay },
    { label: 'Rescue Points', state: showRescueMarkers, setState: setShowRescueMarkers },
  ];


  const handleFetchContourLines = async (polygon) => {
    if (!polygon?.coords || polygon.coords.length < 3) {
      alert('Please draw and select a valid polygon first');
      return;
    }

    try {
      setIsContourLoading(true);
      const response = await axios.post('http://localhost:3000/agency/fetch-contour-lines', {
        geometry: polygon,
      });
      
      if (!response.data.contourLineUrl) {
        throw new Error('No contour data received');
      }

      // Fix 3: Convert coordinates properly
      const coords = polygon.coords;
      const bounds = new window.google.maps.LatLngBounds();
      coords.forEach(coord => bounds.extend(new window.google.maps.LatLng(coord.lat, coord.lng)));
      
      setContourLinesOverlay({
        url: response.data.contourLineUrl,
        bounds: {
          north: bounds.getNorthEast().lat(),
          south: bounds.getSouthWest().lat(),
          east: bounds.getNorthEast().lng(),
          west: bounds.getSouthWest().lng(),
        }
      });
      
      const lats = polygon.coords.map(c => c.lat);
      const lngs = polygon.coords.map(c => c.lng);
      const bounds = {
        north: Math.max(...lats),
        south: Math.min(...lats),
        east: Math.max(...lngs),
        west: Math.min(...lngs),
      };

      setContourLinesOverlay({ url: contourLineUrl, bounds });
      setShowContourLinesOverlay(true);
    } catch (error) {
      console.error('Contour error:', error);
      alert(`Contour Error: ${error.message || 'Failed to generate contours'}`);
    } finally {
      setIsContourLoading(false);
    }
  };

  const handleProcessImage = async () => {
    setIsProcessing(true);
    try {
      const mapElement = document.querySelector('.google-map-container');
      const canvas = await html2canvas(mapElement);
      const imageData = canvas.toDataURL('image/png').split(',')[1];

      const response = await axios.post('http://localhost:5000/process-image', {
        image: imageData
      });

      setProcessedImage(response.data.processed_image);
    } catch (error) {
      console.error('Image processing error:', error);
      alert('Failed to process image');
    } finally {
      setIsProcessing(false);
    }
  };

  const renderMarkers = (places, prefix, iconUrl, show) => {
    if (!show) return null;
    return places.map((place, index) => {
      const pos = {
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
      };
      return (
        <Marker
          key={`${prefix}-${index}`}
          position={pos}
          icon={{ url: iconUrl, scaledSize: new window.google.maps.Size(30, 30) }}
          onClick={() => onMarkerClick(place)}
        />
      );
    });
  };

  const renderLocationMappingsMarkers = () => {
    if (!showLocationMappings) return null;
    return locationMappings.map((location, index) => (
      <Marker
        key={`location-${index}`}
        position={{ lat: location.lat, lng: location.lng }}
        onClick={() => onMarkerClick(location)}
      />
    ));
  };

  const renderPolygons = () =>
    polygons
      .filter(poly => poly.visible)
      .map(poly => (
        <Polygon
          key={poly.id}
          paths={poly.coords}
          strokeColor="#4285F4"
          strokeOpacity={0.8}
          strokeWeight={2}
          fillColor="#4285F4"
          fillOpacity={0.35}
        />
      ));

  const renderDrawingPolyline = () =>
    drawingMode && currentPolygonCoords.length > 0 ? (
      <Polyline
        path={currentPolygonCoords}
        options={{
          strokeColor: '#4285F4',
          strokeOpacity: 0.8,
          strokeWeight: 2,
        }}
      />
    ) : null;

  const fetchNearbyPlaces = useCallback(
    (centerLocation, mapInstance = map) => {
      if (!mapInstance) return;
    }, [map]);

  const onLoad = useCallback(
    (mapInstance) => {
      setMap(mapInstance);
      mapRef.current = mapInstance;
      fetchNearbyPlaces(initialCenter, mapInstance);
    },
    [fetchNearbyPlaces]
  );

  const onUnmount = useCallback(() => {
    setMap(null);
    mapRef.current = null;
  }, []);

  const handleIdle = () => {
    if (map) {
      const newCenter = map.getCenter();
      fetchNearbyPlaces(newCenter, map);
    }
  };

  const handleMapClick = (e) => {
    console.log("Map clicked so the Markers List before is ", rescueMarkers);

    if (drawingMode) {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      setCurrentPolygonCoords(prev => [...prev, { lat, lng }]);
    } else {
      if (showingInfoWindow) {
        setShowingInfoWindow(false);
        setActiveMarker(null);
      }

      setRescueMarkers(prev => [
        ...prev,
        {
          id: Date.now(),
          lat: e.latLng.lat(),
          lng: e.latLng.lng()
        }
      ]);
    }
  };

  const onMarkerClick = (place) => {
    setSelectedPlace(place);
    setActiveMarker({
      lat: place.geometry?.location.lat(),
      lng: place.geometry?.location.lng(),
    });
    setShowingInfoWindow(true);
  };

  const handleFinishPolygon = () => {
    if (currentPolygonCoords.length < 3) {
      alert('A polygon requires at least 3 points.');
      return;
    }
    setPolygons(prev => [
      ...prev,
      { id: Date.now(), coords: currentPolygonCoords, visible: true },
    ]);
    setCurrentPolygonCoords([]);
    setDrawingMode(false);
  };

  const togglePolygonVisibility = (id) => {
    setPolygons(prev =>
      prev.map(poly => (poly.id === id ? { ...poly, visible: !poly.visible } : poly))
    );
  };

  const deletePolygon = (id) => {
    setPolygons(prev => prev.filter(poly => poly.id !== id));
  };

  const fetchLocationMappings = async () => {
    try {
      const response = await axios.get('http://localhost:3000/agency/locationMapping');
      setLocationMappings(response.data);
      setShowLocationMappings(true);
    } catch (error) {
      console.error('Error fetching location mappings:', error);
    }
  };

  const handlePolygonRequest = async (polygon) => {
    try {
      const response = await axios.post('http://localhost:3000/agency/floopMapping', { geometry: polygon });
      const { floodMapUrl } = response.data;

      const lats = polygon.coords.map(c => c.lat);
      const lngs = polygon.coords.map(c => c.lng);
      const bounds = {
        north: Math.max(...lats),
        south: Math.min(...lats),
        east: Math.max(...lngs),
        west: Math.min(...lngs),
      };
      console.log("Flood Map URL: ", floodMapUrl);

      setFloodMappingOverlay({ id: polygon.id, url: floodMapUrl, bounds });
      setShowFloodMappingOverlay(true);
    } catch (error) {
      console.error('Error making request:', error);
    }
  };

  return isLoaded ? (
    <div className="relative w-full h-full bg-light-tertiary dark:bg-dark-tertiary">
      <GoogleMap
        center={initialCenter}
        zoom={10}
        onLoad={onLoad}
        onUnmount={onUnmount}
        onIdle={handleIdle}
        onClick={handleMapClick}
        mapContainerClassName="w-full h-full"
        options={{
          fullscreenControl: false,
          mapTypeControl: false,
          streetViewControl: true,
          zoomControl: true,
          zoomControlOptions: {
            position: window.google.maps.ControlPosition.RIGHT_BOTTOM
          },
          backgroundColor: "var(--color-light-tertiary)"
        }}
      >
        {renderMarkers(gasStations, "gas", GAS_ICON_URL, showGasStations)}
        {renderMarkers(hospitals, "hospital", HOSPITAL_ICON_URL, showHospitals)}
        {renderLocationMappingsMarkers()}
        {renderPolygons()}
        {renderDrawingPolyline()}

        {rescueMarkers.length > 0 && showRescueMarkers && rescueMarkers.map(marker => (
          <RescueMarker
            key={marker.id}
            lat={marker.lat}
            lng={marker.lng}
            onRemove={() => setRescueMarkers(prev => prev.filter(m => m.id !== marker.id))}
          />
        ))}

        {showingInfoWindow && activeMarker && (
          <InfoWindow
            position={activeMarker}
            onCloseClick={() => {
              setShowingInfoWindow(false);
              setActiveMarker(null);
            }}
          >
            <div className="p-3 w-64 rounded-lg bg-light-tertiary dark:bg-dark-primary shadow-lg">
              <h2 className="text-light-text-primary dark:text-dark-text-primary font-medium text-lg mb-1">
                {selectedPlace?.name}
              </h2>
              {selectedPlace?.vicinity && (
                <p className="text-light-text-secondary dark:text-dark-text-secondary text-sm">
                  {selectedPlace.vicinity}
                </p>
              )}
              {selectedPlace?.types && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {selectedPlace.types.slice(0, 3).map((type, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-light-accent/20 dark:bg-dark-accent/30 text-light-accent dark:text-dark-accent text-xs rounded-full"
                    >
                      {type.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </InfoWindow>
        )}

        {showFloodMappingOverlay && floodMappingOverlay && (
          <GroundOverlay
            url={floodMappingOverlay.url}
            bounds={floodMappingOverlay.bounds}
            options={{ opacity: 0.2 }}
          />
        )}

        {showContourLinesOverlay && contourLinesOverlay && (
          <GroundOverlay
            key="contour-overlay"
            url={contourLinesOverlay.url}
            bounds={contourLinesOverlay.bounds}
            options={{ opacity: 0.4 }}
          />
        )}
      </GoogleMap>


      <>
        <div className="absolute top-5 left-4 z-10">
          <div
            className='flex flex-col gap-2'
          >
            <div className="bg-light-tertiary dark:bg-dark-primary shadow-md rounded-md overflow-hidden border border-light-secondary dark:border-dark-secondary">
              <div className="p-3 bg-light-secondary dark:bg-dark-secondary border-b border-light-secondary dark:border-dark-secondary">
                <h3 className="text-sm font-medium text-light-text-primary dark:text-dark-text-primary">
                  Map Layers
                </h3>
              </div>
              <div className="p-3 space-y-2">
                {layerConfig.map((layer, index) => (
                  <LayerCheckbox
                    key={index}
                    label={layer.label}
                    checked={layer.state}
                    onChange={() => layer.setState(!layer.state)}
                  />
                ))}
              </div>
            </div>
            <button
              className='text-sm font-medium rounded-sm p-2 '
            >
              Clear Rescue Markers
            </button>
          </div>
        </div>

        <div className="absolute top-72 left-4 z-10">
          <div className="bg-light-tertiary dark:bg-dark-primary shadow-md rounded-md overflow-hidden border border-light-secondary dark:border-dark-secondary">
            <div className="p-3 bg-light-secondary dark:bg-dark-secondary border-b border-light-secondary dark:border-dark-secondary">
              <h3 className="text-sm font-medium text-light-text-primary dark:text-dark-text-primary">
                Drawing Tools
              </h3>
            </div>
            <div className="p-3 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm text-light-text-secondary dark:text-dark-text-secondary flex items-center py-2">
                  <input
                    type="checkbox"
                    checked={drawingMode}
                    onChange={() => setDrawingMode(!drawingMode)}
                    className="mr-2  h-5 w-5 text-light-accent dark:text-dark-accent focus:ring-light-accent dark:focus:ring-dark-accent rounded border-light-secondary dark:border-dark-secondary"
                  />
                  Drawing Mode
                </label>

                {drawingMode && (
                  <button
                    onClick={handleFinishPolygon}
                    className="py-2 px-3 bg-light-accent dark:bg-dark-accent hover:bg-light-accent/90 dark:hover:bg-dark-accent/90 text-light-text-inverted dark:text-dark-text-inverted text-sm font-medium rounded transition duration-150 disabled:opacity-50"
                    disabled={currentPolygonCoords.length < 3}
                  >
                    Finish Polygon
                  </button>
                )}
              </div>


              <button
                onClick={fetchLocationMappings}
                className="py-2 px-3 bg-light-tertiary dark:bg-dark-primary border border-light-secondary dark:border-dark-secondary hover:bg-light-secondary/50 dark:hover:bg-dark-secondary/50 text-light-text-primary dark:text-dark-text-primary text-sm font-medium rounded transition duration-150"
              >
                Fetch Location Mappings From GEE
              </button>
            </div>
          )}
          <div className="px-4 py-2 bg-light-primary dark:bg-dark-primary bg-opacity-80 rounded-lg">
            <ToggleSwitch
              label="Flood Mapping"
              checked={showFloodMappingOverlay}
              onChange={() =>
                setShowFloodMappingOverlay(!showFloodMappingOverlay)
              }
              checkboxClass="h-4 w-4 text-light-accent dark:text-dark-accent"
              labelClass="text-light-accent dark:text-dark-accent font-medium"
            />
          </div>
          <div className="px-4 py-2 bg-light-primary dark:bg-dark-primary bg-opacity-80 rounded-lg">
            <ToggleSwitch
              label="Contour Lines"
              checked={showContourLinesOverlay}
              onChange={() =>
                setShowContourLinesOverlay(!showContourLinesOverlay)
              }
              checkboxClass="h-4 w-4 text-light-accent dark:text-dark-accent"
              labelClass="text-light-accent dark:text-dark-accent font-medium"
            />
          </div>
        </div>
      </div>
            </div>
          </div>
        </div>

      <div className="absolute top-0 right-0 m-2 z-10">
        <button
          // onClick={fetchLocationMappings}
          onClick={handleFetchContourLines}
          className="px-4 py-2 bg-light-primary dark:bg-dark-primary bg-opacity-80 rounded-lg text-light-text-inverted dark:text-dark-text-inverted"
        >
          Fetch Location Mappings
        </button>
      </div>

      <PolygonList
        polygons={polygons}
        togglePolygonVisibility={togglePolygonVisibility}
        deletePolygon={deletePolygon}
        // handlePolygonRequest={handlePolygonRequest}
        handlePolygonRequest={handleFetchContourLines}
        handleFetchContourLines={handleFetchContourLines} // Ensure proper prop name
        handleContourRequest={fetchCountourMappings}
      />
        <div className="fixed bottom-15 left-4 max-w-xl z-10">
          <div className="bg-light-tertiary dark:bg-dark-primary shadow-lg rounded-md max-h-50 border border-light-secondary dark:border-dark-secondary">
            <div className="p-3 bg-light-secondary dark:bg-dark-secondary border-b border-light-secondary dark:border-dark-secondary overflow-hidden">
              <h3 className="text-sm font-medium text-light-text-primary dark:text-dark-text-primary">
                Drawn Polygons
              </h3>
            </div>
            <div className="p-2 overflow-y-auto custom-scrollbar">
              <PolygonList
                polygons={polygons}
                togglePolygonVisibility={togglePolygonVisibility}
                deletePolygon={deletePolygon}
                handlePolygonRequest={handlePolygonRequest}
                handleFetchContourLines={handleFetchContourLines}
              />
            </div>
          </div>
        </div>
      </>


    </div>
  ) : (
    <div className="flex items-center justify-center h-full w-full bg-light-tertiary dark:bg-dark-tertiary">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-light-accent dark:border-dark-accent">
        Loading....
      </div>
    </div>
  );
}

export default React.memo(MapContainer);
