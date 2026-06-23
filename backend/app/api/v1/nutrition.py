"""
AaharAI NutriSync — API Routes: Nutrition
"""

from fastapi import APIRouter, HTTPException, Request, Query, Depends
from pydantic import BaseModel
from slowapi import Limiter
from slowapi.util import get_remote_address
from app.db.models import UserProfile
from app.db.loader import db
from app.api.v1.customer_profile import _match_rda_profile, _calc_bmr, PAL_MAP
from app.core.dependencies import require_user

router = APIRouter(prefix="/api/nutrition", tags=["Nutrition"])
limiter = Limiter(key_func=get_remote_address)

ALLOWED_SORT_COLS = {"Food Name", "Energy (kcal)", "Protein (g)", "Fat (g)", "Carbs (g)", "Iron (mg)"}


class CompareRequest(BaseModel):
    food_names: list[str]


@router.post("/targets")
@limiter.limit("20/minute")
async def compute_targets(request: Request, profile: UserProfile):
    """Compute personalized nutrient targets from user profile.
    Uses ICMR-NIN 2024 RDA matching + Mifflin-St Jeor BMR.
    """
    p = profile.model_dump()

    w = float(p.get("weight_kg") or 65)
    h = float(p.get("height_cm") or 165)
    a = float(p.get("age") or 25)
    g = p.get("gender") or p.get("sex") or "Male"
    act = (p.get("activity_level") or p.get("profession") or p.get("physical_activity") or "moderate").lower()

    bmr = _calc_bmr(w, h, a, g)
    pal = PAL_MAP.get(act, 1.6)
    tdee = round(bmr * pal)

    rda = _match_rda_profile({"age": a, "gender": g, "activity_level": act})

    if rda:
        targets = {
            "calories": rda["energy"],
            "protein_g": rda["protein_g"],
            "fat_g": rda.get("fat_g", 65),
            "carbs_g": rda.get("carbs_g", 275),
            "fibre_g": rda.get("fibre_g", 30),
            "iron_mg": rda.get("iron_mg", 17),
            "calcium_mg": rda.get("calcium_mg", 600),
            "zinc_mg": rda.get("zinc_mg", 17),
            "folate_mcg": rda.get("folate_mcg", 300),
            "vit_b12_mcg": rda.get("b12_mcg", 2.2),
            "vit_d_mcg": 15.0,
            "vit_c_mg": rda.get("vit_c_mg", 40),
            "magnesium_mg": 310.0,
            "omega3_g": 1.1,
            "bmr": bmr,
            "tdee": tdee,
            "pal": pal,
            "rda_profile": rda.get("profile", ""),
            "source": "ICMR-NIN 2024",
        }
    else:
        # Fallback: generic targets from BMR
        targets = {
            "calories": tdee,
            "protein_g": round(w * 0.88),
            "fat_g": 65,
            "carbs_g": 275,
            "fibre_g": 30,
            "iron_mg": 17,
            "calcium_mg": 600,
            "zinc_mg": 17,
            "folate_mcg": 300,
            "vit_b12_mcg": 2.2,
            "vit_d_mcg": 15.0,
            "vit_c_mg": 40,
            "magnesium_mg": 310.0,
            "omega3_g": 1.1,
            "bmr": bmr,
            "tdee": tdee,
            "pal": pal,
            "source": "Estimated (no RDA match)",
        }

    return {"targets": targets}


@router.get("/foods")
@limiter.limit("50/minute")
async def search_foods(
    request: Request,
    query: str = "",
    diet_type: str = None,
    food_group: str = None,
    region: str = None,
    gi_category: str = None,
    page: int = Query(default=1, ge=1, le=1000),
    limit: int = Query(default=20, ge=1, le=500),
    sort_by: str = "Food Name",
    sort_order: str = "asc",
    user=Depends(require_user),
):
    """Search and filter foods from the database with pagination and sorting."""
    results = db.search_foods(query, diet_type, food_group, region, gi_category)

    if hasattr(results, "sort_values"):
        ascending = sort_order.lower() == "asc"
        if sort_by not in ALLOWED_SORT_COLS:
            raise HTTPException(status_code=400, detail=f"Invalid sort_by. Allowed: {ALLOWED_SORT_COLS}")
        try:
            results = results.sort_values(by=sort_by, ascending=ascending)
        except Exception as e:
            import logging

            logging.error(f"Failed to sort foods by '{sort_by}': {e}")

    total = len(results) if hasattr(results, "__len__") else 0
    skip = (page - 1) * limit
    foods = results.iloc[skip : skip + limit].to_dict(orient="records") if hasattr(results, "iloc") else []

    # Return list when limit is specified without page param for backward compatibility
    if page == 1:
        return foods
    return {"foods": foods, "total": total, "page": page, "limit": limit, "pages": (total + limit - 1) // limit}


@router.post("/foods/compare")
async def compare_foods(request: CompareRequest):
    """Compare nutritional profiles of 2-4 foods.

    NOTE: This route is registered BEFORE /foods/{food_name} so FastAPI
    matches /foods/compare correctly rather than treating 'compare' as a food_name.
    """
    food_names = request.food_names
    if not food_names or len(food_names) > 4:
        raise HTTPException(status_code=400, detail="Please provide 2-4 food names")

    foods = []
    for name in food_names:
        food = db.get_food_by_name(name)
        if food:
            foods.append(food)

    if not foods:
        raise HTTPException(status_code=404, detail="No foods found")

    return {"foods": foods}


@router.get("/foods/{food_name}")
async def get_food(food_name: str):
    """Get full nutrient profile for a specific food."""
    food = db.get_food_by_name(food_name)
    if not food:
        raise HTTPException(status_code=404, detail=f"Food '{food_name}' not found")
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
        raise HTTPException(status_code=404, detail=f"RDA profile '{profile_name}' not found")
    return {"rda": rda}


@router.get("/diseases")
async def list_diseases():
    """List all disease protocols."""
    if getattr(db, "disease", None) is None:
        return {"diseases": []}
    diseases = db.disease[["Condition"]].drop_duplicates().to_dict(orient="records")
    return {"diseases": diseases}


@router.get("/regions")
async def list_regions():
    """List regional food culture data."""
    if getattr(db, "region", None) is None:
        return {"regions": []}
    regions = db.region[["Zone", "State/UT", "Dietary Character"]].to_dict(orient="records")
    return {"regions": regions}
