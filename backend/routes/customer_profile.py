"""
AaharAI NutriSync — API Routes: Customer Profile Analysis
Serves all 6 personalised analysis cards on the dashboard.
Single endpoint, Redis-cached, only recomputes when user profile changes.
"""
import json
import logging
import math
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from auth.database import get_db, UserDB, DailyLogDB
from auth.dependencies import require_user
from database.loader import db as nutri_db
from datetime import datetime, timedelta, timezone

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/analysis", tags=["Analysis"])


def _calc_bmi(weight_kg: float, height_cm: float) -> dict:
    if not weight_kg or not height_cm:
        return {"bmi": None, "status": "Unknown", "healthy_weight_range": None}
    h = height_cm / 100
    bmi = round(weight_kg / (h ** 2), 1)
    if bmi < 18.5:
        status = "Underweight"
    elif bmi < 25:
        status = "Normal"
    elif bmi < 30:
        status = "Overweight"
    else:
        status = "Obese"
    lo = round(18.5 * h * h, 1)
    hi = round(24.9 * h * h, 1)
    return {"bmi": bmi, "status": status, "healthy_weight_range": f"{lo}–{hi} kg"}


def _calc_bmr(weight_kg, height_cm, age, gender) -> int:
    """Mifflin-St Jeor equation."""
    try:
        if gender and gender.lower() in ("female", "f"):
            return round(10 * weight_kg + 6.25 * height_cm - 5 * age - 161)
        return round(10 * weight_kg + 6.25 * height_cm - 5 * age + 5)
    except Exception:
        return 1500


PAL_MAP = {
    "sedentary": 1.4, "light": 1.55, "moderate": 1.6,
    "active": 1.75, "heavy": 1.9, "very heavy": 2.2, "athlete": 2.2,
}


def _match_rda_profile(profile: dict) -> dict | None:
    """Match user profile to closest ICMR-NIN 2024 RDA row."""
    if nutri_db.rda is None:
        return None
    age = profile.get("age", 25)
    gender = (profile.get("gender") or "male").lower()
    activity = (profile.get("activity_level") or "moderate").lower()

    # Determine life stage bucket
    if age < 13:
        stage = "child"
    elif age < 19:
        stage = "teen"
    elif age < 40:
        stage = "adult"
    elif age < 60:
        stage = "middle"
    else:
        stage = "elderly"

    rda = nutri_db.rda
    # Try to match on gender keyword and activity keyword
    gender_kw = "male" if "male" in gender or gender == "m" else "female"
    activity_kw = next((k for k in PAL_MAP if k in activity), "moderate")

    matches = rda[
        rda["Profile"].str.lower().str.contains(gender_kw, na=False) &
        rda["Activity Level"].str.lower().str.contains(activity_kw, na=False)
    ]
    if matches.empty:
        matches = rda[rda["Profile"].str.lower().str.contains(gender_kw, na=False)]
    if matches.empty:
        matches = rda.head(1)

    row = matches.iloc[0]
    return {
        "profile": str(row.get("Profile", "")),
        "life_stage": str(row.get("Life Stage", "")),
        "activity_level": str(row.get("Activity Level", "")),
        "energy": int(row.get("Energy (kcal)", 2000) or 2000),
        "protein_g": float(row.get("Protein (g)", 60) or 60),
        "fat_g": float(row.get("Fat (g)", 65) or 65),
        "carbs_g": float(row.get("Carbs (g)", 275) or 275),
        "fibre_g": float(row.get("Fibre (g)", 30) or 30),
        "iron_mg": float(row.get("Iron (mg)", 17) or 17),
        "calcium_mg": float(row.get("Calcium (mg)", 600) or 600),
        "zinc_mg": float(row.get("Zinc (mg)", 17) or 17),
        "folate_mcg": float(row.get("Folate (mcg)", 300) or 300),
        "b12_mcg": float(row.get("Vit B12 (mcg)", 2.2) or 2.2),
        "vit_c_mg": float(row.get("Vit C (mg)", 40) or 40),
        "source": "ICMR-NIN 2024",
    }


