import React, { useMemo } from 'react';
import { Marker } from '@react-google-maps/api';

const MapMarker = React.memo(({ 
  showLocationMappings, 
  locationMappings,
  onMarkerClick
}) => {
  const markers = useMemo(() => {
    if (!showLocationMappings) return null;
    
    return locationMappings.map((location, index) => (
      <Marker
        key={`location-${index}`}
        position={{ lat: location.lat, lng: location.lng }}
        onClick={() => onMarkerClick(location)}
      />
    ));
  }, [showLocationMappings, locationMappings, onMarkerClick]);

  return markers;
});

export default MapMarker;