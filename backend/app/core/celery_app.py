"""
AaharAI NutriSync — Background Task Framework (Celery)
Optional: gracefully degrades if celery/redis are not installed.
"""

try:
    from celery import Celery
    from app.core.config import settings

    celery_app = Celery(
        "nutrisync",
        broker=f"redis://{settings.REDIS_HOST}:{settings.REDIS_PORT}/{settings.REDIS_DB}",
        backend=f"redis://{settings.REDIS_HOST}:{settings.REDIS_PORT}/{settings.REDIS_DB}",
        include=["app.tasks"],
    )

    celery_app.conf.update(
        task_serializer="json",
        accept_content=["json"],
        result_serializer="json",
        timezone="UTC",
        enable_utc=True,
        task_track_started=True,
        task_time_limit=3600,
    )
except ImportError:
    celery_app = None
except Exception:
    celery_app = None

if __name__ == "__main__":
    if celery_app:
        celery_app.start()