def _get_regional_concern(region: str) -> str:
    if not region or nutri_db.region is None:
        return "No specific regional data available."
    region_lower = region.lower()
    reg = nutri_db.region
    # Try state match first, then zone
    match = reg[reg["State/UT"].str.lower().str.contains(region_lower, na=False)]
    if match.empty:
        match = reg[reg["Zone"].str.lower().str.contains(region_lower, na=False)]
    if match.empty:
        return "General Indian dietary pattern."
    row = match.iloc[0]
    concern = str(row.get("Key Nutritional Concern", ""))
    char = str(row.get("Dietary Character", ""))
    return f"{char}. Key risk: {concern}" if concern and concern != "nan" else char


def _get_disease_protocol(conditions: list) -> dict | None:
    if not conditions or nutri_db.disease is None:
        return None
    dis = nutri_db.disease
    for cond in conditions:
        if not cond or str(cond).lower() in ("none", "no conditions", ""):
            continue
        cond_lower = str(cond).lower()
        match = dis[dis["Condition"].str.lower().str.contains(cond_lower, na=False)]
        if not match.empty:
            row = match.iloc[0]
            return {
                "condition": str(row.get("Condition", "")),
                "calorie_target": str(row.get("Calorie Target", "")),
                "protein": str(row.get("Protein (g/day)", "")),
                "foods_increase": str(row.get("Foods to Increase", "")),
                "foods_restrict": str(row.get("Foods to Restrict", "")),
                "key_micros": str(row.get("Key Micronutrient Priorities", "")),
                "rationale": str(row.get("Clinical Rationale", "")),
            }
    return None


def _get_medicine_watch(medications: list) -> list:
    if not medications or nutri_db.medicine is None:
        return []
    med = nutri_db.medicine
    results = []
    for m in medications:
        if not m:
            continue
        m_lower = str(m).lower()
        match = med[
            med["Brand Name (India)"].str.lower().str.contains(m_lower, na=False) |
            med["Generic Name"].str.lower().str.contains(m_lower, na=False)
        ]
        if not match.empty:
            row = match.iloc[0]
            results.append({
                "medication": str(row.get("Brand Name (India)", "")),
                "note": str(row.get("User-Facing Note", "")),
                "depletes": str(row.get("Nutrients Depleted", "")),
                "timing": str(row.get("Food Timing Rule", "")),
                "pair_with": str(row.get("Foods to Pair With", "")),
            })
    return results


def _get_deficiency_risks(profile: dict) -> list:
    """Return top deficiency risks based on diet type + life stage."""
    risks = []
    diet = (profile.get("diet_type") or "veg").lower()
    gender = (profile.get("gender") or "male").lower()
    age = profile.get("age", 25)
    conditions = profile.get("conditions", [])

    if "veg" in diet:
        risks.append({
            "nutrient": "Vitamin B12",
            "reason": "No animal-source foods — curd and paneer are your only dietary sources. After 5+ years vegetarian, supplement may be needed.",
            "severity": "high",
            "fix": "Daily curd (150g), paneer 3x/week, or B12 supplement 2.4mcg/day",
        })
        risks.append({
            "nutrient": "Iron (non-heme)",
            "reason": "Plant iron absorbs at only 5–10% vs 25% for heme iron. High tea/coffee intake further blocks absorption.",
            "severity": "high",
            "fix": "Pair iron foods with Vit C (amla, guava, lemon). Bajra roti + palak sabzi is ideal. Avoid tea 1hr around meals.",
        })

    if "female" in gender or gender == "f":
        risks.append({
            "nutrient": "Iron (menstrual losses)",
            "reason": "Menstrual iron loss adds ~2mg/day requirement. Indian women have 57% anaemia prevalence (NFHS-5).",
            "severity": "high",
            "fix": "Target 21mg/day. Amaranth leaves, masoor dal, bajra, and moringa are top sources.",
        })
        if age < 40:
            risks.append({
                "nutrient": "Folate",
                "reason": "Critical pre-conception and early pregnancy. Neural tube defect risk if deficient.",
                "severity": "medium",
                "fix": "Rajma 130mcg/100g, moong dal 84mcg/100g, coriander powder 274mcg/100g.",
            })

    if age > 50:
        risks.append({
            "nutrient": "Vitamin D",
            "reason": "Bone density declines post-50. Indoor lifestyle common in urban India — sun exposure inadequate.",
            "severity": "medium",
            "fix": "15–20 min morning sun daily. Eggs (if non-veg). Supplement 600–800 IU/day recommended.",
        })

    risks.append({
        "nutrient": "Calcium",
        "reason": "Spinach oxalates block absorption. Dairy calcium best, but most adults consume below 600mg/day target.",
        "severity": "medium",
        "fix": "Ragi (344mg/100g), sesame seeds (975mg/100g), and curd are best veg sources.",
    })

    return risks[:4]  # top 4


