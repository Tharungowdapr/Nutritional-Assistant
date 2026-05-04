"""
AaharAI NutriSync — Coach Agent
Generates human-friendly, personalized responses.
"""
import logging
from typing import Dict, Any, Optional, List

logger = logging.getLogger(__name__)

SYSTEM_COACH = """You are AaharAI NutriSync, a friendly and knowledgeable nutrition coach.

Your style:
- Warm and supportive tone
- Clear, actionable advice
- Use Indian food examples when possible
- Consider user's diet type (VEG/NON-VEG/VEGAN) and region
- Keep responses concise but informative
- Always cite sources when available

Remember:
- Be encouraging, not judgmental
- Focus on progress, not perfection
- Provide specific quantities (e.g., "1 katori" not "some rice")"""


class CoachAgent:
    """Generates final responses with personalization."""
    
    def __init__(self, llm_router=None):
        self.llm_router = llm_router
    
    def format_profile_context(self, profile: Optional[Dict[str, Any]]) -> str:
        """Format user profile for prompt."""
        if not profile:
            return "No profile information available."
        
        parts = []
        
        # Key info
        if profile.get("name"):
            parts.append(f"User: {profile['name']}")
        if profile.get("diet_type"):
            parts.append(f"Diet: {profile['diet_type']}")
        if profile.get("age"):
            parts.append(f"Age: {profile['age']}")
        
        # Goals
        if profile.get("goal"):
            parts.append(f"Goal: {profile['goal']}")
        
        # Health conditions
        if profile.get("conditions") and profile["conditions"]:
            parts.append(f"Conditions: {', '.join(profile['conditions'])}")
        
        return "\n".join(parts) if parts else "No profile info."
    
    def format_analysis_context(self, analysis_text: str, knowledge: List[Dict]) -> str:
        """Format analysis + sources for prompt."""
        parts = []
        
        if analysis_text:
            parts.append(analysis_text)
        
        # Add sources if available
        if knowledge:
            sources = []
            for chunk in knowledge[:3]:
                meta = chunk.get("metadata", {})
                source = meta.get("source", "unknown")
                if source not in sources:
                    sources.append(source)
            
            if sources:
                parts.append(f"\nSources: {', '.join(sources)}")
        
        return "\n".join(parts) if parts else "No additional data."
    
    async def generate_response(
        self,
        query: str,
        analysis_context: str,
        user_profile: Optional[Dict] = None,
        conversation_history: Optional[List[Dict]] = None,
    ) -> str:
        """Generate final response."""
        if not self.llm_router:
            return "AI service unavailable. Please try again."
        
        # Build context
        profile_ctx = self.format_profile_context(user_profile)
        full_context = f"{profile_ctx}\n\n{analysis_context}"
        
        # Add conversation history if available
        history_ctx = ""
        if conversation_history and len(conversation_history) > 0:
            history_parts = ["Recent conversation:"]
            for h in conversation_history[-3:]:
                if h.get("role") == "user":
                    history_parts.append(f"User: {h.get('content', '')}")
                else:
                    history_parts.append(f"You: {h.get('content', '')}")
            history_ctx = "\n".join(history_parts) + "\n\n"
        
        # Build prompt
        prompt = f"""{history_ctx}Context:
{full_context}

User Question:
{query}

Provide a helpful, personalized response."""
        
        try:
            response, provider = await self.llm_router.generate(
                prompt=prompt,
                system=SYSTEM_COACH,
                temperature=0.7,
            )
            return response.strip()
        except Exception as e:
            logger.error(f"Coach generation failed: {e}")
            return "I apologize, but I couldn't generate a response. Please try again."
    
    async def generate_suggestion(
        self,
        query: str,
        recommendations: List[str],
        user_profile: Optional[Dict] = None,
    ) -> str:
        """Generate suggestion-style response."""
        if not recommendations:
            return await self.generate_response(query, "No specific recommendations available.", user_profile)
        
        # Format recommendations
        rec_text = "Recommended options:\n" + "\n".join(f"- {r}" for r in recommendations)
        
        return await self.generate_response(query, rec_text, user_profile)
    
    async def generate_meal_plan(
        self,
        days: int,
        targets: Dict[str, Any],
        preferences: Dict[str, Any],
    ) -> str:
        """Generate meal plan response."""
        plan_parts = [
            f"Meal Plan for {days} days:",
            "",
            f"Daily Targets:",
            f"- Calories: {targets.get('calories', 'varies')} kcal",
            f"- Protein: {targets.get('protein_g', 'varies')}g",
            "",
            "Preferences considered:",
        ]
        
        if preferences.get("diet_type"):
            plan_parts.append(f"- Diet: {preferences['diet_type']}")
        if preferences.get("cuisine"):
            plan_parts.append(f"- Cuisine: {preferences['cuisine']}")
        if preferences.get("budget"):
            plan_parts.append(f"- Budget: ₹{preferences['budget']}/day")
        
        plan_text = "\n".join(plan_parts)
        
        if self.llm_router:
            prompt = f"""{plan_text}

Generate a detailed meal plan with breakfast, lunch, dinner, and snacks for each day.
Include specific foods and portions (e.g., "1 katori cooked rice")."""
            
            try:
                response, _ = await self.llm_router.generate(prompt, SYSTEM_COACH, temperature=0.7)
                return response.strip()
            except Exception as e:
                logger.error(f"Meal plan generation failed: {e}")
        
        return plan_text + "\n\n(Detailed meal plan generation in progress...)"


def create_coach(llm_router=None) -> CoachAgent:
    """Factory to create coach agent."""
    return CoachAgent(llm_router)