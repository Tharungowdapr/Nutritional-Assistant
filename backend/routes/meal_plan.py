"""
AaharAI NutriSync — Meal Plan Route (JSON structured output, chunked generation)
"""
import json
import logging
import re
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from slowapi import Limiter
from slowapi.util import get_remote_address

from database.models import MealPlanRequest
from auth.database import get_db, MealPlanDB
from auth.dependencies import get_current_user
from routes.customer_profile import _match_rda_profile, _calc_bmr, PAL_MAP

router = APIRouter(prefix="/api/meal-plan", tags=["Meal Plan"])
limiter = Limiter(key_func=get_remote_address)
logger = logging.getLogger(__name__)

DAYS_LIST = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


def _clean_json(raw: str) -> str:
    """Extract JSON from LLM output, stripping markdown fences and extra text."""
    raw = raw.strip()
    if "```" in raw:
        match = re.search(r'```(?:json)?\s*\n?(.*?)\n?\s*```', raw, re.DOTALL)
        if match:
            raw = match.group(1).strip()
        else:
            raw = raw.split("```")[1].strip()
            if raw.startswith("json"):
                raw = raw[4:].strip()
    if not raw.startswith("{"):
        match = re.search(r'\{.*\}', raw, re.DOTALL)
        if match:
            raw = match.group(0)
    return raw


def _enforce_day_slots(plan: dict) -> dict:
    """Ensure all days have all meal slots."""
    for day in plan.get("days", []):
        day.setdefault("breakfast", [])
        day.setdefault("mid_morning", [])
        day.setdefault("lunch", [])
        day.setdefault("snack", [])
        day.setdefault("dinner", [])
    return plan


# Chunk generation prompt - generates N days at a time
CHUNK_PROMPT = """Generate a {num_days}-day Indian meal plan (days {start_day} to {end_day}).

User: Age {age}, {gender}, {weight}kg, {height}cm, {diet_type}, {goal}
Target: {energy} kcal/day, protein {protein}g
Budget: ₹{budget}/day

Days: {day_labels}

RULES:
1. {diet_type} only
2. NO repeats across ALL days
3. 5 slots: breakfast, mid_morning, lunch, snack, dinner
4. Each item: {{"name":str,"qty":str,"cal":int,"protein_g":int}}
5. Day format: {{"day":int,"label":str,"breakfast":[],"mid_morning":[],"lunch":[],"snack":[],"dinner":[],"cal_approx":int}}

Return ONLY valid JSON array of days (no summary, no grocery):
[{day_template}]"""


async def _generate_full_plan(llm, total_days: int, user_params: dict, active_provider: dict = None) -> dict:
    """Generate complete plan with all days, summary and grocery in one call."""
    day_labels = ", ".join(DAYS_LIST[:total_days])
    day_template = ",".join([f'{{"day":{i},"label":"{DAYS_LIST[i-1]}"}}' for i in range(1, total_days + 1)])
    
    prompt = f"""Generate a {total_days}-day Indian meal plan with summary and grocery.

User: Age {user_params["age"]}, {user_params["gender"]}, {user_params["weight"]}kg, {user_params["height"]}cm, {user_params["diet_type"]}, {user_params["goal"]}
Target: {user_params["energy"]} kcal/day, protein {user_params["protein"]}g
Budget: ₹{user_params["budget"]}/day
Days: {day_labels}

RULES:
1. {user_params["diet_type"]} only
2. NO repeats across {total_days} days
3. 5 slots: breakfast, mid_morning, lunch, snack, dinner
4. Each item: {{"name":str,"qty":str,"cal":int,"protein_g":int}}
5. Day: {{"day":int,"label":str,"breakfast":[],"mid_morning":[],"lunch":[],"snack":[],"dinner":[],"cal_approx":int}}
6. Grocery: 7 categories with {{"name":str,"qty":str,"cost_inr":int}}

CRITICAL: Generate EXACTLY {total_days} days. Include summary and full grocery list.

Return ONLY valid JSON:
{{"summary":"2-line summary","days":[{day_template}],"grocery":[{{"category":"Grains","items":[{{"name":"Rice","qty":"5 kg","cost_inr":400}}]}}],"grocery_total_inr":1400}}"""
    
    if active_provider:
        from rag.override import generate_override
        raw = await generate_override(prompt, "Return ONLY valid JSON.", active_provider)
    else:
        raw, _ = await llm.generate(prompt=prompt, system="Return ONLY valid JSON.", temperature=0.4, max_tokens=16384)
    
    try:
        plan = json.loads(_clean_json(raw))
        return plan
    except Exception as e:
        logger.error(f"Failed to parse full plan: {e}")
        return None

