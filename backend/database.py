# =============================================================
# FILE: backend/database.py
# PURPOSE: SQLite database setup for KrishiVigil.ai
# Tables: users, scans, downloads
# Auto-creates krishivigil.db on first run
# =============================================================

import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "krishivigil.db")

def get_db():
    """Get a database connection."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Create all tables if they don't exist."""
    conn = get_db()
    cursor = conn.cursor()

    # ── USERS TABLE ───────────────────────────────────────────
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id                INTEGER PRIMARY KEY AUTOINCREMENT,
            name              TEXT    NOT NULL DEFAULT 'Farmer',
            mobile_or_email   TEXT    NOT NULL UNIQUE,
            password_hash     TEXT    NOT NULL,
            state             TEXT    DEFAULT '',
            land_acres        REAL    DEFAULT 0,
            created_at        TEXT    DEFAULT (datetime('now')),
            last_login        TEXT    DEFAULT (datetime('now'))
        )
    """)

    # ── SCANS TABLE ───────────────────────────────────────────
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS scans (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id       INTEGER NOT NULL,
            crop          TEXT    DEFAULT '',
            land_acres    REAL    DEFAULT 0,
            disease       TEXT    DEFAULT '',
            confidence    REAL    DEFAULT 0,
            severity      TEXT    DEFAULT '',
            health_score  INTEGER DEFAULT 0,
            yield_loss    TEXT    DEFAULT '',
            location      TEXT    DEFAULT '',
            temperature   REAL    DEFAULT 0,
            result_json   TEXT    DEFAULT '{}',
            image_base64  TEXT    DEFAULT '',
            scanned_at    TEXT    DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)

    # ── DOWNLOADS TABLE ───────────────────────────────────────
    # Stores full HTML report so user can re-open anytime
    # html_content stores complete report HTML
    # ─────────────────────────────────────────────────────────
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS downloads (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id       INTEGER NOT NULL,
            title         TEXT    DEFAULT '',
            crop          TEXT    DEFAULT '',
            land_acres    REAL    DEFAULT 0,
            disease       TEXT    DEFAULT '',
            confidence    REAL    DEFAULT 0,
            severity      TEXT    DEFAULT '',
            health_score  INTEGER DEFAULT 0,
            image_base64  TEXT    DEFAULT '',
            html_content  TEXT    DEFAULT '',
            downloaded_at TEXT    DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)

    conn.commit()
    conn.close()
    print("  Database ready:", DB_PATH)