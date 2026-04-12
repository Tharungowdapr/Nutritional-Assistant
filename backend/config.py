"""
AaharAI NutriSync — Configuration
Loads all settings from environment variables with sensible defaults.
"""
import os
from pathlib import Path
from pydantic_settings import BaseSettings

BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    # ── App ──
    APP_NAME: str = "AaharAI NutriSync"
    APP_VERSION: str = "2.0.0"
    DEBUG: bool = True

    # ── Auth / Security ──
    SECRET_KEY: str = ""  # MUST be set in .env - generate with: python -c "import secrets; print(secrets.token_hex(32))"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 1440  # 24 hours

    # ── Data paths ──
    DATA_DIR: Path = BASE_DIR / "data"
    EXCEL_PATH: Path = BASE_DIR / "data" / "AaharAI_NutriSync_Enhanced.xlsx"
    IFCT_PDF_PATH: Path = BASE_DIR / "data" / "IFCT.pdf"
    CHROMA_DB_PATH: Path = BASE_DIR / "data" / "chroma_db"

    # ── Database Configuration ──
    # Use DATABASE_URL for PostgreSQL: postgresql://user:password@localhost:5432/nutrisync
    # Or leave empty to use SQLite
    DATABASE_URL: str = ""
    SQLITE_DB_PATH: str = str(BASE_DIR / "backend" / "nutrisync.db")
    
    # PostgreSQL defaults (used if DATABASE_URL not set)
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_USER: str = "nutrisync"
    POSTGRES_PASSWORD: str = ""
    POSTGRES_DB: str = "nutrisync"

    # ── Ollama (primary LLM) ──
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "gemma3:4b"
    OLLAMA_EMBED_MODEL: str = "nomic-embed-text"

    # ── Groq (fallback LLM) ──
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama3-70b-8192"

    # ── LLM Router ──
    LLM_FALLBACK_RETRY_SECONDS: int = 60

    # ── RAG ──
    RAG_CHUNK_SIZE: int = 512
    RAG_CHUNK_OVERLAP: int = 50
    RAG_TOP_K: int = 5
    RAG_SCORE_THRESHOLD: float = 0.3

    CORS_ORIGINS: list[str] = ["http://localhost:3001", "http://localhost:8000", "http://localhost:3000", "http://127.0.0.1:3001"]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


settings = Settings()
