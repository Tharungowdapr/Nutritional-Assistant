"""
AaharAI NutriSync — Meal Planning Agent
LangChain ReAct-style agent that autonomously:
1. Computes nutrient targets from user profile
2. Selects foods matching targets + budget + diet type
3. Plans weekly meals
4. Generates grocery list with Indian portions
5. Creates recipes from available ingredients
"""
import logging
from typing import Optional

from engines.inference_engine import inference_engine
from rag.llm_router import LLMRouter
from agent.tools.food_search import search_foods_tool
from agent.tools.regional_filter import get_regional_foods

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

        # 2. Get suitable regional foods
        zone = profile.get("region_zone", "South")
        diet_type = profile.get("diet_type", "VEG")
        regional_info = get_regional_foods(zone)
        
        # 3. Get generic base foods using search tool
        base_foods = search_foods_tool(query="", diet_type=diet_type, limit=30)
        
        # Build food context string
        foods_context = []
        for f in base_foods[:25]:
            foods_context.append(f"{f['name']} ({f['energy_kcal']} kcal, {f['protein_g']}g protein, {f['iron_mg']}mg iron)")
        foods_str = "\n".join(foods_context)

        # 4. Generate meal plan using LLM
        meal_plan = await self._plan_meals_with_llm(
            foods_str, targets, profile, days, budget_per_day
        )

        return {
            "targets": targets,
            "meal_plan": meal_plan,
            "foods_used": [f["name"] for f in base_foods[:20]],
        }

    async def _plan_meals_with_llm(self, foods_str: str, targets: dict, profile: dict,
                                     days: int, budget_per_day: float) -> dict:
        """Use LLM to create a structured meal plan."""
        budget_str = f"\nBudget constraint: ₹{budget_per_day}/day" if budget_per_day else ""
        
        # GLP-1 specifics
        glp1_str = ""
        if profile.get('glp1_medication'):
            glp1_str = f"- GLP-1 User ({profile.get('glp1_medication')}). Prioritize nausea-safe foods, enforce protein."

        prompt = f"""Create a {days}-day Indian meal plan using these nutritious foods:

{foods_str}

DAILY NUTRIENT TARGETS:
- Calories: {targets.get('calories', 2000):.0f} kcal
- Protein: {targets.get('protein_g', 55):.0f}g (MINIMUM — non-negotiable)
- Iron: {targets.get('iron_mg', 17):.1f}mg
- Calcium: {targets.get('calcium_mg', 1000):.0f}mg
{budget_str}

USER PROFILE:
- Diet: {profile.get('diet_type', 'VEG')}
- Region: {profile.get('region_zone', 'South')} India
{glp1_str}

Day X:
| Meal | Food Items | Portion/Quantity | Macros (P/F/C/Kcal) |
| :--- | :--- | :--- | :--- |
| Breakfast | Item 1, Item 2 | 1 bowl, 2 pcs | 10g / 5g / 40g / 250kcal |
| Lunch | Item 3, Item 4 | 2 katori, 1 roti | 15g / 8g / 60g / 450kcal |
| Snack | Item 5 | 1 cup | 2g / 1g / 15g / 80kcal |
| Dinner | Item 6, Item 7 | 1 bowl, 1 roti | 12g / 7g / 50g / 350kcal |

After the daily tables, provide a "Nutritional Estimate" table for the week.

Keep portions realistic (1 katori rice = 150g). Prioritize variety across the week. Ensure ALL DAILY MEALS ARE IN THE TABLE FORMAT SHOWN ABOVE. DO NOT USE BULLET POINTS FOR MEALS.
"""

        system = "You are a certified Indian nutritionist creating personalized daily meal plans."
        response, provider = await self.llm_router.generate(prompt, system, temperature=0.6)
        return {"plan_text": response, "provider": provider}

    async def generate_grocery_list(self, meal_plan_text: str, days: int = 7) -> dict:
        """Extract and aggregate grocery items from a meal plan."""
        prompt = f"""From this meal plan, create a consolidated grocery list for {days} days:

{meal_plan_text}

FORMAT:
Category: [Cereals/Pulses/Vegetables/Dairy/Spices/etc.]
- Item: quantity needed (in kg/g/L/units)

At the end, estimate total cost in ₹ (use typical Indian market prices)."""

        system = "You are a practical Indian kitchen manager creating efficient shopping lists."
        response, provider = await self.llm_router.generate(prompt, system, temperature=0.4)
        return {"grocery_text": response, "provider": provider}

    async def generate_recipe(self, instructions: str) -> dict:
        """Generate a detailed recipe from natural language instructions."""
        prompt = f"""Generate a detailed recipe based on following instructions:
{instructions}

Include:
1. Preparation time and cooking time
2. Step-by-step instructions
3. Nutritional info per serving (present this in a Markdown Table)
4. GLP-1 tips (e.g., reduce oil, avoid deep frying) if applicable
5. Ingredient Composition Table (Item | Quantity | Calories | Protein)"""

        system = "You are an expert Indian home cook creating healthy recipes."
        response, provider = await self.llm_router.generate(prompt, system, temperature=0.7)
        return {"recipe_text": response, "provider": provider}
