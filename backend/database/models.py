"""
AaharAI NutriSync — Pydantic Models
Request/response schemas for all API endpoints.
"""
from pydantic import BaseModel, Field
from typing import Optional


class UserProfile(BaseModel):
    """User profile submitted during onboarding."""
    age: int = Field(..., ge=1, le=120)
    sex: str = Field(..., pattern="^(Male|Female|Other)$")
    weight_kg: float = Field(..., ge=10, le=300)
    height_cm: float = Field(..., ge=50, le=250)
    life_stage: str  # e.g. "Teen (Girl)", "Pregnant T2", "Elderly Male"
    profession: str  # e.g. "Sedentary", "Heavy Manual"
    region_zone: str  # e.g. "South"
    region_state: Optional[str] = None  # e.g. "Karnataka"
    diet_type: str = Field(..., pattern="^(VEG|NON-VEG|VEGAN)$")
    conditions: list[str] = []  # e.g. ["T2DM", "PCOS"]
    glp1_medication: Optional[str] = None  # e.g. "Semaglutide"
    glp1_phase: Optional[str] = None  # e.g. "Maintenance"
    energy_score: int = Field(3, ge=1, le=5)
    sleep_hours: float = Field(7, ge=0, le=24)
    focus_score: int = Field(3, ge=1, le=5)
    daily_budget_inr: Optional[float] = None  # e.g. 500.0


class ChatRequest(BaseModel):
    message: str
    user_profile: Optional[dict] = None
    session_id: Optional[str] = None  # UUID for conversation grouping


class ChatResponse(BaseModel):
    answer: str
    sources: list[dict] = []
    llm_provider: str = ""  # "ollama" or "groq"
    session_id: Optional[str] = None


class MealPlanRequest(BaseModel):
    user_profile: UserProfile
    days: int = Field(7, ge=1, le=30)
    num_people: int = Field(1, ge=1, le=10)
    budget_per_day_inr: Optional[float] = None


class GroceryRequest(BaseModel):
    meal_plan_text: str
    days: int = Field(7, ge=1, le=30)
    num_people: int = Field(1, ge=1, le=10)


class GroceryListResponse(BaseModel):
    items: list[dict]
    total_cost_inr: float
    grouped_by_category: dict[str, list[dict]]


class RecipeRequest(BaseModel):
    instructions: str


class NutrientTargets(BaseModel):
    calories: float
    protein_g: float
    fat_g: float
    carbs_g: float
    fibre_g: float
    iron_mg: float
    calcium_mg: float
    zinc_mg: float
    folate_mcg: float
    vit_b12_mcg: float
    vit_d_mcg: float
    vit_c_mg: float
    magnesium_mg: float
    omega3_g: float


class HealthCheckResponse(BaseModel):
    status: str
    database_loaded: bool
    ollama_available: bool
    groq_available: bool
    chroma_ready: bool
    db_stats: dict


class LogFoodRequest(BaseModel):
    meal_slot: str = Field(..., pattern="^(Breakfast|Lunch|Dinner|Snack)$")
    food_name: str
    quantity_g: float = Field(100.0, ge=1, le=5000)
    log_date: Optional[str] = None
    # Optional manual overrides for recipes
    manual_calories: Optional[float] = None
    manual_protein_g: Optional[float] = None
    manual_carbs_g: Optional[float] = None
    manual_fat_g: Optional[float] = None
    manual_iron_mg: Optional[float] = None
    manual_calcium_mg: Optional[float] = None
    manual_fibre_g: Optional[float] = None


class DailyLogResponse(BaseModel):
    id: int
    log_date: str
    meal_slot: str
    food_name: str
    quantity_g: float
    calories: Optional[float] = None
    protein_g: Optional[float] = None
    carbs_g: Optional[float] = None
    fat_g: Optional[float] = None


class DailySummaryResponse(BaseModel):
    log_date: str
    total_calories: float
    total_protein_g: float
    total_carbs_g: float
    total_fat_g: float
    meal_count: int
    meals_by_slot: dict[str, list[DailyLogResponse]]
