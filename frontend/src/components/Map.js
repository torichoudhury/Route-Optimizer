import React, { useState, useEffect, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { getRoute } from "../api"; // Import the API function
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  RadialLinearScale,
} from "chart.js";
import { Bar, Pie, Line, Radar } from "react-chartjs-2";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  RadialLinearScale
);

// Fix Leaflet marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Add these styles at the top of your file
const styles = {
  pageContainer: {
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "20px",
  },
  flexContainer: {
    display: "flex",
    flexWrap: "wrap",
    gap: "20px",
    marginTop: "20px",
  },
  mapSection: {
    flex: "1 1 600px",
    position: "relative",
  },
  infoSection: {
    flex: "1 1 400px",
  },
  card: {
    backgroundColor: "white",
    borderRadius: "8px",
    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
    marginBottom: "20px",
    overflow: "hidden",
  },
  cardHeader: {
    padding: "15px 20px",
    borderBottom: "1px solid #eee",
    backgroundColor: "#f8f9fa",
    fontWeight: "bold",
  },
  cardBody: {
    padding: "20px",
  },
  badge: {
    display: "inline-block",
    padding: "4px 8px",
    borderRadius: "4px",
    fontWeight: "bold",
    fontSize: "12px",
    marginRight: "8px",
  },
  tabs: {
    display: "flex",
    borderBottom: "1px solid #dee2e6",
  },
  tab: {
    padding: "10px 15px",
    cursor: "pointer",
    borderBottom: "2px solid transparent",
  },
  activeTab: {
    borderBottomColor: "#007bff",
    color: "#007bff",
  },
  algorithmSelector: {
    display: "flex",
    alignItems: "center",
    marginBottom: "15px",
    padding: "10px 15px",
    backgroundColor: "#f8f9fa",
    borderRadius: "8px",
  },
  select: {
    padding: "8px 12px",
    borderRadius: "4px",
    border: "1px solid #ced4da",
    marginLeft: "10px",
    background: "white",
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
    borderRadius: "8px",
  },
  statItem: {
    display: "flex",
    justifyContent: "space-between",
    padding: "8px 0",
    borderBottom: "1px solid #eee",
  },
  landmarkItem: {
    padding: "8px 12px",
    margin: "5px 0",
    backgroundColor: "#f1f8ff",
    borderRadius: "4px",
    borderLeft: "3px solid #007bff",
  },
  chartContainer: {
    margin: "15px 0",
  },
};

const containerStyle = {
  width: "100%",
  height: "500px",
  borderRadius: "8px",
  overflow: "hidden",
  boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
};

const center = [19.076, 72.8777]; // Mumbai coordinates

// Add this component to handle map view changes
function MapController({ pickupCoords, destCoords, route }) {
  const map = useMap();

  useEffect(() => {
    // When either coordinates or route changes, adjust the map view
    if (pickupCoords && destCoords) {
      // Create a bounds object that contains both points
      const bounds = L.latLngBounds(
        L.latLng(pickupCoords[0], pickupCoords[1]),
        L.latLng(destCoords[0], destCoords[1])
      );

      // If we have a route, include all route points in the bounds
      if (route && route.length > 0) {
        route.forEach((point) => {
          bounds.extend(L.latLng(point[0], point[1]));
        });
      }

      // Fit the map to the bounds with some padding
      map.fitBounds(bounds, {
        padding: [50, 50],
        maxZoom: 15, // Prevent zooming in too much
      });
    }
  }, [map, pickupCoords, destCoords, route]);

  return null;
}

// Function to choose algorithm based on API recommendation
function getRecommendedAlgorithm(apiResponse) {
  if (!apiResponse || !apiResponse.algorithm) return "dijkstra";

  // Check if the algorithm text contains "A*"
  if (apiResponse.algorithm.includes("A*")) {
    return "astar";
  } else if (apiResponse.algorithm.includes("Dijkstra")) {
    return "dijkstra";
  }

  // Default to the algorithm based on reason if no specific mention
  return apiResponse.reason === "Emergency" || apiResponse.reason === "Quick"
    ? "astar"
    : "dijkstra";
}

