import React from 'react'

function PolygonList({ polygons, togglePolygonVisibility, deletePolygon, handlePolygonRequest }) {
    return (
        <div className="absolute bottom-0 left-0 m-4 p-4 bg-light-primary dark:bg-dark-primary bg-opacity-80 rounded-lg z-10">
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
                            <button
                                onClick={() => handlePolygonRequest(polygon)}
                                className="text-light-accent dark:text-dark-accent ml-2"
                            >
                                Request
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}

export default PolygonList;
