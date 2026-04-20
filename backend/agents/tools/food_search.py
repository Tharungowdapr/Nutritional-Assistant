"""
AaharAI NutriSync — Agent Tool: Food Search
Searches the IFCT database for foods matching a query.
"""
from database.loader import db


def search_foods_tool(query: str, diet_type: str = None, food_group: str = None,
                      limit: int = 20) -> list[dict]:
    """Search IFCT database for foods.
    
    Args:
        query: Text search (food name)
        diet_type: Filter by VEG/NON-VEG/VEGAN
        food_group: Filter by food group
        limit: Max results
    
    Returns:
        List of food dicts with nutrient data
    """
    results = db.search_foods(query=query, diet_type=diet_type, food_group=food_group)

    output = []
    # db.search_foods may return a DataFrame or an empty list; handle both
    if isinstance(results, list):
        rows = results[:limit]
        for row in rows:
            food = {
                "name": row.get("name") or row.get("Food Name", ""),
                "food_group": row.get("food_group") or row.get("Food Group", ""),
                "diet_type": row.get("diet_type") or row.get("Diet Type", ""),
                "energy_kcal": _safe_float(row.get("energy_kcal") or row.get("Energy (kcal)")),
                "protein_g": _safe_float(row.get("protein_g") or row.get("Protein (g)")),
                "fat_g": _safe_float(row.get("fat_g") or row.get("Fat (g)")),
                "carbs_g": _safe_float(row.get("carbs_g") or row.get("Carbs (g)")),
                "fibre_g": _safe_float(row.get("fibre_g") or row.get("Fibre (g)")),
                "iron_mg": _safe_float(row.get("iron_mg") or row.get("Iron (mg)")),
                "calcium_mg": _safe_float(row.get("calcium_mg") or row.get("Calcium (mg)")),
                "source": "IFCT_2017",
            }
            output.append(food)
        return output

    # Otherwise assume DataFrame-like
    foods = results.head(limit)
    for _, row in foods.iterrows():
        food = {
            "name": row.get("Food Name", ""),
            "food_group": row.get("Food Group", ""),
            "diet_type": row.get("Diet Type", ""),
            "energy_kcal": _safe_float(row.get("Energy (kcal)")),
            "protein_g": _safe_float(row.get("Protein (g)")),
            "fat_g": _safe_float(row.get("Fat (g)")),
            "carbs_g": _safe_float(row.get("Carbs (g)")),
            "fibre_g": _safe_float(row.get("Fibre (g)")),
            "iron_mg": _safe_float(row.get("Iron (mg)")),
            "calcium_mg": _safe_float(row.get("Calcium (mg)")),
            "source": "IFCT_2017",
        }
        output.append(food)

    return output


def get_food_detail(food_name: str) -> dict | None:
    """Get detailed nutrient profile for a specific food."""
    food = db.get_food_by_name(food_name)
    if food is None:
        return None

    return {
        "name": food.get("Food Name", ""),
        "food_group": food.get("Food Group", ""),
        "diet_type": food.get("Diet Type", ""),
        "energy_kcal": _safe_float(food.get("Energy (kcal)")),
        "protein_g": _safe_float(food.get("Protein (g)")),
        "fat_g": _safe_float(food.get("Fat (g)")),
        "carbs_g": _safe_float(food.get("Carbs (g)")),
        "fibre_g": _safe_float(food.get("Fibre (g)")),
        "iron_mg": _safe_float(food.get("Iron (mg)")),
        "calcium_mg": _safe_float(food.get("Calcium (mg)")),
        "zinc_mg": _safe_float(food.get("Zinc (mg)")),
        "folate_mcg": _safe_float(food.get("Folate (mcg)")),
        "vit_b12_mcg": _safe_float(food.get("Vit B12 (mcg)")),
        "vit_d_mcg": _safe_float(food.get("Vit D (mcg)")),
        "vit_c_mg": _safe_float(food.get("Vit C (mg)")),
        "magnesium_mg": _safe_float(food.get("Magnesium (mg)")),
        "potassium_mg": _safe_float(food.get("Potassium (mg)")),
        "omega3_g": _safe_float(food.get("Omega-3 (g)")),
        "gi": _safe_float(food.get("GI (Glycaemic Index)")),
        "source": "IFCT_2017",
    }


def _safe_float(val) -> float:
    """Safely convert a value to float, returning 0.0 on failure."""
    try:
        import math
        f = float(val)
        return 0.0 if math.isnan(f) else round(f, 2)
    except (ValueError, TypeError):
        return 0.0
