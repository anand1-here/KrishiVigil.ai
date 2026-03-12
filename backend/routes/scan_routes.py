# =============================================================
# FILE: backend/routes/scan_routes.py
# PURPOSE: Save and retrieve scan history + downloads per user
#
# Scan Endpoints:
#   POST /scans/save       → save a scan result
#   GET  /scans/history    → get all scans for user
#   DELETE /scans/<id>     → delete one scan
#   DELETE /scans/all      → delete all scans
#
# Download Endpoints:
#   POST /downloads/save   → save a full PDF report
#   GET  /downloads/list   → get all downloads for user
#   DELETE /downloads/<id> → delete one download
#   DELETE /downloads/all  → delete all downloads
# =============================================================

from flask import Blueprint, request, jsonify
import json

from database import get_db
from routes.auth_routes import get_current_user

scans_bp = Blueprint("scans", __name__, url_prefix="/scans")
downloads_bp = Blueprint("downloads", __name__, url_prefix="/downloads")


# ─────────────────────────────────────────────────────────────
# POST /scans/save
# ─────────────────────────────────────────────────────────────
@scans_bp.route("/save", methods=["POST"])
def save_scan():
    user = get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    data    = request.get_json() or {}
    result  = data.get("result", {})
    weather = data.get("weather", {})

    conn = get_db()
    conn.execute("""
        INSERT INTO scans
            (user_id, crop, land_acres, disease, confidence, severity,
             health_score, yield_loss, location, temperature, result_json, image_base64)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        user["id"],
        data.get("crop", ""),
        data.get("land", 0),
        result.get("disease", ""),
        result.get("confidence", 0),
        result.get("severity", ""),
        result.get("health_score", 0),
        result.get("yield_loss", ""),
        weather.get("location", ""),
        weather.get("temperature", 0),
        json.dumps(result),
        data.get("image_base64", ""),
    ))
    conn.commit()
    conn.close()
    return jsonify({"message": "Scan saved successfully"}), 201


# ─────────────────────────────────────────────────────────────
# GET /scans/history
# ─────────────────────────────────────────────────────────────
@scans_bp.route("/history", methods=["GET"])
def get_history():
    user = get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    conn = get_db()
    rows = conn.execute("""
        SELECT id, crop, land_acres, disease, confidence, severity,
               health_score, yield_loss, location, temperature,
               result_json, image_base64, scanned_at
        FROM scans
        WHERE user_id = ?
        ORDER BY scanned_at DESC
        LIMIT 50
    """, (user["id"],)).fetchall()
    conn.close()

    scans = []
    for row in rows:
        scans.append({
            "id":           row["id"],
            "crop":         row["crop"],
            "land":         row["land_acres"],
            "disease":      row["disease"],
            "confidence":   row["confidence"],
            "severity":     row["severity"],
            "health_score": row["health_score"],
            "yield_loss":   row["yield_loss"],
            "location":     row["location"],
            "temperature":  row["temperature"],
            "result":       json.loads(row["result_json"] or "{}"),
            "image":        row["image_base64"],
            "scanned_at":   row["scanned_at"],
        })

    return jsonify({"scans": scans, "total": len(scans)}), 200


# ─────────────────────────────────────────────────────────────
# DELETE /scans/<scan_id>
# ─────────────────────────────────────────────────────────────
@scans_bp.route("/<int:scan_id>", methods=["DELETE"])
def delete_scan(scan_id):
    user = get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    conn = get_db()
    conn.execute("DELETE FROM scans WHERE id = ? AND user_id = ?", (scan_id, user["id"]))
    conn.commit()
    conn.close()
    return jsonify({"message": "Scan deleted"}), 200


# ─────────────────────────────────────────────────────────────
# DELETE /scans/all
# ─────────────────────────────────────────────────────────────
@scans_bp.route("/all", methods=["DELETE"])
def delete_all_scans():
    user = get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    conn = get_db()
    conn.execute("DELETE FROM scans WHERE user_id = ?", (user["id"],))
    conn.commit()
    conn.close()
    return jsonify({"message": "All scans deleted"}), 200


# =============================================================
# DOWNLOADS ENDPOINTS
# =============================================================

# ─────────────────────────────────────────────────────────────
# POST /downloads/save
# Body: { title, crop, land, disease, confidence, severity,
#         health_score, image_base64, html_content }
# ─────────────────────────────────────────────────────────────
@downloads_bp.route("/save", methods=["POST"])
def save_download():
    user = get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.get_json() or {}

    conn = get_db()
    conn.execute("""
        INSERT INTO downloads
            (user_id, title, crop, land_acres, disease, confidence,
             severity, health_score, image_base64, html_content)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        user["id"],
        data.get("title", "Crop Report"),
        data.get("crop", ""),
        data.get("land", 0),
        data.get("disease", ""),
        data.get("confidence", 0),
        data.get("severity", ""),
        data.get("health_score", 0),
        data.get("image_base64", ""),
        data.get("html_content", ""),
    ))
    conn.commit()
    conn.close()
    return jsonify({"message": "Download saved successfully"}), 201


# ─────────────────────────────────────────────────────────────
# GET /downloads/list
# Returns all downloads for user, newest first
# ─────────────────────────────────────────────────────────────
@downloads_bp.route("/list", methods=["GET"])
def get_downloads():
    user = get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    conn = get_db()
    rows = conn.execute("""
        SELECT id, title, crop, land_acres, disease, confidence,
               severity, health_score, image_base64, html_content, downloaded_at
        FROM downloads
        WHERE user_id = ?
        ORDER BY downloaded_at DESC
        LIMIT 50
    """, (user["id"],)).fetchall()
    conn.close()

    downloads = []
    for row in rows:
        downloads.append({
            "id":           row["id"],
            "title":        row["title"],
            "crop":         row["crop"],
            "land":         row["land_acres"],
            "disease":      row["disease"],
            "confidence":   row["confidence"],
            "severity":     row["severity"],
            "health_score": row["health_score"],
            "image":        row["image_base64"],
            "html":         row["html_content"],
            "downloaded_at":row["downloaded_at"],
        })

    return jsonify({"downloads": downloads, "total": len(downloads)}), 200


# ─────────────────────────────────────────────────────────────
# DELETE /downloads/<download_id>
# ─────────────────────────────────────────────────────────────
@downloads_bp.route("/<int:download_id>", methods=["DELETE"])
def delete_download(download_id):
    user = get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    conn = get_db()
    conn.execute("DELETE FROM downloads WHERE id = ? AND user_id = ?", (download_id, user["id"]))
    conn.commit()
    conn.close()
    return jsonify({"message": "Download deleted"}), 200


# ─────────────────────────────────────────────────────────────
# DELETE /downloads/all
# ─────────────────────────────────────────────────────────────
@downloads_bp.route("/all", methods=["DELETE"])
def delete_all_downloads():
    user = get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    conn = get_db()
    conn.execute("DELETE FROM downloads WHERE user_id = ?", (user["id"],))
    conn.commit()
    conn.close()
    return jsonify({"message": "All downloads deleted"}), 200