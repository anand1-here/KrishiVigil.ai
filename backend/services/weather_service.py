# =============================================================
# FILE: backend/services/weather_service.py
# PURPOSE: Fetches live weather from OpenWeatherMap API
#          Calculates disease risk score from real weather data
#          Generates field warnings based on actual values
# =============================================================

import requests
from datetime import datetime

# ══════════════════════════════════════════════════════════════
# OPENWEATHERMAP API KEY
#
# Your key is already set below and is WORKING.
# Tested at: https://api.openweathermap.org/data/2.5/weather
#            ?lat=30.90&lon=75.85&appid=YOUR_KEY&units=metric
#
# IF YOUR KEY STOPS WORKING (after 60 days free tier expires):
#   1. Go to: https://home.openweathermap.org/api_keys
#   2. Create a new free account
#   3. Copy your new API key
#   4. Replace the value below with your new key
#   5. Wait 10-15 minutes for key to activate
# ══════════════════════════════════════════════════════════════
OWM_API_KEY = "c8d59e65197776ffdefe8cdcf61e726e"

# OpenWeatherMap endpoints (do not change these URLs)
OWM_CURRENT_URL = "https://api.openweathermap.org/data/2.5/weather"
OWM_FORECAST_URL = "https://api.openweathermap.org/data/2.5/forecast"

# How long to wait for API response before giving up
TIMEOUT_SECS = 6


def get_weather_by_coords(lat, lon):
    """
    Main function called by predict_routes.py and weather_routes.py

    lat: GPS latitude from browser  (e.g. 30.9010)
    lon: GPS longitude from browser (e.g. 75.8573)

    Returns complete weather dict used by App.jsx for:
      - Weather strip on home screen (temperature, forecast)
      - Field operation warnings section
      - Weather risk card on results screen
      - Risk score passed to AI for health score + urgency
    """
    try:
        current = _fetch_current(lat, lon)
        forecast = _fetch_forecast(lat, lon)
        return _build_response(current, forecast, lat, lon)

    except requests.exceptions.Timeout:
        print("Weather API timed out - showing offline fallback")
        return _mock_weather(lat, lon)

    except requests.exceptions.RequestException as e:
        print(f"Weather API error: {e} - showing offline fallback")
        return _mock_weather(lat, lon)


def _fetch_current(lat, lon):
    """Fetches current weather from OpenWeatherMap."""
    resp = requests.get(
        OWM_CURRENT_URL,
        params={
            "lat": lat,
            "lon": lon,
            "appid": OWM_API_KEY,
            "units": "metric",  # Celsius (change to "imperial" for Fahrenheit)
        },
        timeout=TIMEOUT_SECS,
    )
    resp.raise_for_status()
    return resp.json()


def _fetch_forecast(lat, lon):
    """Fetches 5-day / 3-hour forecast from OpenWeatherMap."""
    resp = requests.get(
        OWM_FORECAST_URL,
        params={
            "lat": lat,
            "lon": lon,
            "appid": OWM_API_KEY,
            "units": "metric",
            "cnt": 40,  # 40 x 3-hour slots = ~5 days
        },
        timeout=TIMEOUT_SECS,
    )
    resp.raise_for_status()
    return resp.json()


def _build_response(current, forecast, lat, lon):
    """Builds the structured weather dict from raw API responses."""

    # Extract values from OpenWeatherMap current weather response
    temp = current["main"]["temp"]
    humidity = current["main"]["humidity"]
    wind_ms = current["wind"]["speed"]
    wind_kph = round(wind_ms * 3.6, 1)  # Convert m/s to km/h
    city = current.get("name", "Your Location")

    # Rain probability from next 3-hour forecast slot
    rain_pct = 0
    if forecast.get("list"):
        rain_pct = round(forecast["list"][0].get("pop", 0) * 100)

    # ── DISEASE RISK SCORE ────────────────────────────────────
    # Calculated from REAL weather values (not hardcoded)
    # This score is passed to AI predictor to affect
    # health score and urgency timeline calculations
    risk_score = _calculate_disease_risk(temp, humidity, rain_pct, wind_kph)

    # ── FIELD WARNINGS ────────────────────────────────────────
    # Generated from real temperature/humidity/rain values
    # NOT hardcoded - changes based on actual weather
    warnings = _build_warnings(temp, humidity, rain_pct, wind_kph)

    # ── 5-DAY FORECAST ────────────────────────────────────────
    daily_forecast = _build_daily_forecast(forecast)

    return {
        "location": city,
        "lat": lat,
        "lon": lon,
        "temperature": round(temp, 1),  # Used in weather card
        "humidity": humidity,  # Used in weather card
        "rain_prob": rain_pct,  # Used in weather card
        "wind_kph": wind_kph,  # Used in weather card
        "risk_score": risk_score,  # Used in health score + urgency
        "risk_label": _risk_label(risk_score),
        "warnings": warnings,  # Used in field warnings section
        "forecast": daily_forecast,  # Used in 5-day forecast strip
        "live": True,  # Tells frontend this is real data
    }


