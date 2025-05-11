from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai
import os
import json
import re
import random
from datetime import datetime

app = Flask(__name__)
CORS(app)  # Allow React frontend to connect

# Set up the Gemini API - get API key from environment variable for security
API_KEY = " " # Replace with your actual API key if not using env var
genai.configure(api_key=API_KEY)

@app.route('/api/route', methods=['POST'])
def get_route():
    data = request.get_json()
    pickup = data.get('pickup')
    destination = data.get('destination')
    reason = data.get('reason')

    # Determine optimization approach based on reason
    if reason == "Emergency" or reason == "Quick":
        optimization_goal = "Find the quickest route with minimal traffic delays"
        algorithm = "A*"
    elif reason == "Fuel":
        optimization_goal = "Find the most fuel-efficient route with minimal distance"
        algorithm = "Dijkstra"
    elif reason == "Drive":
        optimization_goal = "Find a scenic, longer route for a leisure drive"
        algorithm = "Custom"
    else:
        optimization_goal = "Find an optimal route"
        algorithm = "Dijkstra"

    # Generate the Gemini prompt
    prompt = f"""
    I need to travel from {pickup} to {destination}.
    My goal is to: {optimization_goal}.
    
    Please provide the following:
    1. A brief description of the optimal route
    2. Estimated distance in kilometers
    3. Estimated travel time
    4. Which algorithm would be better for this route ({algorithm} or another one)
    5. Any major landmarks along the way
    6. Traffic conditions to be aware of
    
    Additionally, provide these metrics as numerical values for charts:
    - speedScore: A value from 1-10 indicating how fast this route is
    - efficiencyScore: A value from 1-10 indicating fuel/energy efficiency
    - sceneryScore: A value from 1-10 indicating scenic value
    - safetyScore: A value from 1-10 indicating safety
    - simplicityScore: A value from 1-10 indicating how easy the route is to follow
    - trafficScore: A value from 1-10 indicating current traffic conditions (10 = no traffic, 1 = heavy traffic)
    
    For algorithm comparison, provide:
    - astarSpeedRating: A value from 0.8-1.5 indicating A* algorithm relative speed for this route
    - astarOptimalityRating: A value from 0.8-1.5 indicating A* optimality for this route
    - dijkstraSpeedRating: A value from 0.8-1.5 indicating Dijkstra algorithm relative speed
    - dijkstraOptimalityRating: A value from 0.8-1.5 indicating Dijkstra optimality
    
    Format the response as JSON with these fields: description, distance, time, algorithm, landmarks, trafficNotes, chartData
    Where chartData is a nested object containing all the numerical metrics listed above.
    """

    # Call the Gemini API
    try:
        model = genai.GenerativeModel("gemini-2.0-flash")
        response = model.generate_content(prompt)
        
        # Try to extract JSON from the response
        try:
            # Look for JSON in the response
            json_pattern = r'```json\s*([\s\S]*?)\s*```'
            match = re.search(json_pattern, response.text)
            
            if match:
                # If found in a code block
                json_str = match.group(1)
                route_info = json.loads(json_str)
            else:
                # Try to parse the whole response as JSON
                try:
                    route_info = json.loads(response.text)
                except:
                    # If all else fails, create our own structure with the response text
                    route_info = generate_fallback_response(response.text, pickup, destination, reason, algorithm)
            
            # If chartData is missing, add it
            if 'chartData' not in route_info:
                route_info['chartData'] = generate_chart_data(reason, route_info.get('description', ''))
            
            # Add the original request info
            route_info["pickup"] = pickup
            route_info["destination"] = destination
            route_info["reason"] = reason
            
            # Add some additional useful metadata
            route_info["timestamp"] = datetime.now().isoformat()
            
            return jsonify(route_info)
        
        except Exception as e:
            # If parsing fails, return a formatted response
            fallback_response = generate_fallback_response(response.text, pickup, destination, reason, algorithm)
            return jsonify(fallback_response)
            
    except Exception as e:
        # If the Gemini API call fails
        fallback_response = {
            "pickup": pickup,
            "destination": destination,
            "reason": reason,
            "error": f"Failed to get response from Gemini API: {str(e)}",
            "description": f"Could not optimize {reason} route between {pickup} and {destination}.",
            "algorithm": algorithm,
            "chartData": generate_chart_data(reason, "")
        }
        return jsonify(fallback_response)

def generate_fallback_response(text, pickup, destination, reason, algorithm):
    """Generate a structured response when JSON parsing fails"""
    
    # Try to extract information from the text using regex
    distance_match = re.search(r'(\d+\.?\d*)\s*kilometers?', text, re.IGNORECASE)
    time_match = re.search(r'(\d+)[-\s]*(\d+)?\s*minutes', text, re.IGNORECASE)
    
    # Extract landmarks if possible
    landmarks = []
    landmark_section = re.search(r'landmarks?:(.*?)(?:traffic|$)', text, re.IGNORECASE | re.DOTALL)
    if landmark_section:
        # Look for bulleted or numbered items
        items = re.findall(r'(?:^|\n)\s*(?:[-•*]|\d+\.)\s*(.*?)(?=\n|$)', landmark_section.group(1))
        if items:
            landmarks = [item.strip() for item in items if item.strip()]
        else:
            # Just grab any sentences
            sentences = landmark_section.group(1).split('.')
            landmarks = [s.strip() for s in sentences if s.strip()]
    
    # Extract traffic notes if possible
    traffic_notes = "No specific traffic information available"
    traffic_section = re.search(r'traffic[^:]*:(.*?)(?:\n\n|$)', text, re.IGNORECASE | re.DOTALL)
    if traffic_section:
        traffic_notes = traffic_section.group(1).strip()
    
    # Generate chart data based on the reason and any extracted info
    chart_data = generate_chart_data(reason, text)
    
    return {
        "pickup": pickup,
        "destination": destination,
        "reason": reason,
        "description": text[:500] + ("..." if len(text) > 500 else ""),
        "distance": f"{distance_match.group(1) if distance_match else 'Unknown'} kilometers",
        "time": f"{time_match.group(0) if time_match else 'Unknown'} minutes",
        "algorithm": algorithm,
        "landmarks": landmarks[:5],  # Limit to 5 landmarks
        "trafficNotes": traffic_notes,
        "chartData": chart_data
    }

