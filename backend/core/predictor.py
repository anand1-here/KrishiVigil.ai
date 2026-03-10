import io
import numpy as np
from PIL import Image
from core.model_loader import get_model, get_class_names

INPUT_SIZE = (300, 300)  # kept for reference — YOLOv8 handles resize internally


# ══════════════════════════════════════════════════════════════
# SECTION 1: DISPLAY NAMES
# Maps raw class name → human-readable disease name
# Covers all 52 classes: 38 PlantVillage + 3 Rice + 11 Wheat
# ══════════════════════════════════════════════════════════════

DISPLAY_NAMES = {
    # ── TOMATO ────────────────────────────────────────────────
    "Tomato___Late_blight":                              "Tomato Late Blight",
    "Tomato___Early_blight":                             "Tomato Early Blight",
    "Tomato___Leaf_Mold":                                "Tomato Leaf Mold",
    "Tomato___Septoria_leaf_spot":                       "Tomato Septoria Leaf Spot",
    "Tomato___Spider_mites Two-spotted_spider_mite":     "Tomato Spider Mite Damage",
    "Tomato___Target_Spot":                              "Tomato Target Spot",
    "Tomato___Bacterial_spot":                           "Tomato Bacterial Spot",
    "Tomato___Tomato_Yellow_Leaf_Curl_Virus":            "Tomato Yellow Leaf Curl Virus",
    "Tomato___Tomato_mosaic_virus":                      "Tomato Mosaic Virus",
    "Tomato___healthy":                                  "Tomato Healthy",

    # ── POTATO ────────────────────────────────────────────────
    "Potato___Late_blight":                              "Potato Late Blight",
    "Potato___Early_blight":                             "Potato Early Blight",
    "Potato___healthy":                                  "Potato Healthy",

    # ── CORN / MAIZE ──────────────────────────────────────────
    "Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot": "Maize Gray Leaf Spot",
    "Corn_(maize)___Common_rust_":                        "Maize Common Rust",
    "Corn_(maize)___Northern_Leaf_Blight":                "Maize Northern Leaf Blight",
    "Corn_(maize)___healthy":                             "Maize Healthy",

    # ── APPLE ─────────────────────────────────────────────────
    "Apple___Apple_scab":                                "Apple Scab",
    "Apple___Black_rot":                                 "Apple Black Rot",
    "Apple___Cedar_apple_rust":                          "Apple Cedar Rust",
    "Apple___healthy":                                   "Apple Healthy",

    # ── GRAPE ─────────────────────────────────────────────────
    "Grape___Black_rot":                                 "Grape Black Rot",
    "Grape___Esca_(Black_Measles)":                      "Grape Black Measles",
    "Grape___Leaf_blight_(Isariopsis_Leaf_Spot)":        "Grape Leaf Blight",
    "Grape___healthy":                                   "Grape Healthy",

    # ── OTHER PLANTVILLAGE CROPS ──────────────────────────────
    "Cherry_(including_sour)___Powdery_mildew":          "Cherry Powdery Mildew",
    "Cherry_(including_sour)___healthy":                 "Cherry Healthy",
    "Orange___Haunglongbing_(Citrus_greening)":          "Citrus Greening Disease",
    "Peach___Bacterial_spot":                            "Peach Bacterial Spot",
    "Peach___healthy":                                   "Peach Healthy",
    "Pepper,_bell___Bacterial_spot":                     "Bell Pepper Bacterial Spot",
    "Pepper,_bell___healthy":                            "Bell Pepper Healthy",
    "Raspberry___healthy":                               "Raspberry Healthy",
    "Blueberry___healthy":                               "Blueberry Healthy",
    "Soybean___healthy":                                 "Soybean Healthy",
    "Squash___Powdery_mildew":                           "Squash Powdery Mildew",
    "Strawberry___Leaf_scorch":                          "Strawberry Leaf Scorch",
    "Strawberry___healthy":                              "Strawberry Healthy",

    # ── RICE (3 new classes from Kaggle merge) ─────────────────
    "Rice___Brown_Spot":                                 "Rice Brown Spot",
    "Rice___Bacterial_Leaf_Blight":                      "Rice Bacterial Leaf Blight",
    "Rice___Leaf_Smut":                                  "Rice Leaf Smut",

    # ── WHEAT (11 new classes from Kaggle merge) ───────────────
    "Wheat___Yellow_Rust":                               "Wheat Yellow Rust",
    "Wheat___Brown_Rust":                                "Wheat Brown Rust",
    "Wheat___Black_Rust":                                "Wheat Black Rust",
    "Wheat___Powdery_Mildew":                            "Wheat Powdery Mildew",
    "Wheat___Blast":                                     "Wheat Blast",
    "Wheat___Septoria":                                  "Wheat Septoria",
    "Wheat___Leaf_Blight":                               "Wheat Leaf Blight",
    "Wheat___Tan_Spot":                                  "Wheat Tan Spot",
    "Wheat___Smut":                                      "Wheat Smut",
    "Wheat___Fusarium_Head_Blight":                      "Wheat Fusarium Head Blight",
    "Wheat___healthy":                                   "Wheat Healthy",
}


# ══════════════════════════════════════════════════════════════
# CROP FILTER MAP
# Maps user crop name → expected display name prefix
# If user says "Maize", only "Maize ..." diseases are valid
# ══════════════════════════════════════════════════════════════

CROP_FILTER_MAP = {
    "tomato":       "Tomato",
    "tamatar":      "Tomato",
    "potato":       "Potato",
    "aloo":         "Potato",
    "maize":        "Maize",
    "corn":         "Maize",
    "makka":        "Maize",
    "makki":        "Maize",
    "wheat":        "Wheat",
    "gehun":        "Wheat",
    "gehu":         "Wheat",
    "rice":         "Rice",
    "paddy":        "Rice",
    "dhan":         "Rice",
    "chawal":       "Rice",
    "grape":        "Grape",
    "angoor":       "Grape",
    "apple":        "Apple",
    "seb":          "Apple",
    "cherry":       "Cherry",
    "peach":        "Peach",
    "aadoo":        "Peach",
    "orange":       "Citrus",
    "santra":       "Citrus",
    "pepper":       "Bell Pepper",
    "shimla mirch": "Bell Pepper",
    "capsicum":     "Bell Pepper",
    "squash":       "Squash",
    "kaddu":        "Squash",
    "strawberry":   "Strawberry",
    "raspberry":    "Raspberry",
    "blueberry":    "Blueberry",
    "soybean":      "Soybean",
    "soya":         "Soybean",
}


# ══════════════════════════════════════════════════════════════
# SECTION 2: SEVERITY MAPPING
# ══════════════════════════════════════════════════════════════

SEVERITY_MAP = {
    # High severity
    "Tomato Late Blight":              "High",
    "Potato Late Blight":              "High",
    "Tomato Yellow Leaf Curl Virus":   "High",
    "Tomato Mosaic Virus":             "High",
    "Maize Northern Leaf Blight":      "High",
    "Citrus Greening Disease":         "High",
    "Grape Black Measles":             "High",
    "Rice Bacterial Leaf Blight":      "High",
    "Wheat Yellow Rust":               "High",
    "Wheat Black Rust":                "High",
    "Wheat Blast":                     "High",
    "Wheat Fusarium Head Blight":      "High",

    # Medium severity
    "Tomato Early Blight":             "Medium",
    "Potato Early Blight":             "Medium",
    "Tomato Bacterial Spot":           "Medium",
    "Maize Common Rust":               "Medium",
    "Maize Gray Leaf Spot":            "Medium",
    "Apple Scab":                      "Medium",
    "Apple Black Rot":                 "Medium",
    "Grape Black Rot":                 "Medium",
    "Grape Leaf Blight":               "Medium",
    "Bell Pepper Bacterial Spot":      "Medium",
    "Peach Bacterial Spot":            "Medium",
    "Cherry Powdery Mildew":           "Medium",
    "Squash Powdery Mildew":           "Medium",
    "Strawberry Leaf Scorch":          "Medium",
    "Rice Leaf Smut":                  "Medium",
    "Rice Brown Spot":                 "Medium",
    "Wheat Brown Rust":                "Medium",
    "Wheat Powdery Mildew":            "Medium",
    "Wheat Septoria":                  "Medium",
    "Wheat Leaf Blight":               "Medium",
    "Wheat Tan Spot":                  "Medium",
    "Wheat Smut":                      "Medium",

    # Low severity
    "Tomato Leaf Mold":                "Low",
    "Tomato Septoria Leaf Spot":       "Low",
    "Tomato Spider Mite Damage":       "Low",
    "Tomato Target Spot":              "Low",
    "Apple Cedar Rust":                "Low",

    # None — healthy
    "Tomato Healthy":                  "None",
    "Potato Healthy":                  "None",
    "Maize Healthy":                   "None",
    "Apple Healthy":                   "None",
    "Grape Healthy":                   "None",
    "Cherry Healthy":                  "None",
    "Peach Healthy":                   "None",
    "Bell Pepper Healthy":             "None",
    "Raspberry Healthy":               "None",
    "Blueberry Healthy":               "None",
    "Soybean Healthy":                 "None",
    "Strawberry Healthy":              "None",
    "Rice Healthy":                    "None",
    "Wheat Healthy":                   "None",
}


# ══════════════════════════════════════════════════════════════
# SECTION 3: YIELD LOSS PER DISEASE
# ══════════════════════════════════════════════════════════════

YIELD_LOSS = {
    # Tomato
    "Tomato Late Blight":              {"label": "50-80%", "pct": 0.65},
    "Tomato Early Blight":             {"label": "20-40%", "pct": 0.30},
    "Tomato Leaf Mold":                {"label": "10-20%", "pct": 0.15},
    "Tomato Septoria Leaf Spot":       {"label": "10-25%", "pct": 0.18},
    "Tomato Spider Mite Damage":       {"label": "15-30%", "pct": 0.22},
    "Tomato Target Spot":              {"label": "10-20%", "pct": 0.15},
    "Tomato Bacterial Spot":           {"label": "20-40%", "pct": 0.30},
    "Tomato Yellow Leaf Curl Virus":   {"label": "40-70%", "pct": 0.55},
    "Tomato Mosaic Virus":             {"label": "30-60%", "pct": 0.45},
    "Tomato Healthy":                  {"label": "0%",     "pct": 0.00},

    # Potato
    "Potato Late Blight":              {"label": "50-80%", "pct": 0.65},
    "Potato Early Blight":             {"label": "20-40%", "pct": 0.30},
    "Potato Healthy":                  {"label": "0%",     "pct": 0.00},

    # Maize
    "Maize Gray Leaf Spot":            {"label": "20-50%", "pct": 0.35},
    "Maize Common Rust":               {"label": "15-40%", "pct": 0.28},
    "Maize Northern Leaf Blight":      {"label": "30-60%", "pct": 0.45},
    "Maize Healthy":                   {"label": "0%",     "pct": 0.00},

    # Apple
    "Apple Scab":                      {"label": "30-50%", "pct": 0.40},
    "Apple Black Rot":                 {"label": "20-40%", "pct": 0.30},
    "Apple Cedar Rust":                {"label": "10-25%", "pct": 0.18},
    "Apple Healthy":                   {"label": "0%",     "pct": 0.00},

    # Grape
    "Grape Black Rot":                 {"label": "30-60%", "pct": 0.45},
    "Grape Black Measles":             {"label": "40-70%", "pct": 0.55},
    "Grape Leaf Blight":               {"label": "20-40%", "pct": 0.30},
    "Grape Healthy":                   {"label": "0%",     "pct": 0.00},

    # Others (PlantVillage)
    "Cherry Powdery Mildew":           {"label": "15-30%", "pct": 0.22},
    "Citrus Greening Disease":         {"label": "60-100%","pct": 0.80},
    "Peach Bacterial Spot":            {"label": "20-40%", "pct": 0.30},
    "Bell Pepper Bacterial Spot":      {"label": "20-35%", "pct": 0.28},
    "Squash Powdery Mildew":           {"label": "15-30%", "pct": 0.22},
    "Strawberry Leaf Scorch":          {"label": "15-30%", "pct": 0.22},
    "Cherry Healthy":                  {"label": "0%",     "pct": 0.00},
    "Peach Healthy":                   {"label": "0%",     "pct": 0.00},
    "Bell Pepper Healthy":             {"label": "0%",     "pct": 0.00},
    "Raspberry Healthy":               {"label": "0%",     "pct": 0.00},
    "Blueberry Healthy":               {"label": "0%",     "pct": 0.00},
    "Soybean Healthy":                 {"label": "0%",     "pct": 0.00},
    "Strawberry Healthy":              {"label": "0%",     "pct": 0.00},

    # Rice (3 new classes)
    "Rice Bacterial Leaf Blight":      {"label": "30-50%", "pct": 0.40},
    "Rice Leaf Smut":                  {"label": "20-40%", "pct": 0.30},
    "Rice Brown Spot":                 {"label": "20-40%", "pct": 0.30},
    "Rice Healthy":                    {"label": "0%",     "pct": 0.00},

    # Wheat (11 new classes)
    "Wheat Yellow Rust":               {"label": "40-70%", "pct": 0.55},
    "Wheat Black Rust":                {"label": "40-70%", "pct": 0.55},
    "Wheat Blast":                     {"label": "50-80%", "pct": 0.65},
    "Wheat Fusarium Head Blight":      {"label": "30-60%", "pct": 0.45},
    "Wheat Brown Rust":                {"label": "20-40%", "pct": 0.30},
    "Wheat Powdery Mildew":            {"label": "15-30%", "pct": 0.22},
    "Wheat Septoria":                  {"label": "20-40%", "pct": 0.30},
    "Wheat Leaf Blight":               {"label": "20-35%", "pct": 0.28},
    "Wheat Tan Spot":                  {"label": "15-30%", "pct": 0.22},
    "Wheat Smut":                      {"label": "20-40%", "pct": 0.30},
    "Wheat Healthy":                   {"label": "0%",     "pct": 0.00},
}


