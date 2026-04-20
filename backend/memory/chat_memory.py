"""
AaharAI NutriSync — Chat Memory Module
Short-term memory for recent chat messages.
"""
import logging
from collections import defaultdict
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

# In-memory chat store (fallback if DB unavailable)
_chat_store = defaultdict(list)

# Config
MAX_CHAT_HISTORY = 10


def save_chat_message(user_id: int, role: str, content: str, session_id: str = None):
    """Save a chat message to memory."""
    message = {
        "role": role,
        "content": content,
        "session_id": session_id
    }
    _chat_store[user_id].append(message)
    
    # Keep only last MAX_CHAT_HISTORY messages
    if len(_chat_store[user_id]) > MAX_CHAT_HISTORY:
        _chat_store[user_id] = _chat_store[user_id][-MAX_CHAT_HISTORY:]
    
    logger.debug(f"Saved {role} message for user {user_id}")


def get_recent_messages(user_id: int, limit: int = 5) -> List[Dict[str, Any]]:
    """Get recent chat messages for a user."""
    messages = _chat_store.get(user_id, [])
    return messages[-limit:] if messages else []


def format_chat_history(user_id: int, limit: int = 5) -> str:
    """Format chat history as text for prompt injection."""
    messages = get_recent_messages(user_id, limit)
    if not messages:
        return ""
    
    return "\n".join([
        f"{msg['role'].capitalize()}: {msg['content']}"
        for msg in messages
    ])


def clear_chat_history(user_id: int):
    """Clear chat history for a user."""
    if user_id in _chat_store:
        _chat_store[user_id] = []


def load_chat_from_db(user_id: int, session_id: str = None, limit: int = 10):
    """Load chat history from database."""
    from auth.database import SessionLocal, ChatHistoryDB
    
    db = SessionLocal()
    try:
        query = db.query(ChatHistoryDB).filter(ChatHistoryDB.user_id == user_id)
        
        if session_id:
            query = query.filter(ChatHistoryDB.session_id == session_id)
        
        messages = query.order_by(ChatHistoryDB.created_at.desc()).limit(limit).all()
        messages = list(reversed(messages))
        
        result = []
        for msg in messages:
            if msg.user_message:
                result.append({"role": "user", "content": msg.user_message})
            if msg.assistant_message:
                result.append({"role": "assistant", "content": msg.assistant_message})
        
        return result
    except Exception as e:
        logger.warning(f"Failed to load chat from DB: {e}")
        return []
    finally:
        db.close()


def save_chat_to_db(user_id: int, user_message: str, assistant_message: str, session_id: str = None, sources: list = None):
    """Save chat message to database."""
    from auth.database import SessionLocal, ChatHistoryDB
    
    db = SessionLocal()
    try:
        import json
        chat = ChatHistoryDB(
            user_id=user_id,
            session_id=session_id,
            user_message=user_message,
            assistant_message=assistant_message,
            sources_json=json.dumps(sources or [])
        )
        db.add(chat)
        db.commit()
    except Exception as e:
        logger.warning(f"Failed to save chat to DB: {e}")
    finally:
        db.close()