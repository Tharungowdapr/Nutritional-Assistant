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
        if profile.get("goal") or profile.get("goals"):
            parts.append(f"Goal: {profile.get('goal') or profile.get('goals')}")

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
        provider_override: Optional[Dict] = None,
    ) -> str:
        """Generate final response with optional provider override.

        For complex queries, decomposes into sub-questions, answers each,
        then synthesizes a cohesive response.
        """
        if not self.llm_router and not provider_override:
            return "AI service unavailable. Please try again."

        profile_ctx = self.format_profile_context(user_profile)
        full_context = f"{profile_ctx}\n\n{analysis_context}"

        history_ctx = ""
        if conversation_history:
            history_parts = ["Recent conversation:"]
            for h in conversation_history[-3:]:
                role = h.get("role", "")
                content = h.get("content", "")
                if role == "user":
                    history_parts.append(f"User: {content}")
                else:
                    history_parts.append(f"You: {content}")
            history_ctx = "\n".join(history_parts) + "\n\n"

        # Only decompose for long/multi-part queries
        if len(query) > 80 and any(c in query for c in [",", ".", "and", "also", "plus"]):
            sub_answers = await self._decompose_and_answer(query, full_context, provider_override)
            synthesis_prompt = f"""{history_ctx}Context:
{full_context}

User Question:
{query}

Analysis breakdown:
{sub_answers}

Provide a cohesive, personalized response that synthesizes the above information."""
        else:
            synthesis_prompt = f"""{history_ctx}Context:
{full_context}

User Question:
{query}

Provide a personalized response using the above context."""

        try:
            response, provider = await self.llm_router.generate(
                prompt=synthesis_prompt,
                system=SYSTEM_COACH,
                temperature=0.7,
                provider_override=provider_override,
            )
            return response.strip()
        except Exception as e:
            logger.error(f"Coach generation failed: {e}")
            return "I apologize, but I couldn't generate a response. Please try again."

    async def _decompose_and_answer(
        self,
        query: str,
        context: str,
        provider_override: Optional[Dict] = None,
    ) -> str:
        """Break complex queries into sub-questions and answer each independently."""
        decompose_prompt = (
            f"Analyze this nutrition query and break it into 2-4 specific "
            f"sub-questions that together answer it fully.\n\n"
            f"Query: {query}\n\n"
            "Return ONLY a numbered list of specific sub-questions, one per line."
        )

        try:
            raw, _ = await self.llm_router.generate(
                prompt=decompose_prompt,
                system="You break nutrition questions into factual sub-questions. Be specific, not generic.",
                temperature=0.3,
                max_tokens=512,
                provider_override=provider_override,
            )
        except Exception:
            return ""

        sub_questions = [q.strip() for q in raw.strip().split("\n") if q.strip() and q[0].isdigit()]

        if len(sub_questions) <= 1:
            return raw.strip()

        answers = []
        for sq in sub_questions[:4]:
            sq_prompt = f"""Context:
{context}

Sub-question: {sq}

Answer concisely with specific data from the context."""
            try:
                ans, _ = await self.llm_router.generate(
                    prompt=sq_prompt,
                    system="Answer the sub-question with facts only. Be concise.",
                    temperature=0.4,
                    max_tokens=1024,
                    provider_override=provider_override,
                )
                answers.append(f"{sq}\n{ans.strip()}")
            except Exception as e:
                logger.warning(f"Sub-question failed: {sq} - {e}")

        return "\n\n".join(answers) if answers else raw.strip()

    async def generate_suggestion(
        self,
        query: str,
        recommendations: List[str],
        user_profile: Optional[Dict] = None,
        provider_override: Optional[Dict] = None,
    ) -> str:
        """Generate suggestion-style response."""
        if not recommendations:
            return await self.generate_response(
                query, "No specific recommendations available.", user_profile, provider_override=provider_override
            )

        # Format recommendations
        rec_text = "Recommended options:\n" + "\n".join(f"- {r}" for r in recommendations)

        return await self.generate_response(query, rec_text, user_profile, provider_override=provider_override)

    async def generate_meal_plan(
        self,
        days: int,
        targets: Dict[str, Any],
        preferences: Dict[str, Any],
        provider_override: Optional[Dict] = None,
    ) -> str:
        """Generate meal plan response."""
        plan_parts = [
            f"Meal Plan for {days} days:",
            "",
            "Daily Targets:",
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

        if self.llm_router or provider_override:
            prompt = f"""{plan_text}

Generate a detailed meal plan with breakfast, lunch, dinner, and snacks for each day.
Include specific foods and portions (e.g., "1 katori cooked rice")."""

            try:
                response, _ = await self.llm_router.generate(
                    prompt,
                    SYSTEM_COACH,
                    temperature=0.7,
                    provider_override=provider_override,
                )
                return response.strip()
            except Exception as e:
                logger.error(f"Meal plan generation failed: {e}")

        return plan_text + "\n\n(Detailed meal plan generation in progress...)"


def create_coach(llm_router=None) -> CoachAgent:
    """Factory to create coach agent."""
    return CoachAgent(llm_router)