# ══════════════════════════════════════════════════════════════
# SECTION 4: CROP NAME BOOST
# ══════════════════════════════════════════════════════════════

CROP_BOOST = {
    # Vegetables
    "tomato":       ["Tomato___"],
    "tamatar":      ["Tomato___"],
    "potato":       ["Potato___"],
    "aloo":         ["Potato___"],
    "pepper":       ["Pepper,_bell___"],
    "shimla mirch": ["Pepper,_bell___"],
    "capsicum":     ["Pepper,_bell___"],
    "squash":       ["Squash___"],
    "kaddu":        ["Squash___"],

    # Cereals
    "corn":         ["Corn_(maize)___"],
    "maize":        ["Corn_(maize)___"],
    "makka":        ["Corn_(maize)___"],
    "makki":        ["Corn_(maize)___"],

    # Rice
    "rice":         ["Rice___"],
    "chawal":       ["Rice___"],
    "dhan":         ["Rice___"],
    "paddy":        ["Rice___"],

    # Wheat
    "wheat":        ["Wheat___"],
    "gehu":         ["Wheat___"],
    "gehun":        ["Wheat___"],

    # Fruits
    "apple":        ["Apple___"],
    "seb":          ["Apple___"],
    "grape":        ["Grape___"],
    "angoor":       ["Grape___"],
    "cherry":       ["Cherry_(including_sour)___"],
    "peach":        ["Peach___"],
    "aadoo":        ["Peach___"],
    "orange":       ["Orange___"],
    "santra":       ["Orange___"],
    "strawberry":   ["Strawberry___"],
    "raspberry":    ["Raspberry___"],
    "blueberry":    ["Blueberry___"],

    # Others
    "soybean":      ["Soybean___"],
    "soya":         ["Soybean___"],
}

BOOST_FACTOR = 1.25


# ══════════════════════════════════════════════════════════════
# SECTION 5: COMPREHENSIVE DISEASE ADVICE DATABASE
# ══════════════════════════════════════════════════════════════

