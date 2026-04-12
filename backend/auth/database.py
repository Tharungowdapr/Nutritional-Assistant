"""
AaharAI NutriSync — SQLAlchemy Database Models & Engine
SQLite (development) or PostgreSQL (production) persistence for users, profiles, and meal plan history.
"""
import json
from datetime import datetime
from sqlalchemy import create_engine, Column, Integer, String, Float, Text, DateTime, Boolean
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from config import settings

# Determine database URL: PostgreSQL if configured, otherwise SQLite
if settings.DATABASE_URL:
    DATABASE_URL = settings.DATABASE_URL
else:
    # PostgreSQL fallback if env vars set
    if settings.POSTGRES_PASSWORD:
        DATABASE_URL = f"postgresql://{settings.POSTGRES_USER}:{settings.POSTGRES_PASSWORD}@{settings.POSTGRES_HOST}:{settings.POSTGRES_PORT}/{settings.POSTGRES_DB}"
    else:
        # SQLite for development
        DATABASE_URL = f"sqlite:///{settings.SQLITE_DB_PATH}"

# Connection kwargs
connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(DATABASE_URL, connect_args=connect_args, echo=False)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class UserDB(Base):
    """User account stored in SQLite."""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    name = Column(String(255), default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    
    # Password reset
    reset_token = Column(String(255), nullable=True, unique=True, index=True)
    reset_token_expires = Column(DateTime, nullable=True)
    
    # Profile metadata
    email_verified = Column(Boolean, default=False)
    last_login_at = Column(DateTime, nullable=True)
    avatar_url = Column(String(500), nullable=True)
    is_admin = Column(Boolean, default=False)

    # Profile data stored as JSON
    profile_json = Column(Text, default="{}")

    @property
    def profile(self) -> dict:
        try:
            return json.loads(self.profile_json) if self.profile_json else {}
        except Exception:
            return {}

    @profile.setter
    def profile(self, value: dict):
        self.profile_json = json.dumps(value)


class MealPlanDB(Base):
    """Saved meal plans."""
    __tablename__ = "meal_plans"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, nullable=True)
    plan_text = Column(Text, nullable=False)
    targets_json = Column(Text, default="{}")
    days = Column(Integer, default=7)
    budget = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class ChatHistoryDB(Base):
    """Chat message history with session support."""
    __tablename__ = "chat_history"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, nullable=True)
    session_id = Column(String(36), nullable=True, index=True)  # UUID for grouping conversations
    user_message = Column(Text, nullable=True)
    assistant_message = Column(Text, nullable=True)
    sources_json = Column(Text, default="[]")
    llm_provider = Column(String(50), default="")
    timestamp = Column(DateTime, default=datetime.utcnow)


class DailyLogDB(Base):
    """Daily food intake log with macro tracking."""
    __tablename__ = "daily_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, nullable=True, index=True)
    log_date = Column(String(10), nullable=False)  # YYYY-MM-DD format
    meal_slot = Column(String(20), nullable=False)  # "Breakfast", "Lunch", "Dinner", "Snack"
    food_name = Column(String(255), nullable=False)
    quantity_g = Column(Float, default=100.0)
    
    # Macros (per serving/quantity)
    calories = Column(Float, nullable=True)
    protein_g = Column(Float, nullable=True)
    fat_g = Column(Float, nullable=True)
    carbs_g = Column(Float, nullable=True)
    fibre_g = Column(Float, nullable=True)
    iron_mg = Column(Float, nullable=True)
    calcium_mg = Column(Float, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


def init_db():
    """Create all tables."""
    Base.metadata.create_all(bind=engine)


def get_db() -> Session:
    """FastAPI dependency for DB session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
