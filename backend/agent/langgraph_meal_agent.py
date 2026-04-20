"""
AaharAI NutriSync — Advanced Agentic Meal Planner (LangGraph)
Uses a multi-agent orchestration pipeline to ensure nutritional accuracy,
cultural appropriateness, and constraint satisfaction.
"""
import logging
import json
from typing import TypedDict, List, Annotated, Dict, Any, Optional
from langgraph.graph import StateGraph, END
from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage

from engines.inference_engine import inference_engine
from rag.llm_router import LLMRouter
from agent.tools.food_search import search_foods_tool
from agent.tools.regional_filter import get_regional_foods

logger = logging.getLogger(__name__)

class PlanState(TypedDict):
    """Internal state for the meal planning graph."""
    profile: Dict[str, Any]
    targets: Dict[str, Any]
    food_candidates: List[Dict[str, Any]]
    draft_plan: str
    critique: Optional[str]
    final_plan: Optional[str]
    iteration: int
    days: int
    num_people: int
    budget_per_day: Optional[float]
    provider: str

class LangGraphMealAgent:
    """Multi-agent meal planner using LangGraph orchestration."""

    def __init__(self, llm_router: LLMRouter):
        self.llm_router = llm_router
        self._build_graph()

    def _build_graph(self):
        """Construct the agentic state machine."""
        workflow = StateGraph(PlanState)

        # Add nodes
        workflow.add_node("nutritionist", self.nutritionist_node)
        workflow.add_node("selector", self.selector_node)
        workflow.add_node("composer", self.composer_node)
        workflow.add_node("critic", self.critic_node)
        workflow.add_node("refiner", self.refiner_node)

        # Define edges
        workflow.set_entry_point("nutritionist")
        workflow.add_edge("nutritionist", "selector")
        workflow.add_edge("selector", "composer")
        workflow.add_edge("composer", "critic")
        
        # Loop conditional
        workflow.add_conditional_edges(
            "critic",
            self._should_refine,
            {
                "refine": "refiner",
                "end": END
            }
        )
        
        workflow.add_edge("refiner", "critic")

        self.app = workflow.compile()

    def _should_refine(self, state: PlanState):
        """Determine if the plan needs another refinement pass."""
        if state.get("critique") and state["iteration"] < 3:
            return "refine"
        return "end"

    async def nutritionist_node(self, state: PlanState):
        """Agent 1: Computes personalized RDA targets."""
        logger.info("LangGraph: Nutritionist Node")
        targets = inference_engine.compute_targets(state["profile"])
        return {"targets": targets, "iteration": state["iteration"] + 1}

    async def selector_node(self, state: PlanState):
        """Agent 2: Queries IFCT database for matching candidates."""
        logger.info("LangGraph: Selector Node")
        diet_type = state["profile"].get("diet_type", "VEG")
        zone = state["profile"].get("region_zone", "South")
        
        # Primary search
        foods = search_foods_tool(query="", diet_type=diet_type, limit=50)
        
        # Specialized pulses/protein search
        protein_boost = search_foods_tool(
            query="", 
            diet_type=diet_type, 
            food_group="Pulses" if diet_type == "VEG" else "Protein Sources",
            limit=15
        )
        
        # Deduplicate
        all_foods = {f["name"]: f for f in (foods + protein_boost)}.values()
        return {"food_candidates": list(all_foods)}

    async def composer_node(self, state: PlanState):
        """Agent 3: Arranges foods into a structured plan."""
        logger.info("LangGraph: Composer Node")
        
        foods_context = "\n".join([
            f"- {f['name']} ({f['energy_kcal']}kcal, {f['protein_g']}g protein, {f['iron_mg']}mg iron, {f['carbs_g']}g carbs)"
            for f in state["food_candidates"][:40]
        ])
        
        prompt = f"""Create a {state['days']}-day Indian meal plan for {state['num_people']} people.
        
        TARGETS (Daily):
        - Calories: {state['targets'].get('calories', 2000):.0f} kcal
        - Protein: {state['targets'].get('protein_g', 55):.0f}g (MINIMUM)
        - Iron: {state['targets'].get('iron_mg', 17):.1f}mg
        
        FOOD OPTIONS:
        {foods_context}
        
        Format each day in a Markdown Table:
        | Meal | Items | Portion | Macros |
        
        Scale all quantities for {state['num_people']} people. Ensure variety.
        """
        
        response, provider = await self.llm_router.generate(prompt, "You are a Master Indian Dietitian.")
        return {"draft_plan": response, "provider": provider}

    async def critic_node(self, state: PlanState):
        """Agent 4: Validates the plan against constraints."""
        logger.info("LangGraph: Critic Node")
        
        prompt = f"""Critique this meal plan against targets:
        Plan: {state['draft_plan']}
        
        Targets:
        - {state['targets'].get('protein_g')}g protein
        - {state['targets'].get('calories')} kcal
        
        Check for:
        1. Nutritional coverage?
        2. Portions scaled for {state['num_people']} people?
        3. Variety?
        
        If perfect, reply 'PASSED'. Otherwise, list specific errors.
        """
        
        response, _ = await self.llm_router.generate(prompt, "You are a Clinical Nutrition Reviewer.")
        if "PASSED" in response.upper() and len(response) < 20:
            return {"critique": None, "final_plan": state["draft_plan"]}
        
        return {"critique": response}

    async def refiner_node(self, state: PlanState):
        """Agent 5: Fixes errors flagged by the critic."""
        logger.info("LangGraph: Refiner Node")
        
        prompt = f"""Refine this meal plan based on feedback:
        Plan: {state['draft_plan']}
        Critique: {state['critique']}
        
        Ensure the final version fixes all issues while maintaining the table format.
        """
        
        response, provider = await self.llm_router.generate(prompt, "You are an expert Refinement Agent.")
        return {"draft_plan": response, "provider": provider, "iteration": state["iteration"] + 1}

    async def generate_meal_plan(self, profile: Dict, days: int = 7, num_people: int = 1, budget_per_day: float = None) -> Dict:
        """Generate a personalized meal plan. Alias for execute()."""
        return await self.execute(profile, days, num_people, budget_per_day)

    async def generate_grocery_list(self, meal_plan_text: str, days: int, num_people: int) -> Dict:
        """Generate a grocery list from a meal plan text."""
        prompt = f"""Based on this meal plan, create a detailed grocery shopping list:

{meal_plan_text}

Provide the list as a simple markdown list with quantities and estimated costs in INR.
Group items by category (Produce, Dairy, Grains, etc.).
Include estimated total cost at the end."""

        response, provider = await self.llm_router.generate(prompt, "You are a nutritionist and grocery shopping expert.")
        
        return {
            "grocery_list": response,
            "provider": provider,
            "days": days,
            "num_people": num_people
        }

    async def generate_recipe(self, instructions: str, num_people: int = 2) -> Dict:
        """Generate a detailed recipe from cooking instructions."""
        prompt = f"""Create a detailed, structured recipe from these cooking instructions:

{instructions}

Format the recipe as follows:
- Title: [Recipe Name]
- Description: [Brief description]
- Ingredients: 
  - [List each ingredient with quantity and unit]
- Instructions:
  1. [Step-by-step instructions]
- Nutrition Info (per serving):
  - Calories: [estimate]
  - Protein: [estimate]g
  - Carbs: [estimate]g
  - Fat: [estimate]g
  - Fiber: [estimate]g

Make it suitable for {num_people} people."""

        response, provider = await self.llm_router.generate(prompt, "You are an expert chef and nutritionist.")
        
        return {
            "recipe": response,
            "provider": provider,
            "instructions": instructions
        }

    async def execute(self, profile: Dict, days: int = 7, num_people: int = 1, budget: float = None) -> Dict:
        """Entry point to run the agentic pipeline."""
        initial_state: PlanState = {
            "profile": profile,
            "targets": {},
            "food_candidates": [],
            "draft_plan": "",
            "critique": None,
            "final_plan": None,
            "iteration": 0,
            "days": days,
            "num_people": num_people,
            "budget_per_day": budget,
            "provider": ""
        }
        
        final_result = await self.app.ainvoke(initial_state)
        
        return {
            "meal_plan": {
                "plan_text": final_result.get("final_plan") or final_result.get("draft_plan"),
                "provider": final_result.get("provider"),
                "analysis_warning": final_result.get("critique") if not final_result.get("final_plan") else ""
            },
            "targets": final_result["targets"],
            "foods_used": [f["name"] for f in final_result["food_candidates"][:20]]
        }
