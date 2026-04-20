"""
AaharAI NutriSync — Analyzer Agent
Retrieves data and performs nutrition analysis.
"""
import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)


class AnalyzerAgent:
    """Analyzes nutrition data using RAG and meal history."""
    
    def __init__(self, rag_service=None, llm_router=None):
        self.rag_service = rag_service
        self.llm_router = llm_router
    
    async def retrieve_knowledge(self, query: str, collection: str = "nutrisync") -> List[Dict[str, Any]]:
        """Retrieve relevant knowledge from RAG."""
        if not self.rag_service:
            return []
        
        try:
            chunks = self.rag_service.retrieve(query, collection_name=collection, top_k=5)
            return chunks
        except Exception as e:
            logger.warning(f"RAG retrieval failed: {e}")
            return []
    
    def analyze_meals(self, meals: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze meal history and provide nutrition summary."""
        if not meals:
            return {"status": "no_data", "message": "No meal data available"}
        
        totals = {
            "calories": 0,
            "protein_g": 0,
            "fat_g": 0,
            "carbs_g": 0,
            "fibre_g": 0,
        }
        
        meals_by_slot = {}
        foods_consumed = []
        
        for meal in meals:
            for key in ["calories", "protein_g", "fat_g", "carbs_g", "fibre_g"]:
                val = meal.get(key) or 0
                totals[key] += val
            
            slot = meal.get("meal_slot", "Unknown")
            if slot not in meals_by_slot:
                meals_by_slot[slot] = []
            meals_by_slot[slot].append(meal.get("food_name", ""))
            foods_consumed.append(meal.get("food_name", ""))
        
        # Calculate averages
        num_meals = len(meals)
        if num_meals > 0:
            for key in totals:
                totals[key] = round(totals[key], 1)
        
        # Determine patterns
        patterns = []
        if totals.get("calories", 0) < 1200:
            patterns.append("low_calorie")
        elif totals.get("calories", 0) > 2500:
            patterns.append("high_calorie")
        
        if totals.get("protein_g", 0) < 30:
            patterns.append("low_protein")
        
        return {
            "status": "success",
            "totals": totals,
            "num_meals": num_meals,
            "meals_by_slot": meals_by_slot,
            "foods_consumed": foods_consumed,
            "patterns": patterns,
        }
    
    async def analyze_query(self, query: str, meals: Optional[List[Dict]] = None, 
                    collection: str = "nutrisync") -> Dict[str, Any]:
        """Full analysis: knowledge + meal data."""
        # Get knowledge from RAG
        knowledge = await self.retrieve_knowledge(query, collection)
        
        # Analyze meals if provided
        meal_analysis = None
        if meals:
            meal_analysis = self.analyze_meals(meals)
        
        return {
            "knowledge": knowledge,
            "meal_analysis": meal_analysis,
            "needs_clarification": len(knowledge) == 0 and meal_analysis is None,
        }
    
    def generate_analysis_text(self, analysis: Dict[str, Any]) -> str:
        """Convert analysis dict to text for prompt injection."""
        parts = []
        
        if analysis.get("meal_analysis") and analysis["meal_analysis"].get("status") == "success":
            meal = analysis["meal_analysis"]
            parts.append("MEAL ANALYSIS:")
            parts.append(f"- Total Calories: {meal['totals']['calories']} kcal")
            parts.append(f"- Protein: {meal['totals']['protein_g']}g")
            parts.append(f"- Carbs: {meal['totals']['carbs_g']}g")
            parts.append(f"- Fat: {meal['totals']['fat_g']}g")
            
            if meal.get("patterns"):
                patterns = ", ".join(meal["patterns"])
                parts.append(f"- Patterns: {patterns}")
        
        if analysis.get("knowledge"):
            parts.append("\nKNOWLEDGE BASE:")
            for chunk in analysis["knowledge"][:3]:
                parts.append(f"- {chunk.get('text', '')[:200]}")
        
        if not parts:
            parts.append("No analysis data available.")
        
        return "\n".join(parts)


def create_analyzer(rag_service=None, llm_router=None) -> AnalyzerAgent:
    """Factory to create analyzer agent."""
    return AnalyzerAgent(rag_service, llm_router)