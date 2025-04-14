import React from 'react';
import { OverlayView } from '@react-google-maps/api';

const RescueMarker = ({ lat, lng, onRemove }) => {
  return (
    <OverlayView
      position={{ lat, lng }}
      mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
    >
      <div className="relative left-1/2 top-1/2">

        <div className="absolute w-[40px] h-[40px] rounded-full bg-blue-900  bg-opacity-80 transform -translate-x-1/2 -translate-y-1/2 z-10 animate-pulse"></div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="absolute top-[-10px] right-[-10px] bg-white border border-gray-300 rounded-full w-[24px] h-[24px] cursor-pointer z-30"
        >
          X
        </button>

      </div>
    </OverlayView>
  );
};

export default React.memo(RescueMarker);
