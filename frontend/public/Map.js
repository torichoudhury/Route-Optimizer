import React, { useState } from 'react';
import { GoogleMap, LoadScript, DirectionsService, DirectionsRenderer } from '@react-google-maps/api';

const containerStyle = {
  width: '800px',
  height: '500px'
};

const center = {
  lat: 19.0760, // Mumbai
  lng: 72.8777
};

function Map() {
  const [directionsResponse, setDirectionsResponse] = useState(null);

  const pickup = "Mumbai Central"; // you can pass via props later
  const destination = "Bandra Kurla Complex"; // you can pass via props later

  const directionsCallback = (response) => {
    if (response !== null && response.status === 'OK') {
      setDirectionsResponse(response);
    } else {
      console.log('Response: ', response);
    }
  };

  return (
    <LoadScript googleMapsApiKey="YOUR_GOOGLE_MAPS_API_KEY">
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={12}
      >
        <DirectionsService
          options={{
            destination: destination,
            origin: pickup,
            travelMode: 'DRIVING'
          }}
          callback={directionsCallback}
        />

        {directionsResponse && (
          <DirectionsRenderer
            options={{
              directions: directionsResponse
            }}
          />
        )}
      </GoogleMap>
    </LoadScript>
  );
}

export default Map;
