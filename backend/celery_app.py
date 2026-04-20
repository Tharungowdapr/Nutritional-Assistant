"""
AaharAI NutriSync — Background Task Framework (Celery)
Handles long-running agentic tasks offline.
"""
from celery import Celery
from config import settings

celery_app = Celery(
    "nutrisync",
    broker=f"redis://{settings.REDIS_HOST}:{settings.REDIS_PORT}/{settings.REDIS_DB}",
    backend=f"redis://{settings.REDIS_HOST}:{settings.REDIS_PORT}/{settings.REDIS_DB}",
    include=["agent.tasks"] # We will create this next
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=3600, # 1 hour max
)

if __name__ == "__main__":
    celery_app.start()
