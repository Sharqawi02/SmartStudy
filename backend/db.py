import sqlite3
from contextlib import contextmanager

from config import DATABASE_PATH


@contextmanager
def get_connection():
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db():
    with get_connection() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS courses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                difficulty TEXT NOT NULL CHECK (difficulty IN ('low', 'med', 'high')),
                exam_date TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS study_settings (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                hours_per_week INTEGER NOT NULL CHECK (hours_per_week >= 0),
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            """
        )

        conn.execute(
            """
            INSERT INTO study_settings (id, hours_per_week, created_at, updated_at)
            VALUES (1, 8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ON CONFLICT(id) DO NOTHING
            """
        )