# Grocery generation prompt
GROCERY_PROMPT = """Generate a grocery list for a {days}-day meal plan.
Previous days used: {used_foods}
Budget: ₹{budget}/day

Categories: Grains & Cereals, Pulses & Legumes, Dairy, Vegetables, Fruits, Oils & Fats, Spices & Condiments
Each item: {{"name":str,"qty":str,"cost_inr":int}}

Return ONLY valid JSON:
{{"grocery":[{{"category":"Grains","items":[{{"name":"Rice","qty":"5 kg","cost_inr":400}}]}}],"grocery_total_inr":1400}}"""


async def _generate_chunk(llm, start_day: int, num_days: int, total_days: int, user_params: dict, active_provider: dict = None) -> list:
    """Generate a chunk of days."""
    day_labels = ", ".join(DAYS_LIST[start_day-1:start_day-1+num_days])
    day_template = ",".join([f'{{"day":{i},"label":"{DAYS_LIST[i-1]}"}}' for i in range(start_day, start_day + num_days)])
    
    prompt = CHUNK_PROMPT.format(
        num_days=num_days,
        start_day=start_day,
        end_day=start_day + num_days - 1,
        age=user_params["age"],
        gender=user_params["gender"],
        weight=user_params["weight"],
        height=user_params["height"],
        diet_type=user_params["diet_type"],
        goal=user_params["goal"],
        energy=user_params["energy"],
        protein=user_params["protein"],
        budget=user_params["budget"],
        day_labels=day_labels,
        day_template=day_template,
    )
    
    if active_provider:
        from rag.override import generate_override
        raw = await generate_override(prompt, "Return ONLY valid JSON array. No markdown.", active_provider)
    else:
        raw, _ = await llm.generate(prompt=prompt, system="Return ONLY valid JSON array. No markdown.", temperature=0.4, max_tokens=4096)
    
    try:
        days = json.loads(_clean_json(raw))
        if not isinstance(days, list):
            days = [days]
        return days
    except Exception as e:
        logger.error(f"Failed to parse chunk {start_day}-{start_day+num_days-1}: {e}")
        return []


async def _generate_grocery(llm, all_days: list, budget: int, active_provider: dict = None) -> dict:
    """Generate aggregated grocery list from all days."""
    used_foods = set()
    for day in all_days:
        for slot in ["breakfast", "mid_morning", "lunch", "snack", "dinner"]:
            for item in day.get(slot, []):
                if item.get("name"):
                    used_foods.add(item["name"])
    
    prompt = GROCERY_PROMPT.format(
        days=len(all_days),
        used_foods=", ".join(list(used_foods)[:50]),
        budget=budget,
    )
    
    if active_provider:
        from rag.override import generate_override
        raw = await generate_override(prompt, "Return ONLY valid JSON.", active_provider)
    else:
        raw, _ = await llm.generate(prompt=prompt, system="Return ONLY valid JSON.", temperature=0.4, max_tokens=2048)
    
    try:
        return json.loads(_clean_json(raw))
    except Exception as e:
        logger.error(f"Failed to parse grocery: {e}")
        return {"grocery": [], "grocery_total_inr": 0}


