import React, { useState, useMemo } from 'react';
import { Marker, InfoWindow } from '@react-google-maps/api';

const DisasterReportMarker = React.memo(({ reports }) => {
    const [selectedReport, setSelectedReport] = useState(null);

    const getIcon = (severity) => {
        const base = {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 8,
            strokeWeight: 1,
        };
        switch (severity) {
            case 'High':
                return { ...base, fillColor: '#FF0000', fillOpacity: 0.9, strokeColor: '#CC0000' };
            case 'Medium':
                return { ...base, fillColor: '#FFCC00', fillOpacity: 0.8, strokeColor: '#D9A600' };
            case 'Low':
            default:
                return { ...base, fillColor: '#FFFF66', fillOpacity: 0.7, strokeColor: '#E6E600' };
        }
    };

    const markers = useMemo(
        () =>
            reports.map((report) => (
                <Marker
                    key={report._id}
                    position={{
                        lat: report.location.latitude,
                        lng: report.location.longitude,
                    }}
                    icon={getIcon(report.severity)}
                    onClick={() => setSelectedReport(report)}
                />
            )),
        [reports]
    );

    return (
        <>
            {markers}

            {selectedReport && (
                <InfoWindow
                    position={{
                        lat: selectedReport.location.latitude,
                        lng: selectedReport.location.longitude,
                    }}
                    onCloseClick={() => setSelectedReport(null)}
                >
                    <div className="max-w-xs">
                        <h3 className="text-lg font-bold">
                            {selectedReport.severity} Severity Disaster
                        </h3>
                        <p className="mt-1 text-sm">{selectedReport.description}</p>
                        <p className="mt-2 text-xs text-gray-600">
                            <strong>Reported by:</strong> {selectedReport.user.name}
                        </p>
                        <p className="text-xs text-gray-600">
                            <strong>Uploaded at:</strong>{' '}
                            {new Date(selectedReport.uploadedAt).toLocaleString()}
                        </p>
                        {selectedReport.type === 'image' && (
                            <img
                                src={`data:image/jpeg;base64,${selectedReport.fileData}`}
                                alt={selectedReport.description}
                                className="mt-2 w-full h-auto rounded"
                            />
                        )}
                    </div>
                </InfoWindow>
            )}
        </>
    );
});

export default DisasterReportMarker;
