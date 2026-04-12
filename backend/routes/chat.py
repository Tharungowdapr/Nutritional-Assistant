"""
AaharAI NutriSync — API Routes: Chat (RAG)
Supports both authenticated and anonymous chat with optional history persistence.
"""
import json
import uuid
import logging
from fastapi import APIRouter, Depends, Request, HTTPException
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from slowapi import Limiter
from slowapi.util import get_remote_address

from database.models import ChatRequest, ChatResponse
from auth.database import get_db, ChatHistoryDB
from auth.dependencies import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/chat", tags=["Chat"])
limiter = Limiter(key_func=get_remote_address)


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
    
    # Check if RAG service is initialized
    if rag_service is None:
        raise HTTPException(
            status_code=503,
            detail="Knowledge base not ready. Run: python -m rag.ingest"
        )

    user_profile = data.user_profile.model_dump() if data.user_profile else None

    # If logged in and no profile in request, use saved profile
    if user_profile is None and user is not None:
        saved_profile = user.profile
        if saved_profile:
            user_profile = saved_profile

    result = await rag_service.chat(data.message, user_profile)

    # Create or use existing session
    session_id = data.session_id or str(uuid.uuid4())

    # Save to history if user is logged in
    if user is not None:
        try:
            db.add(ChatHistoryDB(
                user_id=user.id,
                session_id=session_id,
                user_message=data.message,
                assistant_message=result["answer"],
                sources_json=json.dumps(result["sources"]),
                llm_provider=result["llm_provider"],
            ))
            db.commit()
        except Exception as e:
            logger.warning(f"Failed to save chat history: {e}")

    return ChatResponse(
        answer=result["answer"],
        sources=result["sources"],
        llm_provider=result["llm_provider"],
        session_id=session_id,
    )


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


@router.get("/sessions")
async def list_chat_sessions(
    limit: int = 20,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all chat sessions for the logged-in user."""
    if user is None:
        return {"sessions": []}

    sessions = db.query(
        ChatHistoryDB.session_id,
        func.min(ChatHistoryDB.created_at).label("started_at"),
        func.count(ChatHistoryDB.id).label("message_count"),
    ).filter(
        ChatHistoryDB.user_id == user.id,
        ChatHistoryDB.session_id.isnot(None)
    ).group_by(
        ChatHistoryDB.session_id
    ).order_by(
        func.min(ChatHistoryDB.created_at).desc()
    ).limit(limit).all()

    return {
        "sessions": [
            {
                "session_id": s[0],
                "started_at": s[1].isoformat() if s[1] else None,
                "message_count": s[2],
            }
            for s in sessions
        ]
    }


@router.get("/sessions/{session_id}")
async def get_session_messages(
    session_id: str,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all messages in a specific chat session."""
    if user is None:
        return {"messages": [], "error": "Not authenticated"}

    messages = (
        db.query(ChatHistoryDB)
        .filter(
            ChatHistoryDB.user_id == user.id,
            ChatHistoryDB.session_id == session_id
        )
        .order_by(ChatHistoryDB.created_at.asc())
        .all()
    )

    if not messages:
        return {"messages": [], "warning": "Session not found or empty"}

    return {
        "messages": [
            {
                "id": m.id,
                "role": m.role,
                "content": m.content,
                "sources": json.loads(m.sources_json) if m.sources_json else [],
                "llm_provider": m.llm_provider,
                "created_at": m.created_at.isoformat() if m.created_at else None,
            }
            for m in messages
        ]
    }


@router.delete("/sessions/{session_id}")
async def delete_chat_session(
    session_id: str,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a specific chat session and all its messages."""
    if user is None:
        return {"error": "Not authenticated"}

    deleted = db.query(ChatHistoryDB).filter(
        ChatHistoryDB.user_id == user.id,
        ChatHistoryDB.session_id == session_id
    ).delete()

    db.commit()
    return {"deleted_messages": deleted, "session_id": session_id}
