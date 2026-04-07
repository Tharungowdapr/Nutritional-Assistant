"""
AaharAI NutriSync — API Routes: Chat (RAG)
Supports both authenticated and anonymous chat with optional history persistence.
"""
import json
from fastapi import APIRouter, Depends
from typing import Optional
from sqlalchemy.orm import Session

from database.models import ChatRequest, ChatResponse
from auth.database import get_db, ChatHistoryDB
from auth.dependencies import get_current_user

router = APIRouter(prefix="/api/chat", tags=["Chat"])


@router.post("", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """RAG-powered chat with nutrition knowledge base."""
    from main import get_rag_service
    rag_service = get_rag_service()

    user_profile = request.user_profile.model_dump() if request.user_profile else None

    # If logged in and no profile in request, use saved profile
    if user_profile is None and user is not None:
        saved_profile = user.profile
        if saved_profile:
            user_profile = saved_profile

    result = await rag_service.chat(request.message, user_profile)

    # Save to history if user is logged in
    if user is not None:
        try:
            db.add(ChatHistoryDB(
                user_id=user.id, role="user",
                content=request.message,
            ))
            db.add(ChatHistoryDB(
                user_id=user.id, role="assistant",
                content=result["answer"],
                sources_json=json.dumps(result["sources"]),
                llm_provider=result["llm_provider"],
            ))
            db.commit()
        except Exception:
            pass  # Don't fail the request if history save fails

    return ChatResponse(
        answer=result["answer"],
        sources=result["sources"],
        llm_provider=result["llm_provider"],
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
                "role": m.role,
                "content": m.content,
                "sources": json.loads(m.sources_json) if m.sources_json else [],
                "llm_provider": m.llm_provider,
                "created_at": m.created_at.isoformat() if m.created_at else None,
            }
            for m in messages
        ]
    }
