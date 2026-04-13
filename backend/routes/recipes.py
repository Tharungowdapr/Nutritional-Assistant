"""
AaharAI NutriSync — Recipe API Routes
Save, retrieve, and manage user recipes with history tracking.
"""
import json
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from auth.database import get_db, RecipeDB, RecipeHistoryDB, UserDB
from auth.dependencies import require_user
from pydantic import BaseModel

router = APIRouter(prefix="/api/recipes", tags=["Recipes"])


class RecipeIngredient(BaseModel):
    name: str
    quantity: float
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
        created_at=recipe.created_at.isoformat() if hasattr(recipe.created_at, 'isoformat') else "",  # type: ignore
    )


@router.get("/list", response_model=list[RecipeResponse])
async def list_recipes(
    user: UserDB = Depends(require_user),
    db: Session = Depends(get_db),
):
    """List all recipes for the user."""
    recipes = db.query(RecipeDB).filter(RecipeDB.user_id == user.id).order_by(RecipeDB.created_at.desc()).all()
    
    result = []
    for recipe in recipes:
        result.append(RecipeResponse(
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
        ))
    
    return result


@router.get("/{recipe_id}", response_model=RecipeResponse)
async def get_recipe(
    recipe_id: int,
    user: UserDB = Depends(require_user),
    db: Session = Depends(get_db),
):
    """Get a specific recipe and track history."""
    recipe = db.query(RecipeDB).filter(
        RecipeDB.id == recipe_id,
        RecipeDB.user_id == user.id
    ).first()
    
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    
    # Track recipe history
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
    user: UserDB = Depends(require_user),
    db: Session = Depends(get_db),
):
    """Get user's recipe viewing history."""
    history = db.query(RecipeHistoryDB).filter(
        RecipeHistoryDB.user_id == user.id
    ).order_by(RecipeHistoryDB.viewed_at.desc()).limit(20).all()
    
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
    recipe = db.query(RecipeDB).filter(
        RecipeDB.id == recipe_id,
        RecipeDB.user_id == user.id
    ).first()
    
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    
    db.delete(recipe)
    db.commit()
    return {"message": "Recipe deleted"}
