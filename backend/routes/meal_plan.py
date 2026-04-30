"""
AaharAI NutriSync — Meal Plan Route (Step 4 Fixed)
Structured JSON output, real grocery list, customer analysis banner.
"""
import json
import logging
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from slowapi import Limiter
from slowapi.util import get_remote_address

from database.models import MealPlanRequest, RecipeRequest
from auth.database import get_db, MealPlanDB
from auth.dependencies import get_current_user
from routes.customer_profile import _match_rda_profile, _calc_bmr, PAL_MAP

router = APIRouter(prefix="/api/meal-plan", tags=["Meal Plan"])
limiter = Limiter(key_func=get_remote_address)
logger = logging.getLogger(__name__)

MEAL_PLAN_PROMPT = """You are AaharAI, an Indian clinical nutritionist AI grounded in IFCT 2017 and ICMR-NIN 2024.
Generate a complete {days}-day meal plan. Return ONLY valid JSON — no markdown, no text before/after.

USER: Age {age}, {gender}, {weight}kg, {height}cm, {activity} (PAL {pal}), {diet_type}, {region}, conditions: {conditions}, budget ₹{budget}/day, goal: {goal}, {num_people} person(s).
TARGETS: {energy} kcal, protein {protein}g, iron {iron}mg, calcium {calcium}mg, fibre {fibre}g.

RULES: Indian foods only. Vary daily. Vegetarian: ensure B12 from curd/paneer. Pair iron foods with Vit C.
Each day ≥90% energy target. Include IFCT codes.

JSON SCHEMA:
{{"customer_analysis":{{"icmr_profile":"","energy_target":0,"protein_target":0,"iron_target":0,"calcium_target":0,"fibre_target":0,"key_risks":[],"budget_per_day":"","rationale":""}},"days":[{{"day":1,"day_label":"Monday","meals":{{"Breakfast":{{"foods":[{{"name":"","qty_g":0,"qty_label":"","ifct_code":"","cal":0,"protein_g":0,"carbs_g":0,"fat_g":0,"iron_mg":0,"calcium_mg":0}}],"prep_time_min":0,"meal_total":{{"cal":0,"protein_g":0,"carbs_g":0,"fat_g":0,"iron_mg":0,"calcium_mg":0}}}},"Mid-morning":{{}},"Lunch":{{}},"Snack":{{}},"Dinner":{{}}}},"day_total":{{"cal":0,"protein_g":0,"carbs_g":0,"fat_g":0,"iron_mg":0,"calcium_mg":0}}}}],"grocery":[{{"category":"","items":[{{"name":"","qty":"","est_cost_inr":0,"used_for":""}}]}}],"total_grocery_cost_inr":0,"weekly_avg":{{"cal":0,"protein_g":0,"iron_mg":0,"calcium_mg":0}}}}"""


def _build_ca(profile: dict) -> dict:
    w = float(profile.get("weight_kg") or profile.get("weight") or 65)
    h = float(profile.get("height_cm") or profile.get("height") or 165)
    a = float(profile.get("age") or 25)
    g = profile.get("gender") or "Male"
    act = (profile.get("activity_level") or profile.get("profession") or "moderate").lower()
    diet = profile.get("diet_type") or "VEG"
    region = profile.get("region") or "India"
    conds = profile.get("conditions") or []
    goal = profile.get("goal") or "Maintenance"
    budget = profile.get("budget_per_day_inr") or 300
    bmr = _calc_bmr(w, h, a, g)
    pal = PAL_MAP.get(act, 1.6)
    tdee = round(bmr * pal)
    rda = _match_rda_profile({"age": a, "gender": g, "activity_level": act})
    risks = []
    if "veg" in diet.lower():
        risks += ["Non-heme iron only — pair with Vit C every meal", "No dietary B12 — curd/paneer daily essential"]
    return {"weight": w, "height": h, "age": a, "gender": g, "activity": act, "pal": pal,
            "diet_type": diet, "region": region, "conditions": conds, "goal": goal, "budget": budget,
            "bmr": bmr, "tdee": tdee,
            "energy": rda["energy"] if rda else tdee,
            "protein": rda["protein_g"] if rda else round(w * 0.88),
            "iron": rda["iron_mg"] if rda else 17,
            "calcium": rda["calcium_mg"] if rda else 600,
            "fibre": rda["fibre_g"] if rda else 30,
            "icmr_profile": rda["profile"] if rda else f"{g} adult",
            "key_risks": risks}