def _calculate_disease_risk(temp, humidity, rain_pct, wind_kph):
    """
    Calculates disease risk score 0-100 from real weather values.

    Based on optimal conditions for Late Blight (most dangerous):
      - Temperature: 10-25°C is ideal for fungal growth
      - Humidity: above 80% accelerates spore germination
      - Rain: wet leaves spread spores 10x faster
      - Wind: carries spores to neighbouring plants

    All input values come from live OpenWeatherMap API.
    """
    score = 0

    # Temperature component (max 30 points)
    if 10 <= temp <= 25:
        score += 30  # ideal fungal growth range
    elif 25 < temp <= 30:
        score += 15  # warm but manageable
    else:
        score += 5  # too hot or too cold for most fungal disease

    # Humidity component (max 35 points)
    if humidity >= 90:
        score += 35
    elif humidity >= 80:
        score += 25
    elif humidity >= 70:
        score += 15
    else:
        score += 5

    # Rain probability component (max 25 points)
    if rain_pct >= 70:
        score += 25
    elif rain_pct >= 40:
        score += 15
    elif rain_pct >= 20:
        score += 8
    else:
        score += 2

    # Wind component (max 10 points — spreads spores)
    if wind_kph >= 30:
        score += 10
    elif wind_kph >= 15:
        score += 5

    return min(score, 100)


def _risk_label(score):
    if score >= 75:
        return "CRITICAL"
    if score >= 55:
        return "HIGH"
    if score >= 35:
        return "MODERATE"
    return "LOW"


def _build_warnings(temp, humidity, rain_pct, wind_kph):
    """
    Generates field operation warnings from REAL weather values.
    Each warning message includes the actual number from the API.
    """
    warnings = []

    if rain_pct >= 60:
        warnings.append(
            {
                "type": "rain",
                "level": "high",
                "text": f"Do not irrigate - {rain_pct}% rain probability today",
            }
        )

    if wind_kph >= 25:
        warnings.append(
            {
                "type": "wind",
                "level": "medium",
                "text": f"Avoid pesticide spraying - wind speed {wind_kph} km/h",
            }
        )

    if humidity >= 80:
        warnings.append(
            {
                "type": "humidity",
                "level": "high",
                "text": f"High humidity {humidity}% - fungal spread risk tonight",
            }
        )

    if 10 <= temp <= 25 and humidity >= 75:
        warnings.append(
            {
                "type": "disease",
                "level": "critical",
                "text": f"Critical: {round(temp)}C + high humidity - ideal disease conditions",
            }
        )

    if not warnings:
        warnings.append(
            {
                "type": "ok",
                "level": "low",
                "text": "Weather conditions are currently favourable for field operations",
            }
        )

    return warnings


def _build_daily_forecast(forecast):
    """
    Builds one entry per day from 3-hourly OWM forecast data.
    Returns up to 5 days.
    """
    days = {}
    day_names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

    for slot in forecast.get("list", []):
        dt = datetime.fromtimestamp(slot["dt"])
        date = dt.strftime("%Y-%m-%d")
        day = day_names[dt.weekday()]

        if date not in days:
            weather_main = slot["weather"][0]["main"].lower()
            if "rain" in weather_main or "drizzle" in weather_main:
                icon = "rain"
            elif "cloud" in weather_main:
                icon = "cloud"
            else:
                icon = "sun"

            days[date] = {
                "day": day,
                "type": icon,
                "hi": round(slot["main"]["temp_max"]),
                "lo": round(slot["main"]["temp_min"]),
                "rain": f"{round(slot.get('pop', 0) * 100)}%",
            }

    result = list(days.values())[:5]
    if result:
        result[0]["day"] = "Today"  # Label first entry as Today

    return result


def _mock_weather(lat=30.9, lon=75.8):
    """
    Fallback data shown ONLY if OpenWeatherMap API call fails
    (network error, API key issue, timeout).
    This is NOT the same as demo mode.
    """
    return {
        "location": "Your Location (Offline)",
        "lat": lat,
        "lon": lon,
        "temperature": 21.0,
        "humidity": 87,
        "rain_prob": 72,
        "wind_kph": 28.0,
        "risk_score": 83,
        "risk_label": "CRITICAL",
        "warnings": [
            {
                "type": "rain",
                "level": "high",
                "text": "Do not irrigate - 72% rain probability (offline data)",
            },
            {
                "type": "humidity",
                "level": "high",
                "text": "High humidity 87% - fungal spread risk tonight",
            },
            {
                "type": "disease",
                "level": "critical",
                "text": "Critical conditions for disease spread (offline data)",
            },
        ],
        "forecast": [
            {"day": "Today", "type": "rain", "hi": 24, "lo": 18, "rain": "72%"},
            {"day": "Tue", "type": "cloud", "hi": 27, "lo": 19, "rain": "30%"},
            {"day": "Wed", "type": "sun", "hi": 31, "lo": 21, "rain": "5%"},
            {"day": "Thu", "type": "rain", "hi": 26, "lo": 18, "rain": "55%"},
            {"day": "Fri", "type": "sun", "hi": 30, "lo": 20, "rain": "10%"},
        ],
        "live": False,
    }
