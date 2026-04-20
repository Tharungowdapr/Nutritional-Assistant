"""
AaharAI NutriSync — Planner Agent
Analyzes user query and determines intent + routing.
"""
import json
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

# Intent categories
INTENT_PLAN = "plan"
INTENT_ANALYZE = "analyze"
INTENT_RECOMMEND = "recommend"
INTENT_GENERAL = "general"
INTENT_SEARCH = "food_search"
INTENT_CLINICAL = "clinical"


class PlannerAgent:
    """Routes queries to appropriate handlers."""
    
    def __init__(self, llm_router=None):
        self.llm_router = llm_router
    
    def classify_intent(self, query: str) -> str:
        """Classify query intent using keyword matching + LLM fallback."""
        query_lower = query.lower()
        
        # Keyword-based classification
        if any(w in query_lower for w in ["plan", "meal plan", "diet plan", "create", "generate"]):
            return INTENT_PLAN
        if any(w in query_lower for w in ["analyze", "analysis", "how much", "total", "calories"]):
            return INTENT_ANALYZE
        if any(w in query_lower for w in ["suggest", "recommend", "what should", "give me"]):
            return INTENT_RECOMMEND
        if any(w in query_lower for w in ["find", "search", "nutrients", "protein", "calories"]):
            return INTENT_SEARCH
        if any(w in query_lower for w in ["diabetes", "health", "condition", "medical"]):
            return INTENT_CLINICAL
        
        # LLM fallback for ambiguous queries
        if self.llm_router:
            try:
                return self._llm_classify(query)
            except Exception as e:
                logger.warning(f"LLM classification failed: {e}")
        
        return INTENT_GENERAL
    
    def _llm_classify(self, query: str) -> str:
        """Use LLM for intent classification."""
        prompt = f"""Classify this nutrition query into ONE word:
- plan (meal planning, diet creation)
- analyze (calculations, totals, analysis)
- recommend (suggestions, advice)
- food_search (finding, nutrients)
- clinical (health conditions, medical)
- general (chit-chat, greetings)

Query: {query}
Reply with only one word."""
        
        result, _ = self.llm_router.generate(prompt, "You are an intent classifier.", temperature=0)
        result = result.strip().lower()
        
        # Map to valid intents
        if "plan" in result:
            return INTENT_PLAN
        if "analyze" in result:
            return INTENT_ANALYZE
        if "recommend" in result:
            return INTENT_RECOMMEND
        if "food" in result or "search" in result:
            return INTENT_SEARCH
        if "clinical" in result or "health" in result:
            return INTENT_CLINICAL
        
        return INTENT_GENERAL
    
    def analyze_intent(self, query: str) -> Dict[str, Any]:
        """Structured intent analysis with routing hints."""
        intent = self.classify_intent(query)
        
        # Determine required agents
        needs_rag = intent not in [INTENT_GENERAL]
        needs_meal_data = intent in [INTENT_ANALYZE, INTENT_PLAN]
        needs_profile = intent in [INTENT_RECOMMEND, INTENT_PLAN]
        
        # Determine collection (for RAG)
        collection_map = {
            INTENT_SEARCH: "nutrisync_foods",
            INTENT_CLINICAL: "nutrisync_clinical",
            INTENT_PLAN: "nutrisync",
            INTENT_ANALYZE: "nutrisync",
            INTENT_RECOMMEND: "nutrisync",
            INTENT_GENERAL: "nutrisync",
        }
        
        return {
            "intent": intent,
            "collection": collection_map.get(intent, "nutrisync"),
            "needs_rag": needs_rag,
            "needs_meal_data": needs_meal_data,
            "needs_profile": needs_profile,
        }


def create_planner(llm_router=None) -> PlannerAgent:
    """Factory to create planner agent."""
    return PlannerAgent(llm_router)