ADVICE_DB = {

    # ── TOMATO ──────────────────────────────────────────────────
    "tomato": {
        "Tomato Late Blight": {
            "checklist": [
                {"tier": "Do TODAY", "color": "red", "items": [
                    "Spray Cymoxanil + Mancozeb (Curzate M8) — best for tomato Late Blight",
                    "Remove all black/brown lesion leaves immediately and burn them",
                    "Stop all overhead irrigation — use drip only",
                ]},
                {"tier": "Within 3 Days", "color": "yellow", "items": [
                    "Apply foliar spray of 0.5% K2SO4 to strengthen tomato cell walls",
                    "Check fruits for dark water-soaked spots — remove infected fruits",
                    "Switch to drip irrigation — Late Blight spreads 10x faster with wet leaves",
                ]},
                {"tier": "This Week", "color": "green", "items": [
                    "Stake and prune tomato plants to reduce canopy humidity",
                    "Apply Trichoderma harzianum to soil around root zone",
                    "Send soil sample to nearest KVK for nutrient analysis",
                ]},
                {"tier": "Next Season", "color": "blue", "items": [
                    "Use blight-resistant varieties: Arka Rakshak, Pusa Hybrid-4",
                    "Maintain 60cm plant spacing for better airflow",
                    "Pre-treat seeds with Thiram 75WS at 3g/kg before sowing",
                ]},
            ],
            "fungicides": [
                {"name": "Curzate M8 (Cymoxanil+Mancozeb)", "dose": "2g/L water",   "timing": "Morning, every 5-7 days", "type": "Systemic"},
                {"name": "Ridomil Gold MZ (Metalaxyl)",      "dose": "2.5g/L water", "timing": "Morning spray only",      "type": "Systemic"},
                {"name": "Dithane M-45 (Mancozeb 75WP)",     "dose": "2.5g/L water", "timing": "Alternate with systemic", "type": "Contact"},
            ],
            "weather_triggers": {
                "high_risk_temp":  "15-25°C with humidity above 80% — perfect Late Blight weather",
                "warning":         "Rain forecast increases spread risk by 10x — spray immediately",
                "safe_temp":       "Above 30°C slows Late Blight spread temporarily",
            },
        },
        "Tomato Early Blight": {
            "checklist": [
                {"tier": "Do TODAY", "color": "red", "items": [
                    "Remove all lower leaves with dark bullseye ring spots",
                    "Apply Mancozeb 75WP (Indofil M-45) spray at 2.5g per litre",
                    "Avoid wetting leaves while watering",
                ]},
                {"tier": "Within 3 Days", "color": "yellow", "items": [
                    "Apply Score 250EC (Difenoconazole) for systemic control",
                    "Remove fallen diseased leaves from soil surface",
                    "Top-dress with calcium nitrate to strengthen cell walls",
                ]},
                {"tier": "This Week", "color": "green", "items": [
                    "Apply straw mulch to prevent soil splash onto leaves",
                    "Stake plants to keep foliage off the ground",
                ]},
                {"tier": "Next Season", "color": "blue", "items": [
                    "Use resistant varieties: Pusa Ruby, Arka Vikas",
                    "Seed treatment with Thiram or Captan before sowing",
                    "Maintain 2-year rotation with non-Solanaceae crops",
                ]},
            ],
            "fungicides": [
                {"name": "Indofil M-45 (Mancozeb 75WP)", "dose": "2.5g/L water", "timing": "Every 7 days",  "type": "Contact"},
                {"name": "Score 250EC (Difenoconazole)", "dose": "1mL/L water",  "timing": "Every 14 days", "type": "Systemic"},
                {"name": "Amistar (Azoxystrobin 23SC)",  "dose": "1mL/L water",  "timing": "At first sign", "type": "Systemic"},
            ],
            "weather_triggers": {
                "high_risk_temp": "24-29°C with moderate humidity — ideal Early Blight weather",
                "warning":        "Dry windy conditions spread spores rapidly — monitor closely",
                "safe_temp":      "Cool weather below 15°C slows progression",
            },
        },
        "Tomato Yellow Leaf Curl Virus": {
            "checklist": [
                {"tier": "Do TODAY", "color": "red", "items": [
                    "Remove and destroy all infected plants immediately — no treatment possible",
                    "Apply imidacloprid spray to kill whitefly vectors spreading the virus",
                    "Install yellow sticky traps around the field border",
                ]},
                {"tier": "Within 3 Days", "color": "yellow", "items": [
                    "Spray neem oil (5mL/L) to repel whitefly population",
                    "Apply reflective silver mulch to disorient whitefly insects",
                ]},
                {"tier": "This Week", "color": "green", "items": [
                    "Install insect-proof nets (50-60 mesh) in nursery area",
                    "Remove all weed hosts around the field boundary",
                ]},
                {"tier": "Next Season", "color": "blue", "items": [
                    "Use TYLCV-resistant varieties: Arka Rakshak, Punjab Chhuhara",
                    "Raise nursery under insect-proof nets",
                ]},
            ],
            "fungicides": [
                {"name": "Imidacloprid 17.8SL (Confidor)", "dose": "0.5mL/L water", "timing": "Weekly for vector control", "type": "Insecticide"},
                {"name": "Thiamethoxam 25WG (Actara)",     "dose": "0.3g/L water",  "timing": "Every 10 days",             "type": "Insecticide"},
                {"name": "Neem Oil 1500ppm",                "dose": "5mL/L water",   "timing": "Weekly organic option",     "type": "Bio"},
            ],
            "weather_triggers": {
                "high_risk_temp": "25-35°C dry weather — whitefly population explodes",
                "warning":        "Hot dry season is peak whitefly and TYLCV risk",
                "safe_temp":      "Heavy rain reduces whitefly population temporarily",
            },
        },
        "Tomato Mosaic Virus": {
            "checklist": [
                {"tier": "Do TODAY", "color": "red", "items": [
                    "Remove all plants showing mosaic/mottled patterns immediately",
                    "Wash hands with soap after handling infected plants",
                    "Disinfect tools with 10% bleach between plants",
                ]},
                {"tier": "Within 3 Days", "color": "yellow", "items": [
                    "Control aphid population — main vector of mosaic virus",
                    "Spray Dimethoate or Imidacloprid for aphid control",
                ]},
                {"tier": "This Week", "color": "green", "items": [
                    "Install yellow sticky traps to monitor aphid levels",
                    "Do not smoke near plants — tobacco mosaic virus can spread by contact",
                ]},
                {"tier": "Next Season", "color": "blue", "items": [
                    "Use mosaic-resistant varieties: Pusa Uphar, Arka Vikas",
                    "Seed treatment with Trisodium phosphate (10%) for 15 minutes",
                ]},
            ],
            "fungicides": [
                {"name": "Imidacloprid 17.8SL", "dose": "0.5mL/L water", "timing": "For aphid vector control", "type": "Insecticide"},
                {"name": "Dimethoate 30EC",      "dose": "2mL/L water",   "timing": "Every 10 days",            "type": "Insecticide"},
                {"name": "Neem Oil 1500ppm",      "dose": "5mL/L water",   "timing": "Weekly organic",           "type": "Bio"},
            ],
            "weather_triggers": {
                "high_risk_temp": "Warm dry weather increases aphid population and virus spread",
                "warning":        "Aphid migration season — monitor very closely",
                "safe_temp":      "Heavy rain knocks down aphid colonies temporarily",
            },
        },
        "Tomato Leaf Mold": {
            "checklist": [
                {"tier": "Do TODAY", "color": "red", "items": [
                    "Remove all leaves with yellow patches and brown mold underneath",
                    "Spray Mancozeb or Chlorothalonil immediately",
                    "Improve ventilation — prune dense canopy",
                ]},
                {"tier": "Within 3 Days", "color": "yellow", "items": [
                    "Apply Difenoconazole (Score 250EC) for systemic control",
                    "Reduce humidity in greenhouse/polyhouse below 85%",
                ]},
                {"tier": "This Week", "color": "green", "items": [
                    "Remove lower leaves to improve airflow",
                    "Monitor twice weekly during humid periods",
                ]},
                {"tier": "Next Season", "color": "blue", "items": [
                    "Use resistant varieties: Arka Meghali, Pusa Hybrid-4",
                    "Avoid overhead irrigation",
                ]},
            ],
            "fungicides": [
                {"name": "Kavach (Chlorothalonil 75WP)", "dose": "2g/L water",   "timing": "Every 7-10 days", "type": "Contact"},
                {"name": "Score 250EC (Difenoconazole)", "dose": "1mL/L water",  "timing": "Every 14 days",   "type": "Systemic"},
                {"name": "Dithane M-45 (Mancozeb 75WP)", "dose": "2.5g/L water", "timing": "Preventive use",  "type": "Contact"},
            ],
            "weather_triggers": {
                "high_risk_temp": "18-25°C with humidity above 85% — peak Leaf Mold conditions",
                "warning":        "Avoid night watering during humid weather",
                "safe_temp":      "Low humidity and good ventilation prevents mold",
            },
        },
        "Tomato Bacterial Spot": {
            "checklist": [
                {"tier": "Do TODAY", "color": "red", "items": [
                    "Apply copper hydroxide (Kocide 3000) spray immediately",
                    "Remove and destroy severely infected leaves and fruits",
                    "Avoid working in field when plants are wet — spreads bacteria",
                ]},
                {"tier": "Within 3 Days", "color": "yellow", "items": [
                    "Apply Streptomycin sulfate + Copper oxychloride combination",
                    "Stop overhead irrigation — switch to drip",
                ]},
                {"tier": "This Week", "color": "green", "items": [
                    "Spray with Bordeaux mixture (1%) as protective cover",
                    "Remove all infected plant debris from field",
                ]},
                {"tier": "Next Season", "color": "blue", "items": [
                    "Use certified disease-free seeds only",
                    "Use resistant hybrids: Arka Samrat, Namdhari NS-585",
                ]},
            ],
            "fungicides": [
                {"name": "Kocide 3000 (Copper Hydroxide)",      "dose": "1.5g/L water", "timing": "Every 7-10 days",  "type": "Contact"},
                {"name": "Blitox 50 (Copper Oxychloride 50WP)", "dose": "3g/L water",   "timing": "Preventive spray", "type": "Contact"},
                {"name": "Streptomycin Sulfate 90WP",           "dose": "0.5g/L water", "timing": "At first symptom", "type": "Bactericide"},
            ],
            "weather_triggers": {
                "high_risk_temp": "25-30°C with rain splash — bacteria spread rapidly",
                "warning":        "Rainy windy weather is highest risk period — spray before rain",
                "safe_temp":      "Dry hot weather above 35°C reduces bacterial activity",
            },
        },
        "Tomato Septoria Leaf Spot": {
            "checklist": [
                {"tier": "Do TODAY", "color": "red", "items": [
                    "Remove all lower leaves showing small circular spots with dark borders",
                    "Apply Mancozeb 75WP spray at 2.5g/L immediately",
                    "Stop overhead irrigation",
                ]},
                {"tier": "Within 3 Days", "color": "yellow", "items": [
                    "Apply Copper oxychloride spray for broad-spectrum control",
                    "Mulch around base to prevent soil splash",
                ]},
                {"tier": "This Week", "color": "green", "items": [
                    "Stake and tie plants to keep foliage off ground",
                    "Monitor spread — Septoria moves from bottom to top",
                ]},
                {"tier": "Next Season", "color": "blue", "items": [
                    "3-year crop rotation — avoid solanaceous crops",
                    "Pre-season soil treatment with Trichoderma viride",
                ]},
            ],
            "fungicides": [
                {"name": "Dithane M-45 (Mancozeb 75WP)",  "dose": "2.5g/L water", "timing": "Every 7-10 days",  "type": "Contact"},
                {"name": "Blitox 50 (Copper Oxychloride)", "dose": "3g/L water",   "timing": "Preventive spray", "type": "Contact"},
                {"name": "Score 250EC (Difenoconazole)",   "dose": "1mL/L water",  "timing": "Every 14 days",    "type": "Systemic"},
            ],
            "weather_triggers": {
                "high_risk_temp": "Wet weather 20-25°C — spores spread rapidly in rain",
                "warning":        "Rain splash is primary spreader — spray before rain",
                "safe_temp":      "Dry weather significantly slows Septoria spread",
            },
        },
        "Tomato Target Spot": {
            "checklist": [
                {"tier": "Do TODAY", "color": "red", "items": [
                    "Apply Azoxystrobin (Amistar) or Tebuconazole spray",
                    "Remove all leaves showing concentric ring spots",
                ]},
                {"tier": "Within 3 Days", "color": "yellow", "items": [
                    "Apply Mancozeb as contact protectant",
                    "Avoid evening irrigation",
                ]},
                {"tier": "This Week", "color": "green", "items": [
                    "Monitor fruits — Target Spot can affect fruit too",
                    "Apply balanced NPK to boost immunity",
                ]},
                {"tier": "Next Season", "color": "blue", "items": [
                    "Crop rotation with non-solanaceous crops",
                    "Preventive spray program before monsoon",
                ]},
            ],
            "fungicides": [
                {"name": "Amistar Top (Azoxystrobin+Difenoconazole)", "dose": "1mL/L water",  "timing": "Every 10 days", "type": "Systemic"},
                {"name": "Dithane M-45 (Mancozeb 75WP)",              "dose": "2.5g/L water", "timing": "Every 7 days",  "type": "Contact"},
                {"name": "Nativo (Tebuconazole+Trifloxystrobin)",      "dose": "0.5g/L water", "timing": "Every 14 days", "type": "Systemic"},
            ],
            "weather_triggers": {
                "high_risk_temp": "Warm humid conditions 25-30°C — optimal for Target Spot",
                "warning":        "Monitor closely during monsoon season",
                "safe_temp":      "Cool dry weather slows progression",
            },
        },
        "Tomato Spider Mite Damage": {
            "checklist": [
                {"tier": "Do TODAY", "color": "red", "items": [
                    "Spray Abamectin (Vertimec) or Spiromesifen for mite control",
                    "Spray forceful water jet on leaf undersides to dislodge mites",
                ]},
                {"tier": "Within 3 Days", "color": "yellow", "items": [
                    "Apply Neem oil 5mL/L — organic miticide",
                    "Increase irrigation — mites thrive in dry conditions",
                ]},
                {"tier": "This Week", "color": "green", "items": [
                    "Monitor with magnifying glass — look for fine webbing",
                ]},
                {"tier": "Next Season", "color": "blue", "items": [
                    "Avoid excessive nitrogen fertiliser — attracts mites",
                    "Early season neem oil sprays as preventive measure",
                ]},
            ],
            "fungicides": [
                {"name": "Vertimec (Abamectin 1.9EC)", "dose": "0.5mL/L water", "timing": "Every 7 days",           "type": "Acaricide"},
                {"name": "Oberon (Spiromesifen)",       "dose": "1mL/L water",   "timing": "Alternate with Vertimec", "type": "Acaricide"},
                {"name": "Neem Oil 1500ppm",             "dose": "5mL/L water",   "timing": "Weekly organic",          "type": "Bio"},
            ],
            "weather_triggers": {
                "high_risk_temp": "Hot dry weather above 30°C — mite populations explode",
                "warning":        "Drought stress worsens spider mite damage significantly",
                "safe_temp":      "Rain and humidity naturally suppresses mite populations",
            },
        },
        "Tomato Healthy": {
            "checklist": [
                {"tier": "Keep it Up!", "color": "green", "items": [
                    "Your tomato crop looks healthy — maintain current practices",
                    "Inspect plants every 3-4 days for early signs of disease",
                ]},
                {"tier": "Preventive Care", "color": "blue", "items": [
                    "Apply preventive Mancozeb spray before monsoon season",
                    "Install yellow sticky traps for early pest detection",
                ]},
            ],
            "fungicides": [
                {"name": "Dithane M-45 (Mancozeb 75WP)", "dose": "2g/L water",  "timing": "Preventive pre-monsoon", "type": "Contact"},
                {"name": "Trichoderma viride 1% WP",      "dose": "5g/L water",  "timing": "Soil drench",            "type": "Bio"},
                {"name": "Neem Oil 1500ppm",               "dose": "5mL/L water", "timing": "Weekly preventive",      "type": "Bio"},
            ],
            "weather_triggers": {
                "high_risk_temp": "Monitor closely when humidity rises above 80%",
                "warning":        "Pre-monsoon is highest disease risk period — spray preventively",
                "safe_temp":      "Maintain good practices year round",
            },
        },
    },

    # ── POTATO ──────────────────────────────────────────────────
    "potato": {
        "Potato Late Blight": {
            "checklist": [
                {"tier": "Do TODAY", "color": "red", "items": [
                    "Apply Metalaxyl 8% + Mancozeb 64% WP spray on all plants",
                    "Remove infected haulm (stems/leaves) — do not compost, burn them",
                    "Check tubers in storage — remove any showing rot symptoms",
                ]},
                {"tier": "Within 3 Days", "color": "yellow", "items": [
                    "Earth up potato beds to protect tubers from spore wash-in",
                    "Apply Cymoxanil spray — highly effective for potato Late Blight",
                ]},
                {"tier": "This Week", "color": "green", "items": [
                    "Consider early harvest if more than 30% plant area infected",
                    "Apply Bordeaux mixture (1%) as protective spray on healthy plants",
                ]},
                {"tier": "Next Season", "color": "blue", "items": [
                    "Use certified disease-free seed potatoes only",
                    "Plant resistant varieties: Kufri Jyoti, Kufri Bahar",
                ]},
            ],
            "fungicides": [
                {"name": "Infinito (Fluopicolide+Propamocarb)", "dose": "1.5mL/L water", "timing": "Every 7 days",     "type": "Systemic"},
                {"name": "Ridomil Gold (Metalaxyl+Mancozeb)",   "dose": "2g/L water",    "timing": "Morning only",     "type": "Systemic"},
                {"name": "Bordeaux Mixture 1%",                  "dose": "10L/acre",       "timing": "Preventive spray", "type": "Contact"},
            ],
            "weather_triggers": {
                "high_risk_temp": "10-20°C with humidity above 90% — most dangerous for potato",
                "warning":        "Fog and dew conditions — spray immediately before rainfall",
                "safe_temp":      "Above 30°C temporarily stops Late Blight spread",
            },
        },
        "Potato Early Blight": {
            "checklist": [
                {"tier": "Do TODAY", "color": "red", "items": [
                    "Spray Mancozeb 75WP at 2.5g/L on all potato plants",
                    "Remove and destroy infected lower leaves immediately",
                ]},
                {"tier": "Within 3 Days", "color": "yellow", "items": [
                    "Apply Difenoconazole for deeper systemic action",
                    "Apply micronutrient booster spray (zinc and boron)",
                ]},
                {"tier": "This Week", "color": "green", "items": [
                    "Apply Bordeaux mixture as protective spray on healthy rows",
                ]},
                {"tier": "Next Season", "color": "blue", "items": [
                    "Use certified seed tubers from disease-free stock",
                    "Plant resistant varieties: Kufri Sindhuri, Kufri Chandramukhi",
                ]},
            ],
            "fungicides": [
                {"name": "Indofil M-45 (Mancozeb 75WP)", "dose": "2.5g/L water", "timing": "Every 7-10 days",  "type": "Contact"},
                {"name": "Tilt 25EC (Propiconazole)",     "dose": "1mL/L water",  "timing": "At first symptom", "type": "Systemic"},
                {"name": "Kavach (Chlorothalonil 75WP)",  "dose": "2g/L water",   "timing": "Preventive spray", "type": "Contact"},
            ],
            "weather_triggers": {
                "high_risk_temp": "24-29°C with dry windy weather — spores spread by wind",
                "warning":        "Nutritional stress worsens Early Blight significantly",
                "safe_temp":      "Cool weather below 15°C reduces Early Blight risk",
            },
        },
        "Potato Healthy": {
            "checklist": [
                {"tier": "Keep it Up!", "color": "green", "items": [
                    "Your potato crop looks healthy — maintain current practices",
                    "Monitor for dark spots on leaves every 3-4 days",
                ]},
                {"tier": "Preventive Care", "color": "blue", "items": [
                    "Apply preventive Mancozeb spray before monsoon",
                    "Monitor for Late Blight during cool humid periods",
                ]},
            ],
            "fungicides": [
                {"name": "Dithane M-45 (Mancozeb 75WP)", "dose": "2g/L water", "timing": "Preventive pre-monsoon",  "type": "Contact"},
                {"name": "Bordeaux Mixture 1%",           "dose": "10L/acre",   "timing": "Pre-monsoon spray",       "type": "Contact"},
                {"name": "Trichoderma viride 1% WP",      "dose": "5g/L water", "timing": "Soil drench at planting", "type": "Bio"},
            ],
            "weather_triggers": {
                "high_risk_temp": "Cool foggy weather is highest risk period for potatoes",
                "warning":        "Monitor very closely when temperature drops below 20°C",
                "safe_temp":      "Maintain good drainage to prevent fungal buildup",
            },
        },
    },

    # ── MAIZE ───────────────────────────────────────────────────
    "maize": {
        "Maize Common Rust": {
            "checklist": [
                {"tier": "Do TODAY", "color": "red", "items": [
                    "Spray Propiconazole (Tilt 25EC) for rust control",
                    "Remove severely infected lower leaves from plant base",
                ]},
                {"tier": "Within 3 Days", "color": "yellow", "items": [
                    "Apply potassium-rich fertiliser to boost disease resistance",
                    "Document infection percentage per row for insurance claim",
                ]},
                {"tier": "This Week", "color": "green", "items": [
                    "Monitor tassel and ear leaves — protect these at all cost",
                    "Apply foliar zinc spray — deficiency increases rust risk",
                ]},
                {"tier": "Next Season", "color": "blue", "items": [
                    "Use rust-resistant hybrid maize: DKC 9144, Pioneer 30V92",
                    "Early sowing to escape peak rust season",
                ]},
            ],
            "fungicides": [
                {"name": "Tilt 25EC (Propiconazole)",             "dose": "1mL/L water",  "timing": "At first rust sign", "type": "Systemic"},
                {"name": "Nativo (Tebuconazole+Trifloxystrobin)", "dose": "0.5g/L water", "timing": "Every 14 days",      "type": "Systemic"},
                {"name": "Dithane M-45 (Mancozeb 75WP)",          "dose": "2.5g/L water", "timing": "Preventive use",     "type": "Contact"},
            ],
            "weather_triggers": {
                "high_risk_temp": "16-23°C with high humidity and dew — ideal rust weather",
                "warning":        "Cool humid nights followed by warm days — spray preventively",
                "safe_temp":      "Hot dry weather above 32°C slows rust significantly",
            },
        },
        "Maize Gray Leaf Spot": {
            "checklist": [
                {"tier": "Do TODAY", "color": "red", "items": [
                    "Apply Azoxystrobin + Propiconazole combination spray",
                    "Remove and destroy heavily infected lower leaves",
                ]},
                {"tier": "Within 3 Days", "color": "yellow", "items": [
                    "Apply foliar potassium spray — K deficiency worsens this disease",
                ]},
                {"tier": "This Week", "color": "green", "items": [
                    "Apply zinc sulphate spray — zinc improves disease tolerance",
                ]},
                {"tier": "Next Season", "color": "blue", "items": [
                    "Use resistant hybrids: Pioneer 30B11, DKC 7074",
                    "Crop rotation — avoid maize after maize",
                ]},
            ],
            "fungicides": [
                {"name": "Amistar Top (Azoxystrobin+Difenoconazole)", "dose": "1mL/L water",  "timing": "Every 10-14 days", "type": "Systemic"},
                {"name": "Tilt 25EC (Propiconazole)",                 "dose": "1mL/L water",  "timing": "At first sign",    "type": "Systemic"},
                {"name": "Dithane M-45 (Mancozeb 75WP)",              "dose": "2.5g/L water", "timing": "Preventive use",   "type": "Contact"},
            ],
            "weather_triggers": {
                "high_risk_temp": "25-30°C with high humidity and prolonged leaf wetness",
                "warning":        "Irrigation at night increases leaf wetness — avoid",
                "safe_temp":      "Dry windy conditions reduce Gray Leaf Spot spread",
            },
        },
        "Maize Northern Leaf Blight": {
            "checklist": [
                {"tier": "Do TODAY", "color": "red", "items": [
                    "Apply Mancozeb + Propiconazole combination immediately",
                    "Remove heavily infected leaves — long tan cigar-shaped lesions",
                ]},
                {"tier": "Within 3 Days", "color": "yellow", "items": [
                    "Apply Azoxystrobin for systemic control",
                    "Apply foliar nitrogen — deficiency worsens blight",
                ]},
                {"tier": "This Week", "color": "green", "items": [
                    "Survey upper canopy — NLB targets upper leaves near ear",
                ]},
                {"tier": "Next Season", "color": "blue", "items": [
                    "Plant NLB-resistant varieties: DKC 9081, Pioneer 30D55",
                    "Crop rotation with soybean or pulses",
                ]},
            ],
            "fungicides": [
                {"name": "Dithane M-45 (Mancozeb 75WP)",         "dose": "2.5g/L water", "timing": "Every 7-10 days",  "type": "Contact"},
                {"name": "Amistar (Azoxystrobin 23SC)",            "dose": "1mL/L water",  "timing": "At first symptom", "type": "Systemic"},
                {"name": "Nativo (Tebuconazole+Trifloxystrobin)", "dose": "0.5g/L water", "timing": "Every 14 days",    "type": "Systemic"},
            ],
            "weather_triggers": {
                "high_risk_temp": "18-27°C with leaf wetness — NLB thrives in moderate cool weather",
                "warning":        "Extended rainy periods are highest risk — spray before rain",
                "safe_temp":      "Hot dry summer weather reduces Northern Leaf Blight risk",
            },
        },
        "Maize Healthy": {
            "checklist": [
                {"tier": "Keep it Up!", "color": "green", "items": [
                    "Your maize crop looks healthy — maintain current practices",
                    "Monitor for rust pustules on leaves every 4-5 days",
                ]},
                {"tier": "Preventive Care", "color": "blue", "items": [
                    "Apply Mancozeb preventively before monsoon season",
                    "Soil test for zinc deficiency — common in maize fields",
                ]},
            ],
            "fungicides": [
                {"name": "Dithane M-45 (Mancozeb 75WP)", "dose": "2g/L water",  "timing": "Preventive pre-monsoon", "type": "Contact"},
                {"name": "Trichoderma viride 1% WP",      "dose": "5g/L water",  "timing": "Soil drench at sowing",  "type": "Bio"},
                {"name": "Neem Oil 1500ppm",               "dose": "5mL/L water", "timing": "Weekly preventive",      "type": "Bio"},
            ],
            "weather_triggers": {
                "high_risk_temp": "Monitor during monsoon — highest disease pressure",
                "warning":        "Cool humid weather triggers rust and blight — spray preventively",
                "safe_temp":      "Good drainage and airflow are best preventive measures",
            },
        },
    },

    # ── WHEAT ───────────────────────────────────────────────────
    "wheat": {
        "Wheat Yellow Rust": {
            "checklist": [
                {"tier": "Do TODAY", "color": "red", "items": [
                    "Spray Propiconazole (Tilt 25EC) at 0.1% immediately",
                    "Survey entire field — yellow stripe rust spreads extremely fast",
                    "Alert neighboring farmers — rust spreads via wind across fields",
                ]},
                {"tier": "Within 3 Days", "color": "yellow", "items": [
                    "Apply second spray of Tebuconazole (Folicur 250EC) if needed",
                    "Document affected area percentage for insurance claim",
                ]},
                {"tier": "This Week", "color": "green", "items": [
                    "Monitor upper canopy closely — rust climbs from bottom to top",
                    "Report yellow rust outbreak to nearest KVK or agriculture office",
                ]},
                {"tier": "Next Season", "color": "blue", "items": [
                    "Use rust-resistant varieties: PBW 725, HD 3086, WH 1105",
                    "Early sowing (October 15-25) to escape peak rust season",
                ]},
            ],
            "fungicides": [
                {"name": "Tilt 25EC (Propiconazole 25EC)",        "dose": "1mL/L water",  "timing": "At first stripe sign", "type": "Systemic"},
                {"name": "Folicur 250EC (Tebuconazole)",          "dose": "1mL/L water",  "timing": "Every 14 days",         "type": "Systemic"},
                {"name": "Nativo (Tebuconazole+Trifloxystrobin)", "dose": "0.5g/L water", "timing": "Single spray at boot",  "type": "Systemic"},
            ],
            "weather_triggers": {
                "high_risk_temp": "10-15°C with dew/fog — perfect yellow rust conditions in Jan-Feb",
                "warning":        "North India plains face highest risk January-February",
                "safe_temp":      "Temperature above 25°C kills yellow rust spores",
            },
        },
        "Wheat Brown Rust": {
            "checklist": [
                {"tier": "Do TODAY", "color": "red", "items": [
                    "Apply Propiconazole (Tilt 25EC) spray immediately",
                    "Check entire field for orange-brown pustules on leaves",
                ]},
                {"tier": "Within 3 Days", "color": "yellow", "items": [
                    "Second spray with Tebuconazole if disease has spread to more than 5% leaves",
                    "Monitor grain fill stage closely — rust at this stage causes shriveling",
                ]},
                {"tier": "This Week", "color": "green", "items": [
                    "Inspect flag leaf — protect it at all cost for grain fill",
                ]},
                {"tier": "Next Season", "color": "blue", "items": [
                    "Grow rust-resistant varieties: PBW 550, K 307, GW 496",
                    "Seed treatment with Carboxin + Thiram combination",
                ]},
            ],
            "fungicides": [
                {"name": "Tilt 25EC (Propiconazole)",    "dose": "1mL/L water",  "timing": "At first sign",    "type": "Systemic"},
                {"name": "Folicur 250EC (Tebuconazole)", "dose": "1mL/L water",  "timing": "Every 14-21 days", "type": "Systemic"},
                {"name": "Dithane M-45 (Mancozeb 75WP)", "dose": "2.5g/L water", "timing": "Preventive use",   "type": "Contact"},
            ],
            "weather_triggers": {
                "high_risk_temp": "15-22°C with high humidity and dew — brown rust thrives",
                "warning":        "February-March is peak brown rust period in Punjab-Haryana",
                "safe_temp":      "Summer heat naturally ends brown rust season",
            },
        },
        "Wheat Black Rust": {
            "checklist": [
                {"tier": "Do TODAY", "color": "red", "items": [
                    "Spray Propiconazole (Tilt 25EC) immediately — black rust spreads fast",
                    "Survey entire field for dark brown-black pustules on stems and leaves",
                    "Alert KVK / agriculture department — black rust is a notifiable disease",
                ]},
                {"tier": "Within 3 Days", "color": "yellow", "items": [
                    "Apply Tebuconazole (Folicur 250EC) for systemic control",
                    "Document affected area for PMFBY insurance claim",
                ]},
                {"tier": "This Week", "color": "green", "items": [
                    "Monitor stem pustules — black rust weakens stem, increases lodging risk",
                ]},
                {"tier": "Next Season", "color": "blue", "items": [
                    "Use black rust resistant varieties: HD 2781, PBW 343",
                    "Early sowing to avoid peak rust season",
                ]},
            ],
            "fungicides": [
                {"name": "Tilt 25EC (Propiconazole)",    "dose": "1mL/L water",  "timing": "At first sign",  "type": "Systemic"},
                {"name": "Folicur 250EC (Tebuconazole)", "dose": "1mL/L water",  "timing": "Every 14 days",  "type": "Systemic"},
                {"name": "Dithane M-45 (Mancozeb 75WP)", "dose": "2.5g/L water", "timing": "Preventive use", "type": "Contact"},
            ],
            "weather_triggers": {
                "high_risk_temp": "20-25°C with moisture — black rust spreads rapidly in warm humid weather",
                "warning":        "Warm wet weather in March-April is peak black rust risk",
                "safe_temp":      "Hot dry summer naturally ends black rust season",
            },
        },
        "Wheat Powdery Mildew": {
            "checklist": [
                {"tier": "Do TODAY", "color": "red", "items": [
                    "Apply Propiconazole (Tilt 25EC) at ear head emergence",
                    "Reduce nitrogen application — excess N worsens powdery mildew",
                ]},
                {"tier": "Within 3 Days", "color": "yellow", "items": [
                    "Apply sulphur-based fungicide (Sulfex) for organic control",
                    "Monitor flag leaf — powdery mildew on flag leaf reduces grain quality",
                ]},
                {"tier": "This Week", "color": "green", "items": [
                    "Apply potassium spray to boost natural plant resistance",
                ]},
                {"tier": "Next Season", "color": "blue", "items": [
                    "Use powdery mildew resistant varieties: NW 1014, HS 295",
                    "Balanced fertilisation — avoid high nitrogen application",
                ]},
            ],
            "fungicides": [
                {"name": "Tilt 25EC (Propiconazole)",  "dose": "1mL/L water", "timing": "At ear emergence",     "type": "Systemic"},
                {"name": "Sulfex (Sulphur 80WP)",       "dose": "3g/L water",  "timing": "When disease appears", "type": "Contact"},
                {"name": "Bavistin (Carbendazim 50WP)", "dose": "1g/L water",  "timing": "Every 14 days",         "type": "Systemic"},
            ],
            "weather_triggers": {
                "high_risk_temp": "15-22°C with moderate humidity — powdery mildew thrives",
                "warning":        "Cool dry weather with warm days — highest mildew risk",
                "safe_temp":      "Rain washes away mildew spores temporarily",
            },
        },
        "Wheat Blast": {
            "checklist": [
                {"tier": "Do TODAY", "color": "red", "items": [
                    "Apply Tricyclazole (Beam 75WP) immediately — wheat blast spreads extremely fast",
                    "Report outbreak to nearest KVK / district agriculture office urgently",
                    "Do NOT move grain or straw from affected area — risk of spread",
                ]},
                {"tier": "Within 3 Days", "color": "yellow", "items": [
                    "Apply second spray of Isoprothiolane + Tricyclazole combination",
                    "Document affected area — wheat blast may be eligible for emergency compensation",
                ]},
                {"tier": "This Week", "color": "green", "items": [
                    "Survey neighboring fields — wheat blast spreads across farms via air",
                ]},
                {"tier": "Next Season", "color": "blue", "items": [
                    "Use blast-resistant varieties where available",
                    "Seed treatment with Carbendazim at 2g/kg",
                    "Avoid high nitrogen application",
                ]},
            ],
            "fungicides": [
                {"name": "Beam 75WP (Tricyclazole 75WP)",  "dose": "0.6g/L water", "timing": "At first lesion", "type": "Systemic"},
                {"name": "Fuji-One 40EC (Isoprothiolane)", "dose": "1.5mL/L water","timing": "Every 10 days",   "type": "Systemic"},
                {"name": "Bavistin (Carbendazim 50WP)",    "dose": "1g/L water",   "timing": "Preventive use",  "type": "Systemic"},
            ],
            "weather_triggers": {
                "high_risk_temp": "25-30°C with humidity above 80% — wheat blast spreads explosively",
                "warning":        "Wheat blast is an emergency disease — report to agriculture department",
                "safe_temp":      "Hot dry weather above 35°C reduces blast spread temporarily",
            },
        },
        "Wheat Septoria": {
            "checklist": [
                {"tier": "Do TODAY", "color": "red", "items": [
                    "Apply Propiconazole or Tebuconazole spray immediately",
                    "Remove infected lower leaves showing tan lesions with dark borders",
                ]},
                {"tier": "Within 3 Days", "color": "yellow", "items": [
                    "Apply Mancozeb as contact protectant on remaining healthy leaves",
                ]},
                {"tier": "This Week", "color": "green", "items": [
                    "Monitor flag leaf — Septoria on flag leaf reduces grain fill",
                ]},
                {"tier": "Next Season", "color": "blue", "items": [
                    "Crop rotation — avoid wheat after wheat",
                    "Deep ploughing to bury infected debris",
                ]},
            ],
            "fungicides": [
                {"name": "Tilt 25EC (Propiconazole)",    "dose": "1mL/L water",  "timing": "At first sign",  "type": "Systemic"},
                {"name": "Folicur 250EC (Tebuconazole)", "dose": "1mL/L water",  "timing": "Every 14 days",  "type": "Systemic"},
                {"name": "Dithane M-45 (Mancozeb 75WP)", "dose": "2.5g/L water", "timing": "Preventive use", "type": "Contact"},
            ],
            "weather_triggers": {
                "high_risk_temp": "Wet cool weather 10-20°C — Septoria thrives in rain splash",
                "warning":        "Rain splash is the primary spreader — spray before rain",
                "safe_temp":      "Dry weather significantly slows Septoria spread",
            },
        },
        "Wheat Leaf Blight": {
            "checklist": [
                {"tier": "Do TODAY", "color": "red", "items": [
                    "Apply Mancozeb + Propiconazole combination spray",
                    "Remove infected leaves showing tan-brown lesions",
                ]},
                {"tier": "Within 3 Days", "color": "yellow", "items": [
                    "Apply foliar potassium to strengthen leaf tissue",
                ]},
                {"tier": "This Week", "color": "green", "items": [
                    "Assess percentage of leaf area affected for insurance records",
                ]},
                {"tier": "Next Season", "color": "blue", "items": [
                    "Seed treatment with Thiram + Carbendazim",
                    "Use certified disease-free seeds",
                ]},
            ],
            "fungicides": [
                {"name": "Dithane M-45 (Mancozeb 75WP)", "dose": "2.5g/L water", "timing": "Every 7-10 days",  "type": "Contact"},
                {"name": "Tilt 25EC (Propiconazole)",    "dose": "1mL/L water",  "timing": "At first symptom", "type": "Systemic"},
                {"name": "Bavistin (Carbendazim 50WP)",  "dose": "1g/L water",   "timing": "Every 14 days",    "type": "Systemic"},
            ],
            "weather_triggers": {
                "high_risk_temp": "Warm humid weather — leaf blight spreads via rain splash",
                "warning":        "Monsoon period is highest risk for leaf blight",
                "safe_temp":      "Dry conditions and good airflow reduce disease spread",
            },
        },
        "Wheat Tan Spot": {
            "checklist": [
                {"tier": "Do TODAY", "color": "red", "items": [
                    "Apply Propiconazole spray immediately",
                    "Remove leaves showing tan-colored oval lesions with yellow halo",
                ]},
                {"tier": "Within 3 Days", "color": "yellow", "items": [
                    "Apply Mancozeb as contact protectant",
                ]},
                {"tier": "This Week", "color": "green", "items": [
                    "Monitor upper leaves — tan spot moves upward",
                ]},
                {"tier": "Next Season", "color": "blue", "items": [
                    "Burn or plough under crop residue — tan spot survives in debris",
                    "Crop rotation with non-grass crops",
                ]},
            ],
            "fungicides": [
                {"name": "Tilt 25EC (Propiconazole)",    "dose": "1mL/L water",  "timing": "At first sign",  "type": "Systemic"},
                {"name": "Dithane M-45 (Mancozeb 75WP)", "dose": "2.5g/L water", "timing": "Preventive use", "type": "Contact"},
                {"name": "Bavistin (Carbendazim 50WP)",  "dose": "1g/L water",   "timing": "Every 14 days",  "type": "Systemic"},
            ],
            "weather_triggers": {
                "high_risk_temp": "Warm wet weather 20-28°C — tan spot spreads rapidly in moisture",
                "warning":        "Crop residue from previous season is main infection source",
                "safe_temp":      "Dry weather slows tan spot spread significantly",
            },
        },
        "Wheat Smut": {
            "checklist": [
                {"tier": "Do TODAY", "color": "red", "items": [
                    "Remove all smut-infected ears immediately — bag before removing to avoid spore spread",
                    "Do NOT thresh infected crop with healthy — contaminates seeds",
                ]},
                {"tier": "Within 3 Days", "color": "yellow", "items": [
                    "Calculate infection percentage per acre for insurance claim",
                    "Separate infected field area completely from healthy crop",
                ]},
                {"tier": "This Week", "color": "green", "items": [
                    "Apply Tebuconazole foliar spray on remaining healthy plants",
                    "Document with photographs for PMFBY claim",
                ]},
                {"tier": "Next Season", "color": "blue", "items": [
                    "Seed treatment with Carboxin 75WP at 2.5g/kg seed — CRITICAL",
                    "Use certified disease-free seed — smut is seed-borne",
                ]},
            ],
            "fungicides": [
                {"name": "Vitavax (Carboxin 75WP)",     "dose": "2.5g/kg seed", "timing": "Seed treatment before sowing", "type": "Systemic"},
                {"name": "Raxil (Tebuconazole 2DS)",    "dose": "1.25g/kg seed","timing": "Seed treatment",               "type": "Systemic"},
                {"name": "Bavistin (Carbendazim 50WP)", "dose": "2.5g/kg seed", "timing": "Seed treatment alternative",   "type": "Systemic"},
            ],
            "weather_triggers": {
                "high_risk_temp": "Cool moist conditions at flowering — infection occurs at this stage",
                "warning":        "Infection happens at flowering — prevention through seed treatment only",
                "safe_temp":      "Once infected — only seed treatment in next season can prevent",
            },
        },
        "Wheat Fusarium Head Blight": {
            "checklist": [
                {"tier": "Do TODAY", "color": "red", "items": [
                    "Apply Tebuconazole or Metconazole spray at heading stage",
                    "Do NOT use infected grain as seed or food — mycotoxin risk",
                    "Report to district agriculture officer — FHB causes mycotoxin contamination",
                ]},
                {"tier": "Within 3 Days", "color": "yellow", "items": [
                    "Apply second spray if wet weather continues during heading",
                    "Harvest early if weather is wet at grain fill",
                ]},
                {"tier": "This Week", "color": "green", "items": [
                    "Sample grain for mycotoxin testing before selling",
                    "Document affected area for insurance claim",
                ]},
                {"tier": "Next Season", "color": "blue", "items": [
                    "Crop rotation — avoid wheat after wheat or maize",
                    "Seed treatment with Carbendazim + Thiram",
                    "Use FHB-tolerant varieties where available",
                ]},
            ],
            "fungicides": [
                {"name": "Folicur 250EC (Tebuconazole)",          "dose": "1mL/L water",  "timing": "At heading stage",    "type": "Systemic"},
                {"name": "Nativo (Tebuconazole+Trifloxystrobin)", "dose": "0.5g/L water", "timing": "At flowering",         "type": "Systemic"},
                {"name": "Bavistin (Carbendazim 50WP)",           "dose": "1g/L water",   "timing": "Preventive at boot",  "type": "Systemic"},
            ],
            "weather_triggers": {
                "high_risk_temp": "20-25°C with rain at heading/flowering — highest FHB risk",
                "warning":        "Wet weather during flowering is the critical infection window",
                "safe_temp":      "Dry warm weather at heading greatly reduces FHB risk",
            },
        },
        "Wheat Healthy": {
            "checklist": [
                {"tier": "Keep it Up!", "color": "green", "items": [
                    "Your wheat crop looks healthy — maintain current practices",
                    "Monitor for rust pustules during January-March",
                    "Ensure timely irrigation especially at crown root initiation",
                ]},
                {"tier": "Preventive Care", "color": "blue", "items": [
                    "Apply preventive Propiconazole spray at boot stage",
                    "Maintain balanced NPK — avoid excess nitrogen",
                ]},
            ],
            "fungicides": [
                {"name": "Tilt 25EC (Propiconazole)", "dose": "1mL/L water",  "timing": "Preventive at boot stage",  "type": "Systemic"},
                {"name": "Vitavax (Carboxin 75WP)",   "dose": "2.5g/kg seed", "timing": "Seed treatment before sow", "type": "Systemic"},
                {"name": "Trichoderma viride 1% WP",  "dose": "4g/kg seed",   "timing": "Seed treatment (bio)",      "type": "Bio"},
            ],
            "weather_triggers": {
                "high_risk_temp": "January-March cool weather — monitor for rust and mildew",
                "warning":        "Pre-sowing seed treatment is most important preventive step",
                "safe_temp":      "Timely sowing in October-November reduces disease risk",
            },
        },
    },

    # ── RICE ────────────────────────────────────────────────────
    "rice": {
        "Rice Brown Spot": {
            "checklist": [
                {"tier": "Do TODAY", "color": "red", "items": [
                    "Apply Mancozeb + Propiconazole combination spray",
                    "Apply potassium and phosphorus fertiliser immediately — deficiency causes brown spot",
                    "Check soil for nutrient deficiency — brown spot is often nutritional",
                ]},
                {"tier": "Within 3 Days", "color": "yellow", "items": [
                    "Apply Edifenphos (Hinosan 50EC) for systemic control",
                    "Soil test to confirm potassium levels",
                ]},
                {"tier": "This Week", "color": "green", "items": [
                    "Monitor grain filling — brown spot on grain causes discolouration",
                    "Ensure proper water management — drought stress worsens brown spot",
                ]},
                {"tier": "Next Season", "color": "blue", "items": [
                    "Seed treatment with Carbendazim at 2g/kg — brown spot is seed-borne",
                    "Apply soil test based fertilisation — especially potassium",
                ]},
            ],
            "fungicides": [
                {"name": "Hinosan 50EC (Edifenphos)",    "dose": "1mL/L water",  "timing": "Every 10-14 days", "type": "Systemic"},
                {"name": "Tilt 25EC (Propiconazole)",    "dose": "1mL/L water",  "timing": "At first symptom", "type": "Systemic"},
                {"name": "Dithane M-45 (Mancozeb 75WP)", "dose": "2.5g/L water", "timing": "Preventive spray", "type": "Contact"},
            ],
            "weather_triggers": {
                "high_risk_temp": "25-30°C with intermittent rains — brown spot spreads rapidly",
                "warning":        "Drought stress followed by rain is highest risk period",
                "safe_temp":      "Proper nutrition is most effective prevention",
            },
        },
        "Rice Bacterial Leaf Blight": {
            "checklist": [
                {"tier": "Do TODAY", "color": "red", "items": [
                    "Apply Copper oxychloride + Streptomycin spray immediately",
                    "Drain field and reduce standing water",
                    "Do NOT apply nitrogen fertiliser — worsens bacterial blight severely",
                ]},
                {"tier": "Within 3 Days", "color": "yellow", "items": [
                    "Apply Bleaching powder (25kg/ha) in field water for bacterial control",
                    "Avoid field operations when leaves are wet — spreads bacteria",
                ]},
                {"tier": "This Week", "color": "green", "items": [
                    "Maintain proper drainage — waterlogging spreads bacterial blight",
                    "Apply potassium fertiliser to improve plant resistance",
                ]},
                {"tier": "Next Season", "color": "blue", "items": [
                    "Use BLB-resistant varieties: IR 64, Pusa Basmati 1, Swarna Sub1",
                    "Seed treatment with Streptomycin sulfate 0.025%",
                ]},
            ],
            "fungicides": [
                {"name": "Blitox 50 (Copper Oxychloride 50WP)", "dose": "3g/L water",   "timing": "At first symptom",   "type": "Contact"},
                {"name": "Streptomycin Sulfate 90WP",            "dose": "0.5g/L water", "timing": "Every 10 days",       "type": "Bactericide"},
                {"name": "Agrimycin (Streptomycin+Tetracycline)","dose": "0.5g/L water", "timing": "At disease outbreak", "type": "Bactericide"},
            ],
            "weather_triggers": {
                "high_risk_temp": "25-30°C with strong winds and rain — bacteria spread through wounds",
                "warning":        "Storm or cyclone damage greatly increases BLB infection risk",
                "safe_temp":      "Dry weather and good drainage reduces bacterial blight risk",
            },
        },
        "Rice Leaf Smut": {
            "checklist": [
                {"tier": "Do TODAY", "color": "red", "items": [
                    "Apply Propiconazole (Tilt 25EC) spray immediately",
                    "Remove leaves with black smutty spots — bag before disposal",
                    "Avoid threshing infected crop near healthy fields",
                ]},
                {"tier": "Within 3 Days", "color": "yellow", "items": [
                    "Apply Hexaconazole (Contaf 5EC) for systemic control",
                    "Reduce plant density in affected areas",
                ]},
                {"tier": "This Week", "color": "green", "items": [
                    "Monitor grain quality — leaf smut reduces grain fill",
                ]},
                {"tier": "Next Season", "color": "blue", "items": [
                    "Seed treatment with Carbendazim 50WP at 2g/kg",
                    "Use certified clean seeds from government seed bank",
                ]},
            ],
            "fungicides": [
                {"name": "Tilt 25EC (Propiconazole)",   "dose": "1mL/L water", "timing": "At first symptom", "type": "Systemic"},
                {"name": "Contaf 5EC (Hexaconazole)",   "dose": "2mL/L water", "timing": "Every 14 days",    "type": "Systemic"},
                {"name": "Bavistin (Carbendazim 50WP)", "dose": "1g/L water",  "timing": "Preventive spray", "type": "Systemic"},
            ],
            "weather_triggers": {
                "high_risk_temp": "Warm humid monsoon weather — leaf smut spreads via spores",
                "warning":        "Monsoon July-September is peak leaf smut risk period",
                "safe_temp":      "Dry weather and good drainage reduces leaf smut risk",
            },
        },
        "Rice Healthy": {
            "checklist": [
                {"tier": "Keep it Up!", "color": "green", "items": [
                    "Your rice crop looks healthy — maintain current practices",
                    "Monitor for blast symptoms during humid periods",
                    "Maintain proper water level management",
                ]},
                {"tier": "Preventive Care", "color": "blue", "items": [
                    "Apply Tricyclazole preventively at panicle initiation if blast history",
                    "Balanced fertilisation — split nitrogen into 3-4 doses",
                ]},
            ],
            "fungicides": [
                {"name": "Beam 75WP (Tricyclazole)",    "dose": "0.6g/L water", "timing": "Preventive at panicle init", "type": "Systemic"},
                {"name": "Bavistin (Carbendazim 50WP)", "dose": "2g/kg seed",   "timing": "Seed treatment",             "type": "Systemic"},
                {"name": "Trichoderma viride 1% WP",    "dose": "5g/L water",   "timing": "Nursery soil treatment",     "type": "Bio"},
            ],
            "weather_triggers": {
                "high_risk_temp": "Monitor closely during monsoon peak July-August",
                "warning":        "Blast risk highest at panicle initiation to flowering",
                "safe_temp":      "Proper water management is best blast prevention",
            },
        },
    },

    # ── GRAPE ───────────────────────────────────────────────────
    "grape": {
        "Grape Black Rot": {
            "checklist": [
                {"tier": "Do TODAY", "color": "red", "items": [
                    "Spray Mancozeb 75WP for black rot control immediately",
                    "Remove and destroy all mummified fruits — primary infection source",
                    "Prune dead wood and canes showing dark canker lesions",
                ]},
                {"tier": "Within 3 Days", "color": "yellow", "items": [
                    "Apply Myclobutanil (Rally 40WP) for systemic black rot control",
                    "Train vines to improve canopy aeration",
                ]},
                {"tier": "This Week", "color": "green", "items": [
                    "Thin fruit clusters in heavily infected vines",
                ]},
                {"tier": "Next Season", "color": "blue", "items": [
                    "Pre-bud-break copper spray — key preventive step every year",
                    "Remove all infected debris before new season growth",
                ]},
            ],
            "fungicides": [
                {"name": "Dithane M-45 (Mancozeb 75WP)", "dose": "2.5g/L water", "timing": "Every 10 days",      "type": "Contact"},
                {"name": "Rally 40WP (Myclobutanil)",     "dose": "0.4g/L water", "timing": "Every 14 days",      "type": "Systemic"},
                {"name": "Copper Oxychloride 50WP",       "dose": "3g/L water",   "timing": "Pre-bud protective", "type": "Contact"},
            ],
            "weather_triggers": {
                "high_risk_temp": "22-26°C with rain — perfect grape black rot conditions",
                "warning":        "Monsoon period is highest risk — spray before every rain",
                "safe_temp":      "Dry weather with good canopy management reduces risk",
            },
        },
        "Grape Black Measles": {
            "checklist": [
                {"tier": "Do TODAY", "color": "red", "items": [
                    "No curative treatment — remove severely affected vines immediately",
                    "Apply Thiophanate methyl to slow progression in early stages",
                ]},
                {"tier": "Within 3 Days", "color": "yellow", "items": [
                    "Apply Bordeaux paste on pruning wounds to prevent entry",
                ]},
                {"tier": "This Week", "color": "green", "items": [
                    "Survey all vines for tiger-stripe leaf patterns",
                ]},
                {"tier": "Next Season", "color": "blue", "items": [
                    "Use certified disease-free planting material",
                    "Apply Bordeaux paste to all pruning cuts every year",
                ]},
            ],
            "fungicides": [
                {"name": "Topsin M (Thiophanate methyl 70WP)", "dose": "1g/L water", "timing": "At first symptom",    "type": "Systemic"},
                {"name": "Bordeaux Paste",                     "dose": "On wounds",   "timing": "After every pruning", "type": "Contact"},
                {"name": "Copper Oxychloride 50WP",            "dose": "3g/L water",  "timing": "Preventive spray",    "type": "Contact"},
            ],
            "weather_triggers": {
                "high_risk_temp": "Hot dry periods followed by irrigation stress worsens measles",
                "warning":        "Irregular water supply is the main trigger for measles",
                "safe_temp":      "Consistent irrigation and balanced nutrition is best prevention",
            },
        },
        "Grape Leaf Blight": {
            "checklist": [
                {"tier": "Do TODAY", "color": "red", "items": [
                    "Apply Copper oxychloride + Mancozeb combination spray",
                    "Remove all leaves showing brown marginal blight lesions",
                ]},
                {"tier": "Within 3 Days", "color": "yellow", "items": [
                    "Apply Difenoconazole for systemic control",
                ]},
                {"tier": "This Week", "color": "green", "items": [
                    "Survey fruit clusters — blight can spread to berries",
                ]},
                {"tier": "Next Season", "color": "blue", "items": [
                    "Pre-season copper spray at bud break",
                    "Annual pruning to maintain open canopy",
                ]},
            ],
            "fungicides": [
                {"name": "Blitox 50 (Copper Oxychloride 50WP)", "dose": "3g/L water",   "timing": "Every 10 days",  "type": "Contact"},
                {"name": "Score 250EC (Difenoconazole)",         "dose": "1mL/L water",  "timing": "Every 14 days",  "type": "Systemic"},
                {"name": "Dithane M-45 (Mancozeb 75WP)",         "dose": "2.5g/L water", "timing": "Preventive use", "type": "Contact"},
            ],
            "weather_triggers": {
                "high_risk_temp": "High humidity with warm weather — blight spreads rapidly",
                "warning":        "Monsoon period is highest risk in Maharashtra vineyards",
                "safe_temp":      "Good canopy management and copper sprays prevent blight",
            },
        },
        "Grape Healthy": {
            "checklist": [
                {"tier": "Keep it Up!", "color": "green", "items": [
                    "Your grape crop looks healthy",
                    "Monitor for downy mildew during humid periods",
                ]},
                {"tier": "Preventive Care", "color": "blue", "items": [
                    "Pre-bud break copper spray every season",
                    "Consistent drip irrigation — avoid water stress",
                ]},
            ],
            "fungicides": [
                {"name": "Copper Oxychloride 50WP", "dose": "3g/L water",   "timing": "Pre-bud break spray", "type": "Contact"},
                {"name": "Dithane M-45 (Mancozeb)", "dose": "2.5g/L water", "timing": "Preventive monsoon",  "type": "Contact"},
                {"name": "Neem Oil 1500ppm",          "dose": "5mL/L water",  "timing": "Weekly preventive",   "type": "Bio"},
            ],
            "weather_triggers": {
                "high_risk_temp": "Monsoon onset — apply copper spray before rains",
                "warning":        "Monitor for powdery and downy mildew during humid periods",
                "safe_temp":      "Annual pruning and copper spray are most important preventives",
            },
        },
    },

    # ── APPLE ───────────────────────────────────────────────────
    "apple": {
        "Apple Scab": {
            "checklist": [
                {"tier": "Do TODAY", "color": "red", "items": [
                    "Apply Captan 50WP or Dithane M-45 spray immediately",
                    "Remove and burn all fallen leaves — primary inoculum source",
                ]},
                {"tier": "Within 3 Days", "color": "yellow", "items": [
                    "Apply Myclobutanil (Rally 40WP) for systemic scab control",
                ]},
                {"tier": "This Week", "color": "green", "items": [
                    "Survey fruit for scab marks — reduces market value severely",
                ]},
                {"tier": "Next Season", "color": "blue", "items": [
                    "Use scab-resistant varieties: Florina, Priscilla, Prima",
                    "Apply dormant copper spray before bud break every year",
                ]},
            ],
            "fungicides": [
                {"name": "Captan 50WP",                  "dose": "2.5g/L water", "timing": "Every 7-10 days", "type": "Contact"},
                {"name": "Rally 40WP (Myclobutanil)",    "dose": "0.4g/L water", "timing": "Every 14 days",   "type": "Systemic"},
                {"name": "Dithane M-45 (Mancozeb 75WP)", "dose": "2.5g/L water", "timing": "Preventive use",  "type": "Contact"},
            ],
            "weather_triggers": {
                "high_risk_temp": "10-24°C with rain — apple scab infection period",
                "warning":        "Wet spring after bud break — most critical scab period",
                "safe_temp":      "Dry summer weather reduces scab infection significantly",
            },
        },
        "Apple Black Rot": {
            "checklist": [
                {"tier": "Do TODAY", "color": "red", "items": [
                    "Apply Captan or Thiophanate methyl spray immediately",
                    "Remove all cankers — cut 15cm below visible infection",
                    "Destroy all mummified fruits hanging in tree",
                ]},
                {"tier": "Within 3 Days", "color": "yellow", "items": [
                    "Apply Bordeaux paste on all pruning wounds immediately",
                    "Clear fallen fruit and leaf debris from orchard",
                ]},
                {"tier": "This Week", "color": "green", "items": [
                    "Survey all fruit for black rot entry at calyx end",
                ]},
                {"tier": "Next Season", "color": "blue", "items": [
                    "Dormant copper spray every year before bud break",
                ]},
            ],
            "fungicides": [
                {"name": "Captan 50WP",                        "dose": "2.5g/L water", "timing": "Every 7-10 days", "type": "Contact"},
                {"name": "Topsin M (Thiophanate methyl 70WP)", "dose": "1g/L water",   "timing": "At petal fall",   "type": "Systemic"},
                {"name": "Bordeaux Mixture",                   "dose": "1% solution",  "timing": "Dormant spray",   "type": "Contact"},
            ],
            "weather_triggers": {
                "high_risk_temp": "Warm rainy weather 24-30°C — black rot spreads rapidly",
                "warning":        "Summer storm damage provides entry wounds for black rot",
                "safe_temp":      "Dry warm weather reduces infection — good for orchard",
            },
        },
        "Apple Cedar Rust": {
            "checklist": [
                {"tier": "Do TODAY", "color": "red", "items": [
                    "Apply Myclobutanil or Triadimefon spray immediately",
                    "Remove infected leaves showing yellow-orange spots",
                ]},
                {"tier": "Within 3 Days", "color": "yellow", "items": [
                    "Second spray with Propiconazole for better control",
                ]},
                {"tier": "This Week", "color": "green", "items": [
                    "Monitor adjacent forest for cedar trees — rust alternate host",
                ]},
                {"tier": "Next Season", "color": "blue", "items": [
                    "Apply protective fungicide at pink bud stage every year",
                ]},
            ],
            "fungicides": [
                {"name": "Rally 40WP (Myclobutanil)", "dose": "0.4g/L water", "timing": "At pink bud through bloom", "type": "Systemic"},
                {"name": "Tilt 25EC (Propiconazole)", "dose": "1mL/L water",  "timing": "Every 14 days",             "type": "Systemic"},
                {"name": "Sulfex (Sulphur 80WP)",     "dose": "3g/L water",   "timing": "Preventive spray",          "type": "Contact"},
            ],
            "weather_triggers": {
                "high_risk_temp": "Cool wet spring weather during bloom — peak cedar rust infection",
                "warning":        "Rain after orange spore masses on cedar — spray immediately",
                "safe_temp":      "Dry conditions at bloom reduce cedar rust risk",
            },
        },
        "Apple Healthy": {
            "checklist": [
                {"tier": "Keep it Up!", "color": "green", "items": [
                    "Your apple crop looks healthy",
                    "Monitor for scab during wet spring periods",
                ]},
                {"tier": "Preventive Care", "color": "blue", "items": [
                    "Dormant copper spray before bud break every season",
                    "Balanced NPK with calcium for fruit quality",
                ]},
            ],
            "fungicides": [
                {"name": "Bordeaux Mixture 1%",      "dose": "10L/acre",    "timing": "Dormant spray",           "type": "Contact"},
                {"name": "Captan 50WP",               "dose": "2.5g/L water","timing": "Preventive at bud break", "type": "Contact"},
                {"name": "Trichoderma viride 1% WP", "dose": "5g/L water",  "timing": "Soil drench",             "type": "Bio"},
            ],
            "weather_triggers": {
                "high_risk_temp": "Monitor during wet spring — scab infection period",
                "warning":        "Annual dormant copper spray is most important prevention",
                "safe_temp":      "Open canopy and good drainage are best preventives",
            },
        },
    },

    # ── DEFAULT FALLBACK ────────────────────────────────────────
    "default": {
        "default_disease": {
            "checklist": [
                {"tier": "Do TODAY", "color": "red", "items": [
                    "Apply broad-spectrum Mancozeb 75WP spray at 2.5g/L immediately",
                    "Remove and destroy all visibly infected plant parts",
                    "Stop overhead irrigation — switch to drip or base watering",
                ]},
                {"tier": "Within 3 Days", "color": "yellow", "items": [
                    "Apply Carbendazim 50WP (Bavistin) for systemic control",
                    "Improve drainage if waterlogging present",
                    "Apply balanced NPK to boost plant immunity",
                ]},
                {"tier": "This Week", "color": "green", "items": [
                    "Clear all plant debris from field",
                    "Contact nearest KVK for crop-specific advice",
                ]},
                {"tier": "Next Season", "color": "blue", "items": [
                    "Use certified disease-free seeds",
                    "Crop rotation with non-host crops",
                    "Pre-season Trichoderma viride soil treatment",
                ]},
            ],
            "fungicides": [
                {"name": "Dithane M-45 (Mancozeb 75WP)", "dose": "2.5g/L water", "timing": "Every 7-10 days", "type": "Contact"},
                {"name": "Bavistin (Carbendazim 50WP)",   "dose": "1g/L water",   "timing": "Every 14 days",   "type": "Systemic"},
                {"name": "Neem Oil 1500ppm",               "dose": "5mL/L water",  "timing": "Weekly organic",  "type": "Bio"},
            ],
            "weather_triggers": {
                "high_risk_temp": "High humidity and moderate temperature increases disease risk",
                "warning":        "Monitor closely during monsoon period",
                "safe_temp":      "Good drainage and airflow are best preventive measures",
            },
        },
    },
}


