from flask import Blueprint, jsonify, request

from db import get_connection
from models import parse_json, serialize_settings, validate_settings_payload

settings_bp = Blueprint("settings", __name__, url_prefix="/api/settings")


@settings_bp.get("")
def get_settings():
    with get_connection() as conn:
        row = conn.execute(
            """
            SELECT id, hours_per_week, created_at, updated_at
            FROM study_settings
            WHERE id = 1
            """
        ).fetchone()

    if not row:
        return jsonify({"error": "Settings not initialized"}), 500

    return jsonify({"settings": serialize_settings(row)})


@settings_bp.post("")
def upsert_settings():
    payload = parse_json(request)
    is_valid, error = validate_settings_payload(payload)
    if not is_valid:
        return jsonify({"error": error}), 400

    with get_connection() as conn:
        conn.execute(
            """
            INSERT INTO study_settings (id, hours_per_week, created_at, updated_at)
            VALUES (1, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ON CONFLICT(id)
            DO UPDATE SET
                hours_per_week = excluded.hours_per_week,
                updated_at = CURRENT_TIMESTAMP
            """,
            (payload["hours_per_week"],),
        )
        row = conn.execute(
            """
            SELECT id, hours_per_week, created_at, updated_at
            FROM study_settings
            WHERE id = 1
            """
        ).fetchone()

    return jsonify({"settings": serialize_settings(row)})
