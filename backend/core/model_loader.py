# =============================================================
# FILE: backend/core/model_loader.py
# PURPOSE: Loads YOLOv8 classification model (.pt) ONCE at
#          startup and keeps it in memory for fast inference
#
# UPDATED FOR: YOLOv8 (ultralytics) — plant_model_yolo.pt
# =============================================================

import os

# ── These hold model in memory across all requests ────────────
_model       = None   # YOLOv8 YOLO object
_class_names = None   # List of class name strings (52 classes)
_num_classes = None   # Number of output classes (int)


# ══════════════════════════════════════════════════════════════
# STEP 1 — MODEL FILE LOCATION
#
# After downloading from Kaggle:
#   1. Go to your Kaggle notebook → Output tab
#   2. Download plant_model_yolo.pt
#   3. Place it at: backend/plant_model_yolo.pt
#
# Full path example:
#   C:\Users\wtcaa\krishivigil\backend\plant_model_yolo.pt
# ══════════════════════════════════════════════════════════════
MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "plant_model_yolo.pt")


# ══════════════════════════════════════════════════════════════
# 52-CLASS ORDER FOR YOUR MERGED YOLOV8 MODEL
#
# This is the ALPHABETICAL order that YOLOv8 assigns integer
# labels when it reads your merged plant_data folder.
#
# Original 38 PlantVillage classes (alphabetical) +
# 3 Rice classes (Rice___Bacterial_Leaf_Blight,
#                 Rice___Brown_Spot, Rice___Leaf_Smut) +
# 11 Wheat classes (Wheat___Blast, Wheat___Brown_Rust, ...)
#
# ⚠️  IMPORTANT: After training completes in Kaggle, run:
#       print(trained.names)
#   in Cell 5 to confirm the exact order. If it differs,
#   update YOLO_52 below to match trained.names exactly.
# ══════════════════════════════════════════════════════════════
YOLO_52 = [
    "Apple___Apple_scab",                                    # 0
    "Apple___Black_rot",                                     # 1
    "Apple___Cedar_apple_rust",                              # 2
    "Apple___healthy",                                       # 3
    "Blueberry___healthy",                                   # 4
    "Cherry_(including_sour)___Powdery_mildew",              # 5
    "Cherry_(including_sour)___healthy",                     # 6
    "Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot",    # 7
    "Corn_(maize)___Common_rust_",                           # 8
    "Corn_(maize)___Northern_Leaf_Blight",                   # 9
    "Corn_(maize)___healthy",                                # 10
    "Grape___Black_rot",                                     # 11
    "Grape___Esca_(Black_Measles)",                          # 12
    "Grape___Leaf_blight_(Isariopsis_Leaf_Spot)",            # 13
    "Grape___healthy",                                       # 14
    "Orange___Haunglongbing_(Citrus_greening)",              # 15
    "Peach___Bacterial_spot",                                # 16
    "Peach___healthy",                                       # 17
    "Pepper,_bell___Bacterial_spot",                         # 18
    "Pepper,_bell___healthy",                                # 19
    "Potato___Early_blight",                                 # 20
    "Potato___Late_blight",                                  # 21
    "Potato___healthy",                                      # 22
    "Raspberry___healthy",                                   # 23
    "Rice___Bacterial_Leaf_Blight",                          # 24
    "Rice___Brown_Spot",                                     # 25
    "Rice___Leaf_Smut",                                      # 26
    "Soybean___healthy",                                     # 27
    "Squash___Powdery_mildew",                               # 28
    "Strawberry___Leaf_scorch",                              # 29
    "Strawberry___healthy",                                  # 30
    "Tomato___Bacterial_spot",                               # 31
    "Tomato___Early_blight",                                 # 32
    "Tomato___Late_blight",                                  # 33
    "Tomato___Leaf_Mold",                                    # 34
    "Tomato___Septoria_leaf_spot",                           # 35
    "Tomato___Spider_mites Two-spotted_spider_mite",         # 36
    "Tomato___Target_Spot",                                  # 37
    "Tomato___Tomato_Yellow_Leaf_Curl_Virus",                # 38
    "Tomato___Tomato_mosaic_virus",                          # 39
    "Tomato___healthy",                                      # 40
    "Wheat___Blast",                                         # 41
    "Wheat___Brown_Rust",                                    # 42
    "Wheat___Black_Rust",                                    # 43
    "Wheat___Fusarium_Head_Blight",                          # 44
    "Wheat___Leaf_Blight",                                   # 45
    "Wheat___Powdery_Mildew",                                # 46
    "Wheat___Septoria",                                      # 47
    "Wheat___Smut",                                          # 48
    "Wheat___Tan_Spot",                                      # 49
    "Wheat___Yellow_Rust",                                   # 50
    "Wheat___healthy",                                       # 51
]