# ── Hindi/regional crop name mapping ────────────────────────
CROP_ALIASES = {
    "tamatar":      "tomato",
    "aloo":         "potato",
    "makka":        "maize",
    "makki":        "maize",
    "gehun":        "wheat",
    "gehu":         "wheat",
    "dhan":         "rice",
    "paddy":        "rice",
    "chawal":       "rice",
    "pyaaz":        "onion",
    "mirch":        "chilli",
    "lal mirch":    "chilli",
    "moongfali":    "groundnut",
    "peanut":       "groundnut",
    "angoor":       "grape",
    "seb":          "apple",
    "shimla mirch": "pepper",
    "capsicum":     "pepper",
    "corn":         "maize",
    "soya":         "soybean",
    "sarson":       "mustard",
    "mustard":      "mustard",
    "ganna":        "sugarcane",
    "kela":         "banana",
    "aam":          "mango",
    "aadoo":        "peach",
    "santra":       "orange",
    "kaddu":        "squash",
}


# ══════════════════════════════════════════════════════════════
# SECTION 6: WEATHER RISK SCORING
# ══════════════════════════════════════════════════════════════

CROP_WEATHER_THRESHOLDS = {
    "tomato":    {"temp_risk": (15, 25), "humidity_risk": 80, "rain_risk": 70},
    "potato":    {"temp_risk": (10, 20), "humidity_risk": 85, "rain_risk": 75},
    "maize":     {"temp_risk": (18, 27), "humidity_risk": 75, "rain_risk": 65},
    "wheat":     {"temp_risk": (10, 22), "humidity_risk": 70, "rain_risk": 60},
    "rice":      {"temp_risk": (24, 30), "humidity_risk": 85, "rain_risk": 80},
    "onion":     {"temp_risk": (20, 28), "humidity_risk": 80, "rain_risk": 70},
    "chilli":    {"temp_risk": (25, 32), "humidity_risk": 75, "rain_risk": 65},
    "groundnut": {"temp_risk": (22, 30), "humidity_risk": 80, "rain_risk": 70},
    "grape":     {"temp_risk": (20, 28), "humidity_risk": 75, "rain_risk": 65},
    "apple":     {"temp_risk": (10, 24), "humidity_risk": 70, "rain_risk": 60},
    "default":   {"temp_risk": (20, 28), "humidity_risk": 80, "rain_risk": 70},
}


