# =============================================================
# FILE: backend/routes/auth_routes.py
# PURPOSE: User registration, login, logout endpoints
#
# Endpoints:
#   POST /auth/register  → create new account
#   POST /auth/login     → login + get token
#   POST /auth/logout    → logout (client clears token)
#   GET  /auth/me        → get current user profile
# =============================================================

from flask import Blueprint, request, jsonify
import bcrypt
import jwt
import datetime
import os

from database import get_db

auth_bp = Blueprint("auth", __name__, url_prefix="/auth")

# Secret key for JWT tokens — change this in production!
JWT_SECRET = os.environ.get("JWT_SECRET", "krishivigil_secret_2025")
JWT_EXPIRY_HOURS = 24 * 7  # token valid for 7 days


def make_token(user_id):
    """Generate a JWT token for a logged-in user."""
    payload = {
        "user_id": user_id,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=JWT_EXPIRY_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


def verify_token(token):
    """Verify JWT token and return user_id, or None if invalid."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return payload.get("user_id")
    except Exception:
        return None


def get_current_user():
    """Extract user from Authorization header. Returns user row or None."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None
    token = auth_header.split(" ", 1)[1]
    user_id = verify_token(token)
    if not user_id:
        return None
    conn = get_db()
    user = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    conn.close()
    return user


# ─────────────────────────────────────────────────────────────
# POST /auth/register
# Body: { mobile_or_email, password, name (optional) }
# Returns: { token, user } on success
#          { error } if duplicate account or missing fields
# ─────────────────────────────────────────────────────────────
@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json() or {}
    mobile_or_email = (data.get("mobile_or_email") or "").strip().lower()
    password        = data.get("password", "")
    name            = (data.get("name") or "Farmer").strip()

    # Validate required fields
    if not mobile_or_email or not password:
        return jsonify({"error": "Mobile/email and password are required"}), 400

    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400

    # Hash the password with bcrypt
    password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    conn = get_db()
    try:
        # INSERT will fail with UNIQUE constraint if duplicate
        cursor = conn.execute(
            "INSERT INTO users (name, mobile_or_email, password_hash) VALUES (?, ?, ?)",
            (name, mobile_or_email, password_hash)
        )
        user_id = cursor.lastrowid
        conn.commit()

        token = make_token(user_id)
        return jsonify({
            "message": "Account created successfully",
            "token": token,
            "user": {
                "id": user_id,
                "name": name,
                "mobile_or_email": mobile_or_email,
            }
        }), 201

    except Exception as e:
        if "UNIQUE" in str(e):
            return jsonify({"error": "An account with this mobile/email already exists"}), 409
        return jsonify({"error": "Registration failed. Please try again."}), 500
    finally:
        conn.close()


# ─────────────────────────────────────────────────────────────
# POST /auth/login
# Body: { mobile_or_email, password }
# Returns: { token, user } on success
#          { error } on wrong credentials
# ─────────────────────────────────────────────────────────────
@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    mobile_or_email = (data.get("mobile_or_email") or "").strip().lower()
    password        = data.get("password", "")

    if not mobile_or_email or not password:
        return jsonify({"error": "Mobile/email and password are required"}), 400

    conn = get_db()
    user = conn.execute(
        "SELECT * FROM users WHERE mobile_or_email = ?", (mobile_or_email,)
    ).fetchone()

    if not user:
        conn.close()
        return jsonify({"error": "No account found with this mobile/email"}), 404

    # Check password against stored hash
    if not bcrypt.checkpw(password.encode("utf-8"), user["password_hash"].encode("utf-8")):
        conn.close()
        return jsonify({"error": "Incorrect password"}), 401

    # Update last login timestamp
    conn.execute("UPDATE users SET last_login = datetime('now') WHERE id = ?", (user["id"],))
    conn.commit()
    conn.close()

    token = make_token(user["id"])
    return jsonify({
        "message": "Login successful",
        "token": token,
        "user": {
            "id": user["id"],
            "name": user["name"],
            "mobile_or_email": user["mobile_or_email"],
            "state": user["state"],
            "land_acres": user["land_acres"],
            "created_at": user["created_at"],
        }
    }), 200


# ─────────────────────────────────────────────────────────────
# GET /auth/me
# Header: Authorization: Bearer <token>
# Returns current user profile + scan count
# ─────────────────────────────────────────────────────────────
@auth_bp.route("/me", methods=["GET"])
def me():
    user = get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    conn = get_db()
    scan_count = conn.execute(
        "SELECT COUNT(*) FROM scans WHERE user_id = ?", (user["id"],)
    ).fetchone()[0]
    conn.close()

    return jsonify({
        "id": user["id"],
        "name": user["name"],
        "mobile_or_email": user["mobile_or_email"],
        "state": user["state"],
        "land_acres": user["land_acres"],
        "created_at": user["created_at"],
        "last_login": user["last_login"],
        "total_scans": scan_count,
    }), 200


# ─────────────────────────────────────────────────────────────
# POST /auth/logout
# Just tells client to clear token (stateless JWT)
# ─────────────────────────────────────────────────────────────
@auth_bp.route("/logout", methods=["POST"])
def logout():
    return jsonify({"message": "Logged out successfully"}), 200