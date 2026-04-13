"""
AaharAI NutriSync — Auth Pydantic Schemas
Request/response models for authentication endpoints.
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional


class SignupRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    email: str = Field(..., min_length=5, max_length=255)
    password: str = Field(..., min_length=6, max_length=128)


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserResponse"


class UserResponse(BaseModel):
    id: int
    email: str
    name: str
    profile: dict = {}
    profile_completion: int = 0  # 0-100%


class ProfileUpdateRequest(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    sex: Optional[str] = None
    weight_kg: Optional[float] = None
    height_cm: Optional[float] = None
    life_stage: Optional[str] = None
    profession: Optional[str] = None
    region_zone: Optional[str] = None
    region_state: Optional[str] = None
    diet_type: Optional[str] = None
    conditions: Optional[list[str]] = None
    glp1_medication: Optional[str] = None
    glp1_phase: Optional[str] = None
    energy_score: Optional[int] = None
    sleep_hours: Optional[float] = None
    focus_score: Optional[int] = None
    daily_budget_inr: Optional[float] = None


class ForgotPasswordRequest(BaseModel):
    email: str = Field(..., min_length=5, max_length=255)


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=6, max_length=128)


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=6, max_length=128)
