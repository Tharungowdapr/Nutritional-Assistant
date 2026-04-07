"""
AaharAI NutriSync — Meal Planning Agent
LangChain ReAct agent that autonomously:
1. Computes nutrient targets from user profile
2. Selects foods matching targets + budget + diet type
3. Plans weekly meals
4. Generates grocery list with Indian portions
5. Creates recipes from available ingredients
"""
import logging
from typing import Optional

from database.loader import db
from engines.inference_engine import inference_engine
from rag.llm_router import LLMRouter

logger = logging.getLogger(__name__)


class MealPlanAgent:
    """Budget-aware meal planning with grocery list and recipe generation."""

    def __init__(self, llm_router: LLMRouter):
        self.llm_router = llm_router

    async def generate_meal_plan(self, profile: dict, days: int = 7,
                                  budget_per_day: Optional[float] = None) -> dict:
        """Generate a complete meal plan for the given number of days."""
        # 1. Compute personalized nutrient targets
        targets = inference_engine.compute_targets(profile)

        # 2. Get suitable foods based on diet type, region, and conditions
        suitable_foods = self._get_suitable_foods(profile)

        # 3. Score foods by nutrient density
        scored_foods = self._score_foods(suitable_foods, targets)

        # 4. Generate meal plan using LLM
        meal_plan = await self._plan_meals_with_llm(
            scored_foods, targets, profile, days, budget_per_day
        )

        return {
            "targets": targets,
            "meal_plan": meal_plan,
            "foods_used": scored_foods.head(20)["Food Name"].tolist(),
        }

    def _get_suitable_foods(self, profile: dict):
        """Filter foods by diet type, region, and GLP-1 safety."""
        foods = db.food.copy()

        # Filter by diet type
        diet_type = profile.get("diet_type", "VEG")
        if diet_type == "VEG":
            foods = foods[foods["Diet Type"] == "VEG"]
        elif diet_type == "VEGAN":
            foods = foods[foods["Diet Type"] == "VEG"]
            # Exclude dairy
            dairy_groups = ["Dairy", "Milk Products"]
            foods = foods[~foods["Food Group"].isin(dairy_groups)]

        # If GLP-1 user in titration → prefer nausea-safe foods
        if profile.get("glp1_phase") == "Titration":
            nausea_safe = [
                "Moong dal", "Curd", "Banana", "Oats", "Ragi",
                "Bajra", "Moringa", "Sesame", "Masoor", "Khichdi",
            ]
            foods["nausea_safe"] = foods["Food Name"].apply(
                lambda x: any(s.lower() in str(x).lower() for s in nausea_safe)
            )
            # Boost nausea-safe foods but don't exclude others
            foods["nausea_priority"] = foods["nausea_safe"].astype(int)
        else:
            foods["nausea_priority"] = 0

        return foods

    def _score_foods(self, foods, targets: dict):
        """Score foods by nutrient density relative to targets."""
        score_cols = {
            "Protein (g)": targets.get("protein_g", 55),
            "Iron (mg)": targets.get("iron_mg", 17),
            "Calcium (mg)": targets.get("calcium_mg", 1000),
            "Magnesium (mg)": targets.get("magnesium_mg", 420),
            "Fibre (g)": targets.get("fibre_g", 30),
        }

        foods = foods.copy()
        total_score = 0
        for col, target in score_cols.items():
            if col in foods.columns and target > 0:
                normalized = foods[col].fillna(0) / target
                normalized = normalized.clip(upper=1.0)
                foods[f"score_{col}"] = normalized
                total_score = total_score + normalized

        foods["nutrient_density_score"] = total_score / len(score_cols)

        # Add nausea priority bonus
        if "nausea_priority" in foods.columns:
            foods["nutrient_density_score"] += foods["nausea_priority"] * 0.1

        return foods.sort_values("nutrient_density_score", ascending=False)

    async def _plan_meals_with_llm(self, scored_foods, targets, profile,
                                     days, budget_per_day) -> dict:
        """Use LLM to create a structured meal plan."""
        top_foods = scored_foods.head(25)[["Food Name", "Energy (kcal)", "Protein (g)",
                                            "Iron (mg)", "Food Group"]].to_string(index=False)

        budget_str = f"\nBudget constraint: ₹{budget_per_day}/day" if budget_per_day else ""

        prompt = f"""Create a {days}-day Indian meal plan using these top-ranked foods:

{top_foods}

DAILY NUTRIENT TARGETS:
- Calories: {targets['calories']:.0f} kcal
- Protein: {targets['protein_g']:.0f}g (MINIMUM — non-negotiable)
- Iron: {targets['iron_mg']:.1f}mg
- Calcium: {targets['calcium_mg']:.0f}mg
{budget_str}

USER:
- Diet: {profile.get('diet_type', 'VEG')}
- Region: {profile.get('region_zone', 'South')} India
- GLP-1: {profile.get('glp1_medication', 'None')}

FORMAT each day as:
Day X:
- Breakfast: [food items with portions in Indian units]
- Mid-morning snack: [food items]
- Lunch: [food items with portions]
- Evening snack: [food items]
- Dinner: [food items with portions]
Approx nutrients: Xcal | Xg protein | Xmg iron

Keep portions realistic (1 katori rice = 150g, 1 katori dal = 180g, etc.)
Prioritize variety across the week."""

        system = "You are a certified Indian nutritionist creating personalized meal plans."
        response, provider = await self.llm_router.generate(prompt, system, temperature=0.6)
        return {"plan_text": response, "provider": provider}

    async def generate_grocery_list(self, meal_plan_text: str,
                                     days: int = 7) -> dict:
        """Extract and aggregate grocery items from a meal plan."""
        prompt = f"""From this meal plan, create a consolidated grocery shopping list:

{meal_plan_text}

FORMAT:
Category: [Cereals/Pulses/Vegetables/Dairy/Spices/etc.]
- Item: quantity needed for {days} days (in kg/g/L/units)
- Item: quantity

At the end, estimate total cost in ₹ (use typical Indian market prices).
Group items by store section for easy shopping."""

        system = "You are a practical Indian kitchen manager creating efficient shopping lists."
        response, provider = await self.llm_router.generate(prompt, system, temperature=0.4)
        return {"grocery_text": response, "provider": provider}

    async def generate_recipe(self, meal_name: str, ingredients: list[str],
                               servings: int = 2) -> dict:
        """Generate a detailed Indian recipe from ingredients."""
        prompt = f"""Generate a detailed Indian recipe for: {meal_name}

Available ingredients: {', '.join(ingredients)}
Servings: {servings}

Include:
1. Preparation time and cooking time
2. Step-by-step instructions with Indian cooking techniques
3. Nutritional information per serving (approximate)
4. Tips for GLP-1 users (if applicable — reduce oil, avoid deep frying)
5. Substitution suggestions for missing ingredients"""

        system = "You are an expert Indian home cook creating healthy, nutritious recipes."
        response, provider = await self.llm_router.generate(prompt, system, temperature=0.7)
        return {"recipe_text": response, "provider": provider}
