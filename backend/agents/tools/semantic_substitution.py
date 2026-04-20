"""
AaharAI NutriSync — Semantic Substitution Tool
Suggests healthy, culturally relevant food swaps.
"""
import logging
from typing import List, Dict

logger = logging.getLogger(__name__)

class SemanticSubstitution:
    """Provides nutritional swaps based on goal (Low GI, High Protein, etc)."""

    DATABASE = {
        "White Rice": [
            {"name": "Foxtail Millet", "reason": "Lower GI, 3x more fiber", "gi": 54},
            {"name": "Brown Rice", "reason": "Unprocessed, more bran", "gi": 68},
            {"name": "Cauliflower Rice", "reason": "Ultra low carb", "gi": 15}
        ],
        "Refined Flour (Maida)": [
            {"name": "Whole Wheat Flour (Atta)", "reason": "Retains fiber and minerals"},
            {"name": "Almond Flour", "reason": "Gluten-free, high healthy fats"},
            {"name": "Jackfruit Flour", "reason": "Clinical trial proven for HbA1c control"}
        ],
        "Potato": [
            {"name": "Sweet Potato", "reason": "Lower GI, Vitamin A rich"},
            {"name": "Raw Banana", "reason": "Resistant starch, great for gut health"}
        ]
    }

    def suggest(self, ingredient: str, goal: str = "Weight Loss") -> List[Dict]:
        """Find alternatives in the lookup database."""
        # In production, this would use vector search on the nutrisync_foods collection
        # filtered by metadata (GI < X, Protein > Y)
        
        matches = []
        for key, swaps in self.DATABASE.items():
            if ingredient.lower() in key.lower():
                matches.extend(swaps)
        
        return matches

semantic_substitution = SemanticSubstitution()
