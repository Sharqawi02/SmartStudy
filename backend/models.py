from datetime import datetime

from config import ALLOWED_DIFFICULTIES, DATE_FORMAT


def parse_json(request):
    payload = request.get_json(silent=True)
    return payload if isinstance(payload, dict) else {}


def validate_date(date_string):
    try:
        datetime.strptime(date_string, DATE_FORMAT)
    except (TypeError, ValueError):
        return False
    return True


def validate_course_payload(payload, partial=False):
    required_fields = {"name", "difficulty", "exam_date"}

    if not partial and not required_fields.issubset(payload.keys()):
        missing = sorted(required_fields.difference(payload.keys()))
        return False, f"Missing required fields: {', '.join(missing)}"

    if "name" in payload:
        name = payload.get("name")
        if not isinstance(name, str) or not name.strip():
            return False, "Field 'name' must be a non-empty string"

    if "difficulty" in payload:
        difficulty = payload.get("difficulty")
        if difficulty not in ALLOWED_DIFFICULTIES:
            allowed = ", ".join(sorted(ALLOWED_DIFFICULTIES))
            return False, f"Field 'difficulty' must be one of: {allowed}"

    if "exam_date" in payload and not validate_date(payload.get("exam_date")):
        return False, "Field 'exam_date' must be in YYYY-MM-DD format"

    return True, None


def validate_settings_payload(payload):
    if "hours_per_week" not in payload:
        return False, "Missing required field: hours_per_week"

    hours = payload.get("hours_per_week")
    if not isinstance(hours, int) or hours < 0:
        return False, "Field 'hours_per_week' must be an integer >= 0"

    return True, None


def serialize_course(row):
    return {
        "id": row["id"],
        "name": row["name"],
        "difficulty": row["difficulty"],
        "exam_date": row["exam_date"],
    }


def serialize_settings(row):
    return {
        "hours_per_week": row["hours_per_week"],
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }
