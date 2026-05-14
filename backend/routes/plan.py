import json
import random
from datetime import date, datetime

from flask import Blueprint, current_app, jsonify, request
from psycopg.types.json import Jsonb

from ai_client import AIPlanGenerationError, generate_plan_suggestion, is_ai_configured
from config import OPENAI_PLAN_GENERATION_ENABLED
from db import ensure_user_settings, get_connection
from models import parse_json
from session_auth import require_authenticated_user

plan_bp = Blueprint("plan", __name__, url_prefix="/api/plan")
SWEDISH_MONTHS = {
    1: "jan",
    2: "feb",
    3: "mars",
    4: "apr",
    5: "maj",
    6: "juni",
    7: "juli",
    8: "aug",
    9: "sep",
    10: "okt",
    11: "nov",
    12: "dec",
}


def _difficulty_weight(difficulty):
    return {"low": 1.0, "med": 1.5, "high": 2.0}.get(difficulty, 1.0)


def _course_priority(course):
    today = date.today()
    exam_date = datetime.strptime(course["exam_date"], "%Y-%m-%d").date()
    days_left = (exam_date - today).days
    # Passed exams still get a small floor so generation does not fail.
    effective_days = max(days_left, 1)
    return _difficulty_weight(course["difficulty"]) / effective_days


