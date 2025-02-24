import React from 'react'
import { GoogleMap, useJsApiLoader } from '@react-google-maps/api'



const center = {
    lat: -3.745,
    lng: -38.523,
}

function MapContainer() {

    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: 'AIzaSyBzHWL78g-ZvWNYE3Bki8oi31Y-35ZwTZY',
    })

    const [map, setMap] = React.useState(null)

    const onLoad = React.useCallback(function callback(map) {
        // This is just an example of getting and using the map instance!!! don't just blindly copy!
        const bounds = new window.google.maps.LatLngBounds(center)
        map.fitBounds(bounds)

        setMap(map)
    }, [])

    const onUnmount = React.useCallback(function callback(map) {
        setMap(null)
    }, [])

    return isLoaded ? (
        <GoogleMap
            center={center}
            zoom={10}
            onLoad={onLoad}
            onUnmount={onUnmount}
            mapContainerClassName='w-full h-full'
        >
            {/* Child components, such as markers, info windows, etc. */}
            <></>
        </GoogleMap>
    ) : (
        <></>
    )
}

export default React.memo(MapContainer)