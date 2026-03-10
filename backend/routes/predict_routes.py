# =============================================================
# FILE: backend/routes/predict_routes.py
# PURPOSE: Handles POST /predict — the main AI analysis endpoint
#
# FRONTEND CALLS THIS WHEN:
#   Farmer uploads image and clicks "Analyze Now"
#
# WHAT IT RECEIVES (FormData from App.jsx):
#   image  → crop leaf image file
#   crop   → farmer's crop name (e.g. "Tomato")
#   land   → land size in acres (e.g. "3.5")
#   lat    → GPS latitude from browser
#   lon    → GPS longitude from browser
#
# WHAT IT RETURNS (JSON to App.jsx):
#   All values that fill the results dashboard
# =============================================================

from flask import Blueprint, request, jsonify
from core.predictor import run_inference
from engines.economic_engine import calculate_loss
from services.weather_service import get_weather_by_coords

predict_bp = Blueprint("predict", __name__)


@predict_bp.route("/predict", methods=["POST"])
def predict():

    # ── STEP 1: Validate image file ───────────────────────────
    if "image" not in request.files:
        return (
            jsonify(
                {
                    "error": "No image file — send as multipart/form-data with key 'image'"
                }
            ),
            400,
        )

    file = request.files["image"]
    if file.filename == "":
        return jsonify({"error": "Empty filename — select a valid image file"}), 400

    # ── STEP 2: Read form fields ──────────────────────────────
    # These come from App.jsx FormData
    # crop_name and land_acres are from the crop popup the farmer fills
    crop_name = request.form.get("crop", "").strip()
    land_size = request.form.get("land", "0").strip()

    # ── STEP 3: GPS coordinates ───────────────────────────────
    # These come from browser navigator.geolocation in App.jsx
    # Default is Ludhiana, Punjab (used if GPS is denied)
    lat = request.form.get("lat", "30.9010")
    lon = request.form.get("lon", "75.8573")

    try:
        land_acres = float(land_size)
    except ValueError:
        land_acres = 0.0

    try:
        lat = float(lat)
        lon = float(lon)
    except ValueError:
        lat, lon = 30.9010, 75.8573

    # ── STEP 4: Read image bytes ──────────────────────────────
    image_bytes = file.read()
    if len(image_bytes) == 0:
        return jsonify({"error": "Image file is empty"}), 400

    # ── STEP 5: Get live weather ──────────────────────────────
    # Uses GPS coordinates to fetch real weather from OpenWeatherMap
    # weather_risk score is passed to AI predictor to affect:
    #   - crop health score calculation
    #   - urgency timeline hours
    # ─────────────────────────────────────────────────────────
    weather = get_weather_by_coords(lat, lon)
    weather_risk = weather.get("risk_score", 50)

    # ── STEP 6: Run AI inference ──────────────────────────────
    # ══════════════════════════════════════════════════════════
    # THIS IS WHERE YOUR KAGGLE MODEL DOES ITS WORK
    #
    # run_inference combines:
    #   1. Your EfficientNetB3 model (plant_model.h5)
    #   2. Crop name boost (user input improves accuracy)
    #   3. Weather risk (affects health score + urgency)
    #
    # Returns disease, confidence, health_score, urgency,
    # checklist, fungicides, all_scores
    # ══════════════════════════════════════════════════════════
    result = run_inference(image_bytes, crop_name, weather_risk)

    # ── STEP 7: Calculate economic loss ──────────────────────
    # Only calculated when farmer provides crop name + land size
    # Formula: confidence * yield_loss * (1 + weather_risk/100)
    # ─────────────────────────────────────────────────────────
    if crop_name and land_acres > 0:
        economics = calculate_loss(
            crop_name=crop_name,
            land_acres=land_acres,
            loss_pct=result["loss_pct"],
            confidence=result["confidence"],
            weather_risk=weather_risk,
        )
        result["economics"] = economics
    else:
        result["economics"] = None

    # ── STEP 8: Attach weather data to response ───────────────
    # App.jsx uses this to populate:
    #   - Weather strip on home screen
    #   - Weather risk card on results screen
    #   - Field warnings section
    # ─────────────────────────────────────────────────────────
    result["weather"] = weather

    return jsonify(result), 200


# Info endpoint — visit GET /predict in browser to confirm route works
@predict_bp.route("/predict", methods=["GET"])
def predict_info():
    return jsonify(
        {
            "endpoint": "POST /predict",
            "required_fields": ["image (file)"],
            "optional_fields": [
                "crop (string)",
                "land (float)",
                "lat (float)",
                "lon (float)",
            ],
            "status": "ready",
        }
    )
