"""
AaharAI NutriSync — Production Entrance
Entry point for the FastAPI application.
"""

import logging
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse, Response
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.api.v1.router import api_router
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


def _log_mem(stage: str):
    """Log RSS memory usage."""
    try:
        import resource

        rss_kb = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
        logger.info(f"MEM [{stage}]: {rss_kb // 1024} MB")
    except Exception:
        pass


def get_rag_service():
    return ensure_rag()


def get_meal_agent():
    return _meal_agent


def get_llm_router():
    return _llm_router


def ensure_rag():
    """Lazy-init RAG on first use to avoid ChromaDB OOM at startup."""
    global _rag_service, _meal_agent
    if _rag_service is not None:
        return _rag_service
    try:
        from app.services.rag.service import RAGService

        _rag_service = RAGService(llm_router=_llm_router)
        from app.services.agents.orchestrator import OrchestratorAgent

        _meal_agent = OrchestratorAgent(llm_router=_llm_router)
        _log_mem("RAG ready")
        logger.info("RAG services ready")
    except Exception as e:
        logger.warning(f"RAG service init deferred: {e}")
    return _rag_service


async def _init_background():
    """Initialize data loading and LLM router in background. RAG is lazy."""
    global _llm_router

    _log_mem("before_db_load")

    # Load Knowledge Base (Excel parsing is I/O heavy)
    try:
        db.load()
        logger.info("Database loaded")
    except Exception as e:
        logger.warning(f"Database load failed: {e}. Degraded mode active.")

    _log_mem("after_db_load")

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
        _log_mem("after_llm_router")
        logger.info(f"LLM Router ready — provider: {_llm_router.active_provider}")
    except Exception as e:
        logger.warning(f"LLM router init deferred: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: app serves immediately, heavy init runs in background."""
    global _startup_done

    logger.info("Starting AaharAI NutriSync...")

    # Fast init: DB schema only (no data loading, no remote checks)
    init_db()

    # Deferred background initialization (app starts serving immediately)
    import asyncio

    asyncio.create_task(_init_background())

    logger.info("API ready! (services initializing in background)")
    _startup_done = True
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

# Add middleware at app creation (before lifespan runs)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)

# Security: TrustedHostMiddleware for host header validation
if not settings.DEBUG:
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=settings.ALLOWED_HOSTS if hasattr(settings, "ALLOWED_HOSTS") else ["*"],
    )

# Security headers middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    # Prevent clickjacking
    response.headers["X-Frame-Options"] = "DENY"
    # Prevent MIME type sniffing
    response.headers["X-Content-Type-Options"] = "nosniff"
    # XSS protection (legacy but still useful)
    response.headers["X-XSS-Protection"] = "1; mode=block"
    # Referrer policy
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    # CSP for additional protection
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
        "style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data: https:; "
        "font-src 'self' data:; "
        "connect-src 'self' https://api.groq.com https://*.groq.com; "
        "frame-ancestors 'none'; "
        "base-uri 'self'; "
        "form-action 'self'"
    )
    # HSTS (only in production with HTTPS)
    if not settings.DEBUG and request.url.scheme == "https":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    # Permissions policy
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    return response

app.include_router(api_router)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Global Error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"success": False, "error": str(exc) if settings.DEBUG else "Internal server error"},
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
