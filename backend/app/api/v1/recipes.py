"""
AaharAI NutriSync — Recipe API Routes
Save, retrieve, and manage user recipes with history tracking.
"""

import json
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.models.user import get_db, RecipeDB, RecipeHistoryDB, UserDB
from app.core.dependencies import require_user
from pydantic import BaseModel, Field
from slowapi import Limiter
from slowapi.util import get_remote_address
from fastapi import Request

router = APIRouter(prefix="/api/recipes", tags=["Recipes"])
limiter = Limiter(key_func=get_remote_address)
logger = logging.getLogger(__name__)  # ✅ fixed: was missing


class RecipeIngredient(BaseModel):
    name: str
    quantity: float = Field(..., ge=0)
    unit: str


class RecipeCreate(BaseModel):
    title: str
    ingredients: list[RecipeIngredient]
    instructions: list[str]
    cook_time_minutes: Optional[int] = None
    difficulty: str = "Medium"
    servings: int = 1
    calories: Optional[float] = None
    protein_g: Optional[float] = None
    fat_g: Optional[float] = None
    carbs_g: Optional[float] = None
    fibre_g: Optional[float] = None


class RecipeResponse(BaseModel):
    id: int
    title: str
    ingredients: list[RecipeIngredient]
    instructions: list[str]
    cook_time_minutes: Optional[int]
    difficulty: str
    servings: int
    calories: Optional[float]
    protein_g: Optional[float]
    fat_g: Optional[float]
    carbs_g: Optional[float]
    fibre_g: Optional[float]
    created_at: str

    class Config:
        from_attributes = True


class RecipeHistoryResponse(BaseModel):
    id: int
    recipe_title: str
    viewed_at: str


@router.post("/save", response_model=RecipeResponse)
async def save_recipe(
    recipe_data: RecipeCreate,
    user: UserDB = Depends(require_user),
    db: Session = Depends(get_db),
):
    """Save a new recipe for the user."""
    recipe = RecipeDB(
        user_id=user.id,
        title=recipe_data.title,
        ingredients=json.dumps([ing.model_dump() for ing in recipe_data.ingredients]),
        instructions=json.dumps(recipe_data.instructions),
        cook_time_minutes=recipe_data.cook_time_minutes,
        difficulty=recipe_data.difficulty,
        servings=recipe_data.servings,
        calories=recipe_data.calories,
        protein_g=recipe_data.protein_g,
        fat_g=recipe_data.fat_g,
        carbs_g=recipe_data.carbs_g,
        fibre_g=recipe_data.fibre_g,
    )
    db.add(recipe)
    db.commit()
    db.refresh(recipe)
    return RecipeResponse(  # type: ignore
        id=recipe.id,  # type: ignore
        title=recipe.title,  # type: ignore
        ingredients=[RecipeIngredient(**ing) for ing in json.loads(recipe.ingredients or "[]")],  # type: ignore
        instructions=json.loads(recipe.instructions or "[]"),  # type: ignore
        cook_time_minutes=recipe.cook_time_minutes,  # type: ignore
        difficulty=recipe.difficulty,  # type: ignore
        servings=recipe.servings,  # type: ignore
        calories=recipe.calories,  # type: ignore
        protein_g=recipe.protein_g,  # type: ignore
        fat_g=recipe.fat_g,  # type: ignore
        carbs_g=recipe.carbs_g,  # type: ignore
        fibre_g=recipe.fibre_g,  # type: ignore
        created_at=recipe.created_at.isoformat() if hasattr(recipe.created_at, "isoformat") else "",  # type: ignore
    )


