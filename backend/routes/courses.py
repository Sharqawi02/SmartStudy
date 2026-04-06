from flask import Blueprint, jsonify, request

from db import get_connection
from models import parse_json, serialize_course, validate_course_payload
from session_auth import require_authenticated_user

courses_bp = Blueprint("courses", __name__, url_prefix="/api/courses")


@courses_bp.get("")
def list_courses():
    user, auth_error = require_authenticated_user()
    if auth_error:
        return auth_error

    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT id, name, difficulty, exam_date
            FROM courses
            WHERE user_id = %s
            ORDER BY exam_date ASC
            """,
            (user["id"],),
        ).fetchall()

    return jsonify({"courses": [serialize_course(row) for row in rows]})


@courses_bp.post("")
def create_course():
    user, auth_error = require_authenticated_user()
    if auth_error:
        return auth_error

    payload = parse_json(request)
    is_valid, error = validate_course_payload(payload)
    if not is_valid:
        return jsonify({"error": error}), 400

    with get_connection() as conn:
        row = conn.execute(
            """
            INSERT INTO courses (user_id, name, difficulty, exam_date)
            VALUES (%s, %s, %s, %s)
            RETURNING id, name, difficulty, exam_date
            """,
            (
                user["id"],
                payload["name"].strip(),
                payload["difficulty"],
                payload["exam_date"],
            ),
        ).fetchone()

    return jsonify({"course": serialize_course(row)}), 201


@courses_bp.put("/<int:course_id>")
def update_course(course_id):
    user, auth_error = require_authenticated_user()
    if auth_error:
        return auth_error

    payload = parse_json(request)
    if not payload:
        return jsonify({"error": "No fields provided for update"}), 400

    is_valid, error = validate_course_payload(payload, partial=True)
    if not is_valid:
        return jsonify({"error": error}), 400

    allowed_fields = ("name", "difficulty", "exam_date")
    update_fields = [field for field in allowed_fields if field in payload]
    if not update_fields:
        return jsonify({"error": "No valid updatable fields provided"}), 400

    set_clause = ", ".join(f"{field} = %s" for field in update_fields)
    values = [
        payload[field].strip() if field == "name" else payload[field]
        for field in update_fields
    ]
    values.append(course_id)

    with get_connection() as conn:
        course_exists = conn.execute(
            "SELECT id FROM courses WHERE id = %s AND user_id = %s",
            (course_id, user["id"]),
        ).fetchone()
        if not course_exists:
            return jsonify({"error": "Course not found"}), 404

        conn.execute(
            f"UPDATE courses SET {set_clause} WHERE id = %s AND user_id = %s",
            [*values, user["id"]],
        )
        row = conn.execute(
            """
            SELECT id, name, difficulty, exam_date
            FROM courses
            WHERE id = %s AND user_id = %s
            """,
            (course_id, user["id"]),
        ).fetchone()

    return jsonify({"course": serialize_course(row)})


@courses_bp.delete("/<int:course_id>")
def delete_course(course_id):
    user, auth_error = require_authenticated_user()
    if auth_error:
        return auth_error

    with get_connection() as conn:
        row = conn.execute(
            "SELECT id FROM courses WHERE id = %s AND user_id = %s",
            (course_id, user["id"]),
        ).fetchone()
        if not row:
            return jsonify({"error": "Course not found"}), 404

        conn.execute(
            "DELETE FROM courses WHERE id = %s AND user_id = %s",
            (course_id, user["id"]),
        )

    return "", 204