# ══════════════════════════════════════════════════════════════
# SECTION 7: HEALTH SCORE CALCULATION
# ══════════════════════════════════════════════════════════════

def calculate_health_score(confidence, loss_pct, weather_risk, display_name):
    if "Healthy" in display_name:
        base = 9.0 - (weather_risk / 100) * 2.0
        return max(7, min(10, round(base)))
    confidence_penalty = (confidence / 100) * 3.5
    loss_penalty       = loss_pct * 4.0
    weather_penalty    = (weather_risk / 100) * 2.5
    score = 10.0 - (confidence_penalty + loss_penalty + weather_penalty)
    return max(1, min(9, round(score)))


# ══════════════════════════════════════════════════════════════
# SECTION 8: URGENCY TIMELINE
# ══════════════════════════════════════════════════════════════

def calculate_urgency(confidence, display_name, weather_risk):
    if "Healthy" in display_name:
        return {
            "hours": None,
            "label": "No Urgent Action",
            "description": "Crop is healthy. Maintain regular monitoring every 3-4 days.",
            "critical": False,
        }
    if   confidence >= 90: base_hours = 12
    elif confidence >= 80: base_hours = 24
    elif confidence >= 70: base_hours = 36
    elif confidence >= 60: base_hours = 48
    else:                  base_hours = 72

    if weather_risk >= 75:   base_hours = max(6,  base_hours - 12)
    elif weather_risk >= 55: base_hours = max(12, base_hours - 6)

    if "Late Blight"           in display_name: base_hours = max(6, base_hours - 6)
    if "Virus"                 in display_name: base_hours = max(6, base_hours - 6)
    if "Mosaic"                in display_name: base_hours = max(6, base_hours - 6)
    if "Blast"                 in display_name: base_hours = max(6, base_hours - 6)
    if "Yellow Rust"           in display_name: base_hours = max(6, base_hours - 6)
    if "Black Rust"            in display_name: base_hours = max(6, base_hours - 6)
    if "Bacterial Leaf Blight" in display_name: base_hours = max(6, base_hours - 6)

    if base_hours <= 12:
        desc = f"EMERGENCY: {display_name} spreading rapidly. Act immediately."
    elif base_hours <= 24:
        desc = f"URGENT: {confidence:.0f}% confidence of {display_name}. Spray before next rainfall."
    elif base_hours <= 36:
        desc = f"HIGH PRIORITY: {confidence:.0f}% confidence. Act before weather worsens."
    else:
        desc = f"MODERATE: {confidence:.0f}% confidence. Begin treatment within {base_hours}h."

    return {
        "hours":       base_hours,
        "label":       f"Act within {base_hours} hours",
        "description": desc,
        "critical":    base_hours <= 24,
    }


