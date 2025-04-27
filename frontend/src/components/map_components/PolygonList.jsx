import React from 'react';

function PolygonList({
    polygons,
    deletePolygon,
    handlePolygonRequest,
    handleContourRequest = null,
    selectedPolygonId,
    setSelectedPolygonId,
    setPolygons
}) {

    const togglePolygonVisibilityBatch = (selectedId) => {
        console.log(selectedId);
        console.log(polygons);
        
        
        const updatedPolygons = polygons.map(polygon => ({
            ...polygon,
            visible: polygon.id === selectedId
        }));
        setPolygons(updatedPolygons);
    };

    const handlePolygonSelect = (polygonId) => {
        setSelectedPolygonId(prevSelectedId => {
            if (prevSelectedId === polygonId) {
                togglePolygonVisibilityBatch(null); // Deselect all
                return null;
            } else {
                togglePolygonVisibilityBatch(polygonId); // Select the clicked polygon
                return polygonId;
            }
        });
    };

    return (
        <>
            {polygons.length === 0 ? (
                <div className="text-light-text-secondary dark:text-dark-text-secondary m-2">
                    No polygons created yet.
                </div>
            ) : (
                <ul className="space-y-2">
                    {polygons.map((polygon, index) => (
                        <li key={polygon.id} className="flex items-center space-x-2">
                            <input
                                type="radio"
                                name="polygon-selection"
                                checked={selectedPolygonId === polygon.id}
                                onClick={() => handlePolygonSelect(polygon.id)}
                                className="form-radio h-5 w-5 text-light-accent dark:text-dark-accent"
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
                            <button
                                onClick={() => handlePolygonRequest(polygon)}
                                className="text-light-accent dark:text-dark-accent ml-2 cursor-pointer"
                            >
                                Request Flood Mapping
                            </button>
                            <button
                                onClick={() => handleContourRequest(polygon)}
                                className="text-light-accent dark:text-dark-accent ml-2 cursor-pointer"
                            >
                                Request Contour
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </>
    );
}

export default PolygonList;
