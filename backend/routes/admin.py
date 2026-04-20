"""
AaharAI NutriSync — API Routes: Admin
Admin-only endpoints for user management, statistics, and system monitoring.
"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timedelta, timezone
from sqlalchemy import func
from sqlalchemy.orm import Session
from auth.database import UserDB, ChatHistoryDB, get_db
from auth.dependencies import require_user

router = APIRouter(prefix="/api/admin", tags=["Admin"])


def require_admin(current_user: UserDB = Depends(require_user)) -> UserDB:
    """Dependency to require admin role."""
    if not getattr(current_user, 'is_admin', False):
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


@router.get("/stats")
async def get_stats(
    current_user: UserDB = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Get system statistics."""
    # User stats
    total_users = db.query(func.count(UserDB.id)).scalar()
    active_users_24h = db.query(func.count(UserDB.id)).filter(
        UserDB.last_login_at >= datetime.now(timezone.utc) - timedelta(hours=24)
    ).scalar()
    
    # Chat stats
    total_chats = db.query(func.count(ChatHistoryDB.id)).scalar()
    chats_24h = db.query(func.count(ChatHistoryDB.id)).filter(
        ChatHistoryDB.created_at >= datetime.now(timezone.utc) - timedelta(hours=24)
    ).scalar()
    
    # Unique users with chats
    users_with_chats = db.query(func.count(func.distinct(ChatHistoryDB.user_id))).scalar()
    
    return {
        "total_users": total_users or 0,
        "active_users_24h": active_users_24h or 0,
        "total_chats": total_chats or 0,
        "chats_24h": chats_24h or 0,
        "users_with_chats": users_with_chats or 0,
    }


@router.get("/users")
async def list_users(
    page: int = 1,
    limit: int = 20,
    current_user: UserDB = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """List all users with pagination."""
    # BUG-025: Pagination guard
    limit = min(limit, 100)
    total = db.query(func.count(UserDB.id)).scalar()
    skip = (page - 1) * limit
    
    users = db.query(UserDB).offset(skip).limit(limit).all()
    
    user_list = []
    for user in users:
        user_list.append({
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "is_admin": user.is_admin or False,
            "email_verified": user.email_verified or False,
            "created_at": user.created_at,
            "last_login_at": user.last_login_at,
        })
    
    return {
        "users": user_list,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit,
    }


@router.get("/users/{user_id}/activity")
async def get_user_activity(
    user_id: int,
    current_user: UserDB = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Get activity for a specific user."""
    user = db.query(UserDB).filter(UserDB.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get chat count
    chat_count = db.query(func.count(ChatHistoryDB.id)).filter(
        ChatHistoryDB.user_id == user_id
    ).scalar()
    
    # Get recent chats
    recent_chats = db.query(ChatHistoryDB).filter(
        ChatHistoryDB.user_id == user_id
    ).order_by(ChatHistoryDB.created_at.desc()).limit(5).all()
    
    return {
        "user_id": user_id,
        "name": user.name,
        "email": user.email,
        "total_chats": chat_count or 0,
        "last_login_at": user.last_login_at,
        "created_at": user.created_at,
        "recent_chats": [
            {
                "id": chat.id,
                # BUG-027: Mask message content for privacy
                "message": "[Message Masked for Privacy]" if chat.user_message else "",
                "created_at": chat.created_at,
            }
            for chat in recent_chats
        ]
    }


@router.get("/usage")
async def get_usage_stats(
    current_user: UserDB = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Get LLM usage and system metrics."""
    # Chats by food group (approximation from messages)
    total_chats = db.query(func.count(ChatHistoryDB.id)).scalar()
    
    # Top active users
    top_users = db.query(
        UserDB.name,
        func.count(ChatHistoryDB.id).label("chat_count")
    ).join(
        ChatHistoryDB, UserDB.id == ChatHistoryDB.user_id
    ).group_by(UserDB.id).order_by(
        func.count(ChatHistoryDB.id).desc()
    ).limit(5).all()
    
    return {
        "total_chats": total_chats or 0,
        "avg_chats_per_user": round((total_chats or 0) / max(db.query(func.count(UserDB.id)).scalar() or 1, 1), 2),
        "top_active_users": [
            {"name": user[0], "chats": user[1]}
            for user in top_users
        ],
    }


@router.post("/users/{user_id}/toggle-admin")
async def toggle_admin(
    user_id: int,
    current_user: UserDB = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Toggle admin status for a user."""
    user = db.query(UserDB).filter(UserDB.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    is_currently_admin = user.is_admin or False

    if user.id == current_user.id and is_currently_admin:
        admin_count = db.query(func.count(UserDB.id)).filter(UserDB.is_admin == True).scalar()
        if admin_count <= 1:
            raise HTTPException(status_code=400, detail="Cannot demote the last remaining admin")

    user.is_admin = not is_currently_admin
    db.commit()
    
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "is_admin": user.is_admin,
    }