# ══════════════════════════════════════════════════════════════
# SECTION 9: GET ADVICE
# ══════════════════════════════════════════════════════════════

def get_advice(display_name, crop_name):
    crop_key = crop_name.lower().strip() if crop_name else ""
    crop_key = CROP_ALIASES.get(crop_key, crop_key)

    if crop_key in ADVICE_DB:
        crop_data = ADVICE_DB[crop_key]
        if display_name in crop_data:
            return crop_data[display_name]
        for disease_key in crop_data:
            if disease_key.lower() in display_name.lower() or display_name.lower() in disease_key.lower():
                return crop_data[disease_key]

    inferred_crop = _infer_crop_from_display_name(display_name)
    if inferred_crop and inferred_crop in ADVICE_DB:
        crop_data = ADVICE_DB[inferred_crop]
        if display_name in crop_data:
            return crop_data[display_name]
        for disease_key in crop_data:
            if disease_key.lower() in display_name.lower() or display_name.lower() in disease_key.lower():
                return crop_data[disease_key]

    return ADVICE_DB["default"]["default_disease"]


def _infer_crop_from_display_name(display_name):
    name_lower = display_name.lower()
    if "tomato"    in name_lower: return "tomato"
    if "potato"    in name_lower: return "potato"
    if "maize"     in name_lower or "corn" in name_lower: return "maize"
    if "wheat"     in name_lower: return "wheat"
    if "rice"      in name_lower or "paddy" in name_lower: return "rice"
    if "grape"     in name_lower: return "grape"
    if "apple"     in name_lower: return "apple"
    if "cherry"    in name_lower: return "apple"
    if "peach"     in name_lower: return "apple"
    if "pepper"    in name_lower or "bell" in name_lower: return "tomato"
    if "squash"    in name_lower: return "tomato"
    return None


