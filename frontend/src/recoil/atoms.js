import { atom } from 'recoil';

export const gasStationsAtom = atom({
  key: 'gasStations',
  default: [],
});

export const hospitalsAtom = atom({
  key: 'hospitals',
  default: [],
});

export const rescueMarkersAtom = atom({
  key: 'rescueMarkers',
  default: [],
});

export const showRescueMarkersAtom = atom({
  key: 'showRescueMarkers',
  default: true,
});

export const showGasStationsAtom = atom({
  key: 'showGasStations',
  default: true,
});

export const showHospitalsAtom = atom({
  key: 'showHospitals',
  default: true,
});

export const locationMappingsAtom = atom({
  key: 'locationMappings',
  default: [],
});

export const showLocationMappingsAtom = atom({
  key: 'showLocationMappings',
  default: false,
});

export const drawingModeAtom = atom({
  key: 'drawingMode',
  default: false,
});

export const currentPolygonCoordsAtom = atom({
  key: 'currentPolygonCoords',
  default: [],
});

export const polygonsAtom = atom({
  key: 'polygons',
  default: [],
});

export const floodMappingOverlayAtom = atom({
  key: 'floodMappingOverlay',
  default: null,
});

export const showFloodMappingOverlayAtom = atom({
  key: 'showFloodMappingOverlay',
  default: false,
});

export const contourLinesOverlayAtom = atom({
  key: 'contourLinesOverlay',
  default: null,
});

export const showContourLinesOverlayAtom = atom({
  key: 'showContourLinesOverlay',
  default: false,
});