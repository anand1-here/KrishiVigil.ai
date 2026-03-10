# =============================================================
# FILE: backend/app.py
# PURPOSE: Main Flask entry point for KrishiVigil.ai
# HOW TO RUN: cd backend → python3 app.py
# SERVER: http://localhost:5000
# =============================================================

from flask import Flask
from flask_cors import CORS

from database import init_db
from core.model_loader import load_model_once
from routes.predict_routes import predict_bp
from routes.weather_routes import weather_bp
from routes.auth_routes import auth_bp
from routes.scan_routes import scans_bp, downloads_bp

app = Flask(__name__)

# ── CORS ──────────────────────────────────────────────────────
CORS(app, resources={r"/*": {"origins": [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]}})

# ── REGISTER ROUTES ───────────────────────────────────────────
app.register_blueprint(predict_bp)
app.register_blueprint(weather_bp)
app.register_blueprint(auth_bp)
app.register_blueprint(scans_bp)
app.register_blueprint(downloads_bp)


@app.route("/", methods=["GET"])
def health():
    return {
        "status":  "KrishiVigil.ai backend running",
        "version": "4.0.0",
        "endpoints": {
            "predict":          "POST /predict",
            "weather":          "GET  /weather?lat=X&lon=Y",
            "register":         "POST /auth/register",
            "login":            "POST /auth/login",
            "profile":          "GET  /auth/me",
            "save_scan":        "POST /scans/save",
            "scan_history":     "GET  /scans/history",
            "delete_scan":      "DELETE /scans/<id>",
            "delete_all_scans": "DELETE /scans/all",
            "save_download":    "POST /downloads/save",
            "list_downloads":   "GET  /downloads/list",
            "delete_download":  "DELETE /downloads/<id>",
            "delete_all_dl":    "DELETE /downloads/all",
        }
    }


if __name__ == "__main__":
    print("\n  KrishiVigil.ai Backend Starting...")
    print("-" * 45)
    init_db()
    load_model_once()
    print("-" * 45)
    print("  Server running at http://localhost:5000")
    print("  Frontend at      http://localhost:5173")
    print("-" * 45 + "\n")
    app.run(host="0.0.0.0", port=5000, debug=False)