"""
AaharAI NutriSync — Meal Memory Module
Long-term memory for meal logs and dietary patterns.
"""
import logging
from typing import List, Dict, Any
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

# Config
MAX_MEAL_HISTORY = 20


def get_recent_meals(user_id: int, days: int = 3) -> List[Dict[str, Any]]:
    """Get recent meals from database."""
    from auth.database import SessionLocal, DailyLogDB
    
    db = SessionLocal()
    try:
        start_date = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")
        
        meals = db.query(DailyLogDB).filter(
            DailyLogDB.user_id == user_id,
            DailyLogDB.log_date >= start_date
        ).order_by(DailyLogDB.log_date.desc(), DailyLogDB.created_at.desc()).all()
        
        return [
            {
                "date": m.log_date,
                "meal_slot": m.meal_slot,
                "food_name": m.food_name,
                "quantity_g": m.quantity_g,
                "calories": m.calories,
                "protein_g": m.protein_g,
                "fat_g": m.fat_g,
                "carbs_g": m.carbs_g,
            }
            for m in meals
        ]
    except Exception as e:
        logger.warning(f"Failed to get recent meals: {e}")
        return []
    finally:
        db.close()


def format_recent_meals(user_id: int, days: int = 3, max_meals: int = 5) -> str:
    """Format recent meals as text for prompt injection."""
    meals = get_recent_meals(user_id, days)
    
    if not meals:
        return "No recent meal data available."
    
    # Group by date
    by_date = {}
    for meal in meals:
        date = meal["date"]
        if date not in by_date:
            by_date[date] = []
        by_date[date].append(meal)
    
    # Format
    lines = ["Recent Meals:"]
    
    for date, day_meals in sorted(by_date.items(), reverse=True):
        if len(lines) > 1:
            lines.append("")  # Empty line between days
        
        lines.append(f"{date}:")
        
        total_cal = 0
        for meal in day_meals[:max_meals]:
            slot = meal.get("meal_slot", "")
            food = meal.get("food_name", "")
            cal = meal.get("calories") or 0
            
            if cal:
                lines.append(f"  - {slot}: {food} ({cal:.0f} kcal)")
                total_cal += cal
            else:
                lines.append(f"  - {slot}: {food}")
        
        if total_cal > 0:
            lines.append(f"  Total: {total_cal:.0f} kcal")
    
    return "\n".join(lines)


def get_daily_summary(user_id: int, date: str = None) -> Dict[str, Any]:
    """Get daily nutrition summary."""
    from auth.database import SessionLocal, DailyLogDB
    
    if not date:
        date = datetime.now().strftime("%Y-%m-%d")
    
    db = SessionLocal()
    try:
        meals = db.query(DailyLogDB).filter(
            DailyLogDB.user_id == user_id,
            DailyLogDB.log_date == date
        ).all()
        
        totals = {
            "calories": 0,
            "protein_g": 0,
            "fat_g": 0,
            "carbs_g": 0,
            "fibre_g": 0,
        }
        
        for meal in meals:
            for key in totals:
                if getattr(meal, key, None):
                    totals[key] += getattr(meal, key) or 0
        
        return {
            "date": date,
            "meals": len(meals),
            **totals
        }
    except Exception as e:
        logger.warning(f"Failed to get daily summary: {e}")
        return {"date": date, "meals": 0, **totals}
    finally:
        db.close()


def get_weekly_trends(user_id: int) -> Dict[str, Any]:
    """Get weekly nutrition trends."""
    meals = get_recent_meals(user_id, days=7)
    
    if not meals:
        return {"趋势": "No data available"}
    
    # Group by date
    by_date = {}
    for meal in meals:
        date = meal.get("date")
        if date not in by_date:
            by_date[date] = {"calories": 0, "protein_g": 0}
        
        cal = meal.get("calories") or 0
        prot = meal.get("protein_g") or 0
        
        by_date[date]["calories"] += cal
        by_date[date]["protein_g"] += prot
    
    return {
        "days": len(by_date),
        "trends": by_date
    }


def analyze_diet_pattern(user_id: int) -> str:
    """Analyze diet patterns and provide insights."""
    meals = get_recent_meals(user_id, days=7)
    
    if not meals:
        return "No meal data to analyze."
    
    # Calculate averages
    calories_by_slot = {}
    macros_by_slot = {}
    
    for meal in meals:
        slot = meal.get("meal_slot", "Unknown")
        
        if slot not in calories_by_slot:
            calories_by_slot[slot] = []
            macros_by_slot[slot] = {"protein": [], "carbs": [], "fat": []}
        
        cal = meal.get("calories") or 0
        if cal > 0:
            calories_by_slot[slot].append(cal)
        
        for m, key in [("protein_g", "protein"), ("carbs_g", "carbs"), ("fat_g", "fat")]:
            val = meal.get(m) or 0
            if val > 0:
                macros_by_slot[slot][key].append(val)
    
    # Build analysis
    lines = ["Diet Analysis:"]
    
    for slot in ["Breakfast", "Lunch", "Dinner", "Snack"]:
        if slot in calories_by_slot and calories_by_slot[slot]:
            avg_cal = sum(calories_by_slot[slot]) / len(calories_by_slot[slot])
            lines.append(f"- {slot}: avg {avg_cal:.0f} kcal")
    
    # Check for patterns
    total_days = len(set(m.get("date") for m in meals))
    if total_days >= 3:
        avg_per_day = sum(m.get("calories", 0) for m in meals) / total_days
        lines.append(f"\nDaily average: {avg_per_day:.0f} kcal")
        
        if avg_per_day < 1200:
            lines.append("⚠️-calorie intake seems low")
        elif avg_per_day > 2500:
            lines.append("⚠️ calorie intake seems high")
        else:
            lines.append("✅ Calorie intake is reasonable")
    
    return "\n".join(lines)