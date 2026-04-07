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
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    # ── Data paths ──
    DATA_DIR: Path = BASE_DIR / "data"
    EXCEL_PATH: Path = BASE_DIR / "data" / "AaharAI_NutriSync_Enhanced.xlsx"
    IFCT_PDF_PATH: Path = BASE_DIR / "data" / "IFCT.pdf"
    CHROMA_DB_PATH: Path = BASE_DIR / "data" / "chroma_db"

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

    # ── Databases ──
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""
    MONGODB_URI: str = "mongodb://localhost:27017"
    MONGODB_DB_NAME: str = "nutrisync"
    REDIS_URL: str = "redis://localhost:6379/0"

    # ── Notifications ──
    RESEND_API_KEY: str = ""
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_PHONE_NUMBER: str = ""
    FCM_CREDENTIALS_PATH: str = ""

    # ── CORS ──
    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:8000"]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
