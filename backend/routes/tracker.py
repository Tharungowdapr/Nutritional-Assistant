"""
AaharAI NutriSync — API Routes: Nutrition Tracker
Daily food logging with macro tracking.
"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timedelta, timezone
from sqlalchemy import func

from auth.database import get_db, DailyLogDB, UserDB
from auth.dependencies import require_user
from database.models import LogFoodRequest, DailyLogResponse, DailySummaryResponse
from database.loader import db

router = APIRouter(prefix="/api/tracker", tags=["Tracker"])


@router.post("/log-food")
async def log_food(
    request: LogFoodRequest,
    current_user: UserDB = Depends(require_user),
    db_session = Depends(get_db),
):
    """Log a food item for today."""
    today = datetime.utcnow().strftime("%Y-%m-%d")
    
    # Get food nutritional data
    food_data = db.get_food_by_name(request.food_name)
    if not food_data:
        raise HTTPException(404, f"Food '{request.food_name}' not found in database")
    
    # Calculate macros for the given quantity
    quantity_multiplier = request.quantity_g / 100.0
    
    log = DailyLogDB(
        user_id=current_user.id,
        log_date=today,
        meal_slot=request.meal_slot,
        food_name=request.food_name,
        quantity_g=request.quantity_g,
        calories=(food_data.get("Energy (kcal)", 0) or 0) * quantity_multiplier,
        protein_g=(food_data.get("Protein (g)", 0) or 0) * quantity_multiplier,
        fat_g=(food_data.get("Fat (g)", 0) or 0) * quantity_multiplier,
        carbs_g=(food_data.get("Carbs (g)", 0) or 0) * quantity_multiplier,
        fibre_g=(food_data.get("Fibre (g)", 0) or 0) * quantity_multiplier,
        iron_mg=(food_data.get("Iron (mg)", 0) or 0) * quantity_multiplier,
        calcium_mg=(food_data.get("Calcium (mg)", 0) or 0) * quantity_multiplier,
    )
    
    db_session.add(log)
    db_session.commit()
    
    return {
        "id": log.id,
        "logged_at": today,
        "meal_slot": log.meal_slot,
        "food_name": log.food_name,
        "quantity_g": log.quantity_g,
        "calories": log.calories,
        "protein_g": log.protein_g,
        "carbs_g": log.carbs_g,
        "fat_g": log.fat_g,
    }


@router.get("/daily/{log_date}")
async def get_daily_summary(
    log_date: str,  # YYYY-MM-DD
    current_user: UserDB = Depends(require_user),
    db_session = Depends(get_db),
):
    """Get daily summary with all meals logged."""
    logs = db_session.query(DailyLogDB).filter(
        DailyLogDB.user_id == current_user.id,
        DailyLogDB.log_date == log_date,
    ).all()
    
    # Group by meal slot
    meals_by_slot = {}
    total_calories = 0
    total_protein = 0
    total_carbs = 0
    total_fat = 0
    
    for log in logs:
        slot = log.meal_slot
        if slot not in meals_by_slot:
            meals_by_slot[slot] = []
        
        meals_by_slot[slot].append({
            "id": log.id,
            "food_name": log.food_name,
            "quantity_g": log.quantity_g,
            "calories": log.calories or 0,
            "protein_g": log.protein_g or 0,
            "carbs_g": log.carbs_g or 0,
            "fat_g": log.fat_g or 0,
        })
        
        total_calories += log.calories or 0
        total_protein += log.protein_g or 0
        total_carbs += log.carbs_g or 0
        total_fat += log.fat_g or 0
    
    return {
        "log_date": log_date,
        "total_calories": round(total_calories, 1),
        "total_protein_g": round(total_protein, 1),
        "total_carbs_g": round(total_carbs, 1),
        "total_fat_g": round(total_fat, 1),
        "meal_count": len(logs),
        "meals_by_slot": meals_by_slot,
    }


@router.get("/summary")
async def get_summary(
    days: int = 7,
    current_user: UserDB = Depends(require_user),
    db_session = Depends(get_db),
):
    """Get summary for the last X days."""
    if days > 90:
        raise HTTPException(400, "Maximum history range is 90 days")
        
    start_date = (datetime.now(timezone.utc) - timedelta(days=days)).strftime("%Y-%m-%d")
    logs = db_session.query(DailyLogDB).filter(
        DailyLogDB.user_id == current_user.id,
        DailyLogDB.log_date >= start_date,
    ).order_by(DailyLogDB.log_date.desc()).all()
    
    daily_summary = {}
    for log in logs:
        if log.log_date not in daily_summary:
            daily_summary[log.log_date] = {
                "calories": 0,
                "protein": 0,
                "carbs": 0,
                "fat": 0,
                "meal_count": 0,
            }
        
        daily_summary[log.log_date]["calories"] += log.calories or 0
        daily_summary[log.log_date]["protein"] += log.protein_g or 0
        daily_summary[log.log_date]["carbs"] += log.carbs_g or 0
        daily_summary[log.log_date]["fat"] += log.fat_g or 0
        daily_summary[log.log_date]["meal_count"] += 1
    
    # Generate list for frontend charts
    chart_data = []
    current = datetime.now(timezone.utc)
    for i in range(days):
        d_str = (current - timedelta(days=i)).strftime("%Y-%m-%d")
        stats = daily_summary.get(d_str, {"calories": 0, "protein": 0, "carbs": 0, "fat": 0, "meal_count": 0})
        chart_data.append({"date": d_str, **stats})

    # Link Person Analysis: Contextual Insights
    # Example: If protein is low for a Heavy Laborer, or iron is low for a pregnant woman
    insight = "Great consistency! Keep logging to see long-term trends."
    if current_user.profile:
        # Simple rule-based insight for now
        total_protein = sum(d["protein"] for d in daily_summary.values())
        avg_protein = total_protein / max(len(daily_summary), 1)
        if current_user.profile.get("activity_level") == "Heavy Labor" and avg_protein < 100:
            insight = "Based on your Heavy Labor profile, you should aim for more protein (up to 1.5g per kg)."
        elif current_user.profile.get("gender") == "Female" and avg_protein < 50:
            insight = "Consider slightly increasing protein for better ICMR/NIN balance."

    return {
        "range_days": days,
        "daily_data": chart_data[::-1],  # Chronological order
        "avg_daily_calories": round(sum(d["calories"] for d in daily_summary.values()) / max(len(daily_summary), 1), 1) if daily_summary else 0,
        "insight": insight
    }


@router.delete("/logs/{log_id}")
async def delete_log(
    log_id: int,
    current_user: UserDB = Depends(require_user),
    db_session = Depends(get_db),
):
    """Delete a food log entry."""
    log = db_session.query(DailyLogDB).filter(
        DailyLogDB.id == log_id,
        DailyLogDB.user_id == current_user.id,
    ).first()
    
    if not log:
        raise HTTPException(404, "Log not found")
    
    db_session.delete(log)
    db_session.commit()
    
    return {"deleted": True}
