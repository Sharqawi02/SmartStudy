from datetime import date, datetime

from flask import Blueprint, jsonify, request

from db import get_connection
from models import parse_json

plan_bp = Blueprint("plan", __name__, url_prefix="/api/plan")


def _difficulty_weight(difficulty):
    return {"low": 1.0, "med": 1.5, "high": 2.0}.get(difficulty, 1.0)


def _course_priority(course):
    today = date.today()
    exam_date = datetime.strptime(course["exam_date"], "%Y-%m-%d").date()
    days_left = (exam_date - today).days
    # Passed exams still get a small floor so generation does not fail.
    effective_days = max(days_left, 1)
    return _difficulty_weight(course["difficulty"]) / effective_days


def _fetch_courses():
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT id, name, difficulty, exam_date FROM courses ORDER BY exam_date ASC"
        ).fetchall()
    return [dict(row) for row in rows]


def _fetch_hours_per_week():
    with get_connection() as conn:
        row = conn.execute(
            "SELECT hours_per_week FROM study_settings WHERE id = 1"
        ).fetchone()
    return row["hours_per_week"] if row else 0


@plan_bp.get("")
def get_plan():
    return jsonify(
        {
            "message": "Use POST /api/plan/generate to generate a study-plan suggestion."
        }
    )


@plan_bp.post("/generate")
def generate_plan():
    payload = parse_json(request)

    courses = payload.get("courses")
    if not isinstance(courses, list) or not courses:
        courses = _fetch_courses()

    hours_per_week = payload.get("hours_per_week")
    if not isinstance(hours_per_week, int) or hours_per_week < 0:
        hours_per_week = _fetch_hours_per_week()

    if not courses:
        return jsonify(
            {
                "generated_at": date.today().isoformat(),
                "hours_per_week": hours_per_week,
                "weekly_focus": [],
                "suggestion_text": "No courses available. Add at least one course to generate a plan.",
            }
        )

    priorities = [_course_priority(course) for course in courses]
    total_priority = sum(priorities) or 1.0

    weekly_focus = []
    for index, course in enumerate(courses):
        share = priorities[index] / total_priority
        allocated_hours = round(hours_per_week * share, 1)
        days_left = (
            datetime.strptime(course["exam_date"], "%Y-%m-%d").date() - date.today()
        ).days
        weeks_to_exam = max((days_left + 6) // 7, 0)

        weekly_focus.append(
            {
                "course_id": course["id"],
                "course_name": course["name"],
                "difficulty": course["difficulty"],
                "exam_date": course["exam_date"],
                "weeks_to_exam": weeks_to_exam,
                "hours_per_week": allocated_hours,
            }
        )

    weekly_focus.sort(key=lambda item: item["exam_date"])
    top_courses = ", ".join(item["course_name"] for item in weekly_focus[:2])
    suggestion_text = (
        f"Weeks 1-2: prioritize {top_courses}. "
        "Weeks 3-4: keep cadence, review weak topics, and add one timed practice session. "
        "Final 1-2 weeks before each exam: shift to revision and mock questions."
    )

    return jsonify(
        {
            "generated_at": date.today().isoformat(),
            "hours_per_week": hours_per_week,
            "weekly_focus": weekly_focus,
            "suggestion_text": suggestion_text,
        }
    )
