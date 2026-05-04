"""
AaharAI NutriSync — Production Entrance
Entry point for the FastAPI application.
"""
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.logging import setup_logging
from app.db.loader import db
from app.models.user import init_db
from app.services.rag.llm_router import LLMRouter
from app.api.v1.router import api_router

# Initialize Logging
setup_logging()
logger = logging.getLogger("nutrisync")

# Global instances for DI
_llm_router: LLMRouter = None
_rag_service = None
_meal_agent = None

def get_rag_service(): return _rag_service
def get_meal_agent(): return _meal_agent
def get_llm_router() -> LLMRouter: return _llm_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: load database, initialize services."""
    global _llm_router, _rag_service, _meal_agent

    logger.info("Starting AaharAI NutriSync...")
    init_db()

    # Load Knowledge Base
    try:
        db.load()
        logger.info("✅ Database loaded")
    except Exception as e:
        logger.warning(f"Database load failed: {e}. Degraded mode active.")

    # Initialize LLM Router
    _llm_router = LLMRouter(
        ollama_base_url=settings.OLLAMA_BASE_URL,
        ollama_model=settings.OLLAMA_MODEL,
        groq_api_key=settings.GROQ_API_KEY,
        groq_model=settings.GROQ_MODEL,
        retry_interval=settings.LLM_FALLBACK_RETRY_SECONDS,
    )
    await _llm_router.initialize()

    # Initialize Services
    try:
        from app.services.rag.service import RAGService
        _rag_service = RAGService(llm_router=_llm_router)
        from app.services.agents.orchestrator import OrchestratorAgent
        _meal_agent = OrchestratorAgent(llm_router=_llm_router)
    except Exception as e:
        logger.warning(f"Service initialization failed: {e}")

    logger.info("🚀 API ready!")
    yield
    logger.info("Shutting down...")

# Rate Limiter
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI-powered Indian nutrition assistant",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Global Error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"success": False, "error": str(exc) if settings.DEBUG else "Internal server error"}
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include All Optimized Routes
app.include_router(api_router)

@app.get("/api/health")
async def health_check():
    router_status = _llm_router.status if _llm_router else {}
    return {
        "status": "healthy",
        "database_loaded": db._loaded,
        "ollama_available": router_status.get("ollama_available", False),
        "groq_available": router_status.get("groq_available", False)
    }

@app.get("/")
async def root():
    return {"name": settings.APP_NAME, "version": settings.APP_VERSION, "docs": "/docs"}
