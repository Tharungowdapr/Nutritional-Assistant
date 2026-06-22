from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.models.user import get_db, LLMConfigDB, UserDB
from app.core.dependencies import get_current_user, require_user
from app.core.crypt import decrypt_api_key
from app.services.llm.proxy import LLMProxy
from app.core.security import decode_access_token
from pydantic import BaseModel
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/llm", tags=["LLM Proxy"])


async def _optional_user(request: Request, db: Session = Depends(get_db)) -> Optional[UserDB]:
    """Like get_current_user but never raises 401 — returns None on invalid/missing token."""
    auth = request.headers.get("authorization", "")
    if not auth.startswith("Bearer "):
        return None
    token = auth[7:]
    payload = decode_access_token(token)
    if payload is None:
        return None
    user_id = payload.get("sub")
    if user_id is None:
        return None
    try:
        return db.query(UserDB).filter(UserDB.id == int(user_id)).first()
    except Exception:
        return None

class LLMSettingsUpdate(BaseModel):
    provider: str
    model: Optional[str] = None
    apiKey: Optional[str] = None
    baseUrl: Optional[str] = None
    isActive: bool = True

class ChatRequest(BaseModel):
    message: str
    systemPrompt: Optional[str] = "You are a helpful nutrition assistant."
    provider: Optional[str] = None
    model: Optional[str] = None
    apiKey: Optional[str] = None

@router.post("/chat")
async def chat_proxy(
    data: ChatRequest,
    user: Optional[UserDB] = Depends(_optional_user),
    db: Session = Depends(get_db),
):
    """Proxy LLM requests.
    Uses the API key from the frontend request directly (pass-through).
    Falls back to DB-saved config (authenticated users) or server env defaults.
    """
    provider = data.provider
    model = data.model
    api_key = data.apiKey
    base_url = None

    # 1. Pass-through API key from frontend (highest priority)
    if api_key:
        pass  # use directly

    # 2. Fall back to DB-saved config for authenticated users
    elif user and provider:
        config = db.query(LLMConfigDB).filter(
            LLMConfigDB.user_id == user.id,
            LLMConfigDB.provider == provider,
            LLMConfigDB.is_active == True
        ).first()
        if config:
            if not model: model = config.model
            api_key = decrypt_api_key(config.api_key_encrypted)
            base_url = config.base_url

    # 3. Fallback to env-configured defaults
    if not api_key:
        from app.core.config import settings
        if provider == "groq":
            api_key = settings.GROQ_API_KEY
        elif provider == "ollama":
            base_url = settings.OLLAMA_BASE_URL

    # 4. LLMRouter fallback for ollama/unset
    if not api_key and provider in ("ollama", None, ""):
        try:
            from main import get_llm_router
            llm = get_llm_router()
            if llm and llm.active_provider and llm.active_provider != "none":
                response_text, used_provider = await llm.generate(
                    prompt=data.message,
                    system=data.systemPrompt or "You are a helpful nutrition assistant.",
                    temperature=0.7,
                )
                return {"answer": response_text, "provider": used_provider}
        except Exception as fallback_err:
            logger.warning(f"LLMRouter fallback failed: {fallback_err}")

    if not provider:
        raise HTTPException(status_code=400, detail="Provider is required")

    try:
        response = await LLMProxy.complete(
            provider=provider,
            model=model or "",
            prompt=data.message,
            system_prompt=data.systemPrompt or "",
            api_key=api_key,
            base_url=base_url
        )
        return {"answer": response, "provider": provider}
    except Exception as e:
        logger.error(f"Proxy Chat Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/test")
async def test_connection(
    data: LLMSettingsUpdate,
    user: UserDB = Depends(require_user),
    db: Session = Depends(get_db)
):
    """Test connection with provided (and potentially unsaved) credentials."""
    api_key = data.apiKey
    if api_key == "********":
        # Fetch from DB if user is using existing key
        config = db.query(LLMConfigDB).filter(
            LLMConfigDB.user_id == user.id,
            LLMConfigDB.provider == data.provider
        ).first()
        if config:
            api_key = decrypt_api_key(config.api_key_encrypted)
    
    try:
        start_time = 0 # In a real scenario, you'd measure this
        response = await LLMProxy.complete(
            provider=data.provider,
            model=data.model or "gpt-4o-mini", # default for test
            prompt="Say 'OK'",
            api_key=api_key,
            base_url=data.baseUrl
        )
        return {"success": True, "response": response}
    except Exception as e:
        return {"success": False, "error": str(e)}
