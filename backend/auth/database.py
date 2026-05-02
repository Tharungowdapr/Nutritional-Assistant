"""
AaharAI NutriSync — SQLAlchemy Database Models & Engine
SQLite (development) or PostgreSQL (production) persistence for users, profiles, and meal plan history.
"""
import json
import logging
from datetime import datetime, timezone
from sqlalchemy import create_engine, Column, Integer, String, Float, Text, DateTime, Boolean
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from config import settings

logger = logging.getLogger(__name__)


def utc_now() -> datetime:
    """Return current UTC time (timezone-aware). Replaces deprecated datetime.utcnow()."""
    return datetime.now(timezone.utc)


def utc_now_default():
    """Callable for SQLAlchemy default - returns current UTC time."""
    return datetime.now(timezone.utc)

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
    created_at = Column(DateTime, default=utc_now_default)
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
    created_at = Column(DateTime, default=utc_now_default)


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
    created_at = Column(DateTime, default=utc_now_default)


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
    
    created_at = Column(DateTime, default=utc_now_default)
    updated_at = Column(DateTime, default=utc_now_default, onupdate=utc_now_default)


class RecipeDB(Base):
    """Saved user recipes."""
    __tablename__ = "recipes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, nullable=True, index=True)
    title = Column(String(255), nullable=False)
    ingredients = Column(Text, nullable=False)  # JSON array of {"name": "...", "quantity": "...", "unit": "..."}
    instructions = Column(Text, nullable=False)  # JSON array of step strings
    cook_time_minutes = Column(Integer, nullable=True)
    difficulty = Column(String(20), default="Medium")  # "Easy", "Medium", "Hard"
    servings = Column(Integer, default=1)
    
    # Nutrition facts per serving
    calories = Column(Float, nullable=True)
    protein_g = Column(Float, nullable=True)
    fat_g = Column(Float, nullable=True)
    carbs_g = Column(Float, nullable=True)
    fibre_g = Column(Float, nullable=True)
    iron_mg = Column(Float, nullable=True)
    calcium_mg = Column(Float, nullable=True)
    
    created_at = Column(DateTime, default=utc_now_default)
    updated_at = Column(DateTime, default=utc_now_default, onupdate=utc_now_default)


class RecipeHistoryDB(Base):
    """Track recipe usage/history."""
    __tablename__ = "recipe_history"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, nullable=True, index=True)
    recipe_id = Column(Integer, nullable=True, index=True)
    recipe_title = Column(String(255), nullable=False)
    viewed_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class ChatSessionDB(Base):
    """Chat sessions for multi-chat support in RAG."""
    __tablename__ = "chat_sessions"

    id = Column(String(36), primary_key=True)  # UUID
    user_id = Column(Integer, nullable=True, index=True)
    title = Column(String(255), default="New Chat")
    created_at = Column(DateTime, default=utc_now_default)
    updated_at = Column(DateTime, default=utc_now_default, onupdate=utc_now_default)


class MealPlanHistoryDB(Base):
    """Track meal plan generation history."""
    __tablename__ = "meal_plan_history"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, nullable=True, index=True)
    num_people = Column(Integer, default=1)
    duration_days = Column(Integer, default=7)
    cost_estimate = Column(Float, nullable=True)
    plan_json = Column(Text, nullable=False)  # Full plan data
    created_at = Column(DateTime, default=utc_now_default)


def init_db():
    """Create all tables."""
    Base.metadata.create_all(bind=engine)


def get_db() -> Session:
    """FastAPI dependency for DB session."""
    db = SessionLocal()
    try:
        yield db
    except Exception as e:
        logger.error(f"Database error: {e}")
        db.rollback()
        raise
    finally:
        db.close()
