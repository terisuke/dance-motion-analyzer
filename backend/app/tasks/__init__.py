"""
Celery tasks for asynchronous processing
"""

from app.tasks.analysis import analyze_dance_async
from app.tasks.email import send_welcome_email

__all__ = ["analyze_dance_async", "send_welcome_email"]