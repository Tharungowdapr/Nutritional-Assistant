"""
AaharAI NutriSync — API Routes: Nutrition
"""
from fastapi import APIRouter, HTTPException, Request, Query
from pydantic import BaseModel
from slowapi import Limiter
from slowapi.util import get_remote_address
from database.models import UserProfile, NutrientTargets
from database.loader import db
from engines.inference_engine import inference_engine

router = APIRouter(prefix="/api/nutrition", tags=["Nutrition"])
limiter = Limiter(key_func=get_remote_address)

# IMP-014: Define valid sort columns
ALLOWED_SORT_COLS = {"Food Name", "Energy (kcal)", "Protein (g)",
                     "Fat (g)", "Carbs (g)", "Iron (mg)"}


class CompareRequest(BaseModel):
    food_names: list[str]


@router.post("/targets")
@limiter.limit("20/minute")
async def compute_targets(request: Request, profile: UserProfile):
    """Compute personalized nutrient targets from user profile."""
    targets = inference_engine.compute_targets(profile.model_dump())
    return {"targets": targets}


@router.get("/foods")
@limiter.limit("50/minute")
async def search_foods(
    request: Request,
    query: str = "",
    diet_type: str = None,
    food_group: str = None,
    region: str = None,
    page: int = Query(default=1, ge=1, le=1000),
    limit: int = Query(default=20, ge=1, le=100),
    sort_by: str = "Food Name",
    sort_order: str = "asc"
):
    """Search and filter foods from the database with pagination and sorting."""
    results = db.search_foods(query, diet_type, food_group, region)
    
    # IMP-014: Validate sort_by and handle exceptions properly
    if hasattr(results, 'sort_values'):
        ascending = sort_order.lower() == "asc"
        if sort_by not in ALLOWED_SORT_COLS:
            raise HTTPException(400, f'Invalid sort_by. Allowed: {ALLOWED_SORT_COLS}')
        try:
            results = results.sort_values(by=sort_by, ascending=ascending)
        except ValueError as e:
            # Log the error and return unsorted results
            import logging
            logging.warning(f"Sort failed: {e}")
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
