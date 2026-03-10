# =============================================================
# FILE: backend/routes/weather_routes.py
# PURPOSE: Handles GET /weather — live weather endpoint
#
# FRONTEND CALLS THIS WHEN:
#   App loads (on GPS detection in App.jsx useEffect)
#
# QUERY PARAMS:
#   lat  → GPS latitude  (from browser Geolocation API)
#   lon  → GPS longitude (from browser Geolocation API)
#
# EXAMPLE CALL FROM APP.JSX:
#   fetch(`http://localhost:5000/weather?lat=30.90&lon=75.85`)
#
# RETURNS:
#   temperature, humidity, rain_prob, wind_kph,
#   risk_score, risk_label, warnings, 5-day forecast
# =============================================================

from flask import Blueprint, request, jsonify
from services.weather_service import get_weather_by_coords

weather_bp = Blueprint("weather", __name__)


@weather_bp.route("/weather", methods=["GET"])
def weather():
    # ── READ GPS COORDINATES FROM URL PARAMS ──────────────────
    # These come from browser navigator.geolocation in App.jsx
    # Default is Ludhiana if GPS is not available
    lat = request.args.get("lat", "30.9010")
    lon = request.args.get("lon", "75.8573")

    try:
        lat = float(lat)
        lon = float(lon)
    except ValueError:
        lat, lon = 30.9010, 75.8573

    # ── FETCH LIVE WEATHER ────────────────────────────────────
    # Calls OpenWeatherMap API with your API key
    # Returns structured weather data for App.jsx
    # ─────────────────────────────────────────────────────────
    weather_data = get_weather_by_coords(lat, lon)
    return jsonify(weather_data), 200
