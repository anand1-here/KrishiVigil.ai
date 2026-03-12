# =============================================================
# FILE: backend/engines/economic_engine.py
# PURPOSE: Calculates crop economic loss in Indian Rupees
#
# FORMULA USED:
#   weather_multiplier = 1.0 + (weather_risk / 200)       → range 1.0 to 1.5
#   confidence_factor  = 0.7 + 0.3 * (confidence / 100)  → range 0.70 to 1.0
#   effective_loss%    = loss_pct * weather_multiplier * confidence_factor
#   projected_loss     = land * yield_per_acre * msp_per_kg * effective_loss%
#
# MSP RATES: Official Government of India rates for 2025-26
#   Kharif crops: CCEA approved May 2025
#   Rabi crops:   CCEA approved October 2024
#   Vegetables (tomato/potato/onion): NOT under MSP — uses average mandi prices
#   Source: pib.gov.in, desagri.gov.in
#
# ALL INPUTS COME FROM:
#   confidence    → AI model output (predictor.py)
#   loss_pct      → per-disease value from ADVICE_DB in predictor.py
#   weather_risk  → Live weather API (weather_service.py)
#   crop_name     → Farmer's input from crop popup
#   land_acres    → Farmer's input from crop popup
# =============================================================


# ── MSP DATABASE ──────────────────────────────────────────────
# MSP = Minimum Support Price (Indian Government official rate)
# Unit: Rs per quintal (1 quintal = 100 kg)
# Source: Government of India MSP 2023-24 announcement
#
# TO ADD A NEW CROP:
#   1. Find its official MSP at: https://agricoop.nic.in
#   2. Add a new line: "crop_name": MSP_value,
#   3. Also add it to YIELD_PER_ACRE below
# ─────────────────────────────────────────────────────────────
MSP_PER_QUINTAL = {
    # ── VEGETABLES (NOT under official MSP — using average market/mandi prices) ──
    # Source: NAFED/NCCF market intervention data, average mandi prices 2024-25
    # Tomato, Onion, Potato (TOP crops) are regulated via MIS scheme, not MSP
    "tomato":      800,   # avg mandi ₹8/kg, highly volatile (₹5–₹25/kg range)
    "potato":      700,   # avg mandi ₹7/kg (₹5–₹12/kg range)
    "onion":       1000,  # avg mandi ₹10/kg (₹6–₹20/kg range)
    "brinjal":     800,
    "eggplant":    800,
    "cabbage":     600,
    "cauliflower": 800,
    "spinach":     600,
    "chilli":      9000,  # dried red chilli, approximate market price
    "pepper":      2000,
    "shimla mirch": 2000,

    # ── CEREALS (Official MSP 2025-26, Government of India) ──────────────────
    # Source: CCEA approved rates — Kharif 2025-26 & Rabi 2025-26
    "wheat":  2425,   # Rabi 2025-26 (up from ₹2275 → +₹150/quintal)
    "rice":   2369,   # Kharif 2025-26 common paddy (up from ₹2300 → +₹69)
    "paddy":  2369,   # same as rice
    "maize":  2400,   # Kharif 2025-26 (up from ₹2225 → +₹175/quintal)
    "corn":   2400,
    "jowar":  3371,   # Kharif 2025-26 hybrid jowar
    "bajra":  2625,   # Kharif 2025-26 (up from ₹2500)
    "ragi":   4931,   # Kharif 2025-26 (up from ₹3846 → +₹596 — highest hike)

    # ── PULSES (Official MSP 2025-26) ────────────────────────────────────────
    "chickpea": 5650,  # gram/chana, Rabi 2025-26 (up from ₹5440)
    "gram":     5650,
    "lentil":   6700,  # masur/lentil, Rabi 2025-26 (up from ₹6425)
    "moong":    8768,  # Kharif 2025-26 (up from ₹8682 → +₹86)
    "tur":      8000,  # arhar/pigeon pea, Kharif 2025-26 (up from ₹7550 → +₹450)
    "urad":     7800,  # black gram, Kharif 2025-26 (up from ₹7400 → +₹400)
    "peas":     1350,  # not under central MSP, approximate market price

    # ── OILSEEDS (Official MSP 2025-26) ──────────────────────────────────────
    "soybean":  5328,  # Kharif 2025-26 (up from ₹4892 → +₹436)
    "soya":     5328,
    "mustard":  5950,  # rapeseed/mustard, Rabi 2025-26 (up from ₹5650 → +₹300)
    "rapeseed": 5950,
    "sunflower": 7280, # Kharif 2025-26
    "groundnut": 7263, # Kharif 2025-26 (up from ₹6783 → +₹480)
    "peanut":   7263,

    # ── CASH CROPS (Official MSP 2025-26) ────────────────────────────────────
    "cotton":   7121,  # medium staple, Kharif 2025-26 (up from ₹6620 → +₹589)
    "sugarcane": 340,  # FRP 2025-26 (Fair and Remunerative Price, up from ₹315)

    # ── FRUITS (NOT under official MSP — approximate average market prices) ──
    "banana":      1200,
    "mango":       3000,
    "pomegranate": 6000,
    "guava":       1000,
    "papaya":      800,
    "watermelon":  500,
    "apple":       5000,  # Himachal/Kashmir variety average
    "grape":       4000,
    "strawberry":  10000,
}


