import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

POSTGRES_DB = os.getenv("POSTGRES_DB")
POSTGRES_USER = os.getenv("POSTGRES_USER")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD")
POSTGRES_HOST = os.getenv("POSTGRES_HOST", "localhost")
POSTGRES_PORT = int(os.getenv("POSTGRES_PORT", "5432"))
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-5.4-mini")
OPENAI_API_URL = os.getenv("OPENAI_API_URL", "https://api.openai.com/v1/responses")
OPENAI_ORGANIZATION = os.getenv("OPENAI_ORGANIZATION")
OPENAI_PROJECT = os.getenv("OPENAI_PROJECT")
APP_SECRET_KEY = os.getenv("APP_SECRET_KEY", "smartstudy-dev-secret-change-me")
DEFAULT_HOURS_PER_WEEK = 8


def _parse_bool(value, default=False):
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


OPENAI_PLAN_GENERATION_ENABLED = _parse_bool(
    os.getenv("OPENAI_PLAN_GENERATION_ENABLED"),
    default=False,
)
FRONTEND_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "FRONTEND_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    ).split(",")
    if origin.strip()
]
SESSION_COOKIE_SECURE = _parse_bool(os.getenv("SESSION_COOKIE_SECURE"), default=False)

try:
    OPENAI_TIMEOUT_SECONDS = float(os.getenv("OPENAI_TIMEOUT_SECONDS", "30"))
except ValueError as exc:
    raise RuntimeError("OPENAI_TIMEOUT_SECONDS must be numeric.") from exc

_required_values = {
    "POSTGRES_DB": POSTGRES_DB,
    "POSTGRES_USER": POSTGRES_USER,
    "POSTGRES_PASSWORD": POSTGRES_PASSWORD,
}
_missing = [key for key, value in _required_values.items() if not value]
if _missing:
    missing_list = ", ".join(_missing)
    raise RuntimeError(
        f"Missing required database configuration: {missing_list}. "
        "Set them in backend/.env or environment variables."
    )

DATABASE_CONFIG = {
    "dbname": POSTGRES_DB,
    "user": POSTGRES_USER,
    "password": POSTGRES_PASSWORD,
    "host": POSTGRES_HOST,
    "port": POSTGRES_PORT,
}

DATE_FORMAT = "%Y-%m-%d"
ALLOWED_DIFFICULTIES = {"low", "med", "high"}
