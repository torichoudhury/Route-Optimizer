import React, { useState } from "react";
import { getRoute } from "../api";

function Form({ onRouteCalculated }) {
  const [pickup, setPickup] = useState("");
  const [destination, setDestination] = useState("");
  const [reason, setReason] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    const route = await getRoute(pickup, destination, reason);
    console.log(route);

    // Pass the route data to parent or using context
    if (onRouteCalculated) {
      onRouteCalculated({
        pickup,
        destination,
        routeType: reason,
      });
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Pickup Location"
        value={pickup}
        onChange={(e) => setPickup(e.target.value)}
        required
      />
      <input
        type="text"
        placeholder="Destination Location"
        value={destination}
        onChange={(e) => setDestination(e.target.value)}
        required
      />
      <select
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        required
      >
        <option value="">Select Reason</option>
        <option value="Emergency">Emergency (Shortest Time)</option>
        <option value="Drive">Leisure Drive (Longest Route)</option>
        <option value="Fuel">Fuel Saving (Shortest Distance)</option>
        <option value="Quick">Quick Visit (Shortest Time)</option>
      </select>
      <button type="submit">Get Route</button>
    </form>
  );
}

export default Form;
