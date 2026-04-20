"""
AaharAI NutriSync — FastAPI Application
Main entry point that wires together all modules.
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from config import settings
from database.loader import db
from database.models import HealthCheckResponse
from auth.database import init_db
from rag.llm_router import LLMRouter

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ── Rate Limiter ──
limiter = Limiter(key_func=get_remote_address)

# ── Global instances ──
_llm_router: LLMRouter = None
_rag_service = None
_meal_agent = None


def get_rag_service():
    return _rag_service


def get_meal_agent():
    return _meal_agent


def get_llm_router() -> LLMRouter:
    return _llm_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: load database, initialize LLM router and RAG service."""
    global _llm_router, _rag_service, _meal_agent

    # 0. Initialize SQLite database
    logger.info("Initializing SQLite database...")
    init_db()
    logger.info("✅ SQLite database ready")

    # 1. Load all Excel sheets
    logger.info("Loading NutriSync database...")
    try:
        db.load()
        if db._loaded:
            stats = db.stats()
            logger.info(f"✅ Database loaded: {stats['foods']} foods, {stats['rda_profiles']} RDA profiles")
        else:
            logger.info("No NutriSync Excel/DB loaded — continuing in degraded mode.")
    except Exception as e:
        logger.warning(f"Failed to load NutriSync database: {e}. Continuing without knowledge base.")

    # 2. Initialize LLM Router (Ollama ↔ Groq)
    _llm_router = LLMRouter(
        ollama_base_url=settings.OLLAMA_BASE_URL,
        ollama_model=settings.OLLAMA_MODEL,
        groq_api_key=settings.GROQ_API_KEY,
        groq_model=settings.GROQ_MODEL,
        retry_interval=settings.LLM_FALLBACK_RETRY_SECONDS,
    )
    await _llm_router.initialize()

    # 3. Initialize RAG Service (lazy import so missing optional deps don't break startup)
    try:
        from rag.service import RAGService

        _rag_service = RAGService(llm_router=_llm_router)
    except Exception as e:
        logger.warning(f"Could not initialize RAGService: {e}")
        _rag_service = None

    # 4. Initialize Meal Agent (LangGraph orchestrated)
    try:
        from agent.langgraph_meal_agent import LangGraphMealAgent

        _meal_agent = LangGraphMealAgent(llm_router=_llm_router)
    except Exception as e:
        logger.warning(f"Could not initialize LangGraphMealAgent: {e}")
        _meal_agent = None

    logger.info("✅ AaharAI NutriSync API ready!")
    yield
    # BUG-029: Cleanup logic for resource management
    logger.info("Shutting down NutriSync...")
    try:
        if _llm_router:
            if hasattr(_llm_router, 'close'):
                await _llm_router.close()
            _llm_router = None
        if _rag_service:
            if hasattr(_rag_service, 'close'):
                await _rag_service.close()
            _rag_service = None
        if _meal_agent:
            if hasattr(_meal_agent, 'close'):
                await _meal_agent.close()
            _meal_agent = None
        logger.info("✅ Resources cleaned up")
    except Exception as e:
        logger.error(f"Cleanup failed: {e}")


# ── Create FastAPI app ──
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI-powered Indian nutrition assistant with RAG, GLP-1 support, and meal planning",
    lifespan=lifespan,
)

# ── Rate Limiting Setup ──
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── Global Exception Handler ──
from fastapi.responses import JSONResponse

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Global exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": str(exc) if settings.DEBUG else "Internal server error",
            "data": None
        }
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
from routes.auth import router as auth_router
from routes.chat import router as chat_router
from routes.nutrition import router as nutrition_router
from routes.meal_plan import router as meal_plan_router
from routes.admin import router as admin_router
from routes.tracker import router as tracker_router
from routes.analysis import router as analysis_router
from routes.recipes import router as recipes_router
from routes.chat_sessions import router as chat_sessions_router

app.include_router(auth_router)
app.include_router(chat_router)
app.include_router(nutrition_router)
app.include_router(meal_plan_router)
app.include_router(admin_router)
app.include_router(tracker_router)
app.include_router(analysis_router)
app.include_router(recipes_router)
app.include_router(chat_sessions_router)


@app.get("/api/health", response_model=HealthCheckResponse)
async def health_check():
    """Health check — reports status of all components."""
    router_status = _llm_router.status if _llm_router else {}
    return HealthCheckResponse(
        status="healthy",
        database_loaded=db._loaded,
        ollama_available=router_status.get("ollama_available", False),
        groq_available=router_status.get("groq_available", False),
        chroma_ready=bool(_rag_service.is_ready) if _rag_service else False,
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