# ══════════════════════════════════════════════════════════════
# SECTION 10: IMAGE PREPROCESSING
# ══════════════════════════════════════════════════════════════

def preprocess_image(image_bytes):
    # YOLOv8 accepts PIL Image directly — handles resize/normalize internally
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    return img


# ══════════════════════════════════════════════════════════════
# SECTION 11: HELPER FUNCTIONS
# ══════════════════════════════════════════════════════════════

def _aggregate_scores(preds, class_names, crop_name):
    scores = {}
    for i, cls in enumerate(class_names):
        display = DISPLAY_NAMES.get(cls, _fallback_display_name(cls))
        if display not in scores:
            scores[display] = 0.0
        scores[display] += float(preds[i])

    total = sum(scores.values()) or 1.0
    result = {k: round((v / total) * 100, 1) for k, v in scores.items()}
    top6 = dict(sorted(result.items(), key=lambda x: x[1], reverse=True)[:6])
    return top6


def _fallback_display_name(class_name):
    if "healthy" in class_name.lower():
        crop = class_name.split("___")[0].replace("_", " ").title()
        return f"{crop} Healthy"
    parts = class_name.split("___")
    if len(parts) == 2:
        crop    = parts[0].replace("_", " ").replace("(maize)", "Maize").title()
        disease = parts[1].replace("_", " ").title()
        return f"{crop} {disease}"
    return class_name.replace("_", " ").title()


