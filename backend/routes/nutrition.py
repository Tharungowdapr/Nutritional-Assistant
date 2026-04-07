"""
AaharAI NutriSync — API Routes: Nutrition
"""
from fastapi import APIRouter, HTTPException
from database.models import UserProfile, NutrientTargets
from database.loader import db
from engines.inference_engine import inference_engine

router = APIRouter(prefix="/api/nutrition", tags=["Nutrition"])


@router.post("/targets")
async def compute_targets(profile: UserProfile):
    """Compute personalized nutrient targets from user profile."""
    targets = inference_engine.compute_targets(profile.model_dump())
    return {"targets": targets}


@router.get("/foods")
async def search_foods(query: str = "", diet_type: str = None, food_group: str = None):
    """Search and filter foods from the database."""
    results = db.search_foods(query, diet_type, food_group)
    foods = results.head(50).to_dict(orient="records")
    return {"foods": foods, "total": len(results)}


@router.get("/foods/{food_name}")
async def get_food(food_name: str):
    """Get full nutrient profile for a specific food."""
    food = db.get_food_by_name(food_name)
    if not food:
        raise HTTPException(404, f"Food '{food_name}' not found")
    return {"food": food}


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
