"""
AaharAI NutriSync — API Routes: Analysis
Data analysis and insights endpoints for nutrition trends.
"""
from fastapi import APIRouter
from database.loader import db

router = APIRouter(prefix="/api/analysis", tags=["Analysis"])


@router.get("/food-group-stats")
async def get_food_group_stats():
    """Get distribution of foods by group and key nutrients."""
    if not getattr(db, 'food', None) is not None:
        return {"error": "Database not loaded"}
    
    stats = []
    for group in db.food["Food Group"].unique():
        group_foods = db.food[db.food["Food Group"] == group]
        stats.append({
            "food_group": group,
            "count": len(group_foods),
            "avg_calories": (group_foods["Energy (kcal)"].mean() or 0),
            "avg_protein": (group_foods["Protein (g)"].mean() or 0),
        })
    
    return {"groups": stats}


@router.get("/veg-nonveg")
async def get_veg_nonveg_stats():
    """Compare vegetarian vs non-vegetarian foods."""
    if not getattr(db, 'food', None) is not None:
        return {"error": "Database not loaded"}
    
    veg = db.food[db.food["Diet Type"] == "VEG"]
    nonveg = db.food[db.food["Diet Type"] == "NON-VEG"]
    
    return {
        "vegetarian": {
            "count": len(veg),
            "avg_calories": (veg["Energy (kcal)"].mean() or 0),
            "avg_protein": (veg["Protein (g)"].mean() or 0),
            "avg_iron": (veg["Iron (mg)"].mean() or 0),
        },
        "non_vegetarian": {
            "count": len(nonveg),
            "avg_calories": (nonveg["Energy (kcal)"].mean() or 0),
            "avg_protein": (nonveg["Protein (g)"].mean() or 0),
            "avg_iron": (nonveg["Iron (mg)"].mean() or 0),
        }
    }


@router.get("/top-protein-foods")
async def get_top_protein_foods(limit: int = 10):
    """Get top protein sources."""
    if not getattr(db, 'food', None) is not None:
        return {"error": "Database not loaded"}
    
    top = db.food.nlargest(limit, "Protein (g)")[
        ["Food Name", "Protein (g)", "Diet Type", "Food Group"]
    ].to_dict(orient="records")
    
    return {"foods": top}


@router.get("/iron-analysis")
async def get_iron_analysis():
    """Analyze iron content across foods - India's #1 deficiency."""
    if not getattr(db, 'food', None) is not None:
        return {"error": "Database not loaded"}
    
    veg = db.food[db.food["Diet Type"] == "VEG"]["Iron (mg)"].describe().to_dict()
    nonveg = db.food[db.food["Diet Type"] == "NON-VEG"]["Iron (mg)"].describe().to_dict()
    
    return {
        "vegetarian_iron": veg,
        "non_vegetarian_iron": nonveg,
        "top_iron_sources": db.food.nlargest(5, "Iron (mg)")[
            ["Food Name", "Iron (mg)", "Diet Type"]
        ].to_dict(orient="records")
    }


@router.get("/b12-analysis")
async def get_b12_analysis():
    """Analyze B12 content - vegetarian crisis."""
    if not getattr(db, 'food', None) is not None:
        return {"error": "Database not loaded"}
    
    veg = db.food[db.food["Diet Type"] == "VEG"]
    nonveg = db.food[db.food["Diet Type"] == "NON-VEG"]
    
    return {
        "veg_with_b12": len(veg[veg["Vit B12 (mcg)"] > 0]),
        "veg_avg_b12": (veg["Vit B12 (mcg)"].mean() or 0),
        "nonveg_avg_b12": (nonveg["Vit B12 (mcg)"].mean() or 0),
        "top_sources": db.food.nlargest(5, "Vit B12 (mcg)")[
            ["Food Name", "Vit B12 (mcg)", "Diet Type"]
        ].to_dict(orient="records")
    }


@router.get("/gi-distribution")
async def get_gi_distribution():
    """Get Glycaemic Index distribution."""
    if not getattr(db, 'food', None) is not None:
        return {"error": "Database not loaded"}
    
    food_clean = db.food.dropna(subset=["GI (Glycaemic Index)"])
    
    return {
        "low_gi": len(food_clean[food_clean["GI (Glycaemic Index)"] < 56]),
        "medium_gi": len(food_clean[(food_clean["GI (Glycaemic Index)"] >= 56) & (food_clean["GI (Glycaemic Index)"] <= 69)]),
        "high_gi": len(food_clean[food_clean["GI (Glycaemic Index)"] > 69]),
    }


@router.get("/calorie-distribution")
async def get_calorie_distribution():
    """Get food distribution by caloric density."""
    if not getattr(db, 'food', None) is not None:
        return {"error": "Database not loaded"}
    
    food_clean = db.food.dropna(subset=["Energy (kcal)"])
    
    return {
        "low_calorie": len(food_clean[food_clean["Energy (kcal)"] < 100]),
        "medium_calorie": len(food_clean[(food_clean["Energy (kcal)"] >= 100) & (food_clean["Energy (kcal)"] < 300)]),
        "high_calorie": len(food_clean[food_clean["Energy (kcal)"] >= 300]),
        "avg_calories": (food_clean["Energy (kcal)"].mean() or 0),
    }


@router.get("/nutrient-summary")
async def get_nutrient_summary():
    """Get overall nutrient statistics."""
    if not getattr(db, 'food', None) is not None:
        return {"error": "Database not loaded"}
    
    return {
        "total_foods": len(db.food),
        "food_groups": len(db.food["Food Group"].unique()),
        "diet_types": db.food["Diet Type"].unique().tolist(),
        "avg_nutrients": {
            "calories": (db.food["Energy (kcal)"].mean() or 0),
            "protein": (db.food["Protein (g)"].mean() or 0),
            "fat": (db.food["Fat (g)"].mean() or 0),
            "carbs": (db.food["Carbs (g)"].mean() or 0),
            "iron": (db.food["Iron (mg)"].mean() or 0),
            "calcium": (db.food["Calcium (mg)"].mean() or 0),
        }
    }