def _fetch_courses(user_id):
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT id, name, difficulty, exam_date
            FROM courses
            WHERE user_id = %s
            ORDER BY exam_date ASC
            """,
            (user_id,),
        ).fetchall()
    return [dict(row) for row in rows]


def _fetch_hours_per_week(user_id):
    with get_connection() as conn:
        ensure_user_settings(conn, user_id)
        row = conn.execute(
            "SELECT hours_per_week FROM user_settings WHERE user_id = %s",
            (user_id,),
        ).fetchone()
    return row["hours_per_week"] if row else 0


def _format_swedish_date(date_string):
    parsed = datetime.strptime(date_string, "%Y-%m-%d").date()
    return f"{parsed.day} {SWEDISH_MONTHS[parsed.month]}"


def _focus_level_text(days_left):
    if days_left <= 1:
        return "nästan all"

    if days_left <= 3:
        return "största delen av"

    if days_left <= 7:
        return "huvuddelen av"

    return "merparten av"


def _pass_hint(hours_per_week):
    if hours_per_week >= 3:
        return "2-3 fokuserade pass"

    if hours_per_week >= 1.5:
        return "1-2 fokuserade pass"

    return "ett kort repetitionspass"


def _study_allocation_meta(hours_per_week, days_to_exam):
    if days_to_exam <= 0:
        return {
            "allocation_mode": "passed",
            "recommended_hours": 0.0,
            "recommended_hours_per_day": 0.0,
            "study_window_days": 0,
            "display_hours": 0.0,
            "display_unit": "tentan passerad",
            "display_label": "Tidsfönster",
            "display_detail": "Tentadatumet har passerat.",
        }

    if days_to_exam <= 7:
        display_hours = round(hours_per_week, 1)
        hours_per_day = round(display_hours / max(days_to_exam, 1), 1)
        return {
            "allocation_mode": "before_exam",
            "recommended_hours": display_hours,
            "recommended_hours_per_day": hours_per_day,
            "study_window_days": days_to_exam,
            "display_hours": display_hours,
            "display_unit": "h före tentan",
            "display_label": "Före tentan",
            "display_detail": f"Ca {hours_per_day} h/dag i {days_to_exam} dagar.",
        }

    return {
        "allocation_mode": "per_week",
        "recommended_hours": round(hours_per_week, 1),
        "recommended_hours_per_day": round(hours_per_week / 7, 1),
        "study_window_days": 7,
        "display_hours": round(hours_per_week, 1),
        "display_unit": "h / vecka",
        "display_label": "Veckofördelning",
        "display_detail": "Planera tiden jämnt över veckan och öka trycket när tentan närmar sig.",
    }


def _apply_allocation_meta(focus_item):
    focus_item.update(
        _study_allocation_meta(
            hours_per_week=focus_item["hours_per_week"],
            days_to_exam=focus_item["days_to_exam"],
        )
    )
    return focus_item


def _build_rule_based_suggestion(weekly_focus, hours_per_week):
    primary_course = weekly_focus[0]
    primary_exam_date = _format_swedish_date(primary_course["exam_date"])
    primary_focus = _focus_level_text(primary_course["days_to_exam"])
    primary_hours_text = (
        f"{primary_course['display_hours']} {primary_course['display_unit']}"
        if primary_course["allocation_mode"] == "before_exam"
        else f"{primary_course['display_hours']} h den här veckan"
    )
    primary_daily_text = (
        f"cirka {primary_course['recommended_hours_per_day']} h/dag"
        if primary_course["allocation_mode"] == "before_exam"
        else None
    )

    opening_templates = [
        (
            f"Fram till {primary_exam_date}: lägg {primary_focus} tiden på "
            f"{primary_course['course_name']}."
        ),
        (
            f"Starta veckan med {primary_course['course_name']} och håll "
            f"{primary_focus} studietiden där fram till {primary_exam_date}."
        ),
        (
            f"Prioritera {primary_course['course_name']} först eftersom tentan är "
            f"{primary_exam_date}; ge kursen {primary_focus} tillgänglig tid."
        ),
    ]

    sentences = [random.choice(opening_templates)]
    if primary_daily_text:
        sentences.append(
            random.choice(
                [
                    f"Det motsvarar {primary_daily_text}, totalt {primary_hours_text}.",
                    f"Sikta på {primary_daily_text}, alltså {primary_hours_text} innan tentan.",
                    f"Bryt ner tiden till {primary_daily_text} så att du hinner {primary_hours_text}.",
                ]
            )
        )
    else:
        sentences.append(
            random.choice(
                [
                    f"Sikta på ungefär {primary_hours_text}.",
                    f"Planera in {primary_hours_text} och sprid passen över veckan.",
                    f"Lägg upp veckan så att kursen får cirka {primary_hours_text}.",
                ]
            )
        )

    if len(weekly_focus) > 1:
        secondary_course = weekly_focus[1]
        secondary_exam_date = _format_swedish_date(secondary_course["exam_date"])
        secondary_effort = (
            secondary_course["display_detail"].lower()
            if secondary_course["allocation_mode"] == "before_exam"
            else _pass_hint(secondary_course["hours_per_week"])
        )
        sentences.append(
            random.choice(
                [
                    (
                        f"Håll samtidigt {secondary_course['course_name']} igång med "
                        f"{secondary_effort} före {secondary_exam_date}."
                    ),
                    (
                        f"Ge {secondary_course['course_name']} ett underhållsspår med "
                        f"{secondary_effort} inför {secondary_exam_date}."
                    ),
                    (
                        f"Låt {secondary_course['course_name']} få {secondary_effort} så att "
                        f"du inte tappar kursen före {secondary_exam_date}."
                    ),
                ]
            )
        )
        sentences.append(
            random.choice(
                [
                    (
                        f"Efter {primary_exam_date}: flytta huvudfokus till "
                        f"{secondary_course['course_name']} och gå över till aktiv repetition, "
                        "gamla uppgifter och snabba självtester."
                    ),
                    (
                        f"När {primary_course['course_name']} är avklarad, byt tyngdpunkt till "
                        f"{secondary_course['course_name']} med repetition och gamla uppgifter."
                    ),
                    (
                        f"Direkt efter {primary_exam_date} bör {secondary_course['course_name']} "
                        "bli huvudspåret med tidsatta övningar och självtester."
                    ),
                ]
            )
        )
    else:
        sentences.append(
            random.choice(
                [
                    (
                        f"Fördela cirka {hours_per_week} timmar den här veckan på repetition, "
                        "begreppsträning och en kort kontroll av svaga områden."
                    ),
                    (
                        f"Använd veckans {hours_per_week} timmar till två tydliga block: "
                        "förståelse först, sedan testfrågor."
                    ),
                    (
                        f"Låt de {hours_per_week} timmarna gå till blandad repetition, "
                        "övningsuppgifter och en kort genomgång av svaga delar."
                    ),
                ]
            )
        )

    if primary_course["days_to_exam"] <= 3:
        sentences.append(
            random.choice(
                [
                    "Sista dagarna före tentan: prioritera sammanfattningar, nyckelbegrepp och tidigare frågor framför nytt material.",
                    "När tentan är så nära bör du repetera, testa dig själv och undvika att öppna stora nya områden.",
                    "Avsluta med korta repetitionspass, tidigare frågor och kontroll av de vanligaste misstagen.",
                ]
            )
        )
    else:
        sentences.append(
            random.choice(
                [
                    "När det återstår 1-2 dagar till varje tenta: växla från nyinlärning till repetition och tidsatta övningar.",
                    "Spara de sista dagarna till repetition, minnestest och uppgifter under tidspress.",
                    "Mot slutet ska fokus flyttas från nytt material till att kontrollera vad du faktiskt kan lösa själv.",
                ]
            )
        )

    return " ".join(sentences)


def _build_empty_plan_response(hours_per_week):
    return {
        "id": None,
        "generated_at": date.today().isoformat(),
        "hours_per_week": hours_per_week,
        "weekly_focus": [],
        "suggestion_text": "Inga kurser finns ännu. Lägg till minst en kurs för att skapa en studieplan.",
        "suggestion_source": "rule_based",
        "ai_configured": is_ai_configured(),
        "ai_generation_enabled": OPENAI_PLAN_GENERATION_ENABLED,
    }


def _build_single_focus(course, allocated_hours):
    days_left = (
        datetime.strptime(course["exam_date"], "%Y-%m-%d").date() - date.today()
    ).days
    weeks_to_exam = max((days_left + 6) // 7, 0)

    return _apply_allocation_meta(
        {
            "course_id": course["id"],
            "course_name": course["name"],
            "difficulty": course["difficulty"],
            "exam_date": course["exam_date"],
            "days_to_exam": days_left,
            "weeks_to_exam": weeks_to_exam,
            "hours_per_week": allocated_hours,
        }
    )


def _serialize_plan_row(row):
    weekly_focus = row["weekly_focus"]
    if isinstance(weekly_focus, str):
        weekly_focus = json.loads(weekly_focus)

    return {
        "id": row["id"],
        "generated_at": row["generated_at"],
        "hours_per_week": row["hours_per_week"],
        "weekly_focus": weekly_focus,
        "suggestion_text": row["suggestion_text"],
        "suggestion_source": row["suggestion_source"],
        "ai_configured": is_ai_configured(),
        "ai_generation_enabled": OPENAI_PLAN_GENERATION_ENABLED,
    }


def _store_plan(user_id, plan_payload):
    with get_connection() as conn:
        row = conn.execute(
            """
            INSERT INTO study_plans (
                user_id,
                generated_at,
                hours_per_week,
                suggestion_text,
                suggestion_source,
                weekly_focus
            )
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING
                id,
                generated_at,
                hours_per_week,
                suggestion_text,
                suggestion_source,
                weekly_focus
            """,
            (
                user_id,
                plan_payload["generated_at"],
                plan_payload["hours_per_week"],
                plan_payload["suggestion_text"],
                plan_payload["suggestion_source"],
                Jsonb(plan_payload["weekly_focus"]),
            ),
        ).fetchone()

    return _serialize_plan_row(row)


def _fetch_plan_history(user_id, limit=10):
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT
                id,
                generated_at,
                hours_per_week,
                suggestion_text,
                suggestion_source,
                weekly_focus
            FROM study_plans
            WHERE user_id = %s
            ORDER BY created_at DESC, id DESC
            LIMIT %s
            """,
            (user_id, limit),
        ).fetchall()

    return [_serialize_plan_row(row) for row in rows]


