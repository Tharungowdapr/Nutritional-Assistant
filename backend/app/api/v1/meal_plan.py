"""
AaharAI NutriSync — Meal Plan Route (JSON structured output, chunked generation)
"""

import asyncio
import json
import logging
import re
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.db.models import MealPlanRequest  # ✅ fixed: was database.models
from app.models.user import get_db, MealPlanDB
from app.core.dependencies import get_current_user
from app.api.v1.customer_profile import _match_rda_profile, _calc_bmr, PAL_MAP  # ✅ fixed: was routes.customer_profile

router = APIRouter(prefix="/api/meal-plan", tags=["Meal Plan"])
limiter = Limiter(key_func=get_remote_address)
logger = logging.getLogger(__name__)

DAYS_LIST = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


def _extract_profile_params(profile: dict) -> dict:
    """Extract and compute user profile parameters for meal plan generation."""
    w = float(profile.get("weight_kg") or profile.get("weight") or 65)
    h = float(profile.get("height_cm") or profile.get("height") or 165)
    a = float(profile.get("age") or 25)
    g = profile.get("gender") or profile.get("sex") or "Male"
    act = (
        profile.get("activity_level") or profile.get("profession") or profile.get("physical_activity") or "moderate"
    ).lower()
    diet = profile.get("diet_type") or "VEG"
    goal = profile.get("goal") or profile.get("goals") or "Maintenance"
    budget = profile.get("budget_per_day_inr") or profile.get("daily_budget_inr") or 300
    bmr = _calc_bmr(w, h, a, g)
    pal = PAL_MAP.get(act, 1.6)
    tdee = round(bmr * pal)
    rda = _match_rda_profile({"age": a, "gender": g, "activity_level": act})
    energy = rda["energy"] if rda else tdee
    protein = rda["protein_g"] if rda else round(w * 0.88)
    return {
        "w": w,
        "h": h,
        "a": a,
        "g": g,
        "act": act,
        "diet": diet,
        "goal": goal,
        "budget": budget,
        "bmr": bmr,
        "pal": pal,
        "tdee": tdee,
        "rda": rda,
        "energy": energy,
        "protein": protein,
    }


def _clean_json(raw: str) -> str:
    """Extract JSON from LLM output, stripping markdown fences and extra text.
    Handles both dicts {...} and arrays [...]."""
    raw = raw.strip()
    if "```" in raw:
        match = re.search(r"```(?:json)?\s*\n?(.*?)\n?\s*```", raw, re.DOTALL)
        if match:
            raw = match.group(1).strip()
        else:
            raw = raw.split("```")[1].strip()
            if raw.startswith("json"):
                raw = raw[4:].strip()
    # Find the outermost JSON construct, skipping brackets inside strings
    # First, find all { and [ positions that are not inside string quotes
    candidates = []
    in_string = False
    escape = False
    for i, ch in enumerate(raw):
        if escape:
            escape = False
            continue
        if ch == "\\":
            escape = True
            continue
        if ch == '"':
            in_string = not in_string
            continue
        if not in_string and ch in ("{", "["):
            candidates.append((i, ch))

    if not candidates:
        return raw

    start_pos, start_char = candidates[0]
    end_char = "}" if start_char == "{" else "]"

    depth = 0
    in_string = False
    escape = False
    for i in range(start_pos, len(raw)):
        ch = raw[i]
        if escape:
            escape = False
            continue
        if ch == "\\":
            escape = True
            continue
        if ch == '"':
            in_string = not in_string
            continue
        if in_string:
            continue
        if ch == start_char:
            depth += 1
        elif ch == end_char:
            depth -= 1
            if depth == 0:
                return raw[start_pos: i + 1]

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


# Chunk generation prompt - generates 1 day at a time
CHUNK_PROMPT = """Generate day {day_num} ({day_label}) of an Indian meal plan.

User: Age {age}, {gender}, {weight}kg, {height}cm, {diet_type}, {goal}
Target: {energy} kcal/day, protein {protein}g
Budget: ₹{budget}/day

RULES:
1. {diet_type} only — Indian foods
2. 5 slots: breakfast, mid_morning, lunch, snack, dinner
3. Each item: {{"name":str,"qty":str,"cal":int,"protein_g":int}}
4. Day format: {{"day":{day_num},"label":"{day_label}","breakfast":[],"mid_morning":[],"lunch":[],"snack":[],"dinner":[],"cal_approx":int}}

Return ONLY valid JSON for day {day_num}:
{{"day":{day_num},"label":"{day_label}","breakfast":[{{"name":"...","qty":"...","cal":0,"protein_g":0}}],"mid_morning":[],"lunch":[],"snack":[],"dinner":[],"cal_approx":0}}"""


# Grocery generation prompt
GROCERY_PROMPT = """Generate a grocery list for a {days}-day meal plan.
Previous days used: {used_foods}
Budget: ₹{budget}/day

Categories: Grains & Cereals, Pulses & Legumes, Dairy, Vegetables, Fruits, Oils & Fats, Spices & Condiments
Each item: {{"name":str,"qty":str,"cost_inr":int}}

Return ONLY valid JSON:
{{"grocery":[{{"category":"Grains","items":[{{"name":"Rice","qty":"5 kg","cost_inr":400}}]}}],"grocery_total_inr":1400}}"""


async def _generate_chunk(llm, day_num: int, total_days: int, user_params: dict, active_provider: dict = None) -> dict:
    """Generate exactly 1 day of the meal plan with retry."""
    day_label = DAYS_LIST[(day_num - 1) % 7]

    prompt = CHUNK_PROMPT.format(
        day_num=day_num,
        day_label=day_label,
        age=user_params["age"],
        gender=user_params["gender"],
        weight=user_params["weight"],
        height=user_params["height"],
        diet_type=user_params["diet_type"],
        goal=user_params["goal"],
        energy=user_params["energy"],
        protein=user_params["protein"],
        budget=user_params["budget"],
    )

    async def _try() -> dict:
        if active_provider:
            from app.services.rag.override import generate_override

            raw = await generate_override(
                prompt, "Return ONLY valid JSON. No markdown.", active_provider, json_mode=False, max_tokens=768
            )
            if raw == "INVALID_API_KEY":
                raise PermissionError("Invalid API Key — Update your LLM provider settings.")
            if raw == "RATE_LIMITED":
                raise ConnectionError("Rate limit exceeded — Check your LLM provider billing tier.")
            if raw.startswith("Error from") or raw.startswith("Connection error"):
                logger.error(f"LLM error on day {day_num}: {raw[:200]}")
                return None
        else:
            raw, _ = await llm.generate(
                prompt=prompt, system="Return ONLY valid JSON. No markdown.", temperature=0.4, max_tokens=2048
            )
        try:
            cleaned = _clean_json(raw)
            day = json.loads(cleaned)
            if isinstance(day, dict) and "days" in day and isinstance(day["days"], list):
                day = day["days"][0] if day["days"] else None
            if isinstance(day, dict) and "day" in day:
                day["label"] = day_label
                logger.info(f"Day {day_num} ({day_label}) generated")
                return day
            logger.warning(f"Day {day_num} response not a valid day dict: {cleaned[:200]}")
            return None
        except Exception as e:
            logger.error(f"Failed to parse day {day_num}: {e} | raw={raw[:200]}")
            return None

    for attempt in range(3):
        try:
            result = await _try()
            if result is not None:
                return result
            logger.warning(f"Day {day_num} attempt {attempt + 1} failed, retrying...")
        except ConnectionError:
            if attempt < 2:
                logger.warning(f"Rate limit on day {day_num}, retrying after 10s...")
                await asyncio.sleep(10)
            else:
                raise
    return None


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
        from app.services.rag.override import generate_override

        raw = await generate_override(
            prompt, "Return ONLY valid JSON.", active_provider, json_mode=True, max_tokens=768
        )
        if raw == "INVALID_API_KEY":
            raise PermissionError("Invalid API Key — Update your LLM provider settings.")
        if raw == "RATE_LIMITED":
            raise ConnectionError("Rate limit exceeded — Check your LLM provider billing tier.")
        if raw.startswith("Error from") or raw.startswith("Connection error"):
            logger.error(f"LLM error on grocery: {raw[:200]}")
            return {"grocery": [], "grocery_total_inr": 0}
    else:
        raw, _ = await llm.generate(prompt=prompt, system="Return ONLY valid JSON.", temperature=0.4, max_tokens=2048)

    try:
        result = json.loads(_clean_json(raw))
        if not isinstance(result.get("grocery_total_inr"), (int, float)) or result["grocery_total_inr"] == 0:
            total = sum(
                item.get("cost_inr", 0) or 0 for cat in result.get("grocery", []) for item in cat.get("items", [])
            )
            result["grocery_total_inr"] = total
        return result
    except Exception as e:
        logger.error(f"Failed to parse grocery: {e}")
        return {"grocery": [], "grocery_total_inr": 0}


