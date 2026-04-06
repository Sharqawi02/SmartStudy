from flask import Blueprint, jsonify, request

from db import ensure_user_settings, get_connection
from models import parse_json, serialize_settings, validate_settings_payload
from session_auth import require_authenticated_user

settings_bp = Blueprint("settings", __name__, url_prefix="/api/settings")


@settings_bp.get("")
def get_settings():
    user, auth_error = require_authenticated_user()
    if auth_error:
        return auth_error

    with get_connection() as conn:
        ensure_user_settings(conn, user["id"])
        row = conn.execute(
            """
            SELECT user_id, hours_per_week, created_at, updated_at
            FROM user_settings
            WHERE user_id = %s
            """,
            (user["id"],),
        ).fetchone()

    if not row:
        return jsonify({"error": "Settings not initialized"}), 500

    return jsonify({"settings": serialize_settings(row)})


@settings_bp.post("")
def upsert_settings():
    user, auth_error = require_authenticated_user()
    if auth_error:
        return auth_error

    payload = parse_json(request)
    is_valid, error = validate_settings_payload(payload)
    if not is_valid:
        return jsonify({"error": error}), 400

    with get_connection() as conn:
        conn.execute(
            """
            INSERT INTO user_settings (user_id, hours_per_week, created_at, updated_at)
            VALUES (%s, %s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ON CONFLICT (user_id)
            DO UPDATE SET
                hours_per_week = EXCLUDED.hours_per_week,
                updated_at = CURRENT_TIMESTAMP
            """,
            (user["id"], payload["hours_per_week"]),
        )
        row = conn.execute(
            """
            SELECT user_id, hours_per_week, created_at, updated_at
            FROM user_settings
            WHERE user_id = %s
            """,
            (user["id"],),
        ).fetchone()

    return jsonify({"settings": serialize_settings(row)})