@router.post("/stream")
async def stream_meal_plan(request: Request, meal_request: MealPlanRequest,
                            user=Depends(get_current_user), db: Session = Depends(get_db)):
    from main import get_llm_router
    llm = get_llm_router()
    if llm is None:
        raise HTTPException(status_code=503, detail="LLM not available")

    from routes.settings import get_user_active_provider
    active_provider = get_user_active_provider(user) if user else None

    profile = meal_request.user_profile.model_dump() if hasattr(meal_request.user_profile, "model_dump") else dict(meal_request.user_profile)
    profile["budget_per_day_inr"] = meal_request.budget_per_day_inr

    w = float(profile.get("weight_kg") or profile.get("weight") or 65)
    h = float(profile.get("height_cm") or profile.get("height") or 165)
    a = float(profile.get("age") or 25)
    g = profile.get("sex") or profile.get("gender") or "Male"
    act = (profile.get("profession") or profile.get("activity_level") or "moderate").lower()
    diet = profile.get("diet_type") or "VEG"
    region = profile.get("region_zone") or profile.get("region") or "India"
    conds = profile.get("conditions") or []
    goal = profile.get("goal") or "Maintenance"
    budget = profile.get("budget_per_day_inr") or profile.get("daily_budget_inr") or 300
    bmr = _calc_bmr(w, h, a, g)
    pal = PAL_MAP.get(act, 1.6)
    tdee = round(bmr * pal)
    rda = _match_rda_profile({"age": a, "gender": g, "activity_level": act})
    energy = rda["energy"] if rda else tdee
    protein = rda["protein_g"] if rda else round(w * 0.88)

    extra = ""
    suggestions = getattr(meal_request, "suggestions", None)
    if suggestions:
        extra = f"Additional notes: {suggestions}"

    user_params = {
        "age": a, "gender": g, "weight": w, "height": h,
        "diet_type": diet, "goal": goal, "energy": energy,
        "protein": protein, "budget": budget,
    }

    async def event_generator():
        all_days = []
        total_days = meal_request.days
        
        try:
            yield f"data: {json.dumps({'token': f'Generating {total_days}-day meal plan...\n'})}\n\n"
            
            # Generate full plan in one call
            plan = await _generate_full_plan(llm, total_days, user_params, active_provider)
            
            if not plan:
                raise Exception("Failed to generate meal plan")
            
            # Ensure we have all days
            if len(plan.get("days", [])) < total_days:
                logger.warning(f"Only got {len(plan.get('days', []))} days, expected {total_days}")
            
            plan = _enforce_day_slots(plan)

            if user is not None:
                try:
                    plan_db = MealPlanDB(user_id=user.id, plan_text=json.dumps(plan),
                                         targets_json=json.dumps({"energy": energy}),
                                         days=meal_request.days, budget=float(budget))
                    db.add(plan_db); db.commit()
                except Exception as e:
                    logger.error(f"Failed to persist meal plan: {e}")

            yield f"data: {json.dumps({'final': True, 'plan': plan})}\n\n"
        except Exception as e:
            logger.error(f"Meal plan stream failed: {e}")
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

MEAL_PLAN_PROMPT = """You are AaharAI, an Indian clinical nutritionist (IFCT 2017 / ICMR-NIN 2024).
Generate a {days}-day meal plan with summary and aggregated grocery list for the ENTIRE {days}-day period.

USER: Age {age}, {gender}, {weight}kg, {height}cm, {diet_type}, {region}, Goal: {goal}
TARGET: {energy} kcal/day, protein {protein}g
BUDGET: ₹{budget}/day for {num_people} person(s)
{extra}

DAYS TO GENERATE: {day_labels}

RULES:
1. Indian foods ONLY, {diet_type} strictly followed
2. NO food repeats across {days} days
3. 5 slots: breakfast, mid_morning, lunch, snack, dinner
4. Each item: {{"name":str,"qty":str,"cal":int,"protein_g":int}}
5. Each day: {{"day":int,"label":str,"breakfast":[],"mid_morning":[],"lunch":[],"snack":[],"dinner":[],"cal_approx":int}}
6. Grocery: 7 categories. Item: {{"name":str,"qty":str,"cost_inr":int}}

CRITICAL: Generate exactly {days} days. Do not stop at 1 or 2 days.

Return ONLY valid JSON (no markdown):
{{"summary":"summary","days":[{{"day":1,"label":"Monday","breakfast":[{{"name":"Idli","qty":"3 pcs","cal":120,"protein_g":4}}],"mid_morning":[{{"name":"Banana","qty":"1","cal":105,"protein_g":1}}],"lunch":[{{"name":"Rice","qty":"1.5 cups","cal":205,"protein_g":4}},{{"name":"Sambar","qty":"200ml","cal":120,"protein_g":6}}],"snack":[{{"name":"Chana","qty":"30g","cal":110,"protein_g":6}}],"dinner":[{{"name":"Roti","qty":"2","cal":210,"protein_g":6}},{{"name":"Paneer","qty":"150g","cal":260,"protein_g":14}}],"cal_approx":1130}},{{"day":2,"label":"Tuesday","breakfast":[{{"name":"Dosa","qty":"2","cal":150,"protein_g":4}}],"mid_morning":[{{"name":"Apple","qty":"1","cal":95,"protein_g":1}}],"lunch":[{{"name":"Chapati","qty":"3","cal":250,"protein_g":8}},{{"name":"Dal","qty":"200ml","cal":140,"protein_g":8}}],"snack":[{{"name":"Peanuts","qty":"30g","cal":170,"protein_g":7}}],"dinner":[{{"name":"Jeera Rice","qty":"1.5 cups","cal":220,"protein_g":5}},{{"name":"Aloo Gobi","qty":"150g","cal":130,"protein_g":3}}],"cal_approx":1155}},{{"day":3,"label":"Wednesday","breakfast":[{{"name":"Poha","qty":"1.5 cups","cal":180,"protein_g":5}}],"mid_morning":[{{"name":"Orange","qty":"1","cal":62,"protein_g":1}}],"lunch":[{{"name":"Rice","qty":"1.5 cups","cal":205,"protein_g":4}},{{"name":"Rajma","qty":"200ml","cal":170,"protein_g":12}}],"snack":[{{"name":"Bhuna Chana","qty":"40g","cal":150,"protein_g":7}}],"dinner":[{{"name":"Paratha","qty":"2","cal":280,"protein_g":7}},{{"name":"Curry","qty":"150g","cal":180,"protein_g":8}}],"cal_approx":1260}}],"grocery":[{{"category":"Grains","items":[{{"name":"Rice","qty":"5 kg","cost":400}}]}},{{"category":"Pulses","items":[{{"name":"Toor Dal","qty":"1.5 kg","cost":210}}]}},{{"category":"Dairy","items":[{{"name":"Paneer","qty":"1.5 kg","cost":525}}]}},{{"category":"Vegetables","items":[{{"name":"Potato","qty":"2 kg","cost":60}}]}},{{"category":"Fruits","items":[{{"name":"Banana","qty":"10","cost":50}}]}},{{"category":"Oils","items":[{{"name":"Oil","qty":"750 ml","cost":120}}]}},{{"category":"Spices","items":[{{"name":"Cumin","qty":"100g","cost":30}}]}}],"grocery_total_inr":1400}}"""



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
                        "days": p.days, "budget": p.budget,
                        "created_at": p.created_at.isoformat() if p.created_at else None})
    return {"plans": result}