def generate_chart_data(reason, description_text):
    """Generate chart data based on the route type and description"""
    
    # Base values for each route type
    route_type_scores = {
        "Emergency": {
            "speedScore": 9,
            "efficiencyScore": 5,
            "sceneryScore": 3,
            "safetyScore": 6,
            "simplicityScore": 7,
            "trafficScore": 8  # Emergency routes often consider traffic
        },
        "Quick": {
            "speedScore": 8,
            "efficiencyScore": 6,
            "sceneryScore": 4,
            "safetyScore": 7,
            "simplicityScore": 7,
            "trafficScore": 7
        },
        "Fuel": {
            "speedScore": 5,
            "efficiencyScore": 9,
            "sceneryScore": 5,
            "safetyScore": 8,
            "simplicityScore": 6,
            "trafficScore": 6
        },
        "Drive": {
            "speedScore": 4,
            "efficiencyScore": 5,
            "sceneryScore": 9,
            "safetyScore": 8,
            "simplicityScore": 5,
            "trafficScore": 7
        }
    }
    
    # Get the base scores for the route type, or use default values
    base_scores = route_type_scores.get(reason, {
        "speedScore": 6,
        "efficiencyScore": 6,
        "sceneryScore": 6,
        "safetyScore": 7,
        "simplicityScore": 6,
        "trafficScore": 6
    })
    
    # Adjust scores based on the description text
    scores = base_scores.copy()
    
    # Add some randomness to make each route unique
    for key in scores:
        # Add random variation of ±1
        scores[key] = min(10, max(1, scores[key] + random.uniform(-1, 1)))
    
    # Adjust scores based on text content
    if "direct" in description_text.lower() or "shortest" in description_text.lower():
        scores["simplicityScore"] = min(10, scores["simplicityScore"] + 1)
    
    if "congestion" in description_text.lower() or "traffic" in description_text.lower():
        scores["trafficScore"] = max(1, scores["trafficScore"] - 2)
    
    if "scenic" in description_text.lower() or "beautiful" in description_text.lower():
        scores["sceneryScore"] = min(10, scores["sceneryScore"] + 1.5)
    
    if "highway" in description_text.lower() or "expressway" in description_text.lower():
        scores["speedScore"] = min(10, scores["speedScore"] + 1)
        
    # Algorithm comparisons
    # These are relative to each other and vary by route type
    algorithm_ratings = {
        "Emergency": {
            "astarSpeedRating": 1.4,
            "astarOptimalityRating": 1.1,
            "dijkstraSpeedRating": 1.0,
            "dijkstraOptimalityRating": 1.2
        },
        "Quick": {
            "astarSpeedRating": 1.3,
            "astarOptimalityRating": 1.0,
            "dijkstraSpeedRating": 1.0,
            "dijkstraOptimalityRating": 1.1
        },
        "Fuel": {
            "astarSpeedRating": 1.2,
            "astarOptimalityRating": 0.9,
            "dijkstraSpeedRating": 0.9,
            "dijkstraOptimalityRating": 1.3
        },
        "Drive": {
            "astarSpeedRating": 1.2,
            "astarOptimalityRating": 0.8,
            "dijkstraSpeedRating": 0.9,
            "dijkstraOptimalityRating": 1.0
        }
    }
    
    # Get algorithm ratings for the route type or use default values
    alg_ratings = algorithm_ratings.get(reason, {
        "astarSpeedRating": 1.2,
        "astarOptimalityRating": 1.0,
        "dijkstraSpeedRating": 1.0,
        "dijkstraOptimalityRating": 1.1
    })
    
    # Add some randomness to algorithm ratings
    for key in alg_ratings:
        # Add random variation of ±0.1
        alg_ratings[key] = min(1.5, max(0.8, alg_ratings[key] + random.uniform(-0.1, 0.1)))
    
    # Calculate fuel usage by route type (relative values)
    fuel_consumption = {
        "Emergency": 1.3,
        "Quick": 1.2,
        "Fuel": 1.0,
        "Drive": 1.5
    }
    
    # Add all data to the chart data object
    chart_data = {
        **scores,
        **alg_ratings,
        "fuelConsumption": {
            "Emergency": fuel_consumption["Emergency"],
            "Quick": fuel_consumption["Quick"],
            "Fuel": fuel_consumption["Fuel"],
            "Drive": fuel_consumption["Drive"]
        },
        "currentRouteType": reason,
        "currentRouteFuelUsage": fuel_consumption.get(reason, 1.2)
    }
    
    return chart_data

if __name__ == '__main__':
    app.run(debug=True)
