import React, { useState } from "react";
import Form from "./components/Form";
import Map from "./components/Map";

function App() {
  const [routeData, setRouteData] = useState(null);

  const handleRouteCalculated = (data) => {
    setRouteData(data);
  };

  return (
    <div className="App">
      <h1>AI Route Optimizer</h1>
      <Form onRouteCalculated={handleRouteCalculated} />
      <Map
        pickup={routeData?.pickup}
        destination={routeData?.destination}
        routeType={routeData?.routeType}
      />
    </div>
  );
}

export default App;