@router.post("/generate")
@limiter.limit("2/minute")
async def generate_meal_plan(request: Request, meal_request: MealPlanRequest,
                              user=Depends(get_current_user), db: Session = Depends(get_db)):
    from main import get_llm_router
    llm = get_llm_router()
    if llm is None:
        raise HTTPException(status_code=503, detail="LLM not available")

    from routes.settings import get_user_active_provider
    active_provider = get_user_active_provider(user) if user else None

    profile = meal_request.user_profile.model_dump() if hasattr(meal_request.user_profile, "model_dump") else dict(meal_request.user_profile)
    profile["budget_per_day_inr"] = meal_request.budget_per_day_inr

    w = float(profile.get("weight_kg") or profile.get("weight") or 65)
    h = float(profile.get("height_cm") or profile.get("height") or 165)
    a = float(profile.get("age") or 25)
    g = profile.get("sex") or profile.get("gender") or "Male"
    act = (profile.get("profession") or profile.get("activity_level") or "moderate").lower()
    diet = profile.get("diet_type") or "VEG"
    region = profile.get("region_zone") or profile.get("region") or "India"
    conds = profile.get("conditions") or []
    goal = profile.get("goal") or "Maintenance"
    budget = profile.get("budget_per_day_inr") or profile.get("daily_budget_inr") or 300
    bmr = _calc_bmr(w, h, a, g)
    pal = PAL_MAP.get(act, 1.6)
    tdee = round(bmr * pal)
    rda = _match_rda_profile({"age": a, "gender": g, "activity_level": act})
    energy = rda["energy"] if rda else tdee
    protein = rda["protein_g"] if rda else round(w * 0.88)

    day_labels = ", ".join(DAYS_LIST[:meal_request.days])

    prompt = MEAL_PLAN_PROMPT.format(
        days=meal_request.days, num_people=meal_request.num_people,
        age=a, gender=g, weight=w, height=h, activity=act, pal=pal,
        diet_type=diet, region=region,
        conditions=", ".join(conds) if conds else "None",
        goal=goal, budget=budget, extra="",
        energy=energy, protein=protein,
        day_labels=day_labels,
    )

    if active_provider:
        from rag.override import generate_override
        raw = await generate_override(prompt, "Return ONLY valid JSON.", active_provider)
    else:
        raw, _ = await llm.generate(prompt=prompt, system="Return ONLY valid JSON.", temperature=0.4, max_tokens=16384)

    try:
        plan = _enforce_day_slots(json.loads(_clean_json(raw)))
    except Exception:
        plan = {"summary": "Generation failed", "days": [], "grocery": [], "grocery_total_inr": 0}

    if user is not None:
        try:
            plan_db = MealPlanDB(user_id=user.id, plan_text=json.dumps(plan),
                                 targets_json=json.dumps({"energy": energy}),
                                 days=meal_request.days, budget=float(budget))
            db.add(plan_db); db.commit(); db.refresh(plan_db)
        except Exception as e:
            logger.error(f"Failed to persist meal plan: {e}")

    return plan
