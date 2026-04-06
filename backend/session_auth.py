from flask import jsonify, session

from db import get_connection


def serialize_user(row):
    return {
        "id": row["id"],
        "full_name": row["full_name"],
        "email": row["email"],
        "created_at": row["created_at"],
    }


def login_user(user):
    session.clear()
    session["user_id"] = user["id"]
    session.permanent = True


def logout_user():
    session.clear()


def get_current_user():
    user_id = session.get("user_id")
    if not isinstance(user_id, int):
        return None

    with get_connection() as conn:
        row = conn.execute(
            """
            SELECT id, full_name, email, created_at
            FROM users
            WHERE id = %s
            """,
            (user_id,),
        ).fetchone()

    if not row:
        session.clear()
        return None

    return row


def require_authenticated_user():
    user = get_current_user()
    if user:
        return user, None

    return None, (jsonify({"error": "Authentication required"}), 401)
