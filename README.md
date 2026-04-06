# SmartStudy

Project scaffold with:
- `backend/` using Python Flask + PostgreSQL
- `frontend/` using React + Vite

## Backend (Flask + PostgreSQL)

SmartStudy backend expects PostgreSQL settings from environment variables or from
`backend/.env`.

Required variables:

- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_HOST`
- `POSTGRES_PORT`

Optional AI variables for plan text generation:

- `OPENAI_API_KEY`
- `OPENAI_MODEL` (defaults to `gpt-5.4-mini`)
- `OPENAI_ORGANIZATION`
- `OPENAI_PROJECT`
- `OPENAI_TIMEOUT_SECONDS`

Create a local `backend/.env` file from `backend/.env.example` and fill in your own
values before starting the backend.

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

Runs on `http://127.0.0.1:5001`.

## Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev
```

Runs on `http://127.0.0.1:5173`.
