from flask import Flask, jsonify
from flask_cors import CORS
import os

from db import init_db
from routes import register_routes


app = Flask(__name__)
CORS(app)
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
