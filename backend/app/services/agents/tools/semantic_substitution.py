"""
AaharAI NutriSync — Semantic Substitution Tool
Suggests healthy, culturally relevant food swaps based on Indian dietary context.
Covers common Indian staples with goal-specific alternatives.
"""
import logging
from typing import List, Dict
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class FoodSwap:
    original: str
    alternative: str
    reason: str
    gi: int = None
    protein_delta: str = None
    goal_tags: List[str] = None

    def to_dict(self):
        d = {"name": self.alternative, "reason": self.reason}
        if self.gi: d["gi"] = self.gi
        if self.protein_delta: d["protein_delta"] = self.protein_delta
        return d


class SemanticSubstitution:
    """Provides nutritional swaps based on goal (Low GI, High Protein, etc)."""

    SWAP_DATABASE: List[FoodSwap] = [
        # === Grains & Staples ===
        FoodSwap("White Rice", "Foxtail Millet (Kangni)", "Lower GI (54 vs 73), 3x more fiber, rich in iron", gi=54, goal_tags=["low_gi", "weight_loss"]),
        FoodSwap("White Rice", "Brown Rice", "Unprocessed bran, more magnesium and selenium", gi=68, goal_tags=["low_gi", "fiber"]),
        FoodSwap("White Rice", "Cauliflower Rice", "Ultra-low carb (5g vs 28g per 100g), suitable for keto", gi=15, goal_tags=["low_carb", "weight_loss"]),
        FoodSwap("White Rice", "Barnyard Millet (Sanwa)", "Lowest GI among millets (50), high in protein", gi=50, goal_tags=["low_gi", "diabetes"]),
        FoodSwap("White Rice", "Kodo Millet", "High fiber, helps manage blood sugar", gi=45, goal_tags=["low_gi", "diabetes"]),

        FoodSwap("Refined Flour (Maida)", "Whole Wheat Flour (Atta)", "Retains fiber, B-vitamins, and minerals", goal_tags=["fiber", "general"]),
        FoodSwap("Refined Flour (Maida)", "Almond Flour", "Gluten-free, high healthy fats, low carb", goal_tags=["low_carb", "gluten_free"]),
        FoodSwap("Refined Flour (Maida)", "Jackfruit Flour", "Clinical trial proven for HbA1c control", gi=45, goal_tags=["diabetes", "low_gi"]),
        FoodSwap("Refined Flour (Maida)", "Ragi Flour", "Calcium-rich (344mg/100g), high fiber", gi=54, goal_tags=["calcium", "low_gi"]),

        FoodSwap("Potato", "Sweet Potato", "Lower GI (63 vs 78), Vitamin A rich, more fiber", gi=63, goal_tags=["low_gi", "vitamin_a"]),
        FoodSwap("Potato", "Raw Banana (Plantain)", "Resistant starch, great for gut health", gi=30, goal_tags=["gut_health", "low_gi"]),
        FoodSwap("Potato", "Taro (Arbi)", "Lower GI, good source of dietary fiber", gi=55, goal_tags=["low_gi", "fiber"]),

        # === Proteins ===
        FoodSwap("Chicken Breast", "Paneer (Cottage Cheese)", "Vegetarian protein, calcium-rich (265mg/100g)", goal_tags=["vegetarian", "calcium"]),
        FoodSwap("Chicken Breast", "Soya Chunks", "52g protein per 100g (textured), complete amino acid profile", goal_tags=["high_protein", "vegetarian"]),
        FoodSwap("Chicken Breast", "Rajma (Kidney Beans)", "Plant protein + fiber combo, iron-rich", goal_tags=["vegetarian", "iron"]),
        FoodSwap("Paneer", "Tofu", "Lower saturated fat (2.3g vs 20g per 100g), similar protein", goal_tags=["low_fat", "heart_healthy"]),

        # === Dairy ===
        FoodSwap("Whole Milk", "Toned Milk (1.5% fat)", "Reduces saturated fat intake by 75%, same calcium", goal_tags=["low_fat", "heart_healthy"]),
        FoodSwap("Sugar", "Stevia / Monk Fruit", "Zero glycemic impact, suitable for diabetics", gi=0, goal_tags=["diabetes", "low_gi"]),
        FoodSwap("Sugar", "Jaggery (Gur)", "Retains iron and minerals, lower GI than sugar", gi=55, goal_tags=["iron", "general"]),
        FoodSwap("Sugar", "Dates (Khajoor)", "Natural sweetener with fiber and potassium", gi=42, goal_tags=["fiber", "natural"]),

        # === Fats ===
        FoodSwap("Butter", "Ghee (moderate portions)", "Conjugated linoleic acid, butyrate for gut health", goal_tags=["gut_health", "indian"]),
        FoodSwap("Butter", "Mustard Oil", "Low in saturated fat, high in omega-3, traditional Indian oil", goal_tags=["heart_healthy", "indian"]),
        FoodSwap("Butter", "Avocado", "Heart-healthy monounsaturated fats, potassium-rich", goal_tags=["heart_healthy", "low_carb"]),

        # === Snacks & Beverages ===
        FoodSwap("Soft Drinks", "Nimbu Pani (Lemon Water)", "Zero sugar, vitamin C, electrolytes", goal_tags=["hydration", "weight_loss"]),
        FoodSwap("Soft Drinks", "Buttermilk (Chaas)", "Probiotic, aids digestion, low calorie", goal_tags=["gut_health", "low_calorie"]),
        FoodSwap("Potato Chips", "Roasted Makhana (Fox Nuts)", "Low calorie (347kcal/100g), high protein, crunchy", goal_tags=["weight_loss", "snack"]),
        FoodSwap("Biscuits", "Mixed Nuts (Almonds + Walnuts)", "Healthy fats, protein, omega-3", goal_tags=["heart_healthy", "brain"]),

        # === South Indian specifics ===
        FoodSwap("Idli (rice)", "Ragi Idli", "3x more calcium, lower GI", gi=45, goal_tags=["calcium", "low_gi"]),
        FoodSwap("Dosa (rice)", "Moong Dal Dosa", "Higher protein (12g vs 4g per dosa), lower GI", gi=40, goal_tags=["high_protein", "low_gi"]),
    ]

    def suggest(self, ingredient: str, goal: str = "Weight Loss") -> List[Dict]:
        """Find alternatives for a given ingredient, optionally filtered by goal."""
        goal_lower = goal.lower()
        matches = []
        seen_alternatives = set()

        for swap in self.SWAP_DATABASE:
            if ingredient.lower() in swap.original.lower() or swap.original.lower() in ingredient.lower():
                # If goal matches, prioritize; otherwise include as general
                if swap.goal_tags and any(goal_lower in tag or tag in goal_lower for tag in swap.goal_tags):
                    if swap.alternative not in seen_alternatives:
                        matches.append(swap.to_dict())
                        seen_alternatives.add(swap.alternative)
                elif not matches:
                    if swap.alternative not in seen_alternatives:
                        matches.append(swap.to_dict())
                        seen_alternatives.add(swap.alternative)

        return matches[:5]

    def suggest_for_query(self, query: str) -> List[Dict]:
        """Extract ingredient from a natural language query and suggest swaps."""
        # Try to find food terms in the query
        all_originals = {s.original.lower(): s.original for s in self.SWAP_DATABASE}
        for original_lower, original in all_originals.items():
            if original_lower in query.lower():
                return self.suggest(original)
        return []


semantic_substitution = SemanticSubstitution()