@router.get("/list", response_model=list[RecipeResponse])
async def list_recipes(
    page: int = 1,
    limit: int = 20,
    user: UserDB = Depends(require_user),
    db: Session = Depends(get_db),
):
    """List all recipes for the user with pagination."""
    limit = min(limit, 100)
    skip = (page - 1) * limit
    recipes = (
        db.query(RecipeDB)
        .filter(RecipeDB.user_id == user.id)
        .order_by(RecipeDB.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    result = []
    for recipe in recipes:
        result.append(
            RecipeResponse(
                id=recipe.id,
                title=recipe.title,
                ingredients=[RecipeIngredient(**ing) for ing in json.loads(recipe.ingredients or "[]")],
                instructions=json.loads(recipe.instructions or "[]"),
                cook_time_minutes=recipe.cook_time_minutes,
                difficulty=recipe.difficulty,
                servings=recipe.servings,
                calories=recipe.calories,
                protein_g=recipe.protein_g,
                fat_g=recipe.fat_g,
                carbs_g=recipe.carbs_g,
                fibre_g=recipe.fibre_g,
                created_at=recipe.created_at.isoformat() if recipe.created_at else "",
            )
        )

    return result


@router.get("/{recipe_id}", response_model=RecipeResponse)
async def get_recipe(
    recipe_id: int,
    user: UserDB = Depends(require_user),
    db: Session = Depends(get_db),
):
    """Get a specific recipe and track history."""
    recipe = db.query(RecipeDB).filter(RecipeDB.id == recipe_id, RecipeDB.user_id == user.id).first()

    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    # Track recipe history — only if no entry in the last hour
    recent = (
        db.query(RecipeHistoryDB)
        .filter(
            RecipeHistoryDB.user_id == user.id,
            RecipeHistoryDB.recipe_id == recipe.id,
            RecipeHistoryDB.viewed_at >= datetime.now(timezone.utc) - timedelta(hours=1),
        )
        .first()
    )
    if not recent:
        history = RecipeHistoryDB(
            user_id=user.id,
            recipe_id=recipe.id,
            recipe_title=recipe.title,
        )
        db.add(history)
        db.commit()

    return RecipeResponse(
        id=recipe.id,
        title=recipe.title,
        ingredients=[RecipeIngredient(**ing) for ing in json.loads(recipe.ingredients or "[]")],
        instructions=json.loads(recipe.instructions or "[]"),
        cook_time_minutes=recipe.cook_time_minutes,
        difficulty=recipe.difficulty,
        servings=recipe.servings,
        calories=recipe.calories,
        protein_g=recipe.protein_g,
        fat_g=recipe.fat_g,
        carbs_g=recipe.carbs_g,
        fibre_g=recipe.fibre_g,
        created_at=recipe.created_at.isoformat() if recipe.created_at else "",
    )


@router.get("/history/list")
async def get_recipe_history(
    page: int = 1,
    limit: int = 20,
    user: UserDB = Depends(require_user),
    db: Session = Depends(get_db),
):
    """Get user's recipe viewing history with pagination."""
    limit = min(limit, 100)
    skip = (page - 1) * limit
    history = (
        db.query(RecipeHistoryDB)
        .filter(RecipeHistoryDB.user_id == user.id)
        .order_by(RecipeHistoryDB.viewed_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    return [
        RecipeHistoryResponse(
            id=h.id,
            recipe_title=h.recipe_title,
            viewed_at=h.viewed_at.isoformat() if h.viewed_at else "",
        )
        for h in history
    ]


@router.delete("/{recipe_id}")
async def delete_recipe(
    recipe_id: int,
    user: UserDB = Depends(require_user),
    db: Session = Depends(get_db),
):
    """Delete a recipe."""
    recipe = db.query(RecipeDB).filter(RecipeDB.id == recipe_id, RecipeDB.user_id == user.id).first()

    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    db.delete(recipe)
    db.commit()
    return {"message": "Recipe deleted"}


class RecipeGenerateRequest(BaseModel):
    prompt: str
    user_profile: Optional[dict] = None


@router.post("/generate")
@limiter.limit("3/minute")
async def generate_recipe_ai(
    request: Request,
    gen_req: RecipeGenerateRequest,
    user: Optional[UserDB] = Depends(require_user),
    db: Session = Depends(get_db),
):
    """Generate a recipe using LLM with optional override."""
    from main import get_llm_router

    llm = get_llm_router()
    if not llm:
        raise HTTPException(status_code=503, detail="LLM service unavailable")

    # Use backend-stored LLM config for authenticated users
    from app.api.v1.settings import get_user_active_provider

    active_provider = get_user_active_provider(user, db) if user else None

    system_prompt = "You are a master Indian chef and nutritionist. Return ONLY valid JSON."
    prompt = f"""Generate a highly detailed Indian recipe for: "{gen_req.prompt}".
Return ONLY a valid JSON object matching this exact structure (no markdown tags):
{{
  "id": "ai_generated",
  "name": "Recipe Name",
  "category": "Breakfast, Lunch, Dinner, or Snack",
  "diet_type": "VEG" or "NON-VEG",
  "region": "Indian Region",
  "prep_time_min": 30,
  "servings": 2,
  "cal": 400,
  "protein_g": 15,
  "carbs_g": 45,
  "fat_g": 12,
  "fibre_g": 6,
  "iron_mg": 5,
  "calcium_mg": 100,
  "badge": "High Protein" (or High Iron, etc),
  "badge_color": "teal",
  "ingredients": [
    "200g specific ingredient...",
    "1 tbsp specific spice"
  ],
  "steps": [
    "Step 1...",
    "Step 2..."
  ],
  "tips": ["Tip 1", "Tip 2"]
}}
Make ingredients specific and steps professional."""

    try:
        if active_provider:
            from app.services.rag.override import generate_override

            raw = await generate_override(prompt, system_prompt, active_provider)
        else:
            raw, _ = await llm.generate(prompt, system_prompt, temperature=0.7)

        # Clean JSON if needed
        import re

        json_match = re.search(r"\{.*\}", raw, re.DOTALL)
        if json_match:
            raw = json_match.group(0)

        return json.loads(raw)
    except Exception as e:
        logger.error(f"Recipe generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
