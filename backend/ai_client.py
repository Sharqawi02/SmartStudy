import json
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from config import (
    OPENAI_API_KEY,
    OPENAI_API_URL,
    OPENAI_MODEL,
    OPENAI_ORGANIZATION,
    OPENAI_PROJECT,
    OPENAI_TIMEOUT_SECONDS,
)


class AIPlanGenerationError(RuntimeError):
    pass


def is_ai_configured():
    return bool(OPENAI_API_KEY)


def _build_headers():
    headers = {
        "Authorization": f"Bearer {OPENAI_API_KEY}",
        "Content-Type": "application/json",
    }
    if OPENAI_ORGANIZATION:
        headers["OpenAI-Organization"] = OPENAI_ORGANIZATION
    if OPENAI_PROJECT:
        headers["OpenAI-Project"] = OPENAI_PROJECT
    return headers


def _build_plan_prompt(weekly_focus, hours_per_week, today_iso):
    course_lines = []
    for item in weekly_focus:
        course_lines.append(
            (
                f"- {item['course_name']}: {item['hours_per_week']} h/week, "
                f"difficulty={item['difficulty']}, exam={item['exam_date']}, "
                f"weeks_to_exam={item['weeks_to_exam']}"
            )
        )

    return (
        f"Today's date: {today_iso}\n"
        f"Available study time per week: {hours_per_week} hours\n"
        "Weekly focus allocation:\n"
        f"{chr(10).join(course_lines)}\n\n"
        "Write a concise Swedish study plan summary for the student."
    )


def _extract_output_text(payload):
    output_text = payload.get("output_text")
    if isinstance(output_text, str) and output_text.strip():
        return output_text.strip()

    segments = []
    for item in payload.get("output", []):
        if item.get("type") != "message":
            continue
        for content in item.get("content", []):
            if content.get("type") != "output_text":
                continue
            text = content.get("text")
            if isinstance(text, str) and text.strip():
                segments.append(text.strip())

    return "\n".join(segments).strip()


def generate_plan_suggestion(weekly_focus, hours_per_week, today_iso):
    if not is_ai_configured():
        raise AIPlanGenerationError("OPENAI_API_KEY is not configured.")

    payload = {
        "model": OPENAI_MODEL,
        "instructions": (
            "You write short, practical Swedish study-plan summaries for students. "
            "Mention the most urgent courses by name, suggest a realistic weekly cadence, "
            "and explain how to shift into revision near each exam. "
            "Keep the answer under 120 words. No headings. No markdown bullets."
        ),
        "input": _build_plan_prompt(weekly_focus, hours_per_week, today_iso),
        "max_output_tokens": 220,
    }

    request = Request(
        OPENAI_API_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers=_build_headers(),
        method="POST",
    )

    try:
        with urlopen(request, timeout=OPENAI_TIMEOUT_SECONDS) as response:
            response_payload = json.load(response)
    except HTTPError as exc:
        error_body = exc.read().decode("utf-8", errors="ignore")
        raise AIPlanGenerationError(
            f"OpenAI request failed with status {exc.code}: {error_body}"
        ) from exc
    except URLError as exc:
        raise AIPlanGenerationError(f"Could not reach OpenAI API: {exc.reason}") from exc

    text = _extract_output_text(response_payload)
    if not text:
        raise AIPlanGenerationError("OpenAI response did not contain usable text output.")

    return text
