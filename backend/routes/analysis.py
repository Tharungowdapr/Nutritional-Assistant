from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database.loader import db
from auth.database import get_db, DailyLogDB
from auth.dependencies import get_current_user

router = APIRouter(prefix="/api/analysis", tags=["Analysis"])


@router.get("/food-group-stats")
async def get_food_group_stats():
    """Get distribution of foods by group and key nutrients."""
    if getattr(db, 'food', None) is None:
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
    if getattr(db, 'food', None) is None:
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
    if getattr(db, 'food', None) is None:
        return {"error": "Database not loaded"}
    
    top = db.food.nlargest(limit, "Protein (g)")[
        ["Food Name", "Protein (g)", "Diet Type", "Food Group"]
    ].to_dict(orient="records")
    
    return {"foods": top}


@router.get("/iron-analysis")
async def get_iron_analysis():
    """Analyze iron content across foods - India's #1 deficiency."""
    if getattr(db, 'food', None) is None:
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
    if getattr(db, 'food', None) is None:
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
    if getattr(db, 'food', None) is None:
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
    if getattr(db, 'food', None) is None:
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
    if getattr(db, 'food', None) is None:
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

@router.get("/personal")
async def get_personal_analysis(
    user=Depends(get_current_user),
    db_session: Session = Depends(get_db),
):
    """Deep dive analysis of the user's logged food vs RDA targets."""
    if user is None:
        return {"error": "Not logged in"}
    
    # Fetch last 14 days of logs
    two_weeks_ago = (datetime.utcnow() - timedelta(days=14)).strftime("%Y-%m-%d")
    
    logs = (
        db_session.query(DailyLogDB)
        .filter(DailyLogDB.user_id == user.id)
        .filter(DailyLogDB.log_date >= two_weeks_ago)
        .all()
    )
    
    if not logs:
        return {"has_data": False, "message": "Log some meals to see your personalized analysis."}

    # Aggregate by date
    daily_stats = {}
    for log in logs:
        date = log.log_date
        if date not in daily_stats:
            daily_stats[date] = {"calories": 0, "protein": 0, "iron": 0, "fat": 0, "carbs": 0}
        
        daily_stats[date]["calories"] += log.calories or 0
        daily_stats[date]["protein"] += log.protein_g or 0
        daily_stats[date]["iron"] += log.iron_mg or 0
        daily_stats[date]["fat"] += log.fat_g or 0
        daily_stats[date]["carbs"] += log.carbs_g or 0

    # Calculate averages
    days_logged = len(daily_stats)
    avg_nutrients = {
        "calories": sum(d["calories"] for d in daily_stats.values()) / days_logged,
        "protein": sum(d["protein"] for d in daily_stats.values()) / days_logged,
        "iron": sum(d["iron"] for d in daily_stats.values()) / days_logged,
        "fat": sum(d["fat"] for d in daily_stats.values()) / days_logged,
        "carbs": sum(d["carbs"] for d in daily_stats.values()) / days_logged,
    }

    # Compare with RDA (Simplified logic for now)
    profile = user.profile
    
    # Insights generation
    insights = []
    if avg_nutrients["protein"] < 50:
        insights.append("Your protein intake is consistently below the 60g RDA. Try adding more pulses or dairy.")
    if avg_nutrients["iron"] < 15:
        insights.append("Iron levels are low. Consider green leafy vegetables or iron-fortified cereals.")
    if avg_nutrients["calories"] > 2500:
        insights.append("Energy intake is high relative to average requirements. Monitor portion sizes.")

    return {
        "has_data": True,
        "avg_nutrients": avg_nutrients,
        "days_logged": days_logged,
        "daily_history": [
            {"date": d, **v} for d, v in sorted(daily_stats.items())
        ],
        "insights": insights
    }

@router.get("/intelligence")
async def get_database_intelligence():
    """Get summarized intelligence from all 12 sheets for home page display."""
    try:
        if getattr(db, 'food', None) is None:
            return {"error": "Database not loaded"}
        
        # Helper to get nunique safely
        def get_nunique(df, col):
            return df[col].nunique() if col in df.columns else 0

        # 1. Food Stats
        food_stats = {
            "total": len(db.food),
            "groups": get_nunique(db.food, "Food Group"),
            "diet_types": db.food["Diet Type"].unique().tolist() if "Diet Type" in db.food.columns else []
        }
        
        # 2. RDA Insight
        rda_insight = {
            "profiles": len(db.rda) if hasattr(db, 'rda') else 0,
            "sample": db.rda["Profile"].iloc[0] if hasattr(db, 'rda') and not db.rda.empty else "N/A"
        }
        
        # 3. Disease Insight
        disease_insight = {
            "conditions_count": get_nunique(db.disease, "Condition") if hasattr(db, 'disease') else 0,
            "top_conditions": db.disease["Condition"].value_counts().head(3).index.tolist() if hasattr(db, 'disease') and "Condition" in db.disease.columns else []
        }
        
        # 4. Regional Insight
        regional_insight = {
            "zones": get_nunique(db.region, "Zone") if hasattr(db, 'region') else 0,
            "states": get_nunique(db.region, "State/UT") if hasattr(db, 'region') else 0
        }
        
        # 5. Medicine Insight
        medicine_insight = {
            "interactions": len(db.medicine) if hasattr(db, 'medicine') else 0,
            "sample_medicine": db.medicine["Brand Name (India)"].iloc[0] if hasattr(db, 'medicine') and not db.medicine.empty and "Brand Name (India)" in db.medicine.columns else "N/A"
        }
    
        # 6. Profession Insight
        prof_val = 0
        if hasattr(db, 'profession') and not db.profession.empty and "Male Kcal/day (65kg ref)" in db.profession.columns:
            try:
                prof_val = abs(db.profession["Male Kcal/day (65kg ref)"].max() - db.profession["Male Kcal/day (65kg ref)"].min())
            except:
                pass

        prof_insight = {
            "categories": len(db.profession) if hasattr(db, 'profession') else 0,
            "diff_kcal": float(prof_val)
        }
    
        # 7. Life Stages / Physio
        life_insight = len(db.lifestage) if hasattr(db, 'lifestage') else 0
        physio_insight = len(db.physio) if hasattr(db, 'physio') else 0
    
        return {
            "food": food_stats,
            "rda": rda_insight,
            "disease": disease_insight,
            "region": regional_insight,
            "medicine": medicine_insight,
            "profession": prof_insight,
            "life_stages": life_insight,
            "physio_states": physio_insight
        }
    except Exception as e:
        # Fallback to empty intel to avoid 500
        return {
            "error": str(e),
            "food": {"total": 0, "groups": 0, "diet_types": []},
            "rda": {"profiles": 0, "sample": "N/A"},
            "disease": {"conditions_count": 0, "top_conditions": []},
            "region": {"zones": 0, "states": 0},
            "medicine": {"interactions": 0, "sample_medicine": "N/A"},
            "profession": {"categories": 0, "diff_kcal": 0},
            "life_stages": 0,
            "physio_states": 0
        }
