"""
AaharAI NutriSync — Auth Dependencies
FastAPI dependencies for extracting the current user from JWT tokens.
"""
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from auth.database import get_db, UserDB
from auth.security import decode_access_token

security = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db),
) -> Optional[UserDB]:
    """Extract and validate user from JWT Bearer token.
    Returns None if no token provided (allows unauthenticated access).
    Raises 401 if token is invalid.
    """
    if credentials is None:
        return None

    payload = decode_access_token(credentials.credentials)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    user = db.query(UserDB).filter(UserDB.id == int(user_id)).first()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")

    return user


async def require_user(
    user: Optional[UserDB] = Depends(get_current_user),
) -> UserDB:
    """Dependency that REQUIRES authentication. Raises 401 if not logged in."""
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user
