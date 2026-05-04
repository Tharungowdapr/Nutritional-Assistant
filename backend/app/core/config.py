"""
AaharAI NutriSync — Configuration
Loads all settings from environment variables with sensible defaults.
All values can be overridden via backend/.env or environment variables.
"""
import logging
import os
from pathlib import Path
from typing import Literal
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR.parent / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # ── Application ────────────────────────────────────────────
    APP_NAME: str = "AaharAI NutriSync"
    APP_VERSION: str = "2.0.0"
    APP_ENV: Literal["development", "staging", "production"] = "development"
    DEBUG: bool = False

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if not self.SECRET_KEY and not os.getenv("PYTEST_CURRENT_TEST"):
            raise ValueError("SECRET_KEY must be set in the environment!")

    # ── Security ───────────────────────────────────────────────
    SECRET_KEY: str = ""
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 1440

    # ── Logging ────────────────────────────────────────────────
    LOG_FORMAT: Literal["text", "json"] = "text"
    LOG_LEVEL: str = "INFO"

    # ── Data Paths ─────────────────────────────────────────────
    DATA_DIR: Path = BASE_DIR / "db" / "static"
    EXCEL_PATH: Path = DATA_DIR / "AaharAI_NutriSync_Enhanced.xlsx"
    IFCT_PDF_PATH: Path = DATA_DIR / "IFCT.pdf"
    CHROMA_DB_PATH: Path = DATA_DIR / "chroma_db"
    CHROMA_MODE: Literal["embedded", "http"] = "embedded"
    CHROMA_HOST: str = "localhost"
    CHROMA_PORT: int = 8000

    # ── Database ───────────────────────────────────────────────
    DATABASE_URL: str = ""
    SQLITE_DB_PATH: str = str(BASE_DIR.parent / "data" / "nutrisync.db")
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_USER: str = "nutrisync"
    POSTGRES_PASSWORD: str = ""
    POSTGRES_DB: str = "nutrisync"

    # ── Local AI — Ollama ──────────────────────────────────────
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "gemma3:4b"
    OLLAMA_EMBED_MODEL: str = "nomic-embed-text"

    # ── Cloud AI — Groq ────────────────────────────────────────
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.3-70b-versatile"

    LLM_FALLBACK_RETRY_SECONDS: int = 60

    # ── RAG ────────────────────────────────────────────────────
    RAG_CHUNK_SIZE: int = 512
    RAG_CHUNK_OVERLAP: int = 50
    RAG_TOP_K: int = 5
    RAG_SCORE_THRESHOLD: float = 0.3

    # ── CORS ───────────────────────────────────────────────────
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:8000",
    ]

    # ── Redis / Celery ─────────────────────────────────────────
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_PASSWORD: str = ""
    REDIS_DB: int = 0
    REDIS_CACHE_TTL: int = 300


settings = Settings()