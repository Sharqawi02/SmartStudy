import re

from flask import Blueprint, jsonify, request
from werkzeug.security import check_password_hash, generate_password_hash

from config import DEFAULT_HOURS_PER_WEEK
from db import ensure_user_settings, get_connection
from models import parse_json
from session_auth import (
    get_current_user,
    login_user,
    logout_user,
    serialize_user,
)

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")
EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _normalize_email(email):
    if not isinstance(email, str):
        return ""
    return email.strip().lower()


def _validate_registration_payload(payload):
    full_name = payload.get("full_name")
    email = _normalize_email(payload.get("email"))
    password = payload.get("password")

    if not isinstance(full_name, str) or len(full_name.strip()) < 2:
        return False, "Full name must be at least 2 characters long"

    if not EMAIL_PATTERN.match(email):
        return False, "Enter a valid email address"

    if not isinstance(password, str) or len(password) < 8:
        return False, "Password must be at least 8 characters long"

    return True, None


def _validate_login_payload(payload):
    email = _normalize_email(payload.get("email"))
    password = payload.get("password")

    if not EMAIL_PATTERN.match(email):
        return False, "Enter a valid email address"

    if not isinstance(password, str) or not password:
        return False, "Password is required"

    return True, None


@auth_bp.get("/me")
def get_session_user():
    user = get_current_user()
    if not user:
        return jsonify({"error": "Not authenticated"}), 401

    return jsonify({"user": serialize_user(user)})


@auth_bp.post("/register")
def register():
    payload = parse_json(request)
    is_valid, error = _validate_registration_payload(payload)
    if not is_valid:
        return jsonify({"error": error}), 400

    full_name = payload["full_name"].strip()
    email = _normalize_email(payload["email"])
    password_hash = generate_password_hash(payload["password"])

    with get_connection() as conn:
        existing_user = conn.execute(
            """
            SELECT id
            FROM users
            WHERE LOWER(email) = %s
            """,
            (email,),
        ).fetchone()
        if existing_user:
            return jsonify({"error": "An account already exists for that email"}), 409

        user = conn.execute(
            """
            INSERT INTO users (full_name, email, password_hash)
            VALUES (%s, %s, %s)
            RETURNING id, full_name, email, created_at
            """,
            (full_name, email, password_hash),
        ).fetchone()
        ensure_user_settings(conn, user["id"], DEFAULT_HOURS_PER_WEEK)

    login_user(user)
    return jsonify({"user": serialize_user(user)}), 201


@auth_bp.post("/login")
def login():
    payload = parse_json(request)
    is_valid, error = _validate_login_payload(payload)
    if not is_valid:
        return jsonify({"error": error}), 400

    email = _normalize_email(payload["email"])

    with get_connection() as conn:
        user = conn.execute(
            """
            SELECT id, full_name, email, password_hash, created_at
            FROM users
            WHERE LOWER(email) = %s
            """,
            (email,),
        ).fetchone()

    if not user or not check_password_hash(user["password_hash"], payload["password"]):
        return jsonify({"error": "Incorrect email or password"}), 401

    login_user(user)
    return jsonify({"user": serialize_user(user)})


@auth_bp.post("/logout")
def logout():
    logout_user()
    return "", 204
