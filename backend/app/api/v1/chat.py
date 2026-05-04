"""
AaharAI NutriSync — API Routes: Chat (RAG)
Supports both authenticated and anonymous chat with optional history persistence.
"""
import json
import uuid
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Request, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.db.models import ChatRequest, ChatResponse          # ✅ fixed: was `database.models`
from app.models.user import get_db, ChatHistoryDB, ChatSessionDB
from app.core.dependencies import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/chat", tags=["Chat"])
limiter = Limiter(key_func=get_remote_address)


def _get_active_provider(user, user_profile: dict | None, db: Session):
    """Resolve the user's active LLM provider from settings or profile fallback."""
    # 1. Front-end override takes precedence
    if user_profile:
        llm_p = user_profile.get("llm_provider")
        llm_k = user_profile.get("llm_api_key")
        if llm_p and llm_k:
            return {
                "provider": llm_p,
                "model": user_profile.get("llm_model", ""),
                "api_key": llm_k,
            }
            
    # 2. Fallback to backend config for authenticated users
    if user:
        from app.api.v1.settings import get_user_active_provider
        return get_user_active_provider(user, db)
    return None


def _get_session_history(db: Session, session_id: str) -> list:
    """Fetch the last 5 messages for a session."""
    if not session_id or not db:
        return []
    try:
        prev_messages = (
            db.query(ChatHistoryDB)
            .filter(ChatHistoryDB.session_id == session_id)
            .order_by(ChatHistoryDB.created_at.desc())
            .limit(5)
            .all()
        )
        return [
            {"user_message": m.user_message, "assistant_message": m.assistant_message}
            for m in reversed(prev_messages)
        ]
    except Exception as e:
        logger.warning(f"Failed to fetch session history: {e}")
        return []


@router.post("", response_model=ChatResponse)
@limiter.limit("30/minute")
async def chat(
    request: Request,
    data: ChatRequest,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """RAG-powered chat with nutrition knowledge base."""
    from main import get_rag_service
    rag_service = get_rag_service()

    if rag_service is None:
        raise HTTPException(
            status_code=503,
            detail="Knowledge base not ready. Run: make ingest"
        )

    # Resolve user profile
    user_profile = data.user_profile
    if user_profile is None and user is not None and user.profile:
        user_profile = user.profile

    session_id = data.session_id or str(uuid.uuid4())
    history = _get_session_history(db, session_id)
    active_provider = _get_active_provider(user, user_profile, db)

    result = await rag_service.chat(
        data.message,
        user_profile,
        history=history,
        user_id=user.id if user else None,
        user_provider_override=active_provider,
    )

    if user is not None:
        try:
            db.add(ChatHistoryDB(
                user_id=user.id,
                session_id=session_id,
                user_message=data.message,
                assistant_message=result["answer"],
                sources_json=json.dumps(result.get("sources", [])),
                llm_provider=result.get("llm_provider", ""),
            ))
            db.commit()
        except Exception as e:
            logger.warning(f"Failed to save chat history: {e}")
            db.rollback()

    return ChatResponse(
        answer=result["answer"],
        sources=result.get("sources", []),
        llm_provider=result.get("llm_provider", ""),
        session_id=session_id,
    )


@router.post("/stream")
async def chat_stream(
    request: Request,
    data: ChatRequest,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Streaming RAG-powered chat (SSE)."""
    from main import get_rag_service
    rag_service = get_rag_service()

    if rag_service is None:
        raise HTTPException(status_code=503, detail="RAG Service unavailable")

    session_id = data.session_id or str(uuid.uuid4())
    history = _get_session_history(db, session_id)
    active_provider = _get_active_provider(user, data.user_profile, db)

    async def event_generator():
        full_response = ""
        sources = []
        try:
            if hasattr(rag_service, "chat_stream"):
                async for token in rag_service.chat_stream(
                    data.message,
                    data.user_profile,
                    history=history,
                    user_id=user.id if user else None,
                    user_provider_override=active_provider,
                ):
                    full_response += token
                    yield f"data: {json.dumps({'token': token})}\n\n"
            else:
                res = await rag_service.chat(
                    data.message,
                    data.user_profile,
                    history=history,
                    user_id=user.id if user else None,
                    user_provider_override=active_provider,
                )
                full_response = res["answer"]
                sources = res.get("sources", [])           # ✅ fixed: was always []
                yield f"data: {json.dumps({'token': full_response, 'final': True})}\n\n"

            # Persist to history
            if user is not None and session_id and full_response:
                try:
                    provider = getattr(rag_service.llm_router, "active_provider", "ollama")
                    db.add(ChatHistoryDB(
                        user_id=user.id,
                        session_id=session_id,
                        user_message=data.message,
                        assistant_message=full_response,
                        sources_json=json.dumps(sources),   # ✅ fixed: now captures sources
                        llm_provider=provider,
                    ))
                    session = db.query(ChatSessionDB).filter(ChatSessionDB.id == session_id).first()
                    if session:
                        session.updated_at = datetime.now(timezone.utc)
                        if session.title == "New Chat":
                            session.title = data.message[:50] + ("..." if len(data.message) > 50 else "")
                    db.commit()
                except Exception as e:
                    logger.warning(f"Failed to save streamed chat history: {e}")
                    db.rollback()

        except Exception as e:
            logger.error(f"Streaming error: {e}")
            yield f"data: {json.dumps({'error': str(e), 'final': True})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.get("/history")
async def get_chat_history(
    limit: int = 50,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get chat history for the logged-in user."""
    if user is None:
        return {"messages": []}

    messages = (
        db.query(ChatHistoryDB)
        .filter(ChatHistoryDB.user_id == user.id)
        .order_by(ChatHistoryDB.created_at.desc())
        .limit(limit)
        .all()
    )
    messages.reverse()

    return {
        "messages": [
            {
                "user_message": m.user_message,
                "assistant_message": m.assistant_message,
                "sources": json.loads(m.sources_json) if m.sources_json else [],
                "llm_provider": m.llm_provider,
                "session_id": m.session_id,
                "created_at": m.created_at.isoformat() if m.created_at else None,
            }
            for m in messages
        ]
    }
