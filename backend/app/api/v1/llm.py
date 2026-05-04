from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.models.user import get_db, LLMConfigDB, UserDB
from app.core.dependencies import require_user, get_current_user
from app.core.crypt import encrypt_api_key, decrypt_api_key
from app.services.llm.proxy import LLMProxy
from pydantic import BaseModel, Field
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/llm", tags=["LLM Proxy"])

class LLMSettingsUpdate(BaseModel):
    provider: str
    model: Optional[str] = None
    apiKey: Optional[str] = None
    baseUrl: Optional[str] = None
    isActive: bool = True

class ChatRequest(BaseModel):
    message: str
    systemPrompt: Optional[str] = "You are a helpful nutrition assistant."
    provider: Optional[str] = None  # Override
    model: Optional[str] = None

@router.post("/settings")
async def update_llm_settings(
    data: LLMSettingsUpdate,
    user: UserDB = Depends(require_user),
    db: Session = Depends(get_db)
):
    """Save or update LLM configuration for the user."""
    # Check if config exists for this provider
    config = db.query(LLMConfigDB).filter(
        LLMConfigDB.user_id == user.id,
        LLMConfigDB.provider == data.provider
    ).first()

    if not config:
        config = LLMConfigDB(user_id=user.id, provider=data.provider)
        db.add(config)

    if data.model: config.model = data.model
    if data.baseUrl: config.base_url = data.baseUrl
    if data.apiKey:
        # Only update if a new key is provided
        if data.apiKey != "********": 
            config.api_key_encrypted = encrypt_api_key(data.apiKey)
    
    config.is_active = data.isActive
    db.commit()
    return {"success": True}

@router.get("/settings", response_model=List[dict])
async def get_llm_settings(
    user: UserDB = Depends(require_user),
    db: Session = Depends(get_db)
):
    """Retrieve saved LLM settings (masked keys)."""
    configs = db.query(LLMConfigDB).filter(LLMConfigDB.user_id == user.id).all()
    return [
        {
            "provider": c.provider,
            "model": c.model,
            "baseUrl": c.base_url,
            "isActive": c.is_active,
            "hasKey": bool(c.api_key_encrypted),
            "apiKey": "********" if c.api_key_encrypted else ""
        }
        for c in configs
    ]

@router.post("/chat")
async def chat_proxy(
    data: ChatRequest,
    user: Optional[UserDB] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Proxy LLM requests using stored or provided credentials."""
    provider = data.provider
    model = data.model
    api_key = None
    base_url = None

    # If user is authenticated, try to fetch their saved config
    if user:
        config = db.query(LLMConfigDB).filter(
            LLMConfigDB.user_id == user.id,
            LLMConfigDB.provider == provider,
            LLMConfigDB.is_active == True
        ).first()
        
        if config:
            if not model: model = config.model
            api_key = decrypt_api_key(config.api_key_encrypted)
            base_url = config.base_url

    # Fallback to defaults from config/settings if still missing
    if not api_key and provider == "groq":
        from app.core.config import settings
        api_key = settings.GROQ_API_KEY
    
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
