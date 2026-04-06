from flask import Flask, jsonify
from flask_cors import CORS
import os

from config import APP_SECRET_KEY, FRONTEND_ORIGINS, SESSION_COOKIE_SECURE
from db import init_db
from routes import register_routes


app = Flask(__name__)
app.config.update(
    SECRET_KEY=APP_SECRET_KEY,
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
    SESSION_COOKIE_SECURE=SESSION_COOKIE_SECURE,
)
CORS(app, supports_credentials=True, origins=FRONTEND_ORIGINS)
init_db()
register_routes(app)


@app.get('/api/health')
def health_check():
    return jsonify({
        'status': 'ok',
        'message': 'Flask backend is running'
    })


if __name__ == '__main__':
    port = int(os.getenv('PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=True)
