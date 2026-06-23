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

# Initialize Logging
setup_logging()
logger = logging.getLogger("nutrisync")

# Global instances for DI
_llm_router = None
_rag_service = None
_meal_agent = None
_startup_done = False


def get_rag_service():
    return _rag_service


def get_meal_agent():
    return _meal_agent


def get_llm_router():
    return _llm_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: load database, initialize services in background."""
    global _startup_done

    logger.info("Starting AaharAI NutriSync...")

    # Import routing after logging is set up
    from app.api.v1.router import api_router

    app.include_router(api_router)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Fast init: DB schema only (no data loading, no remote checks)
    init_db()

    # Deferred background initialization (app starts serving immediately)
    import asyncio

    asyncio.create_task(_init_background())

    logger.info("API ready! (services initializing in background)")
    _startup_done = True
    yield
    logger.info("Shutting down...")


async def _init_background():
    """Initialize data loading, LLM router, and RAG services in background."""
    global _llm_router, _rag_service, _meal_agent

    # Load Knowledge Base (Excel parsing is I/O heavy)
    try:
        db.load()
        logger.info("Database loaded")
    except Exception as e:
        logger.warning(f"Database load failed: {e}. Degraded mode active.")

    # Initialize LLM Router (makes remote HTTP calls)
    try:
        from app.services.rag.llm_router import LLMRouter

        _llm_router = LLMRouter(
            ollama_base_url=settings.OLLAMA_BASE_URL,
            ollama_model=settings.OLLAMA_MODEL,
            groq_api_key=settings.GROQ_API_KEY,
            groq_model=settings.GROQ_MODEL,
            retry_interval=settings.LLM_FALLBACK_RETRY_SECONDS,
        )
        await _llm_router.initialize()
        logger.info(f"LLM Router ready — provider: {_llm_router.active_provider}")
    except Exception as e:
        logger.warning(f"LLM router init deferred: {e}")

    # Initialize RAG Services (imports chromadb — heavy)
    try:
        from app.services.rag.service import RAGService

        _rag_service = RAGService(llm_router=_llm_router)
        from app.services.agents.orchestrator import OrchestratorAgent

        _meal_agent = OrchestratorAgent(llm_router=_llm_router)
        logger.info("RAG services ready")
    except Exception as e:
        logger.warning(f"RAG service init deferred: {e}")


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
        status_code=500, content={"success": False, "error": str(exc) if settings.DEBUG else "Internal server error"}
    )


@app.get("/api/health")
async def health_check():
    router_status = _llm_router.status if _llm_router else {}
    return {
        "status": "healthy",
        "database_loaded": db._loaded,
        "startup_complete": _startup_done,
        "services_ready": _rag_service is not None,
        "llm_provider": router_status.get("active_provider", "pending"),
        "ollama_available": router_status.get("ollama_available", False),
        "groq_available": router_status.get("groq_available", False),
    }


@app.get("/")
async def root():
    return {"name": settings.APP_NAME, "version": settings.APP_VERSION, "docs": "/docs"}
