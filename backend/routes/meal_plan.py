"""
AaharAI NutriSync — API Routes: Meal Plan, Grocery, Recipes
"""
from fastapi import APIRouter
from database.models import MealPlanRequest, RecipeRequest
from typing import Optional

router = APIRouter(prefix="/api/meal-plan", tags=["Meal Plan"])


@router.post("/generate")
async def generate_meal_plan(request: MealPlanRequest):
    """Generate a personalized meal plan using the agent."""
    from main import get_meal_agent
    agent = get_meal_agent()

    result = await agent.generate_meal_plan(
        profile=request.user_profile.model_dump(),
        days=request.days,
        budget_per_day=request.budget_per_day_inr,
    )
    return result


@router.post("/grocery")
async def generate_grocery_list(meal_plan_text: str, days: int = 7):
    """Generate a grocery shopping list from a meal plan."""
    from main import get_meal_agent
    agent = get_meal_agent()

    result = await agent.generate_grocery_list(meal_plan_text, days)
    return result


@router.post("/recipe")
async def generate_recipe(request: RecipeRequest):
    """Generate a detailed recipe from ingredients."""
    from main import get_meal_agent
    agent = get_meal_agent()

    result = await agent.generate_recipe(
        meal_name=request.meal_name,
        ingredients=request.ingredients,
        servings=request.servings,
    )
    return result
