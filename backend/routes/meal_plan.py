"""
AaharAI NutriSync — API Routes: Meal Plan, Grocery, Recipes
Now with persistence for logged-in users.
"""
import json
from fastapi import APIRouter, Depends, HTTPException, status
from typing import Optional
from sqlalchemy.orm import Session

from database.models import MealPlanRequest, RecipeRequest, GroceryRequest
from auth.database import get_db, MealPlanDB
from auth.dependencies import get_current_user

router = APIRouter(prefix="/api/meal-plan", tags=["Meal Plan"])


@router.post("/generate")
async def generate_meal_plan(
    request: MealPlanRequest,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Generate a personalized meal plan using the agent."""
    from main import get_meal_agent
    agent = get_meal_agent()
    if agent is None:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Meal agent unavailable")

    result = await agent.generate_meal_plan(
        profile=request.user_profile.model_dump(),
        days=request.days,
        budget_per_day=request.budget_per_day_inr,
    )

    # Save to DB if user is logged in
    if user is not None:
        try:
            plan = MealPlanDB(
                user_id=user.id,
                plan_text=result.get("meal_plan", {}).get("plan_text", ""),
                targets_json=json.dumps(result.get("targets", {})),
                days=request.days,
                budget=request.budget_per_day_inr,
            )
            db.add(plan)
            db.commit()
            db.refresh(plan)
            result["plan_id"] = plan.id
        except Exception:
            pass

    return result


@router.get("/history")
async def get_meal_plan_history(
    limit: int = 10,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get saved meal plans for the logged-in user."""
    if user is None:
        return {"plans": []}

    plans = (
        db.query(MealPlanDB)
        .filter(MealPlanDB.user_id == user.id)
        .order_by(MealPlanDB.created_at.desc())
        .limit(limit)
        .all()
    )
    return {
        "plans": [
            {
                "id": p.id,
                "plan_text": p.plan_text,
                "targets": json.loads(p.targets_json) if p.targets_json else {},
                "days": p.days,
                "budget": p.budget,
                "created_at": p.created_at.isoformat() if p.created_at else None,
            }
            for p in plans
        ]
    }


@router.post("/grocery")
async def generate_grocery_list(request: GroceryRequest):
    """Generate a grocery shopping list from a meal plan."""
    from main import get_meal_agent
    agent = get_meal_agent()
    if agent is None:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Meal agent unavailable")
    result = await agent.generate_grocery_list(request.meal_plan_text, request.days)
    return result


@router.post("/recipe")
async def generate_recipe(request: RecipeRequest):
    """Generate a detailed recipe from ingredients."""
    from main import get_meal_agent
    agent = get_meal_agent()
    if agent is None:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Meal agent unavailable")
    result = await agent.generate_recipe(
        meal_name=request.meal_name,
        ingredients=request.ingredients,
        servings=request.servings,
    )
    return result