@router.post("/stream")
async def stream_meal_plan(
    request: Request, meal_request: MealPlanRequest, user=Depends(get_current_user), db: Session = Depends(get_db)
):
    from main import get_llm_router

    llm = get_llm_router()
    if llm is None:
        raise HTTPException(status_code=503, detail="LLM not available")

    profile = (
        meal_request.user_profile.model_dump()
        if hasattr(meal_request.user_profile, "model_dump")
        else dict(meal_request.user_profile)
    )
    profile["budget_per_day_inr"] = meal_request.budget_per_day_inr

    # Resolve active provider: 1) pass-through API key, 2) DB, 3) LLMRouter fallback
    active_provider = None
    profile_provider = profile.get("llm_provider", "")
    profile_model = profile.get("llm_model", "")

    # 1. Pass-through API key from frontend (highest priority)
    if meal_request.api_key:
        active_provider = {
            "provider": profile_provider or "groq",
            "model": profile_model or "",
            "api_key": meal_request.api_key,
            "base_url": None,
        }
    # 2. DB-saved config for authenticated users
    elif user and profile_provider and profile_provider != "ollama":
        from app.api.v1.settings import get_user_active_provider

        active_provider = get_user_active_provider(user, db)
        if not active_provider:
            from app.models.user import LLMConfigDB

            config = (
                db.query(LLMConfigDB)
                .filter(LLMConfigDB.user_id == user.id, LLMConfigDB.provider == profile_provider)
                .first()
            )
            if config:
                from app.core.crypt import decrypt_api_key

                active_provider = {
                    "provider": config.provider,
                    "model": profile_model or config.model,
                    "api_key": decrypt_api_key(config.api_key_encrypted) if config.api_key_encrypted else None,
                    "base_url": config.base_url,
                }

    p = _extract_profile_params(profile)

    user_params = {
        "age": p["a"],
        "gender": p["g"],
        "weight": p["w"],
        "height": p["h"],
        "diet_type": p["diet"],
        "goal": p["goal"],
        "energy": p["energy"],
        "protein": p["protein"],
        "budget": p["budget"],
    }

    async def event_generator():
        all_days = []
        total_days = meal_request.days
        nl = "\n"

        try:
            yield f"data: {json.dumps({'token': f'Planning {total_days}-day meal plan...{nl}'})}\n\n"

            # Generate 1 day at a time — guarantees all days are produced
            for day_num in range(1, total_days + 1):
                day_label = DAYS_LIST[(day_num - 1) % 7]
                yield f"data: {json.dumps({'token': f'Day {day_num} ({day_label})...{nl}'})}\n\n"

                day = await _generate_chunk(llm, day_num, total_days, user_params, active_provider)

                if day:
                    all_days.append(day)
                else:
                    logger.error(f"Failed to generate day {day_num} after retries")

                await asyncio.sleep(3)

            # Validate no days are missing — fill gaps with fallback days
            if len(all_days) < total_days:
                existing = {d.get("day") for d in all_days}
                for day_num in range(1, total_days + 1):
                    if day_num not in existing:
                        yield f"data: {json.dumps({'token': f'Filling missing day {day_num}...\n'})}\n\n"
                        day = await _generate_chunk(llm, day_num, total_days, user_params, active_provider)
                        if day:
                            all_days.append(day)

            all_days.sort(key=lambda d: d.get("day", 0))

            if not all_days:
                raise Exception("Failed to generate any meal plan days")

            # Generate grocery list
            yield f"data: {json.dumps({'token': 'Generating grocery list...\n'})}\n\n"
            grocery_data = await _generate_grocery(llm, all_days, p["budget"], active_provider)

            plan = _enforce_day_slots(
                {
                    "summary": f"Personalized {total_days}-day meal plan",
                    "days": all_days,
                    "grocery": grocery_data.get("grocery", []),
                    "grocery_total_inr": grocery_data.get("grocery_total_inr", 0),
                }
            )

            if user is not None:
                try:
                    plan_db = MealPlanDB(
                        user_id=user.id,
                        plan_text=json.dumps(plan),
                        targets_json=json.dumps({"energy": p["energy"]}),
                        days=meal_request.days,
                        budget=float(p["budget"]),
                    )
                    db.add(plan_db)
                    db.commit()
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
    plans = (
        db.query(MealPlanDB)
        .filter(MealPlanDB.user_id == user.id)
        .order_by(MealPlanDB.created_at.desc())
        .limit(limit)
        .all()
    )
    result = []
    for p in plans:
        try:
            parsed = json.loads(p.plan_text) if p.plan_text else {}
        except Exception:
            parsed = {}
        result.append(
            {
                "id": p.id,
                "plan": parsed,
                "days": p.days,
                "budget": p.budget,
                "created_at": p.created_at.isoformat() if p.created_at else None,
            }
        )
    return {"plans": result}


