"""
AaharAI NutriSync — Settings Routes
LLM provider config: save, test, activate, list.
API keys encrypted with Fernet before storing.
"""
import logging
from typing import Optional, List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.models.user import get_db, UserDB, LLMConfigDB
from app.core.dependencies import require_user

router = APIRouter(prefix="/api/settings", tags=["Settings"])
logger = logging.getLogger(__name__)

# ── Pydantic schemas ──────────────────────────────────────────────────────
class ProviderSaveRequest(BaseModel):
    provider: str
    api_key: str
    model: str
    base_url: Optional[str] = None

class ProviderTestRequest(BaseModel):
    provider: str
    api_key: str
    model: str
    base_url: Optional[str] = None

# ── Routes ────────────────────────────────────────────────────────────────
@router.get("/llm-providers")
async def list_providers(user: UserDB = Depends(require_user), db: Session = Depends(get_db)):
    """List configured providers for this user (keys masked)."""
    configs = db.query(LLMConfigDB).filter(LLMConfigDB.user_id == user.id).all()
    return {
        "providers": [
            {
                "provider": c.provider,
                "model": c.model,
                "is_active": c.is_active,
                "api_key_set": bool(c.api_key_encrypted),
                "base_url": c.base_url
            }
            for c in configs
        ]
    }

@router.put("/llm-providers")
async def save_provider(
    req: ProviderSaveRequest,
    user: UserDB = Depends(require_user),
    db: Session = Depends(get_db),
):
    """Save/update a provider config with encrypted API key."""
    from app.core.crypt import encrypt_api_key
    
    config = db.query(LLMConfigDB).filter(
        LLMConfigDB.user_id == user.id, 
        LLMConfigDB.provider == req.provider
    ).first()
    
    if not config:
        config = LLMConfigDB(user_id=user.id, provider=req.provider)
        db.add(config)

    config.model = req.model
    if req.api_key and req.api_key != "********":
        config.api_key_encrypted = encrypt_api_key(req.api_key)
    if req.base_url:
        config.base_url = req.base_url
        
    db.commit()
    return {"success": True, "provider": req.provider}

@router.post("/llm-providers/test")
async def test_provider(req: ProviderTestRequest, user: UserDB = Depends(require_user),
                        db: Session = Depends(get_db)):
    """Validate an API key by sending a short test prompt. Returns latency."""
    from app.services.llm.proxy import LLMProxy
    from app.core.crypt import decrypt_api_key
    import time
    
    api_key = req.api_key
    if api_key == "********":
        config = db.query(LLMConfigDB).filter(
            LLMConfigDB.user_id == user.id,
            LLMConfigDB.provider == req.provider
        ).first()
        if config and config.api_key_encrypted:
            api_key = decrypt_api_key(config.api_key_encrypted)
    
    start = time.time()
    try:
        response = await LLMProxy.complete(
            provider=req.provider,
            model=req.model,
            prompt="Say 'OK'",
            api_key=api_key,
            base_url=req.base_url
        )
        latency = round((time.time() - start) * 1000)
        return {"valid": True, "latency_ms": latency, "model": req.model, "response": response}
    except Exception as e:
        return {"valid": False, "latency_ms": None, "error": str(e)}

@router.put("/llm-providers/{provider}/activate")
async def activate_provider(
    provider: str,
    user: UserDB = Depends(require_user),
    db: Session = Depends(get_db),
):
    """Set a provider as the active default."""
    configs = db.query(LLMConfigDB).filter(LLMConfigDB.user_id == user.id).all()
    for config in configs:
        config.is_active = (config.provider == provider)
    db.commit()
    return {"success": True, "active": provider}

@router.delete("/llm-providers/{provider}")
async def delete_provider(
    provider: str,
    user: UserDB = Depends(require_user),
    db: Session = Depends(get_db),
):
    config = db.query(LLMConfigDB).filter(
        LLMConfigDB.user_id == user.id,
        LLMConfigDB.provider == provider
    ).first()
    if config:
        db.delete(config)
        db.commit()
    return {"success": True}

@router.get("/llm-providers/ollama/models")
async def list_ollama_models():
    """Probe configured Ollama URL for locally installed models."""
    import httpx
    from app.core.config import settings as cfg
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            # Inside Docker, we use host.docker.internal to reach the host's Ollama
            resp = await client.get(f"{cfg.OLLAMA_BASE_URL}/api/tags")
            data = resp.json()
            return {"models": [m["name"] for m in data.get("models", [])]}
    except Exception as e:
        return {"models": [], "error": str(e)}


def get_user_active_provider(user: UserDB, db: Session):
    """Retrieve the user's active LLM provider configuration from the database."""
    config = db.query(LLMConfigDB).filter(
        LLMConfigDB.user_id == user.id,
        LLMConfigDB.is_active == True
    ).first()
    
    if not config:
        return None
        
    from app.core.crypt import decrypt_api_key
    return {
        "provider": config.provider,
        "model": config.model,
        "api_key": decrypt_api_key(config.api_key_encrypted) if config.api_key_encrypted else None,
        "base_url": config.base_url,
    }
