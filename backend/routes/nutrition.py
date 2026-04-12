"""
AaharAI NutriSync — API Routes: Nutrition
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database.models import UserProfile, NutrientTargets
from database.loader import db
from engines.inference_engine import inference_engine

router = APIRouter(prefix="/api/nutrition", tags=["Nutrition"])


class CompareRequest(BaseModel):
    food_names: list[str]


@router.post("/targets")
async def compute_targets(profile: UserProfile):
    """Compute personalized nutrient targets from user profile."""
    targets = inference_engine.compute_targets(profile.model_dump())
    return {"targets": targets}


@router.get("/foods")
async def search_foods(
    query: str = "",
    diet_type: str = None,
    food_group: str = None,
    page: int = 1,
    limit: int = 20,
    sort_by: str = "Food Name",
    sort_order: str = "asc"
):
    """Search and filter foods from the database with pagination and sorting."""
    results = db.search_foods(query, diet_type, food_group)
    
    # Apply sorting
    if hasattr(results, 'sort_values'):
        ascending = sort_order.lower() == "asc"
        try:
            results = results.sort_values(by=sort_by, ascending=ascending)
        except:
            pass
    
    # Apply pagination
    total = len(results) if hasattr(results, '__len__') else 0
    skip = (page - 1) * limit
    foods = results.iloc[skip:skip + limit].to_dict(orient="records") if hasattr(results, 'iloc') else []
    
    return {
        "foods": foods,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit
    }


@router.get("/foods/{food_name}")
async def get_food(food_name: str):
    """Get full nutrient profile for a specific food."""
    food = db.get_food_by_name(food_name)
    if not food:
        raise HTTPException(404, f"Food '{food_name}' not found")
    return {"food": food}


@router.post("/foods/compare")
async def compare_foods(request: CompareRequest):
    """Compare nutritional profiles of 2-4 foods."""
    food_names = request.food_names
    if not food_names or len(food_names) > 4:
        raise HTTPException(400, "Please provide 2-4 food names")
    
    foods = []
    for name in food_names:
        food = db.get_food_by_name(name)
        if food:
            foods.append(food)
    
    if not foods:
        raise HTTPException(404, "No foods found")
    
    return {"foods": foods}



@router.get("/food-groups")
async def list_food_groups():
    """List all available food groups."""
    return {"food_groups": db.food_groups}


@router.get("/rda/{profile_name}")
async def get_rda(profile_name: str):
    """Get RDA targets for a specific life stage profile."""
    rda = db.get_rda(profile_name)
    if not rda:
        raise HTTPException(404, f"RDA profile '{profile_name}' not found")
    return {"rda": rda}


@router.get("/diseases")
async def list_diseases():
    """List all disease protocols."""
    diseases = db.disease[["Condition"]].drop_duplicates().to_dict(orient="records")
    return {"diseases": diseases}


@router.get("/regions")
async def list_regions():
    """List regional food culture data."""
    regions = db.region[["Zone", "State/UT", "Dietary Character"]].to_dict(orient="records")
    return {"regions": regions}