@router.post("/generate")
@limiter.limit("2/minute")
async def generate_meal_plan(
    request: Request, meal_request: MealPlanRequest, user=Depends(get_current_user), db: Session = Depends(get_db)
):
    from main import get_llm_router

    llm = get_llm_router()
    if llm is None:
        raise HTTPException(status_code=503, detail="LLM not available")

    profile = (
        meal_request.user_profile.model_dump()
        if hasattr(meal_request.user_profile, "model_dump")
        else dict(meal_request.user_profile)
    )
    profile["budget_per_day_inr"] = meal_request.budget_per_day_inr

    # Resolve active provider: pass-through API key takes priority
    active_provider = None
    profile_provider = profile.get("llm_provider", "")
    profile_model = profile.get("llm_model", "")
    if meal_request.api_key:
        active_provider = {
            "provider": profile_provider or "groq",
            "model": profile_model or "",
            "api_key": meal_request.api_key,
            "base_url": None,
        }
    elif user and profile_provider and profile_provider != "ollama":
        from app.api.v1.settings import get_user_active_provider

        active_provider = get_user_active_provider(user, db)

    p = _extract_profile_params(profile)

    day_labels = ", ".join(DAYS_LIST[: meal_request.days])

    prompt = MEAL_PLAN_PROMPT.format(
        days=meal_request.days,
        num_people=meal_request.num_people,
        age=p["a"],
        gender=p["g"],
        weight=p["w"],
        height=p["h"],
        activity=p["act"],
        pal=p["pal"],
        diet_type=p["diet"],
        region=p.get("region", "India"),
        conditions=", ".join(profile.get("conditions") or []) if profile.get("conditions") else "None",
        goal=p["goal"],
        budget=p["budget"],
        extra="",
        energy=p["energy"],
        protein=p["protein"],
        day_labels=day_labels,
    )

    if active_provider:
        from app.services.rag.override import generate_override

        raw = await generate_override(
            prompt, "Return ONLY valid JSON.", active_provider, json_mode=True, max_tokens=2048
        )
        if raw == "INVALID_API_KEY":
            raise HTTPException(status_code=401, detail="Invalid API Key — Update your LLM provider settings.")
        if raw == "RATE_LIMITED":
            raise HTTPException(status_code=429, detail="Rate limit exceeded — Check your LLM provider billing tier.")
        if raw.startswith("Error from") or raw.startswith("Connection error"):
            raise HTTPException(status_code=502, detail=raw[:200])
    else:
        raw, _ = await llm.generate(prompt=prompt, system="Return ONLY valid JSON.", temperature=0.4, max_tokens=16384)

    try:
        plan = _enforce_day_slots(json.loads(_clean_json(raw)))
    except Exception:
        plan = {"summary": "Generation failed", "days": [], "grocery": [], "grocery_total_inr": 0}

    if user is not None:
        try:
            plan_db = MealPlanDB(
                user_id=user.id,
                plan_text=json.dumps(plan),
                targets_json=json.dumps({"energy": p["energy"]}),
                days=meal_request.days,
                budget=float(p["budget"]),
            )
            db.add(plan_db)
            db.commit()
            db.refresh(plan_db)
        except Exception as e:
            logger.error(f"Failed to persist meal plan: {e}")

    return plan
