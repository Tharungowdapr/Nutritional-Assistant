"""
AaharAI NutriSync — Auth API Routes
Signup, login, profile management.
"""
import json
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from auth.database import get_db, UserDB
from auth.security import hash_password, verify_password, create_access_token
from auth.schemas import SignupRequest, LoginRequest, TokenResponse, UserResponse, ProfileUpdateRequest
from auth.dependencies import require_user

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/signup", response_model=TokenResponse)
async def signup(request: SignupRequest, db: Session = Depends(get_db)):
    """Create a new user account and return JWT token."""
    existing = db.query(UserDB).filter(UserDB.email == request.email.lower()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = UserDB(
        email=request.email.lower().strip(),
        hashed_password=hash_password(request.password),
        name=request.name.strip(),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(data={"sub": str(user.id)})
    return TokenResponse(
        access_token=token,
        user=UserResponse(id=user.id, email=user.email, name=user.name, profile=user.profile),
    )


@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest, db: Session = Depends(get_db)):
    """Login with email and password, returns JWT token."""
    user = db.query(UserDB).filter(UserDB.email == request.email.lower()).first()
    if not user or not verify_password(request.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token(data={"sub": str(user.id)})
    return TokenResponse(
        access_token=token,
        user=UserResponse(id=user.id, email=user.email, name=user.name, profile=user.profile),
    )


@router.get("/me", response_model=UserResponse)
async def get_me(user: UserDB = Depends(require_user)):
    """Get current user profile."""
    return UserResponse(id=user.id, email=user.email, name=user.name, profile=user.profile)


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
    return UserResponse(id=user.id, email=user.email, name=user.name, profile=user.profile)
