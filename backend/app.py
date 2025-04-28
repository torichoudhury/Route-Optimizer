from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Allow React frontend to connect

@app.route('/api/route', methods=['POST'])
def get_route():
    data = request.get_json()
    pickup = data.get('pickup')
    destination = data.get('destination')
    reason = data.get('reason')

    # Here you would connect to Google Maps API and calculate route
    # You can add logic for priority: shortest, fastest, etc.
    # For now, mock response:
    route_info = {
        "pickup": pickup,
        "destination": destination,
        "reason": reason,
        "optimized_route": f"Optimized {reason} route between {pickup} and {destination}."
    }
    
    return jsonify(route_info)

if __name__ == '__main__':
    app.run(debug=True)
