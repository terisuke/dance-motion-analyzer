"""
SQLAlchemy Base Class for all models
"""

from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

# Import all models here to ensure they are registered with SQLAlchemy
# This is important for Alembic migrations to detect all models
def import_all_models():
    """Import all models to ensure they are registered with SQLAlchemy"""
    from app.models import user, dance_session, analysis_result  # noqa: F401