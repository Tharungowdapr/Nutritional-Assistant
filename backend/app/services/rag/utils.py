import httpx
import logging
import time
from app.core.config import settings

logger = logging.getLogger(__name__)

# Cache status (300s for offline to avoid repeated timeouts)
_ollama_status_cache = {"online": None, "timestamp": 0}
_embedding_function_cache = None


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
    """Retrieve embedding function (singleton) with Ollama -> SentenceTransformer fallback."""
    global _embedding_function_cache
    if _embedding_function_cache is not None:
        return _embedding_function_cache

    import chromadb.utils.embedding_functions as ef

    if is_ollama_online():
        try:
            _embedding_function_cache = ef.OllamaEmbeddingFunction(
                url=settings.OLLAMA_BASE_URL + "/api/embeddings",
                model_name=settings.OLLAMA_EMBED_MODEL,
            )
            return _embedding_function_cache
        except Exception as e:
            logger.warning(f"Ollama embedding model '{settings.OLLAMA_EMBED_MODEL}' failed: {e}")

    logger.info("Using local SentenceTransformer embeddings (all-MiniLM-L6-v2)")
    _embedding_function_cache = ef.SentenceTransformerEmbeddingFunction(model_name="all-MiniLM-L6-v2")
    return _embedding_function_cache
