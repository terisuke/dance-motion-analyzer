"""
Celery configuration for asynchronous task processing
"""

from celery import Celery
from app.core.config import settings

# Create Celery instance
celery_app = Celery(
    "dance_motion_analyzer",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["app.tasks"]
)

# Configure Celery
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Tokyo",
    enable_utc=True,
    result_expires=3600,
    task_track_started=True,
    task_time_limit=30 * 60,  # 30 minutes
    task_soft_time_limit=25 * 60,  # 25 minutes
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=1000,
)

# Optional: Configure task routing
celery_app.conf.task_routes = {
    "app.tasks.analysis.*": {"queue": "analysis"},
    "app.tasks.email.*": {"queue": "email"},
}