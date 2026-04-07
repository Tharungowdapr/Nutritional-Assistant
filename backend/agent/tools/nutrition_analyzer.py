"""
AaharAI NutriSync — Agent Tool: Nutrition Analyzer
Computes nutrient totals for a meal (list of foods with portions).
"""
from agent.tools.food_search import get_food_detail, _safe_float


def analyze_meal(foods_with_portions: list[dict]) -> dict:
    """Compute total nutrients for a meal.
    
    Args:
        foods_with_portions: List of {"name": "Ragi", "quantity_g": 150}
    
    Returns:
        Dict with total nutrients and per-food breakdown
    """
    totals = {
        "energy_kcal": 0, "protein_g": 0, "fat_g": 0, "carbs_g": 0,
        "fibre_g": 0, "iron_mg": 0, "calcium_mg": 0, "zinc_mg": 0,
        "folate_mcg": 0, "vit_b12_mcg": 0, "vit_c_mg": 0,
    }

    breakdown = []

    for item in foods_with_portions:
        name = item.get("name", "")
        quantity_g = item.get("quantity_g", 100)
        factor = quantity_g / 100.0  # IFCT data is per 100g

        detail = get_food_detail(name)
        if detail is None:
            breakdown.append({"name": name, "quantity_g": quantity_g, "found": False})
            continue

        item_nutrients = {}
        for key in totals:
            val = detail.get(key, 0.0) * factor
            totals[key] += val
            item_nutrients[key] = round(val, 2)

        breakdown.append({
            "name": name,
            "quantity_g": quantity_g,
            "found": True,
            "nutrients": item_nutrients,
        })

    # Round totals
    for key in totals:
        totals[key] = round(totals[key], 2)

    return {
        "totals": totals,
        "breakdown": breakdown,
        "food_count": len(foods_with_portions),
    }