def _build_weekly_focus(courses, hours_per_week):
    if not courses:
        return []

    raw_priorities = [_course_priority(course) for course in courses]
    total_priority = sum(raw_priorities) or 1.0

    weekly_focus = []
    allocated_total = 0.0
    for index, course in enumerate(courses):
        share = raw_priorities[index] / total_priority
        allocated_hours = round(hours_per_week * share, 1)
        allocated_total += allocated_hours
        weekly_focus.append(_build_single_focus(course, allocated_hours))

    if weekly_focus and hours_per_week > 0:
        rounding_delta = round(hours_per_week - allocated_total, 1)
        weekly_focus[0]["hours_per_week"] = round(
            max(0.0, weekly_focus[0]["hours_per_week"] + rounding_delta), 1
        )

    weekly_focus.sort(key=lambda item: item["exam_date"])
    for item in weekly_focus:
        _apply_allocation_meta(item)
    return weekly_focus


def _rebalance_for_imminent_exam(weekly_focus):
    if len(weekly_focus) < 2:
        return weekly_focus

    primary_course = weekly_focus[0]
    if primary_course["days_to_exam"] > 3:
        return weekly_focus

    total_hours = round(sum(item["hours_per_week"] for item in weekly_focus), 1)
    if total_hours <= 0:
        return weekly_focus

    if primary_course["days_to_exam"] <= 1:
        target_share = 0.95
        maintenance_floor = 0.1
    elif primary_course["days_to_exam"] <= 2:
        target_share = 0.9
        maintenance_floor = 0.2
    else:
        target_share = 0.8
        maintenance_floor = 0.4

    desired_primary_hours = round(total_hours * target_share, 1)
    additional_needed = round(desired_primary_hours - primary_course["hours_per_week"], 1)
    if additional_needed <= 0:
        _apply_allocation_meta(primary_course)
        for course in weekly_focus[1:]:
            _apply_allocation_meta(course)
        return weekly_focus

    for course in reversed(weekly_focus[1:]):
        if course["days_to_exam"] <= 0:
            continue

        available_to_shift = round(
            max(course["hours_per_week"] - maintenance_floor, 0.0), 1
        )
        if available_to_shift <= 0:
            continue

        shifted_hours = min(available_to_shift, additional_needed)
        course["hours_per_week"] = round(course["hours_per_week"] - shifted_hours, 1)
        primary_course["hours_per_week"] = round(
            primary_course["hours_per_week"] + shifted_hours, 1
        )
        additional_needed = round(additional_needed - shifted_hours, 1)
        _apply_allocation_meta(course)
        if additional_needed <= 0:
            break

    _apply_allocation_meta(primary_course)
    return weekly_focus


