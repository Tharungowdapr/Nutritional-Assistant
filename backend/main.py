"""
AaharAI NutriSync — FastAPI Application
Main entry point that wires together all modules.
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from database.loader import db
from database.models import HealthCheckResponse
from rag.llm_router import LLMRouter
from rag.service import RAGService
from agent.meal_agent import MealPlanAgent

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ── Global instances ──
_llm_router: LLMRouter = None
_rag_service: RAGService = None
_meal_agent: MealPlanAgent = None


def get_rag_service() -> RAGService:
    return _rag_service


def get_meal_agent() -> MealPlanAgent:
    return _meal_agent


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: load database, initialize LLM router and RAG service."""
    global _llm_router, _rag_service, _meal_agent

    # 1. Load all Excel sheets
    logger.info("Loading NutriSync database...")
    db.load()
    stats = db.stats()
    logger.info(f"✅ Database loaded: {stats['foods']} foods, {stats['rda_profiles']} RDA profiles")

    # 2. Initialize LLM Router (Ollama ↔ Groq)
    _llm_router = LLMRouter(
        ollama_base_url=settings.OLLAMA_BASE_URL,
        ollama_model=settings.OLLAMA_MODEL,
        groq_api_key=settings.GROQ_API_KEY,
        groq_model=settings.GROQ_MODEL,
        retry_interval=settings.LLM_FALLBACK_RETRY_SECONDS,
    )
    await _llm_router.initialize()

    # 3. Initialize RAG Service
    _rag_service = RAGService(llm_router=_llm_router)

    # 4. Initialize Meal Agent
    _meal_agent = MealPlanAgent(llm_router=_llm_router)

    logger.info("✅ AaharAI NutriSync API ready!")
    yield
    logger.info("Shutting down NutriSync...")


# ── Create FastAPI app ──
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI-powered Indian nutrition assistant with RAG, GLP-1 support, and meal planning",
    lifespan=lifespan,
)

# ── CORS ──
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routes ──
from routes.chat import router as chat_router
from routes.nutrition import router as nutrition_router
from routes.meal_plan import router as meal_plan_router

app.include_router(chat_router)
app.include_router(nutrition_router)
app.include_router(meal_plan_router)


@app.get("/api/health", response_model=HealthCheckResponse)
async def health_check():
    """Health check — reports status of all components."""
    return HealthCheckResponse(
        status="healthy",
        database_loaded=db._loaded,
        ollama_available=_llm_router._ollama_available if _llm_router else False,
        groq_available=_llm_router._groq_available if _llm_router else False,
        chroma_ready=_rag_service.is_ready if _rag_service else False,
        db_stats=db.stats() if db._loaded else {},
    )


@app.get("/")
async def root():
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "health": "/api/health",
    }
