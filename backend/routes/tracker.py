"""
AaharAI NutriSync — API Routes: Nutrition Tracker
Daily food logging with macro tracking.
"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime
from sqlalchemy import func

from auth.database import SessionLocal, get_db, DailyLogDB, UserDB
from auth.dependencies import get_current_user
from database.models import LogFoodRequest, DailyLogResponse, DailySummaryResponse
from database.loader import db

router = APIRouter(prefix="/api/tracker", tags=["Tracker"])


@router.post("/log-food")
async def log_food(
    request: LogFoodRequest,
    current_user: UserDB = Depends(get_current_user),
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
    current_user: UserDB = Depends(get_current_user),
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


@router.get("/weekly")
async def get_weekly_summary(
    current_user: UserDB = Depends(get_current_user),
    db_session = Depends(get_db),
):
    """Get last 7 days summary."""
    logs = db_session.query(DailyLogDB).filter(
        DailyLogDB.user_id == current_user.id,
    ).order_by(DailyLogDB.log_date.desc()).limit(7*50).all()  # Rough limit
    
    # Group by date
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
    
    return {
        "days": daily_summary,
        "avg_daily_calories": round(sum(d["calories"] for d in daily_summary.values()) / max(len(daily_summary), 1), 1) if daily_summary else 0,
    }


@router.delete("/logs/{log_id}")
async def delete_log(
    log_id: int,
    current_user: UserDB = Depends(get_current_user),
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