@plan_bp.get("")
def get_plan():
    user, auth_error = require_authenticated_user()
    if auth_error:
        return auth_error

    return jsonify(
        {
            "message": "Use POST /api/plan/generate to generate a study-plan suggestion."
        }
    )


@plan_bp.get("/history")
def get_plan_history():
    user, auth_error = require_authenticated_user()
    if auth_error:
        return auth_error

    return jsonify({"plans": _fetch_plan_history(user["id"])})


@plan_bp.post("/generate")
def generate_plan():
    user, auth_error = require_authenticated_user()
    if auth_error:
        return auth_error

    payload = parse_json(request)

    courses = payload.get("courses")
    if not isinstance(courses, list) or not courses:
        courses = _fetch_courses(user["id"])

    hours_per_week = payload.get("hours_per_week")
    if not isinstance(hours_per_week, int) or hours_per_week < 0:
        hours_per_week = _fetch_hours_per_week(user["id"])

    if not courses:
        return jsonify(_build_empty_plan_response(hours_per_week))

    weekly_focus = _rebalance_for_imminent_exam(
        _build_weekly_focus(courses, hours_per_week)
    )
    suggestion_text = _build_rule_based_suggestion(weekly_focus, hours_per_week)
    suggestion_source = "rule_based"

    if OPENAI_PLAN_GENERATION_ENABLED and is_ai_configured():
        try:
            suggestion_text = generate_plan_suggestion(
                weekly_focus=weekly_focus,
                hours_per_week=hours_per_week,
                today_iso=date.today().isoformat(),
            )
            suggestion_source = "ai"
        except AIPlanGenerationError as exc:
            current_app.logger.warning("AI plan generation failed: %s", exc)
            suggestion_source = "rule_based_fallback"

    saved_plan = _store_plan(
        user["id"],
        {
            "generated_at": date.today().isoformat(),
            "hours_per_week": hours_per_week,
            "weekly_focus": weekly_focus,
            "suggestion_text": suggestion_text,
            "suggestion_source": suggestion_source,
        }
    )
    return jsonify(saved_plan)