def _apply_crop_boost(preds, class_names, crop_name):
    if not crop_name:
        return preds
    boosted  = preds.copy()
    key      = crop_name.lower().strip()
    key      = CROP_ALIASES.get(key, key)
    prefixes = CROP_BOOST.get(key, [])
    for i, cls in enumerate(class_names):
        if any(cls.startswith(p) for p in prefixes):
            boosted[i] = min(boosted[i] * BOOST_FACTOR, 1.0)
    total = boosted.sum()
    if total > 0:
        boosted = boosted / total
    return boosted


def _apply_crop_filter(preds, class_names, crop_name, original_display, original_conf):
    """
    If the top prediction doesn't match the user's selected crop,
    find the highest-scoring class that does match their crop.
    Falls back to original result if no matching class found.
    """
    key             = CROP_ALIASES.get(crop_name.lower().strip(), crop_name.lower().strip())
    expected_prefix = CROP_FILTER_MAP.get(key, None)

    if expected_prefix is None:
        # Crop not in filter map — no filtering, return as-is
        return original_display, original_conf

    # Already correct crop — no change needed
    if original_display.startswith(expected_prefix):
        return original_display, original_conf

    # Wrong crop detected — find best matching disease for correct crop
    print(f"  [CropFilter] User said '{crop_name}' but model returned '{original_display}' — filtering...")

    best_idx   = None
    best_score = -1.0
    for i, cls in enumerate(class_names):
        display = DISPLAY_NAMES.get(cls, _fallback_display_name(cls))
        if display.startswith(expected_prefix):
            if preds[i] > best_score:
                best_score = preds[i]
                best_idx   = i

    if best_idx is not None and best_score > 0:
        filtered_display = DISPLAY_NAMES.get(class_names[best_idx], _fallback_display_name(class_names[best_idx]))
        filtered_conf    = float(best_score) * 100
        print(f"  [CropFilter] Corrected to: '{filtered_display}' ({filtered_conf:.1f}%)")
        return filtered_display, filtered_conf

    # No matching class found — return original unchanged
    return original_display, original_conf


# ══════════════════════════════════════════════════════════════
# SECTION 12: MAIN INFERENCE FUNCTION
# ══════════════════════════════════════════════════════════════

def run_inference(image_bytes, crop_name="", weather_risk=50):
    model       = get_model()
    class_names = get_class_names()

    if model is None or not class_names:
        return _demo_result(crop_name, weather_risk)

    try:
        img = preprocess_image(image_bytes)

        results = model.predict(
            source  = img,
            imgsz   = 300,
            verbose = False,
        )

        raw_preds = results[0].probs.data.cpu().numpy()
        preds     = _apply_crop_boost(raw_preds, class_names, crop_name)

        top_idx      = int(np.argmax(preds))
        top_class    = class_names[top_idx]
        top_conf     = float(preds[top_idx]) * 100
        display_name = DISPLAY_NAMES.get(top_class, _fallback_display_name(top_class))

        # ── CROP FILTER ───────────────────────────────────────
        # If user selected Maize but model returned Wheat disease,
        # this corrects it to the best Maize disease instead.
        # ─────────────────────────────────────────────────────
        if crop_name:
            display_name, top_conf = _apply_crop_filter(
                preds, class_names, crop_name, display_name, top_conf
            )

        key             = CROP_ALIASES.get(crop_name.lower().strip(), crop_name.lower().strip()) if crop_name else ""
        expected_prefix = CROP_FILTER_MAP.get(key, None)
        if expected_prefix:
            filtered_preds = preds.copy()
            for i, cls in enumerate(class_names):
                dn = DISPLAY_NAMES.get(cls, _fallback_display_name(cls))
                if not dn.startswith(expected_prefix):
                    filtered_preds[i] = 0.0
            total = filtered_preds.sum()
            if total > 0:
                filtered_preds = filtered_preds / total
            all_scores = _aggregate_scores(filtered_preds, class_names, crop_name)
        else:
            all_scores = _aggregate_scores(preds, class_names, crop_name)
        yl           = YIELD_LOSS.get(display_name, {"label": "10-25%", "pct": 0.18})
        sev          = SEVERITY_MAP.get(display_name, "Medium")
        health_score = calculate_health_score(top_conf, yl["pct"], weather_risk, display_name)
        urgency      = calculate_urgency(top_conf, display_name, weather_risk)
        advice       = get_advice(display_name, crop_name)
        weather_tip  = advice.get("weather_triggers", {})

        return {
            "disease":      display_name,
            "raw_class":    top_class,
            "confidence":   round(top_conf, 1),
            "severity":     sev,
            "yield_loss":   yl["label"],
            "loss_pct":     yl["pct"],
            "all_scores":   all_scores,
            "health_score": health_score,
            "urgency":      urgency,
            "checklist":    advice["checklist"],
            "fungicides":   advice["fungicides"],
            "weather_tip":  weather_tip,
            "demo":         False,
        }

    except Exception as e:
        print(f"Inference error: {e}")
        return _demo_result(crop_name, weather_risk)


def _demo_result(crop_name="", weather_risk=50):
    confidence   = 87.4
    loss_pct     = 0.65
    display_name = "Tomato Late Blight"
    if crop_name:
        key = CROP_ALIASES.get(crop_name.lower().strip(), crop_name.lower().strip())
        if key == "potato":                    display_name = "Potato Late Blight"
        elif key == "wheat":                   display_name = "Wheat Yellow Rust"
        elif key in ("maize", "corn"):         display_name = "Maize Common Rust"
        elif key in ("rice", "paddy", "dhan"): display_name = "Rice Bacterial Leaf Blight"
        elif key == "grape":                   display_name = "Grape Black Rot"
        elif key == "apple":                   display_name = "Apple Scab"
    health  = calculate_health_score(confidence, loss_pct, weather_risk, display_name)
    urgency = calculate_urgency(confidence, display_name, weather_risk)
    advice  = get_advice(display_name, crop_name or "tomato")
    return {
        "disease":      display_name,
        "raw_class":    "Demo___Mode",
        "confidence":   confidence,
        "severity":     "High",
        "yield_loss":   "50-80%",
        "loss_pct":     loss_pct,
        "all_scores":   {display_name: 87.4, "Healthy": 7.2, "Leaf Spot": 3.8, "Other": 1.6},
        "health_score": health,
        "urgency":      urgency,
        "checklist":    advice["checklist"],
        "fungicides":   advice["fungicides"],
        "weather_tip":  advice.get("weather_triggers", {}),
        "demo":         True,
    }