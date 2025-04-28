export const getRoute = async (pickup, destination, reason) => {
  try {
    const response = await fetch("http://localhost:5000/api/route", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pickup, destination, reason }),
    });

    if (!response.ok) {
      throw new Error(`Server responded with status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching route:", error);
    // Return a structured error response that your app can handle
    return {
      error: true,
      message: error.message || "Failed to fetch route data",
      pickup,
      destination,
      reason,
    };
  }
};
