import React, { useState, useCallback } from 'react';
import { GoogleMap, Marker, Polygon, Polyline, InfoWindow, useJsApiLoader } from '@react-google-maps/api';

const initialCenter = { lat: 19.0760, lng: 72.8777 };
const GAS_ICON_URL = "https://cdn-icons-png.flaticon.com/512/5193/5193677.png";
const HOSPITAL_ICON_URL = "https://cdn-icons-png.flaticon.com/512/7928/7928713.png";

const mapStyles = [
  {
    featureType: 'all',
    elementType: 'labels',
    stylers: [{ visibility: 'off' }]
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ visibility: 'on' }]
  },
  {
    featureType: 'poi.medical',
    elementType: 'geometry',
    stylers: [{ visibility: 'on' }]
  },
  {
    featureType: 'poi.gas_station',
    elementType: 'geometry',
    stylers: [{ visibility: 'on' }]
  },
  {
    featureType: 'administrative',
    elementType: 'labels',
    stylers: [{ visibility: 'on' }]
  },
  {
    featureType: 'road',
    elementType: 'labels',
    stylers: [{ visibility: 'on' }]
  }
];

const ToggleSwitch = ({ label, checked, onChange, checkboxClass, labelClass }) => (
  <div className="flex items-center space-x-2">
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      className={`form-checkbox ${checkboxClass}`}
    />
    <span className={labelClass}>{label}</span>
  </div>
);

const PolygonList = ({ polygons, togglePolygonVisibility, deletePolygon }) => (
  <div className="absolute top-0 right-0 m-4 p-4 bg-light-primary dark:bg-dark-primary bg-opacity-80 rounded-lg z-10">
    <h3 className="text-lg font-bold mb-2 text-light-text-primary dark:text-dark-text-primary">
      Polygons
    </h3>
    {polygons.length === 0 ? (
      <div className="text-light-text-secondary dark:text-dark-text-secondary">
        No polygons created yet.
      </div>
    ) : (
      <ul className="space-y-2">
        {polygons.map((polygon, index) => (
          <li key={polygon.id} className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={polygon.visible}
              onChange={() => togglePolygonVisibility(polygon.id)}
              className="form-checkbox h-5 w-5 text-light-accent dark:text-dark-accent"
            />
            <span className="text-light-text-primary dark:text-dark-text-primary">
              Polygon {index + 1}
            </span>
            <button
              onClick={() => deletePolygon(polygon.id)}
              className="text-light-accent dark:text-dark-accent ml-2"
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    )}
  </div>
);

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

  // States for polygon drawing functionality
  const [drawingMode, setDrawingMode] = useState(false);
  const [currentPolygonCoords, setCurrentPolygonCoords] = useState([]);
  const [polygons, setPolygons] = useState([]);

  // States for InfoWindow
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [activeMarker, setActiveMarker] = useState(null);
  const [showingInfoWindow, setShowingInfoWindow] = useState(false);

  // Generic helper to render markers given a list of places.
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

  // Helper to render finished polygons.
  const renderPolygons = () =>
    polygons
      .filter((poly) => poly.visible)
      .map((poly) => (
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

  // Helper to render the in-progress drawing as a polyline.
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
      const radius = 10000; // in meters

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

  // Handle map click: if drawing mode, add polygon coordinate; otherwise, close InfoWindow if open.
  const handleMapClick = (e) => {
    if (drawingMode) {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      setCurrentPolygonCoords((prev) => [...prev, { lat, lng }]);
    } else {
      if (showingInfoWindow) {
        setShowingInfoWindow(false);
        setActiveMarker(null);
      }
    }
  };

  // When a marker is clicked, store its info and show the InfoWindow.
  const onMarkerClick = (place) => {
    setSelectedPlace(place);
    setActiveMarker({
      lat: place.geometry.location.lat(),
      lng: place.geometry.location.lng(),
    });
    setShowingInfoWindow(true);
  };

  // Finish the current polygon (if at least 3 points) and add it to the list.
  const handleFinishPolygon = () => {
    if (currentPolygonCoords.length < 3) {
      alert('A polygon requires at least 3 points.');
      return;
    }
    setPolygons((prev) => [
      ...prev,
      { id: Date.now(), coords: currentPolygonCoords, visible: true },
    ]);
    setCurrentPolygonCoords([]);
  };

  const togglePolygonVisibility = (id) => {
    setPolygons((prev) =>
      prev.map((poly) => (poly.id === id ? { ...poly, visible: !poly.visible } : poly))
    );
  };

  const deletePolygon = (id) => {
    setPolygons((prev) => prev.filter((poly) => poly.id !== id));
  };

  return isLoaded ? (
    <div className="relative w-full h-full">
      <GoogleMap
        center={initialCenter}
        zoom={13}
        onLoad={onLoad}
        onUnmount={onUnmount}
        onIdle={handleIdle}
        onClick={handleMapClick}
        mapContainerClassName="w-full h-full"
        options={{ styles: mapStyles }}
      >
        {renderMarkers(gasStations, 'gas', GAS_ICON_URL, showGasStations)}
        {renderMarkers(hospitals, 'hospital', HOSPITAL_ICON_URL, showHospitals)}
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
        </div>
      </div>

      <PolygonList
        polygons={polygons}
        togglePolygonVisibility={togglePolygonVisibility}
        deletePolygon={deletePolygon}
      />
    </div>
  ) : (
    <></>
  );
}

export default React.memo(MapContainer);
