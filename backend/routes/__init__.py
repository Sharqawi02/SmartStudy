from .auth import auth_bp
from .courses import courses_bp
from .settings import settings_bp
from .plan import plan_bp


def register_routes(app):
    app.register_blueprint(auth_bp)
    app.register_blueprint(courses_bp)
    app.register_blueprint(settings_bp)
    app.register_blueprint(plan_bp)
