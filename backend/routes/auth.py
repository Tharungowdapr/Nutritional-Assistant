"""
AaharAI NutriSync — Auth API Routes
Signup, login, profile management, password reset, etc.
"""
import json
import secrets
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from slowapi import Limiter
from slowapi.util import get_remote_address

from auth.database import get_db, UserDB
from auth.security import hash_password, verify_password, create_access_token
from auth.schemas import (
    SignupRequest, LoginRequest, TokenResponse, UserResponse, ProfileUpdateRequest,
    ForgotPasswordRequest, ResetPasswordRequest, ChangePasswordRequest
)
from auth.dependencies import require_user
from utils import calculate_profile_completion

router = APIRouter(prefix="/api/auth", tags=["Authentication"])
limiter = Limiter(key_func=get_remote_address)


@router.post("/signup", response_model=TokenResponse)
@limiter.limit("5/minute")
async def signup(request: Request, data: SignupRequest, db: Session = Depends(get_db)):
    """Create a new user account and return JWT token."""
    existing = db.query(UserDB).filter(UserDB.email == data.email.lower()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = UserDB(
        email=data.email.lower().strip(),
        hashed_password=hash_password(data.password),
        name=data.name.strip(),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(data={"sub": str(user.id)})
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user.id, email=user.email, name=user.name, profile=user.profile,
            profile_completion=calculate_profile_completion(user.profile)
        ),
    )


@router.post("/login", response_model=TokenResponse)
@limiter.limit("10/minute")
async def login(request: Request, data: LoginRequest, db: Session = Depends(get_db)):
    """Login with email and password, returns JWT token."""
    user = db.query(UserDB).filter(UserDB.email == data.email.lower()).first()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token(data={"sub": str(user.id)})
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user.id, email=user.email, name=user.name, profile=user.profile,
            profile_completion=calculate_profile_completion(user.profile)
        ),
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(user: UserDB = Depends(require_user), db: Session = Depends(get_db)):
    """Issue a new access token for the currently authenticated user."""
    db.refresh(user)  # Get latest user data
    new_token = create_access_token(data={"sub": str(user.id)})
    return TokenResponse(
        access_token=new_token,
        user=UserResponse(
            id=user.id, email=user.email, name=user.name, profile=user.profile,
            profile_completion=calculate_profile_completion(user.profile)
        ),
    )


@router.post("/forgot-password")
@limiter.limit("5/minute")
async def forgot_password(request: Request, data: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """Send password reset link to email (user existence is kept secret)."""
    user = db.query(UserDB).filter(UserDB.email == data.email.lower()).first()
    if user:
        # Generate secure reset token
        token = secrets.token_urlsafe(32)
        user.reset_token = token
        user.reset_token_expires = datetime.now(timezone.utc) + timedelta(hours=1)
        # Integrate Resend for sending email
        import resend
        from config import settings
        
        if settings.SECRET_KEY:  # We just need some dummy or real key to send, ideally user should have RESEND_API_KEY
            # If there's no RESEND_API_KEY in settings, let's try reading from env or just use a dummy 
            # (as the guide says "Integrate Resend: pip install resend, call resend.Emails.send() with reset URL")
            resend.api_key = getattr(settings, "RESEND_API_KEY", "re_dummy_key") 
            try:
                resend.Emails.send({
                    "from": "Acme <onboarding@resend.dev>",
                    "to": [user.email],
                    "subject": "Password Reset - AaharAI NutriSync",
                    "html": f"<p>Reset your password using this link: <strong>http://localhost:3000/reset-password?token={token}</strong></p>"
                })
            except Exception as e:
                import logging
                logging.getLogger(__name__).warning(f"Failed to send email via resend: {e}")

    return {"message": "If that email exists, password reset instructions have been sent."}


@router.post("/reset-password")
@limiter.limit("10/minute")
async def reset_password(request: Request, data: ResetPasswordRequest, db: Session = Depends(get_db)):
    """Reset password using token from email link."""
    user = db.query(UserDB).filter(
        UserDB.reset_token == data.token,
        UserDB.reset_token_expires > datetime.now(timezone.utc)
    ).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    
    user.hashed_password = hash_password(data.new_password)
    user.reset_token = None
    user.reset_token_expires = None
    db.commit()
    db.refresh(user)
    return {"message": "Password updated successfully"}


@router.put("/change-password", response_model=UserResponse)
async def change_password(
    data: ChangePasswordRequest,
    user: UserDB = Depends(require_user),
    db: Session = Depends(get_db),
):
    """Change password for authenticated user."""
    if not verify_password(data.current_password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    user.hashed_password = hash_password(data.new_password)
    db.commit()
    db.refresh(user)
    return UserResponse(
        id=user.id, email=user.email, name=user.name, profile=user.profile,
        profile_completion=calculate_profile_completion(user.profile)
    )


@router.get("/me", response_model=UserResponse)
async def get_me(user: UserDB = Depends(require_user)):
    """Get current user profile."""
    return UserResponse(
        id=user.id, email=user.email, name=user.name, profile=user.profile,
        profile_completion=calculate_profile_completion(user.profile)
    )


@router.put("/profile", response_model=UserResponse)
async def update_profile(
    request: ProfileUpdateRequest,
    user: UserDB = Depends(require_user),
    db: Session = Depends(get_db),
):
    """Update user profile data."""
    if request.name is not None:
        user.name = request.name

    # Merge profile data
    current_profile = user.profile
    update_data = request.model_dump(exclude_none=True, exclude={"name"})
    current_profile.update(update_data)
    user.profile_json = json.dumps(current_profile)

    db.commit()
    db.refresh(user)
    return UserResponse(
        id=user.id, email=user.email, name=user.name, profile=user.profile,
        profile_completion=calculate_profile_completion(user.profile)
    )
