"""
AaharAI NutriSync — Chat Session API Routes
Multi-chat interface for RAG bot with session history.
"""
import uuid
import json
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from pydantic import BaseModel

from auth.database import get_db, ChatSessionDB, ChatHistoryDB, UserDB
from auth.dependencies import require_user

router = APIRouter(prefix="/api/chat/sessions", tags=["Chat Sessions"])


class ChatSessionCreate(BaseModel):
    title: Optional[str] = None


class ChatSessionResponse(BaseModel):
    id: str
    title: str
    created_at: str
    updated_at: str


class ChatMessageRequest(BaseModel):
    message: str
    session_id: str


class ChatMessageResponse(BaseModel):
    message_id: int
    assistant_message: str
    sources: list[dict] = []
    llm_provider: str


@router.post("/", response_model=ChatSessionResponse)
async def create_chat_session(
    user: UserDB = Depends(require_user),
    db: Session = Depends(get_db),
):
    """Create a new chat session."""
    session_id = str(uuid.uuid4())
    session = ChatSessionDB(
        id=session_id,
        user_id=user.id,
        title="New Chat",
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return ChatSessionResponse(
        id=session.id,
        title=session.title,
        created_at=session.created_at.isoformat(),
        updated_at=session.updated_at.isoformat(),
    )


@router.get("/", response_model=list[ChatSessionResponse])
async def list_chat_sessions(
    user: UserDB = Depends(require_user),
    db: Session = Depends(get_db),
):
    """List all chat sessions for the user."""
    sessions = db.query(ChatSessionDB).filter(
        ChatSessionDB.user_id == user.id
    ).order_by(ChatSessionDB.updated_at.desc()).all()
    
    return [
        ChatSessionResponse(
            id=s.id,
            title=s.title,
            created_at=s.created_at.isoformat() if s.created_at else "",
            updated_at=s.updated_at.isoformat() if s.updated_at else "",
        )
        for s in sessions
    ]


@router.get("/{session_id}", response_model=ChatSessionResponse)
async def get_chat_session(
    session_id: str,
    user: UserDB = Depends(require_user),
    db: Session = Depends(get_db),
):
    """Get a specific chat session."""
    session = db.query(ChatSessionDB).filter(
        ChatSessionDB.id == session_id,
        ChatSessionDB.user_id == user.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")
    
    return ChatSessionResponse(
        id=session.id,
        title=session.title,
        created_at=session.created_at.isoformat() if session.created_at else "",
        updated_at=session.updated_at.isoformat() if session.updated_at else "",
    )


@router.post("/{session_id}/messages", response_model=ChatMessageResponse)
async def send_chat_message(
    session_id: str,
    message_data: ChatMessageRequest,
    user: UserDB = Depends(require_user),
    db: Session = Depends(get_db),
):
    """Send a message in a chat session."""
    from main import get_rag_service
    rag_service = get_rag_service()
    
    # Verify session exists and belongs to user
    session = db.query(ChatSessionDB).filter(
        ChatSessionDB.id == session_id,
        ChatSessionDB.user_id == user.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")
    
    # Get RAG response
    try:
        if rag_service is None:
            raise HTTPException(status_code=503, detail="Knowledge base not ready")

        rag_response = await rag_service.chat(message_data.message, user_profile=user.profile, history=None)
        assistant_message = rag_response.get("answer", "")
        sources = rag_response.get("sources", [])
        llm_provider = rag_response.get("llm_provider", "")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"RAG service error: {str(e)}")
    
    # Store in chat history
    chat_entry = ChatHistoryDB(
        user_id=user.id,
        session_id=session_id,
        user_message=message_data.message,
        assistant_message=assistant_message,
        sources_json=json.dumps(sources),
        llm_provider=llm_provider,
    )
    db.add(chat_entry)
    
    # Update session timestamp
    session.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(chat_entry)
    
    return ChatMessageResponse(
        message_id=chat_entry.id,
        assistant_message=assistant_message,
        sources=sources,
        llm_provider=llm_provider,
    )


@router.get("/{session_id}/history")
async def get_session_history(
    session_id: str,
    user: UserDB = Depends(require_user),
    db: Session = Depends(get_db),
):
    """Get chat history for a specific session."""
    # Verify session belongs to user
    session = db.query(ChatSessionDB).filter(
        ChatSessionDB.id == session_id,
        ChatSessionDB.user_id == user.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")
    
    # Get all messages in session
    messages = db.query(ChatHistoryDB).filter(
        ChatHistoryDB.session_id == session_id
    ).order_by(ChatHistoryDB.created_at).all()
    
    return [
        {
            "id": m.id,
            "user_message": m.user_message,
            "assistant_message": m.assistant_message,
            "sources": json.loads(m.sources_json) if m.sources_json else [],
            "llm_provider": m.llm_provider,
            "created_at": m.created_at.isoformat() if m.created_at else "",
        }
        for m in messages
    ]


@router.delete("/{session_id}")
async def delete_chat_session(
    session_id: str,
    user: UserDB = Depends(require_user),
    db: Session = Depends(get_db),
):
    """Delete a chat session and its history."""
    session = db.query(ChatSessionDB).filter(
        ChatSessionDB.id == session_id,
        ChatSessionDB.user_id == user.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")
    
    # Delete associated messages
    db.query(ChatHistoryDB).filter(
        ChatHistoryDB.session_id == session_id
    ).delete()
    
    # Delete session
    db.delete(session)
    db.commit()
    
    return {"message": "Chat session deleted"}


@router.put("/{session_id}/title")
async def update_session_title(
    session_id: str,
    title_data: dict,
    user: UserDB = Depends(require_user),
    db: Session = Depends(get_db),
):
    """Update chat session title."""
    session = db.query(ChatSessionDB).filter(
        ChatSessionDB.id == session_id,
        ChatSessionDB.user_id == user.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")
    
    if "title" in title_data:
        session.title = title_data["title"]
        db.commit()
    
    return ChatSessionResponse(
        id=session.id,
        title=session.title,
        created_at=session.created_at.isoformat() if session.created_at else "",
        updated_at=session.updated_at.isoformat() if session.updated_at else "",
    )
