from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DATABASE_PATH = BASE_DIR / "db.sqlite3"

DATE_FORMAT = "%Y-%m-%d"
ALLOWED_DIFFICULTIES = {"low", "med", "high"}
