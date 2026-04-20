"""
AaharAI NutriSync — Orchestrator Agent
Coordinates planner, analyzer, and coach agents.
"""
import logging
from typing import Dict, Any, Optional, List

logger = logging.getLogger(__name__)


class OrchestratorAgent:
    """Multi-agent orchestration for nutrition queries."""
    
    def __init__(
        self,
        planner=None,
        analyzer=None,
        coach=None,
        rag_service=None,
        llm_router=None,
    ):
        self.planner = planner
        self.analyzer = analyzer
        self.coach = coach
        self.rag_service = rag_service
        self.llm_router = llm_router
    
    async def process(
        self,
        query: str,
        user_profile: Optional[Dict] = None,
        meals: Optional[List[Dict]] = None,
        conversation_history: Optional[List[Dict]] = None,
    ) -> Dict[str, Any]:
        """Process query through the agent pipeline."""
        # Step 1: Plan - classify intent
        intent_analysis = self.planner.analyze_intent(query)
        logger.info(f"Orchestrator: intent={intent_analysis['intent']}")
        
        # Step 2: Analyze - get knowledge and meal data
        knowledge = []
        meal_analysis = None
        
        if intent_analysis.get("needs_rag"):
            try:
                knowledge = await self.analyzer.retrieve_knowledge(
                    query,
                    intent_analysis["collection"]
                )
            except Exception as e:
                logger.warning(f"RAG retrieval failed: {e}")
        
        if intent_analysis.get("needs_meal_data") and meals:
            meal_analysis = self.analyzer.analyze_meals(meals)
        
        # Build analysis text
        analysis_text = self.analyzer.generate_analysis_text({
            "knowledge": knowledge,
            "meal_analysis": meal_analysis,
        })
        
        # Step 3: Coach - generate response
        response_text = await self.coach.generate_response(
            query=query,
            analysis_context=analysis_text,
            user_profile=user_profile,
            conversation_history=conversation_history,
        )
        
        # Validate and structure output
        response_text = self._validate_response(response_text)
        
        # Extract sources
        sources = []
        for chunk in knowledge[:3]:
            meta = chunk.get("metadata", {})
            source = meta.get("source", "unknown")
            if source not in sources:
                sources.append(source)
        
        return self._standard_response(
            answer=response_text,
            sources=sources,
            intent=intent_analysis["intent"],
            analysis={"knowledge": knowledge, "meal_analysis": meal_analysis},
        )
    
    def _validate_response(self, output: str) -> str:
        """Validate and sanitize agent output."""
        if not output or len(output.strip()) == 0:
            return "I couldn't process that request. Please try again."
        if len(output) > 10000:  # Max response length
            return output[:10000] + "... (truncated)"
        return output.strip()
    
    def _standard_response(self, answer: str, sources: list, intent: str, analysis: dict = None) -> dict:
        """Standard response format for all agents."""
        return {
            "success": True,
            "data": {
                "answer": answer,
                "sources": sources,
                "intent": intent,
                "analysis": analysis,
            },
            "error": None,
            "llm_provider": "ollama" if self.llm_router else "unknown",
        }
    
    async def process_meal_plan(
        self,
        user_profile: Dict,
        days: int = 7,
        preferences: Dict = None,
    ) -> Dict[str, Any]:
        """Process meal plan request."""
        try:
            from rag.service import RAGService
            from config import settings
            
            if not self.rag_service:
                self.rag_service = RAGService(self.llm_router)
        except Exception as e:
            logger.warning(f"RAG service not available: {e}")
        
        # Get relevant knowledge
        knowledge = []
        if self.rag_service and user_profile.get("diet_type"):
            try:
                knowledge = await self.analyzer.retrieve_knowledge(
                    f"meal plan for {user_profile['diet_type']} diet",
                    "nutrisync"
                )
            except Exception as e:
                logger.warning(f"Meal plan RAG failed: {e}")
        
        # Generate meal plan
        targets = self._calculate_targets(user_profile)
        
        response_text = await self.coach.generate_meal_plan(
            days=days,
            targets=targets,
            preferences=preferences or {},
        )
        
        return {
            "meal_plan": response_text,
            "targets": targets,
            "days": days,
        }
    
    def _calculate_targets(self, profile: Dict) -> Dict[str, Any]:
        """Calculate nutrition targets from profile."""
        # Basic calculation (can be enhanced)
        weight = profile.get("weight_kg", 70)
        
        # Estimate BMR (Mifflin-St Jeor)
        if profile.get("sex") == "Male":
            bmr = 10 * weight + 6.25 * profile.get("height_cm", 170) - 5 * profile.get("age", 30) + 5
        else:
            bmr = 10 * weight + 6.25 * profile.get("height_cm", 160) - 5 * profile.get("age", 30) - 161
        
        # Activity multiplier
        activity_mult = {
            "Sedentary": 1.2,
            "Light": 1.375,
            "Moderate": 1.55,
            "Active": 1.725,
            "Very Active": 1.9,
        }.get(profile.get("profession", "Moderate"), 1.375)
        
        tdee = bmr * activity_mult
        
        # Adjust for goal
        goal = profile.get("goal", "").lower()
        if "loss" in goal or "reduce" in goal:
            tdee -= 500
        elif "gain" in goal or "muscle" in goal:
            tdee += 300
        
        return {
            "calories": int(tdee),
            "protein_g": int(weight * 1.2),  # 1.2g per kg
            "carbs_g": int(tdee * 0.5 / 4),
            "fat_g": int(tdee * 0.3 / 9),
        }


def create_orchestrator(
    rag_service=None,
    llm_router=None,
) -> OrchestratorAgent:
    """Factory to create orchestrator with all dependencies."""
    # Create agents
    from agents.planner import create_planner
    from agents.analyzer import create_analyzer
    from agents.coach import create_coach
    
    planner = create_planner(llm_router)
    analyzer = create_analyzer(rag_service, llm_router)
    coach = create_coach(llm_router)
    
    return OrchestratorAgent(
        planner=planner,
        analyzer=analyzer,
        coach=coach,
        rag_service=rag_service,
        llm_router=llm_router,
    )