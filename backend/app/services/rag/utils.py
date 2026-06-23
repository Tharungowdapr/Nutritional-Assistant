import httpx
import logging
import time
from app.core.config import settings

logger = logging.getLogger(__name__)

# Cache status (300s for offline to avoid repeated timeouts)
_ollama_status_cache = {"online": None, "timestamp": 0}


def is_ollama_online() -> bool:
    """Fast check if Ollama is responsive with a 1s timeout and 300s cache."""
    now = time.time()

    if _ollama_status_cache["online"] is not None and (now - _ollama_status_cache["timestamp"] < 300):
        return _ollama_status_cache["online"]

    try:
        with httpx.Client(timeout=1.0) as client:
            resp = client.get(f"{settings.OLLAMA_BASE_URL}/api/tags")
            is_online = resp.status_code == 200
            _ollama_status_cache["online"] = is_online
            _ollama_status_cache["timestamp"] = now
            return is_online
    except Exception:
        _ollama_status_cache["online"] = False
        _ollama_status_cache["timestamp"] = now
        return False


def get_embedding_function():
    """
    Get embedding function — no global cache.
    Returns None to let ChromaDB use its built-in default (all-MiniLM-L6-v2) which is lazy-loaded.
    Only uses Ollama if explicitly available.
    """
    import chromadb.utils.embedding_functions as ef

    if is_ollama_online():
        try:
            return ef.OllamaEmbeddingFunction(
                url=settings.OLLAMA_BASE_URL + "/api/embeddings",
                model_name=settings.OLLAMA_EMBED_MODEL,
            )
        except Exception as e:
            logger.warning(f"Ollama embedding model '{settings.OLLAMA_EMBED_MODEL}' failed: {e}")

    # Return None → ChromaDB uses its built-in default (all-MiniLM-L6-v2) which is lazy-loaded on first query
    logger.info("Using ChromaDB default embedding (lazy-loaded on first query)")
    return None
