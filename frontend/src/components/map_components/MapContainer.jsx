import React, { useState, useCallback, useEffect } from 'react';
import { GoogleMap, Marker, Polygon, Polyline, InfoWindow, GroundOverlay, useJsApiLoader } from '@react-google-maps/api';
import axios from 'axios';
import ToggleSwitch from './ToggleSwitch';
import PolygonList from './PolygonList';


const initialCenter = { lat: -6.30, lng: 106.80 };
const GAS_ICON_URL = "https://cdn-icons-png.flaticon.com/512/5193/5193677.png";
const HOSPITAL_ICON_URL = "https://cdn-icons-png.flaticon.com/512/7928/7928713.png";

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
  const [gasStations, setGasStations] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [showGasStations, setShowGasStations] = useState(true);
  const [showHospitals, setShowHospitals] = useState(true);
  const [locationMappings, setLocationMappings] = useState([]);
  const [showLocationMappings, setShowLocationMappings] = useState(false);

  // Polygon drawing states
  const [drawingMode, setDrawingMode] = useState(false);
  const [currentPolygonCoords, setCurrentPolygonCoords] = useState([]);
  const [polygons, setPolygons] = useState([]);

  // Flood mapping overlay state
  const [floodMappingOverlay, setFloodMappingOverlay] = useState(null);
  const [showFloodMappingOverlay, setShowFloodMappingOverlay] = useState(false);

  // Contour lines overlay state
  const [contourLinesOverlay, setContourLinesOverlay] = useState(null);
  const [showContourLinesOverlay, setShowContourLinesOverlay] = useState(false);

  // InfoWindow states
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

  // Fetch contour lines for a polygon
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
      
      setShowContourLinesOverlay(true);
    } catch (error) {
      console.error('Contour error:', error);
      alert(`Contour Error: ${error.message || 'Failed to generate contours'}`);
    } finally {
      setIsContourLoading(false);
    }
  };

  // Render markers
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

  // Render finished polygons
  const renderPolygons = () =>
    polygons
      .filter(poly => poly.visible)
      .map(poly => (
        <Polygon
          key={poly.id}
          paths={poly.coords}
          strokeColor="var(--color-light-accent)"
          strokeOpacity={0.8}
          strokeWeight={2}
          fillColor="var(--color-light-accent)"
          fillOpacity={0.35}
          className="dark:stroke-dark-accent dark:fill-dark-accent"
        />
      ));

  // Render drawing polyline
  const renderDrawingPolyline = () =>
    drawingMode && currentPolygonCoords.length > 0 ? (
      <Polyline
        path={currentPolygonCoords}
        options={{
          strokeColor: 'var(--color-light-accent)',
          strokeOpacity: 0.8,
          strokeWeight: 2,
          className: 'dark:stroke-dark-accent',
        }}
      />
    ) : null;

  const fetchNearbyPlaces = useCallback(
    (centerLocation, mapInstance = map) => {
      if (!mapInstance) return;
      const service = new window.google.maps.places.PlacesService(mapInstance);
      const radius = 20000; // in meters

      // Fetch gas stations
      service.nearbySearch(
        { location: centerLocation, radius, type: 'gas_station' },
        (results, status) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
            setGasStations(results);
          }
        }
      );

      // Fetch hospitals
      service.nearbySearch(
        { location: centerLocation, radius, type: 'hospital' },
        (results, status) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
            setHospitals(results);
          }
        }
      );
    },
    [map]
  );

  const onLoad = useCallback(
    (mapInstance) => {
      setMap(mapInstance);
      fetchNearbyPlaces(initialCenter, mapInstance);
    },
    [fetchNearbyPlaces]
  );

  const onUnmount = useCallback(() => setMap(null), []);

  const handleIdle = () => {
    if (map) {
      const newCenter = map.getCenter();
      fetchNearbyPlaces(newCenter, map);
    }
  };

  // Map click: add polygon coordinate in drawing mode or close InfoWindow
  const handleMapClick = (e) => {
    if (drawingMode) {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      setCurrentPolygonCoords(prev => [...prev, { lat, lng }]);
    } else {
      if (showingInfoWindow) {
        setShowingInfoWindow(false);
        setActiveMarker(null);
      }
    }
  };

  // Marker click: show InfoWindow
  const onMarkerClick = (place) => {
    setSelectedPlace(place);
    setActiveMarker({
      lat: place.geometry.location.lat(),
      lng: place.geometry.location.lng(),
    });
    setShowingInfoWindow(true);
  };

  // Finish polygon drawing
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
      throw error;
    }
  };

  // Handle flood mapping request for a polygon
  const handlePolygonRequest = async (polygon) => {
    try {
      const response = await axios.post('http://localhost:3000/agency/floopMapping', { geometry: polygon });
      // Response: { id, floodMapUrl }
      const { floodMapUrl } = response.data;

      // Compute bounds from polygon.coords
      const lats = polygon.coords.map(c => c.lat);
      const lngs = polygon.coords.map(c => c.lng);
      const bounds = {
        north: Math.max(...lats),
        south: Math.min(...lats),
        east: Math.max(...lngs),
        west: Math.min(...lngs),
      };

      setTimeout(() => {
        setFloodMappingOverlay({ id: polygon.id, url: floodMapUrl, bounds });
      }, 7000)

      setShowFloodMappingOverlay(true);
      console.log('Flood mapping overlay set:', floodMapUrl);
    } catch (error) {
      console.error('Error making request:', error);
    }
  };

  return isLoaded ? (
    <div className="relative w-full h-full">
      <GoogleMap
        center={initialCenter}
        zoom={10}
        onLoad={onLoad}
        onUnmount={onUnmount}
        onIdle={handleIdle}
        onClick={handleMapClick}
        mapContainerClassName="w-full h-full"
        options={{ styles: mapStyles }}
      >
        {renderMarkers(gasStations, "gas", GAS_ICON_URL, showGasStations)}
        {renderMarkers(hospitals, "hospital", HOSPITAL_ICON_URL, showHospitals)}
        {renderLocationMappingsMarkers()}
        {renderPolygons()}
        {renderDrawingPolyline()}
        {showingInfoWindow && activeMarker && (
          <InfoWindow
            position={activeMarker}
            onCloseClick={() => {
              setShowingInfoWindow(false);
              setActiveMarker(null);
            }}
          >
            <div className="p-2 w-40 rounded-lg bg-white dark:bg-white">
              <h1 className="text-light-text-primary dark:text-light-text-primary font-bold text-center">
                {selectedPlace?.name}
              </h1>
            </div>
          </InfoWindow>
        )}
        {showFloodMappingOverlay && floodMappingOverlay && (
          <GroundOverlay
            url={floodMappingOverlay.url}
            bounds={floodMappingOverlay.bounds}
            options={{ opacity: showFloodMappingOverlay ? 1 : 0 }}
          />
        )}
        {showContourLinesOverlay && contourLinesOverlay && (
          <GroundOverlay
            key="contour-overlay"
            url={contourLinesOverlay.url}
            bounds={contourLinesOverlay.bounds}
            options={{
              opacity: 0.7,
              clickable: false,
            }}
          />
        )}
      </GoogleMap>

      <div className="absolute top-0 left-0 m-2 z-10 flex gap-6 bg-transparent">
        <div className="flex space-x-4">
          <div className="px-4 py-2 bg-light-primary dark:bg-dark-primary bg-opacity-80 rounded-lg">
            <ToggleSwitch
              label="Gas Stations"
              checked={showGasStations}
              onChange={() => setShowGasStations(!showGasStations)}
              checkboxClass="h-4 w-4"
              labelClass="text-light-text-inverted dark:text-light-tertiary font-medium"
            />
          </div>
          <div className="px-4 py-2 bg-light-primary dark:bg-dark-primary bg-opacity-80 rounded-lg">
            <ToggleSwitch
              label="Hospitals"
              checked={showHospitals}
              onChange={() => setShowHospitals(!showHospitals)}
              checkboxClass="h-5 w-5 text-light-accent dark:text-dark-accent"
              labelClass="text-light-accent dark:text-dark-accent font-medium"
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-light-primary dark:bg-dark-primary bg-opacity-80 rounded-lg">
            <ToggleSwitch
              label="Drawing Mode"
              checked={drawingMode}
              onChange={() => setDrawingMode(!drawingMode)}
              checkboxClass="h-4 w-4 text-light-accent dark:text-dark-accent"
              labelClass="text-light-accent dark:text-dark-accent font-medium"
            />
          </div>
          {drawingMode && (
            <div className="px-3 py-1 bg-light-accent dark:bg-dark-accent bg-opacity-80 rounded-lg">
              <button
                onClick={handleFinishPolygon}
                className="text-light-text-inverted dark:text-dark-text-inverted text-sm"
                disabled={currentPolygonCoords.length < 3}
              >
                Finish Polygon
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
      />
    </div>
  ) : (
    <></>
  );
}

export default React.memo(MapContainer);