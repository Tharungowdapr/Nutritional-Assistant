import httpx
import logging
import time
from app.core.config import settings

logger = logging.getLogger(__name__)

# Cache status for 60 seconds to prevent repeated timeouts
_ollama_status_cache = {"online": None, "timestamp": 0}

def is_ollama_online() -> bool:
    """Fast check if Ollama is responsive with a 1s timeout and 60s cache."""
    now = time.time()
    
    # Return cached status if recent (within 60s)
    if _ollama_status_cache["online"] is not None and (now - _ollama_status_cache["timestamp"] < 60):
        return _ollama_status_cache["online"]

    try:
        # Use a short timeout to prevent blocking during RAG operations
        with httpx.Client(timeout=1.0) as client:
            resp = client.get(f"{settings.OLLAMA_BASE_URL}/api/tags")
            is_online = resp.status_code == 200
            
            # Update cache
            _ollama_status_cache["online"] = is_online
            _ollama_status_cache["timestamp"] = now
            return is_online
    except Exception:
        _ollama_status_cache["online"] = False
        _ollama_status_cache["timestamp"] = now
        return False