# ── YIELD PER ACRE ────────────────────────────────────────────
# Average yield in KG per acre for Indian farming conditions
# Source: ICAR crop production statistics
#
# TO ADD A NEW CROP: add same key as in MSP_PER_QUINTAL above
# ─────────────────────────────────────────────────────────────
YIELD_PER_ACRE = {
    "tomato": 20000,
    "potato": 12000,
    "onion": 15000,
    "brinjal": 14000,
    "eggplant": 14000,
    "cabbage": 18000,
    "cauliflower": 12000,
    "spinach": 8000,
    "chilli": 1500,
    "pepper": 3000,
    "shimla mirch": 3000,
    "wheat": 3200,
    "rice": 2500,
    "paddy": 2500,
    "maize": 5500,
    "corn": 5500,
    "jowar": 1000,
    "bajra": 900,
    "ragi": 800,
    "chickpea": 900,
    "gram": 900,
    "lentil": 800,
    "peas": 3000,
    "soybean": 1200,
    "soya": 1200,
    "mustard": 1300,
    "rapeseed": 1300,
    "sunflower": 1000,
    "groundnut": 1800,
    "peanut": 1800,
    "cotton": 600,
    "sugarcane": 80000,
    "banana": 12000,
    "mango": 5000,
    "papaya": 15000,
    "watermelon": 20000,
    "apple": 8000,
    "grape": 8000,
    "strawberry": 4000,
}

DEFAULT_MSP = 1200  # Rs/quintal fallback for unknown crops
DEFAULT_YIELD = 8000  # kg/acre fallback for unknown crops


def _lookup(database, crop_name, default):
    """Finds crop in database with partial name matching."""
    key = crop_name.lower().strip()
    if key in database:
        return database[key]
    # Try partial match (e.g. "red tomato" matches "tomato")
    for k in database:
        if k in key or key in k:
            return database[k]
    return default


def calculate_loss(crop_name, land_acres, loss_pct, confidence=100.0, weather_risk=50):
    """
    Calculates projected economic loss in Indian Rupees.

    Parameters:
        crop_name    → from farmer's crop popup (e.g. "Tomato")
        land_acres   → from farmer's crop popup (e.g. 3.5)
        loss_pct     → yield loss 0.0-1.0 from AI model
                       (0.65 = 65% for Late Blight)
        confidence   → AI model confidence 0-100
        weather_risk → live weather risk score 0-100

    Economic Formula:
        effective_loss = (confidence/100) * loss_pct * (1 + weather_risk/100)
        projected_loss = total_crop_value * effective_loss
    """
    # Look up MSP and yield for this crop
    msp_quintal = _lookup(MSP_PER_QUINTAL, crop_name, DEFAULT_MSP)
    msp_per_kg = msp_quintal / 100  # Convert Rs/quintal to Rs/kg
    yield_per_ac = _lookup(YIELD_PER_ACRE, crop_name, DEFAULT_YIELD)

    # Total crop value if harvested perfectly
    total_yield_kg = land_acres * yield_per_ac
    total_value = round(total_yield_kg * msp_per_kg)

    # ── CORE LOSS FORMULA ─────────────────────────────────────
    # loss_pct           → base disease damage from ADVICE_DB (e.g. 0.65 for Late Blight)
    #                       This is a fixed agronomic fact — independent of AI confidence
    # weather_multiplier → weather amplifies spread risk: 1.0 (no risk) to 1.5 (high risk)
    # confidence_factor  → mild adjustment only: high confidence = full estimate,
    #                       low confidence = 70% of estimate (NEVER zeros out loss).
    #                       Range: 0.7 (at conf=0) to 1.0 (at conf=100)
    #
    # WHY THIS CHANGE: confidence is the AI model's certainty score, NOT disease severity.
    # A low-confidence detection of Late Blight still means Late Blight is present.
    # The old formula (confidence/100 * loss_pct) wrongly gave ₹0 at 0% confidence,
    # misleading farmers into ignoring a real disease.
    # ─────────────────────────────────────────────────────────
    weather_multiplier = 1.0 + (weather_risk / 200)        # 1.0 to 1.5 range
    confidence_factor  = 0.7 + 0.3 * (confidence / 100)   # 0.70 to 1.0 range
    effective_loss_pct = loss_pct * weather_multiplier * confidence_factor
    effective_loss_pct = min(effective_loss_pct, 1.0)      # Cap at 100% loss

    projected_loss = round(total_value * effective_loss_pct)
    treatment_cost = round(land_acres * 1200)  # ~Rs 1200/acre for treatment
    net_saving = max(projected_loss - treatment_cost, 0)

    # PM Fasal Bima Yojana maximum coverage is Rs 2,00,000
    insurance_cover = min(projected_loss, 200000)

    # Risk classification for dashboard badge
    if projected_loss > 100000:
        risk_label = "SEVERE"
    elif projected_loss > 50000:
        risk_label = "HIGH"
    else:
        risk_label = "MODERATE"

    return {
        "crop": crop_name,
        "land_acres": land_acres,
        "msp_per_kg": round(msp_per_kg, 2),
        "yield_per_acre_kg": yield_per_ac,
        "total_value": total_value,
        "effective_loss_pct": round(effective_loss_pct * 100, 1),
        "projected_loss": projected_loss,
        "treatment_cost": treatment_cost,
        "net_saving": net_saving,
        "insurance_cover": insurance_cover,
        "risk_label": risk_label,
        "currency": "INR",
    }