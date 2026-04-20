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
import re
from typing import Optional

from engines.inference_engine import inference_engine
from rag.llm_router import LLMRouter
from agent.tools.food_search import search_foods_tool
from agent.tools.regional_filter import get_regional_foods
from agent.tools.nutrition_analyzer import analyze_meal

logger = logging.getLogger(__name__)


class MealPlanAgent:
    """Budget-aware meal planning with grocery list and recipe generation."""

    def __init__(self, llm_router: LLMRouter):
        self.llm_router = llm_router

    async def generate_meal_plan(self, profile: dict, days: int = 7,
                                  num_people: int = 1,
                                  budget_per_day: Optional[float] = None) -> dict:
        """Generate a complete meal plan for the given number of days."""
        # 1. Compute personalized nutrient targets
        targets = inference_engine.compute_targets(profile)

        # 2. Get suitable regional foods
        zone = profile.get("region_zone", "South")
        diet_type = profile.get("diet_type", "VEG")
        regional_info = get_regional_foods(zone)
        
        # 3. Get generic base foods + nutrient-targeted foods (IMP-019: unified slicing)
        FOOD_CONTEXT_LIMIT = 40
        base_foods = search_foods_tool(query="", diet_type=diet_type, limit=FOOD_CONTEXT_LIMIT)
        
        # Also fetch high-protein and high-iron foods for diversity
        high_protein = search_foods_tool(query="", diet_type=diet_type, 
                                        food_group="Pulses" if diet_type == "VEG" else "Protein Sources",
                                        limit=10) if hasattr(search_foods_tool, '__call__') else []
        
        # Combine and deduplicate
        all_foods_dict = {}
        for f in base_foods:
            if f.get('name'):
                all_foods_dict[f['name']] = f
        for f in high_protein:
            if f.get('name'):
                all_foods_dict[f['name']] = f
        
        all_foods = list(all_foods_dict.values())[:FOOD_CONTEXT_LIMIT]
        
        # Build food context string
        foods_context = []
        for f in all_foods:
            foods_context.append(f"{f['name']} ({f['energy_kcal']} kcal, {f['protein_g']}g protein, {f['iron_mg']}mg iron)")
        foods_str = "\n".join(foods_context)

        # 4. Generate meal plan using LLM
        meal_plan = await self._plan_meals_with_llm(
            foods_str, targets, profile, days, num_people, budget_per_day, regional_info
        )

        return {
            "targets": targets,
            "meal_plan": meal_plan,
            "foods_used": [f["name"] for f in all_foods[:FOOD_CONTEXT_LIMIT]],
        }

    async def _plan_meals_with_llm(self, foods_str: str, targets: dict, profile: dict,
                                     days: int, num_people: int, budget_per_day: float, regional_info: dict = None) -> dict:
        """Use LLM to create a structured meal plan with verification."""
        budget_str = f"\nBudget constraint: ₹{budget_per_day}/day" if budget_per_day else ""
        
        # IMP-004: Build regional context from fetched data
        regional_str = ""
        if regional_info and regional_info.get('recommendations'):
            rec = regional_info['recommendations'][0] if isinstance(regional_info['recommendations'], list) else regional_info['recommendations']
            staples = rec.get('Staple Foods', '')
            char = rec.get('Dietary Character', '')
            zone = profile.get('region_zone', 'South')
            regional_str = f"\nREGIONAL CONTEXT ({zone} India):"
            regional_str += f"\n- Dietary character: {char}"
            regional_str += f"\n- Staple foods: {staples}"
        
        # GLP-1 specifics
        glp1_str = ""
        if profile.get('glp1_medication'):
            glp1_str = f"- GLP-1 User ({profile.get('glp1_medication')}). Prioritize nausea-safe foods, enforce protein."

        prompt = f"""Create a {days}-day Indian meal plan for {num_people} people using these nutritious foods:

{foods_str}

DAILY NUTRIENT TARGETS:
- Calories: {targets.get('calories', 2000):.0f} kcal
- Protein: {targets.get('protein_g', 55):.0f}g (MINIMUM — non-negotiable)
- Iron: {targets.get('iron_mg', 17):.1f}mg
- Calcium: {targets.get('calcium_mg', 1000):.0f}mg
{budget_str}
{regional_str}

USER PROFILE:
- Diet: {profile.get('diet_type', 'VEG')}
- Region: {profile.get('region_zone', 'South')} India
{glp1_str}

    Day X (per person):
| Meal | Food Items | Portion/Quantity | Macros (P/F/C/Kcal) |
| :--- | :--- | :--- | :--- |
| Breakfast | Item 1, Item 2 | 1 bowl, 2 pcs | 10g / 5g / 40g / 250kcal |
| Lunch | Item 3, Item 4 | 2 katori, 1 roti | 15g / 8g / 60g / 450kcal |
| Snack | Item 5 | 1 cup | 2g / 1g / 15g / 80kcal |
| Dinner | Item 6, Item 7 | 1 bowl, 1 roti | 12g / 7g / 50g / 350kcal |

After the daily tables, provide a "Nutritional Estimate" table for the week.

    Keep portions realistic (1 katori rice = 150g). Scale quantities for {num_people} people. Prioritize variety across the week. Ensure ALL DAILY MEALS ARE IN THE TABLE FORMAT SHOWN ABOVE. DO NOT USE BULLET POINTS FOR MEALS.
"""

        system = "You are a certified Indian nutritionist creating personalized daily meal plans."
        response, provider = await self.llm_router.generate(prompt, system, temperature=0.6)
        
        # IMP-009: Verify meal plan meets nutrient targets (optional warning)
        analysis_warning = ""
        try:
            # Try to extract estimated macros from response
            protein_match = re.search(r'Protein.*?(\d+(?:\.\d+)?)\s*g', response, re.IGNORECASE)
            calorie_match = re.search(r'Calories?.*?(\d+(?:\.\d+)?)\s*(?:kcal|cal)', response, re.IGNORECASE)
            
            if protein_match and calorie_match:
                est_protein = float(protein_match.group(1))
                est_calories = float(calorie_match.group(1))
                target_protein = targets.get('protein_g', 55)
                target_calories = targets.get('calories', 2000)
                
                # Daily analysis
                daily_protein = est_protein / max(int(response.count('Day')), 1)
                daily_calories = est_calories / max(int(response.count('Day')), 1)
                
                if daily_protein < target_protein * 0.85:
                    analysis_warning = f"⚠️ Estimated daily protein ({daily_protein:.0f}g) is below target ({target_protein:.0f}g). Consider adding more pulses or protein-rich foods."
        except Exception as e:
            logger.debug(f"Could not parse meal plan for validation: {e}")
        
        return {
            "plan_text": response, 
            "provider": provider,
            "analysis_warning": analysis_warning
        }

    async def generate_grocery_list(self, meal_plan_text: str, days: int = 7, num_people: int = 1) -> dict:
        """Extract and aggregate grocery items from a meal plan."""
        prompt = f"""From this meal plan, create a consolidated grocery list for {days} days and {num_people} {'person' if num_people == 1 else 'people'}:

{meal_plan_text}

FORMAT:
Category: [Cereals/Pulses/Vegetables/Dairy/Spices/etc.]
- Item: quantity needed (in kg/g/L/units)

At the end, estimate total cost in ₹ (use typical Indian market prices for {num_people} people)."""

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
