export const getRoute = async (pickup, destination, reason) => {
    try {
      const response = await fetch('http://localhost:5000/api/route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pickup, destination, reason })
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching route:', error);
    }
  };
  