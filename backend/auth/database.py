"""
AaharAI NutriSync — SQLAlchemy Database Models & Engine
SQLite-based persistence for users, profiles, and meal plan history.
"""
import json
from datetime import datetime
from sqlalchemy import create_engine, Column, Integer, String, Float, Text, DateTime, Boolean
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from config import settings

DATABASE_URL = f"sqlite:///{settings.SQLITE_DB_PATH}"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False}, echo=False)
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
    """Chat message history."""
    __tablename__ = "chat_history"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, nullable=True)
    role = Column(String(20), nullable=False)  # "user" or "assistant"
    content = Column(Text, nullable=False)
    sources_json = Column(Text, default="[]")
    llm_provider = Column(String(50), default="")
    created_at = Column(DateTime, default=datetime.utcnow)


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
