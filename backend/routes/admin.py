"""
AaharAI NutriSync — API Routes: Admin
Admin-only endpoints for user management, statistics, and system monitoring.
"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timedelta
from sqlalchemy import func, select
from auth.database import SessionLocal, UserDB, ChatHistoryDB
from auth.dependencies import get_current_user

router = APIRouter(prefix="/api/admin", tags=["Admin"])


def require_admin(current_user: UserDB = Depends(get_current_user)):
    """Dependency to require admin role."""
    if not getattr(current_user, 'is_admin', False):
        raise HTTPException(403, "Admin access required")
    return current_user


@router.get("/stats")
async def get_stats(current_user: UserDB = Depends(require_admin)):
    """Get system statistics."""
    db = SessionLocal()
    try:
        # User stats
        total_users = db.query(func.count(UserDB.id)).scalar()
        active_users_24h = db.query(func.count(UserDB.id)).filter(
            UserDB.last_login_at >= datetime.utcnow() - timedelta(hours=24)
        ).scalar()
        
        # Chat stats
        total_chats = db.query(func.count(ChatHistoryDB.id)).scalar()
        chats_24h = db.query(func.count(ChatHistoryDB.id)).filter(
            ChatHistoryDB.timestamp >= datetime.utcnow() - timedelta(hours=24)
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
    finally:
        db.close()


@router.get("/users")
async def list_users(
    page: int = 1,
    limit: int = 20,
    current_user: UserDB = Depends(require_admin)
):
    """List all users with pagination."""
    db = SessionLocal()
    try:
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
    finally:
        db.close()


@router.get("/users/{user_id}/activity")
async def get_user_activity(
    user_id: int,
    current_user: UserDB = Depends(require_admin)
):
    """Get activity for a specific user."""
    db = SessionLocal()
    try:
        user = db.query(UserDB).filter(UserDB.id == user_id).first()
        if not user:
            raise HTTPException(404, "User not found")
        
        # Get chat count
        chat_count = db.query(func.count(ChatHistoryDB.id)).filter(
            ChatHistoryDB.user_id == user_id
        ).scalar()
        
        # Get recent chats
        recent_chats = db.query(ChatHistoryDB).filter(
            ChatHistoryDB.user_id == user_id
        ).order_by(ChatHistoryDB.timestamp.desc()).limit(5).all()
        
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
                    "message": chat.user_message[:100] if chat.user_message else "",
                    "timestamp": chat.timestamp,
                }
                for chat in recent_chats
            ]
        }
    finally:
        db.close()


@router.get("/usage")
async def get_usage_stats(current_user: UserDB = Depends(require_admin)):
    """Get LLM usage and system metrics."""
    db = SessionLocal()
    try:
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
    finally:
        db.close()


@router.post("/users/{user_id}/toggle-admin")
async def toggle_admin(
    user_id: int,
    current_user: UserDB = Depends(require_admin)
):
    """Toggle admin status for a user."""
    db = SessionLocal()
    try:
        user = db.query(UserDB).filter(UserDB.id == user_id).first()
        if not user:
            raise HTTPException(404, "User not found")
        
        user.is_admin = not (user.is_admin or False)
        db.commit()
        
        return {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "is_admin": user.is_admin,
        }
    finally:
        db.close()