@router.post("/generate")
@limiter.limit("5/minute")
async def generate_meal_plan(request: Request, meal_request: MealPlanRequest,
                              user=Depends(get_current_user), db: Session = Depends(get_db)):
    from main import get_llm_router
    llm = get_llm_router()
    if llm is None:
        raise HTTPException(status_code=503, detail="LLM not available")

    profile = meal_request.user_profile.model_dump() if hasattr(meal_request.user_profile, "model_dump") else dict(meal_request.user_profile)
    profile["budget_per_day_inr"] = meal_request.budget_per_day_inr
    ca = _build_ca(profile)

    prompt = MEAL_PLAN_PROMPT.format(
        days=meal_request.days, age=ca["age"], gender=ca["gender"],
        weight=ca["weight"], height=ca["height"], activity=ca["activity"], pal=ca["pal"],
        diet_type=ca["diet_type"], region=ca["region"],
        conditions=", ".join(ca["conditions"]) if ca["conditions"] else "None",
        budget=ca["budget"], goal=ca["goal"], num_people=meal_request.num_people,
        energy=ca["energy"], protein=ca["protein"],
        iron=ca["iron"], calcium=ca["calcium"], fibre=ca["fibre"],
    )

    try:
        raw, _ = llm.generate(prompt=prompt, system="Return only valid JSON.", temperature=0.3, max_tokens=6000)
        raw = raw.strip()
        if "```" in raw:
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        raw = raw.strip().rstrip("`").strip()
        plan_json = json.loads(raw)
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON from LLM: {e}")
        raise HTTPException(status_code=500, detail="Meal plan generation failed — invalid response. Please retry.")
    except Exception as e:
        logger.error(f"Meal plan error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    # Overwrite customer_analysis with server-computed values (more accurate)
    plan_json["customer_analysis"] = {
        "icmr_profile": ca["icmr_profile"],
        "energy_target": ca["energy"], "protein_target": ca["protein"],
        "iron_target": ca["iron"], "calcium_target": ca["calcium"], "fibre_target": ca["fibre"],
        "key_risks": ca["key_risks"],
        "budget_per_day": f"₹{ca['budget']}/day · {ca['diet_type']} · {ca['region']}",
        "rationale": f"BMR {ca['bmr']} kcal × PAL {ca['pal']} = TDEE {ca['tdee']} kcal",
    }

    if user is not None:
        try:
            plan_db = MealPlanDB(user_id=user.id, plan_text=json.dumps(plan_json),
                                 targets_json=json.dumps({"energy": ca["energy"], "protein_g": ca["protein"],
                                                          "iron_mg": ca["iron"], "calcium_mg": ca["calcium"]}),
                                 days=meal_request.days, budget=float(ca["budget"]))
            db.add(plan_db); db.commit(); db.refresh(plan_db)
            plan_json["plan_id"] = plan_db.id
        except Exception as e:
            logger.error(f"Failed to persist meal plan: {e}")

    return plan_json


@router.get("/history")
async def get_meal_plan_history(limit: int = 10, user=Depends(get_current_user), db: Session = Depends(get_db)):
    if user is None:
        return {"plans": []}
    plans = (db.query(MealPlanDB).filter(MealPlanDB.user_id == user.id)
             .order_by(MealPlanDB.created_at.desc()).limit(limit).all())
    result = []
    for p in plans:
        try:
            parsed = json.loads(p.plan_text) if p.plan_text else {}
        except Exception:
            parsed = {}
        result.append({"id": p.id, "plan": parsed,
                        "targets": json.loads(p.targets_json) if p.targets_json else {},
                        "days": p.days, "budget": p.budget,
                        "created_at": p.created_at.isoformat() if p.created_at else None})
    return {"plans": result}


@router.post("/recipe")
@limiter.limit("5/minute")
async def generate_recipe(request: Request, recipe_request: RecipeRequest):
    from main import get_llm_router
    llm = get_llm_router()
    if llm is None:
        raise HTTPException(status_code=503, detail="LLM not available")
    prompt = f"""Generate an Indian recipe for: {recipe_request.instructions}
Return ONLY valid JSON:
{{"title":"","category":"Breakfast|Lunch|Dinner|Snack","diet_type":"VEG|NON-VEG","region":"","prep_time_min":0,"cook_time_min":0,"servings":2,"ingredients":[{{"name":"","qty_g":0,"qty_label":"","ifct_code":""}}],"steps":[""],"nutrition_per_serving":{{"cal":0,"protein_g":0,"carbs_g":0,"fat_g":0,"iron_mg":0,"calcium_mg":0,"fibre_g":0}},"ifct_note":"","icmr_match":"","tips":[""]}}"""
    try:
        raw, _ = llm.generate(prompt=prompt, system="Return only valid JSON.", temperature=0.4)
        raw = raw.strip().lstrip("```json").lstrip("```").rstrip("```").strip()
        return json.loads(raw)
    except Exception as e:
        logger.error(f"Recipe error: {e}")
        raise HTTPException(status_code=500, detail="Recipe generation failed. Please retry.")