// Add a visual indicator for which algorithm was chosen based on API
const renderAlgorithmBadge = (routeInfo, algorithm) => {
  if (!routeInfo || !routeInfo.algorithm) return null;

  return (
    <div
      className="algorithm-badge"
      style={{
        position: "absolute",
        top: "10px",
        right: "10px",
        background: algorithm === "astar" ? "#0073FF" : "#33CC66",
        color: "white",
        padding: "5px 10px",
        borderRadius: "4px",
        zIndex: 1000,
        fontWeight: "bold",
      }}
    >
      {algorithm === "astar"
        ? "A* Algorithm (AI Recommended)"
        : "Dijkstra Algorithm (AI Recommended)"}
    </div>
  );
};

function Map({ pickup, destination, routeType }) {
  const [pickupCoords, setPickupCoords] = useState(null);
  const [destCoords, setDestCoords] = useState(null);
  const [route, setRoute] = useState(null);
  const [algorithm, setAlgorithm] = useState("dijkstra");
  const [routeInfo, setRouteInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [comparisonData, setComparisonData] = useState(null);
  const [activeTab, setActiveTab] = useState("metrics");

  // Use props if provided, otherwise use defaults
  const pickupLocation = pickup || "Mumbai Central";
  const destinationLocation = destination || "Bandra Kurla Complex";

  // Function to generate comparison data for charts
  const generateComparisonData = (routeInfo) => {
    if (!routeInfo) return null;

    // Use chart data directly from API if available
    const chartData = routeInfo.chartData;

    // Extract the distance value as a number for calculations
    let distanceValue = 0;
    if (typeof routeInfo.distance === "number") {
      // If the backend already sent a number
      distanceValue = routeInfo.distance;
    } else if (routeInfo.distance) {
      // Extract numeric part from distance string (e.g., "2.3 kilometers")
      const distanceMatch = routeInfo.distance.toString().match(/(\d+\.?\d*)/);
      if (distanceMatch) {
        distanceValue = parseFloat(distanceMatch[0]);
      }
    }

    // Extract time estimate as a number (minutes)
    let timeValue = 0;
    if (routeInfo.time) {
      // Try to extract minutes (e.g., "5-10 minutes" -> 7.5)
      const timeMatch = routeInfo.time;
      if (timeMatch && timeMatch[2]) {
        // Range provided, take average
        timeValue = (parseInt(timeMatch[1]) + parseInt(timeMatch[2])) / 2;
      } else if (timeMatch) {
        // Single value
        timeValue = parseInt(timeMatch[1]);
      }
    }

    // Initialize fuelConsumption if it doesn't exist in chartData
    const fuelConsumptionData =
      chartData && chartData.fuelConsumption
        ? chartData.fuelConsumption
        : {
            Emergency: 1.3,
            Quick: 1.2,
            Fuel: 1.0,
            Drive: 1.5,
          };

    // Generate comparison data for charts
    return {
      // For algorithm comparison (A* vs Dijkstra)
      algorithmComparison: {
        labels: ["A*", "Dijkstra"],
        datasets: [
          {
            label: "Speed (relative)",
            data: chartData
              ? [
                  chartData.astarSpeedRating || 1.2,
                  chartData.dijkstraSpeedRating || 1.0,
                ]
              : [1.2, 1.0], // Fallback
            backgroundColor: [
              "rgba(54, 162, 235, 0.6)",
              "rgba(75, 192, 192, 0.6)",
            ],
            borderColor: ["rgba(54, 162, 235, 1)", "rgba(75, 192, 192, 1)"],
            borderWidth: 1,
          },
          {
            label: "Optimality (relative)",
            data: chartData
              ? [
                  chartData.astarOptimalityRating || 1.0,
                  chartData.dijkstraOptimalityRating || 1.1,
                ]
              : [1.0, 1.1], // Fallback
            backgroundColor: [
              "rgba(255, 206, 86, 0.6)",
              "rgba(153, 102, 255, 0.6)",
            ],
            borderColor: ["rgba(255, 206, 86, 1)", "rgba(153, 102, 255, 1)"],
            borderWidth: 1,
          },
        ],
      },

      // Route metrics
      routeMetrics: {
        labels: [
          "Distance (km)",
          "Time (min)",
          "Traffic (1-10)",
          "Complexity (1-10)",
        ],
        datasets: [
          {
            label: "Current Route",
            data: [
              distanceValue,
              timeValue,
              // Use traffic score from API or calculate
              chartData
                ? 10 - (chartData.trafficScore || 5) // Invert for clarity (10 = heavy traffic)
                : Math.min(10, Math.max(1, (timeValue / distanceValue) * 3)),
              // Use simplicity score from API or calculate
              chartData
                ? 10 - (chartData.simplicityScore || 5) // Invert for clarity (10 = complex)
                : routeInfo.description?.includes("urban")
                ? 7
                : 4,
            ],
            backgroundColor: "rgba(75, 192, 192, 0.7)",
            borderColor: "rgba(75, 192, 192, 1)",
            borderWidth: 1,
          },
        ],
      },

      // Estimated fuel consumption by route type
      fuelConsumption: {
        labels: ["Emergency", "Quick", "Fuel Saving", "Leisure"],
        datasets: [
          {
            label: "Fuel Usage (relative)",
            data: [
              fuelConsumptionData.Emergency || 1.3,
              fuelConsumptionData.Quick || 1.2,
              fuelConsumptionData.Fuel || 1.0,
              fuelConsumptionData.Drive || 1.5,
            ],
            backgroundColor: [
              "rgba(255, 99, 132, 0.7)",
              "rgba(54, 162, 235, 0.7)",
              "rgba(75, 192, 192, 0.7)",
              "rgba(153, 102, 255, 0.7)",
            ],
          },
        ],
      },

      // Route characteristics radar chart
      routeCharacteristics: {
        labels: ["Speed", "Efficiency", "Scenery", "Safety", "Simplicity"],
        datasets: [
          {
            label: routeInfo.algorithm
              ? routeInfo.algorithm.substring(0, 30) + "..."
              : "Current Route",
            data: chartData
              ? [
                  chartData.speedScore || 5,
                  chartData.efficiencyScore || 5,
                  chartData.sceneryScore || 5,
                  chartData.safetyScore || 5,
                  chartData.simplicityScore || 5,
                ]
              : [
                  // Higher speed for emergency/quick routes
                  routeType === "Emergency" || routeType === "Quick" ? 9 : 6,
                  // Higher efficiency for fuel saving
                  routeType === "Fuel" ? 9 : 7,
                  // Higher scenery for leisure
                  routeType === "Drive" ? 9 : 4,
                  // Safety is generally high but lower for speed-oriented routes
                  routeType === "Emergency" ? 6 : 8,
                  // Simplicity (fewer turns/complexity)
                  routeInfo.description?.includes("direct") ? 8 : 5,
                ],
            backgroundColor: "rgba(75, 192, 192, 0.2)",
            borderColor: "rgba(75, 192, 192, 1)",
            borderWidth: 2,
            pointBackgroundColor: "rgba(75, 192, 192, 1)",
            pointBorderColor: "#fff",
            pointHoverBackgroundColor: "#fff",
            pointHoverBorderColor: "rgba(75, 192, 192, 1)",
          },
        ],
      },
    };
  };

  // Update comparison data when routeInfo changes
  useEffect(() => {
    if (routeInfo) {
      const data = generateComparisonData(routeInfo);
      setComparisonData(data);
    }
  }, [routeInfo, routeType]);

  // Fetch route data from the API when inputs change
  useEffect(() => {
    async function fetchRouteData() {
      if (!pickup || !destination || !routeType) return;

      setLoading(true);
      try {
        // Call the API function from api.js
        const response = await getRoute(pickup, destination, routeType);

        if (response && !response.error) {
          // Process the API response to ensure consistency
          const processedResponse = {
            ...response,
            // Ensure landmarks is always an array
            landmarks: Array.isArray(response.landmarks)
              ? response.landmarks
              : [],
            // Convert distance to string if it's a number
            distance:
              typeof response.distance === "number"
                ? `${response.distance} kilometers`
                : response.distance,
            // Ensure chartData exists
            chartData: response.chartData || {},
          };

          // Set the route info from the processed API response
          setRouteInfo(processedResponse);
          console.log("Route Info:", processedResponse);

          // Set the algorithm based on the API recommendation
          const recommendedAlgo = getRecommendedAlgorithm(response);
          setAlgorithm(recommendedAlgo);
        }
      } catch (error) {
        console.error("Error fetching route data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchRouteData();
  }, [pickup, destination, routeType]);

  // Function to geocode addresses to coordinates using Nominatim (OpenStreetMap's geocoding service)
  const geocodeAddress = async (address) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          address
        )}`
      );
      const data = await response.json();
      if (data && data.length > 0) {
        return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
      }
      return null;
    } catch (error) {
      console.error("Geocoding error:", error);
      return null;
    }
  };

  // Geocode both addresses
  useEffect(() => {
    const fetchCoordinates = async () => {
      const pickupCoords = await geocodeAddress(pickupLocation);
      const destCoords = await geocodeAddress(destinationLocation);

      setPickupCoords(pickupCoords);
      setDestCoords(destCoords);

      if (pickupCoords && destCoords) {
        calculateRoute(pickupCoords, destCoords);
      }
    };

    fetchCoordinates();
  }, [pickupLocation, destinationLocation, algorithm]); // Add algorithm as dependency

  const calculateRoute = async (start, end) => {
    try {
      // Use OSRM for getting real road-based routes
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`
      );

      const data = await response.json();

      if (data.code === "Ok" && data.routes && data.routes.length > 0) {
        // OSRM returns GeoJSON coordinates [longitude, latitude]
        // But Leaflet expects [latitude, longitude]
        const coordinates = data.routes[0].geometry.coordinates.map((coord) => [
          coord[1],
          coord[0],
        ]);

        setRoute(coordinates);
      } else {
        // Fallback to direct line if OSRM fails
        createFallbackRoute(start, end);
      }
    } catch (error) {
      console.error("Route calculation error:", error);
      createFallbackRoute(start, end);
    }
  };

  // Helper function to create a fallback route if OSRM fails
  const createFallbackRoute = (start, end) => {
    // Create a direct line with a few points for demonstration
    const path = [
      start,
      [
        start[0] + (end[0] - start[0]) * 0.25,
        start[1] + (end[1] - start[1]) * 0.25,
      ],
      [
        start[0] + (end[0] - start[0]) * 0.5,
        start[1] + (end[1] - start[1]) * 0.5,
      ],
      [
        start[0] + (end[0] - start[0]) * 0.75,
        start[1] + (end[1] - start[1]) * 0.75,
      ],
      end,
    ];

    setRoute(path);
  };

  // Helper function to calculate the total distance of a route
  const calculateRouteDistance = (routeCoords) => {
    const R = 6371e3; // Earth's radius in meters
    let totalDistance = 0;

    for (let i = 0; i < routeCoords.length - 1; i++) {
      const φ1 = (routeCoords[i][0] * Math.PI) / 180;
      const φ2 = (routeCoords[i + 1][0] * Math.PI) / 180;
      const Δφ = ((routeCoords[i + 1][0] - routeCoords[i][0]) * Math.PI) / 180;
      const Δλ = ((routeCoords[i + 1][1] - routeCoords[i][1]) * Math.PI) / 180;

      const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      totalDistance += R * c; // Distance in meters
    }

    return totalDistance;
  };

  // Chart options
  const barOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "top",
      },
      title: {
        display: true,
        text: "Algorithm Comparison",
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  const pieOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "top",
      },
      title: {
        display: true,
        text: "Fuel Consumption by Route Type",
      },
    },
  };

  const radarOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "top",
      },
      title: {
        display: true,
        text: "Route Characteristics",
      },
    },
    scales: {
      r: {
        min: 0,
        max: 10,
        ticks: {
          stepSize: 2,
        },
      },
    },
  };

  return (
    <div style={styles.pageContainer}>
      <div style={styles.algorithmSelector}>
        <div>
          <strong>Algorithm:</strong>
          <select
            value={algorithm}
            onChange={(e) => setAlgorithm(e.target.value)}
            style={styles.select}
          >
            <option value="dijkstra">Dijkstra (Shortest Distance)</option>
            <option value="astar">A* (Fastest Route)</option>
          </select>
        </div>
        {routeInfo && routeInfo.algorithm && (
          <div
            style={{ marginLeft: "20px", color: "#666", fontStyle: "italic" }}
          >
            <span>API recommended: </span>
            <span style={{ color: "#0056b3" }}>
              {routeInfo.algorithm}
            </span>
          </div>
        )}
      </div>

      <div style={styles.flexContainer}>
        {/* Map Column */}
        <div style={styles.mapSection}>
          <div style={{ position: "relative" }}>
            <MapContainer center={center} zoom={13} style={containerStyle}>
              {renderAlgorithmBadge(routeInfo, algorithm)}

              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              <MapController
                pickupCoords={pickupCoords}
                destCoords={destCoords}
                route={route}
              />

              {pickupCoords && (
                <Marker position={pickupCoords}>
                  <Popup>Pickup: {pickupLocation}</Popup>
                </Marker>
              )}

              {destCoords && (
                <Marker position={destCoords}>
                  <Popup>Destination: {destinationLocation}</Popup>
                </Marker>
              )}

              {route && (
                <Polyline
                  positions={route}
                  color={algorithm === "astar" ? "#0073FF" : "#33CC66"}
                  weight={5}
                  opacity={0.7}
                  dashArray={routeType === "Fuel" ? "10, 10" : null}
                />
              )}
            </MapContainer>

            {loading && (
              <div style={styles.loadingOverlay}>
                <div>
                  <div style={{ textAlign: "center", marginBottom: "10px" }}>
                    <span style={{ fontSize: "24px" }}>⟳</span>{" "}
                    {/* Simple loading spinner */}
                  </div>
                  <p>Calculating optimal route...</p>
                </div>
              </div>
            )}
          </div>

          {/* Route Summary Card */}
          {routeInfo && (
            <div style={styles.card}>
              <div style={styles.cardHeader}>Route Summary</div>
              <div style={styles.cardBody}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "15px" }}>
                  <div style={{ flex: "1 1 180px" }}>
                    <div style={{ fontSize: "14px", color: "#666" }}>
                      Distance
                    </div>
                    <div style={{ fontSize: "20px", fontWeight: "bold" }}>
                      {routeInfo.distance}
                    </div>
                  </div>
                  <div style={{ flex: "1 1 180px" }}>
                    <div style={{ fontSize: "14px", color: "#666" }}>
                      Est. Time
                    </div>
                    <div style={{ fontSize: "20px", fontWeight: "bold" }}>
                      {routeInfo.time}
                    </div>
                  </div>
                  <div style={{ flex: "1 1 180px" }}>
                    <div style={{ fontSize: "14px", color: "#666" }}>
                      Route Type
                    </div>
                    <div style={{ fontSize: "20px", fontWeight: "bold" }}>
                      <span
                        style={{
                          ...styles.badge,
                          backgroundColor:
                            routeType === "Emergency"
                              ? "#dc3545"
                              : routeType === "Quick"
                              ? "#0073FF"
                              : routeType === "Fuel"
                              ? "#28a745"
                              : "#6c757d",
                        }}
                      >
                        {routeType}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Algorithm Explanation Card - Moved here */}
          {routeInfo && (
            <div style={styles.card}>
              <div style={styles.cardHeader}>Algorithm Explanation</div>
              <div style={styles.cardBody}>
                <div style={{ marginBottom: "10px" }}>
                  <strong>Current algorithm:</strong>{" "}
                  <span
                    style={{
                      ...styles.badge,
                      backgroundColor:
                        algorithm === "astar" ? "#0073FF" : "#33CC66",
                      color: "white",
                    }}
                  >
                    {algorithm === "astar"
                      ? "A* Algorithm"
                      : "Dijkstra Algorithm"}
                  </span>
                </div>

                <div
                  style={{
                    padding: "10px",
                    backgroundColor:
                      algorithm === "astar" ? "#f0f7ff" : "#f0fff5",
                    borderRadius: "4px",
                    marginBottom: "10px",
                  }}
                >
                  {algorithm === "astar" ? (
                    <p style={{ margin: 0 }}>
                      <strong>A* Algorithm:</strong> A* is best for finding the
                      shortest path quickly when you have a good estimate of the
                      distance to the destination. It uses a heuristic to guide
                      search toward the goal faster.
                    </p>
                  ) : (
                    <p style={{ margin: 0 }}>
                      <strong>Dijkstra's Algorithm:</strong> Dijkstra guarantees
                      the absolute shortest path by systematically exploring all
                      possible routes from the starting point, but may be slower
                      than A* as it doesn't use any heuristics.
                    </p>
                  )}
                </div>

                <p>
                  <strong>For this route:</strong> {routeInfo.algorithm}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Info Column */}
        <div style={styles.infoSection}>
          {routeInfo && (
            <>
              <div style={styles.card}>
                <div style={styles.cardHeader}>Route Details</div>
                <div style={styles.cardBody}>
                  <p style={{ marginTop: 0 }}>{routeInfo.description}</p>

                  {routeInfo.trafficNotes && (
                    <div style={{ marginTop: "15px" }}>
                      <div style={{ fontWeight: "bold", marginBottom: "5px" }}>
                        Traffic Notes:
                      </div>
                      <div
                        style={{
                          padding: "10px",
                          backgroundColor: "#fff8e6",
                          borderLeft: "3px solid #ffc107",
                          borderRadius: "4px",
                        }}
                      >
                        {routeInfo.trafficNotes}
                      </div>
                    </div>
                  )}

                  {routeInfo.landmarks && routeInfo.landmarks.length > 0 && (
                    <div style={{ marginTop: "15px" }}>
                      <div style={{ fontWeight: "bold", marginBottom: "5px" }}>
                        Landmarks Along the Way:
                      </div>
                      {routeInfo.landmarks.map((landmark, index) => (
                        <div key={index} style={styles.landmarkItem}>
                          {landmark}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {comparisonData && (
                <div style={styles.card}>
                  <div style={styles.cardHeader}>Route Analysis</div>
                  <div style={styles.tabs}>
                    <div
                      style={{
                        ...styles.tab,
                        ...(activeTab === "metrics" ? styles.activeTab : {}),
                      }}
                      onClick={() => setActiveTab("metrics")}
                    >
                      Metrics
                    </div>
                    <div
                      style={{
                        ...styles.tab,
                        ...(activeTab === "comparison" ? styles.activeTab : {}),
                      }}
                      onClick={() => setActiveTab("comparison")}
                    >
                      Algorithm Comparison
                    </div>
                    <div
                      style={{
                        ...styles.tab,
                        ...(activeTab === "characteristics"
                          ? styles.activeTab
                          : {}),
                      }}
                      onClick={() => setActiveTab("characteristics")}
                    >
                      Characteristics
                    </div>
                  </div>
                  <div style={styles.cardBody}>
                    {activeTab === "metrics" && (
                      <div style={styles.chartContainer}>
                        <Bar data={comparisonData.routeMetrics} />
                      </div>
                    )}

                    {activeTab === "comparison" && (
                      <>
                        <div style={styles.chartContainer}>
                          <Bar data={comparisonData.algorithmComparison} />
                        </div>
                        <div style={styles.chartContainer}>
                          <Pie data={comparisonData.fuelConsumption} />
                        </div>
                      </>
                    )}

                    {activeTab === "characteristics" && (
                      <div style={styles.chartContainer}>
                        <Radar data={comparisonData.routeCharacteristics} />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Algorithm Explanation card has been moved to below Route Summary */}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default Map;