def load_model_once():
    """
    Called ONCE when Flask starts in app.py.
    Loads the YOLOv8 .pt file using ultralytics.
    """
    global _model, _class_names, _num_classes

    # Already loaded — skip
    if _model is not None:
        return _model

    # ── CHECK IF MODEL FILE EXISTS ────────────────────────────
    if not os.path.exists(MODEL_PATH):
        print(f"  WARNING: plant_model_yolo.pt NOT found at:")
        print(f"  {os.path.abspath(MODEL_PATH)}")
        print("  Running in DEMO MODE — place model file to enable AI\n")
        _model       = None
        _class_names = []
        _num_classes = 0
        return None

    # ── LOAD THE YOLOV8 MODEL ─────────────────────────────────
    print(f"  Loading YOLOv8 model from: {os.path.abspath(MODEL_PATH)}")
    try:
        from ultralytics import YOLO

        _model = YOLO(MODEL_PATH)

        # ── AUTO-DETECT CLASS COUNT ───────────────────────────
        # YOLOv8 stores class names in model.names dict
        # e.g. {0: 'Apple___Apple_scab', 1: 'Apple___Black_rot', ...}
        detected_names = _model.names  # dict {int: str}
        _num_classes   = len(detected_names)
        print(f"  Model loaded — {_num_classes} output classes detected")

        if _num_classes == 52:
            # ══════════════════════════════════════════════════
            # USE MODEL'S OWN CLASS NAMES — most reliable method
            # This guarantees order matches what the model learned
            # ══════════════════════════════════════════════════
            _class_names = [detected_names[i] for i in range(_num_classes)]
            print("  Using: Model's own 52-class labels (Rice + Wheat + PlantVillage)")

        elif _num_classes == 38:
            # Fallback: standard PlantVillage only (old model)
            _class_names = [detected_names[i] for i in range(_num_classes)]
            print("  Using: 38-class PlantVillage labels (old model detected)")

        else:
            # Any other size — use whatever the model says
            _class_names = [detected_names[i] for i in range(_num_classes)]
            print(f"  Using: Auto-detected {_num_classes}-class labels from model")

        # ── VERIFY CLASS ORDER MATCHES YOLO_52 ───────────────
        # Logs a warning if model order differs from YOLO_52
        # This helps catch any mismatch during development
        if _num_classes == 52 and _class_names != YOLO_52:
            print("  NOTE: Model class order differs from YOLO_52 constant.")
            print("  Using model.names order — this is correct behaviour.")
            print("  Update YOLO_52 in model_loader.py if needed for reference.")

        return _model

    except ImportError:
        print("  ERROR: ultralytics not installed.")
        print("  Run:  pip install ultralytics")
        _model       = None
        _class_names = []
        _num_classes = 0
        return None

    except Exception as e:
        print(f"  ERROR loading model: {e}")
        _model       = None
        _class_names = []
        _num_classes = 0
        return None


def get_model():
    """Returns the loaded YOLOv8 YOLO object, or None in demo mode."""
    return _model


def get_class_names():
    """Returns list of class name strings matching model output order."""
    return _class_names or []


def get_num_classes():
    """Returns integer count of output classes."""
    return _num_classes or 0