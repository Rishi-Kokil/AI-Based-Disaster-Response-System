import React, { useState, useCallback, useRef, useEffect, useContext } from 'react';
import { GoogleMap, Marker, Polygon, Polyline, InfoWindow, GroundOverlay, useJsApiLoader, OverlayView } from '@react-google-maps/api';
import axios from 'axios';
import PolygonList from './PolygonList';
import LayerCheckbox from './LayerCheckBox';
import RescueMarker from './RescueMarker';
import ToggleSwitch from './ToggleSwitch';
import DisasterReportMarker from './DisasterReportMarker';
import { SnackbarContext } from '@/context'

const GAS_ICON_URL = "https://cdn-icons-png.flaticon.com/512/5193/5193677.png";
const HOSPITAL_ICON_URL = "https://cdn-icons-png.flaticon.com/512/7928/7928713.png";

function MapContainer({ rescueMarkers, setRescueMarkers, }) {

  // State variables
  const [map, setMap] = useState(null);
  const mapRef = useRef(null);

  const [center, setCenter] = useState({ lat: -6.30, lng: 106.80 });
  const [gasStations, setGasStations] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [showRescueMarkers, setShowRescueMarkers] = useState(true);

  const [showGasStations, setShowGasStations] = useState(true);
  const [showHospitals, setShowHospitals] = useState(true);

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

  const [selectedPolygonId, setSelectedPolygonId] = useState(null);
  const [disasterReports, setDisasterReports] = useState([]);

  // Configurations
  const layerConfig = [
    { label: 'Gas Stations', state: showGasStations, setState: setShowGasStations },
    { label: 'Hospitals', state: showHospitals, setState: setShowHospitals },
    { label: 'Flood Mapping', state: showFloodMappingOverlay, setState: setShowFloodMappingOverlay },
    { label: 'Contour Lines', state: showContourLinesOverlay, setState: setShowContourLinesOverlay },
    { label: 'Rescue Points', state: showRescueMarkers, setState: setShowRescueMarkers },
  ];

  const { showSnackbar } = useContext(SnackbarContext)

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: 'AIzaSyBzHWL78g-ZvWNYE3Bki8oi31Y-35ZwTZY',
    libraries: ['places'],
  });


  // Use Effects
  useEffect(() => {
    return () => {
      setContourLinesOverlay(null);
      setShowContourLinesOverlay(false);
    };
  }, []);

  // Clear the ongoing polygon coordinates when the drawing mode is disabled
  useEffect(() => {
    if (!drawingMode && currentPolygonCoords.length) {
      setCurrentPolygonCoords([])
    }
  }, [drawingMode, currentPolygonCoords.length, setCurrentPolygonCoords])

  // Callback functions

  // Fetches the list of disaster reports from the server
  const handleFetchDisasterReports = useCallback(async () => {
    try {
      const { data: { data: reports } } = await axios.get('http://localhost:3000/agency/reports')
      setDisasterReports(reports)
      showSnackbar('Disaster reports fetched successfully', { type: 'success' })
    } catch (error) {
      showSnackbar(`Error fetching disaster reports ${error}`, { type: 'error' })
    }
  }, [setDisasterReports, showSnackbar])

  // Fetch and display contour lines for a polygon
  const handleFetchContourLines = useCallback(async () => {
    const polygon = polygons.find(poly => poly.id === selectedPolygonId);

    if (!polygon) {
      showSnackbar('No polygon selected. Please select a polygon first.', { type: 'error' });
      return;
    }

    if (polygon.coords.length < 3) {
      showSnackbar('Selected polygon is invalid (requires at least 3 points)', { type: 'error' });
      return;
    }

    try {
      const { data: { contourLineUrl } } = await axios.post(
        'http://localhost:3000/agency/fetch-contour-lines',
        { geometry: polygon }
      );

      if (!contourLineUrl) throw new Error('Contour data URL not provided');

      const bounds = new window.google.maps.LatLngBounds();
      polygon.coords.forEach(({ lat, lng }) =>
        bounds.extend(new window.google.maps.LatLng(lat, lng))
      );

      setContourLinesOverlay({
        url: contourLineUrl,
        bounds: {
          north: bounds.getNorthEast().lat(),
          south: bounds.getSouthWest().lat(),
          east: bounds.getNorthEast().lng(),
          west: bounds.getSouthWest().lng(),
        }
      });
      setShowContourLinesOverlay(true);
      showSnackbar('Contour lines generated successfully', { type: 'success' });
    } catch (error) {
      showSnackbar(`Contour Error: ${error.message || 'Failed to generate contours'}`, { type: 'error' });
    }
  }, [polygons, selectedPolygonId, setContourLinesOverlay, setShowContourLinesOverlay, showSnackbar]);

  // Handle marker click: select place, center map, and show info window
  const onMarkerClick = useCallback(place => {
    setSelectedPlace(place)
    setActiveMarker({ lat: place.geometry?.location.lat(), lng: place.geometry?.location.lng() })
    setShowingInfoWindow(true)
  }, [setSelectedPlace, setActiveMarker, setShowingInfoWindow])


  // Renders map markers only when `show` is true
  const renderMarkers = useCallback((places, prefix, iconUrl, show) => {
    if (!show) return null
    return places.map((place, idx) =>
      <Marker
        key={`${prefix}-${idx}`}
        position={{
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng()
        }}
        icon={{ url: iconUrl, scaledSize: new window.google.maps.Size(30, 30) }}
        onClick={() => onMarkerClick(place)}
      />
    )
  }, [onMarkerClick])

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

  const onLoad = useCallback(
    (mapInstance) => {
      setMap(mapInstance);
      mapRef.current = mapInstance;
    },
    []
  );

  const onUnmount = useCallback(() => {
    setMap(null);
    mapRef.current = null;
  }, []);



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

  // Finalize new polygon: hide all others, add this one as visible, select it, and exit draw mode
  const handleFinishPolygon = useCallback(() => {
    if (currentPolygonCoords.length < 3)
      return alert('A polygon requires at least 3 points.')

    const polygonId = Date.now()
    setPolygons(prev => [
      ...prev.map(p => ({ ...p, visible: false })),
      { id: polygonId, coords: currentPolygonCoords, visible: true }
    ])
    setCurrentPolygonCoords([])
    setSelectedPolygonId(polygonId)
    setDrawingMode(false)
  }, [currentPolygonCoords, setPolygons, setCurrentPolygonCoords, setSelectedPolygonId, setDrawingMode
  ])

  const deletePolygon = (id) => setPolygons(prev => prev.filter(poly => poly.id !== id))

  return isLoaded ? (
    <div className="relative w-full h-full bg-light-tertiary dark:bg-dark-tertiary">
      <GoogleMap
        center={center}
        zoom={10}
        onLoad={onLoad}
        onUnmount={onUnmount}
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
        <DisasterReportMarker reports={disasterReports} />
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

      <div className="absolute top-5 left-4 z-10 ">
        <div className='flex flex-col gap-2'>
          <div className="bg-light-tertiary dark:bg-dark-primary shadow-md rounded-md overflow-hidden border border-light-secondary dark:border-dark-secondary">
            <div className="p-3 bg-light-secondary dark:bg-dark-secondary border-b border-light-secondary dark:border-dark-secondary">
              <h3 className="text-sm font-med ium text-light-text-primary dark:text-dark-text-primary">
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

        </div>

      </div>

      <div
        className='absolute top-5 left-44 z-10 flex gap-2 items-start wrap'
      >
        <button
          onClick={() => handleFetchContourLines()}
          className="py-2 px-3 bg-light-accent dark:bg-dark-accent hover:bg-light-accent/90 dark:hover:bg-dark-accent/90 text-light-text-inverted dark:text-dark-text-inverted text-sm font-medium rounded transition duration-150 disabled:opacity-50"
        >
          Fetch Contor Lines
        </button>
        <button
          className=' py-2 px-3   bg-light-accent dark:bg-dark-accent   hover:bg-light-accent/90 dark:hover:bg-dark-accent/90   active:bg-light-accent/80 dark:active:bg-dark-accent/80  text-light-text-inverted dark:text-dark-text-inverted text-sm font-medium rounded transition duration-150 disabled:opacity-50'
          onClick={() => setRescueMarkers([])}
        >
          Clear Rescue Markers
        </button>
        <button
          className=' py-2 px-3   bg-light-accent dark:bg-dark-accent   hover:bg-light-accent/90 dark:hover:bg-dark-accent/90   active:bg-light-accent/80 dark:active:bg-dark-accent/80  text-light-text-inverted dark:text-dark-text-inverted text-sm font-medium rounded transition duration-150 disabled:opacity-50'
          onClick={handleFetchDisasterReports}
        >
          Fetch Disaster Reports
        </button>
        <button
          className=' py-2 px-3   bg-light-accent dark:bg-dark-accent   hover:bg-light-accent/90 dark:hover:bg-dark-accent/90   active:bg-light-accent/80 dark:active:bg-dark-accent/80  text-light-text-inverted dark:text-dark-text-inverted text-sm font-medium rounded transition duration-150 disabled:opacity-50'
          onClick={() => showSnackbar('Flood Mapping is not available yet', { type: 'error' })}
        >
          Fetch Flood Mappings
        </button>

      </div>

      <div className="absolute top-80  left-4 z-10">
        <div className="bg-light-tertiary dark:bg-dark-primary shadow-md rounded-md overflow-hidden border border-light-secondary dark:border-dark-secondary">
          <div className="p-3 bg-light-secondary dark:bg-dark-secondary border-b border-light-secondary dark:border-dark-secondary">
            <h3 className="text-sm font-medium text-light-text-primary dark:text-dark-text-primary">
              Drawing Tools
            </h3>
          </div>
          <div className="p-3 space-y-3 flex flex-col ">
            <div className="flex items-center justify-between">
              <label className="text-sm text-light-text-secondary dark:text-dark-text-secondary flex items-center py-2 px-2">
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


          </div>
        </div>
      </div>

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
              deletePolygon={deletePolygon}
              handleFetchContourLines={handleFetchContourLines}
              selectedPolygonId={selectedPolygonId}
              setSelectedPolygonId={setSelectedPolygonId}
              setPolygons={setPolygons}
            />
          </div>
        </div>
      </div>

    </div >
  ) : (
    <div className="flex items-center justify-center h-full w-full bg-light-tertiary dark:bg-dark-tertiary">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-light-accent dark:border-dark-accent">
        Loading....
      </div>
    </div>
  );
}

export default React.memo(MapContainer);