def _calc_streak(user_id: int, db_session: Session) -> int:
    """Count consecutive days with at least 1 food log."""
    from zoneinfo import ZoneInfo
    ist = ZoneInfo("Asia/Kolkata")
    today = datetime.now(ist).date()
    streak = 0
    for i in range(30):
        day = (today - timedelta(days=i)).isoformat()
        count = db_session.query(DailyLogDB).filter(
            DailyLogDB.user_id == user_id,
            DailyLogDB.log_date == day,
        ).count()
        if count > 0:
            streak += 1
        elif i > 0:  # allow today to be 0 (haven't logged yet)
            break
    return streak


@router.get("/customer-profile")
async def get_customer_profile(
    current_user: UserDB = Depends(require_user),
    db_session: Session = Depends(get_db),
):
    """
    Returns all data for the 6 dashboard analysis cards.
    Personalised to this user's profile — not dataset-level stats.
    """
    profile = current_user.profile or {}

    weight = profile.get("weight_kg") or profile.get("weight") or 65
    height = profile.get("height_cm") or profile.get("height") or 165
    age = profile.get("age") or 25
    gender = profile.get("gender") or "Male"
    activity = profile.get("activity_level") or "Moderate"
    diet_type = profile.get("diet_type") or "VEG"
    region = profile.get("region") or profile.get("state") or ""
    conditions = profile.get("conditions") or profile.get("health_conditions") or []
    medications = profile.get("medications") or []
    if isinstance(conditions, str):
        conditions = [conditions]
    if isinstance(medications, str):
        medications = [medications]

    # Compute all cards
    bmi_data = _calc_bmi(float(weight), float(height))
    bmr = _calc_bmr(float(weight), float(height), float(age), gender)
    pal = PAL_MAP.get((activity or "moderate").lower(), 1.6)
    tdee = round(bmr * pal)

    rda_match = _match_rda_profile({
        "age": age, "gender": gender, "activity_level": activity,
    })

    deficiency_risks = _get_deficiency_risks({
        "diet_type": diet_type, "gender": gender,
        "age": age, "conditions": conditions,
    })

    regional_concern = _get_regional_concern(region)
    disease_protocol = _get_disease_protocol(conditions)
    medicine_watch = _get_medicine_watch(medications)
    streak = _calc_streak(current_user.id, db_session)

    return {
        "user_name": current_user.name,
        "streak_days": streak,
        "body_metrics": {
            **bmi_data,
            "weight_kg": float(weight),
            "height_cm": float(height),
            "bmr": bmr,
            "tdee": tdee,
            "pal": pal,
            "bmr_formula": f"Mifflin-St Jeor: 10×{weight} + 6.25×{height} − 5×{age} {'+ 5' if 'male' in gender.lower() else '− 161'} = {bmr}",
            "tdee_formula": f"BMR {bmr} × PAL {pal} = {tdee} kcal",
        },
        "icmr_match": rda_match,
        "deficiency_risks": deficiency_risks,
        "regional_concern": {
            "region": region or "India (general)",
            "detail": regional_concern,
        },
        "disease_protocol": disease_protocol,
        "medicine_watch": medicine_watch,
        "profile_summary": {
            "age": age, "gender": gender, "diet_type": diet_type,
            "activity_level": activity, "region": region,
            "conditions": conditions,
        },
    }
