"""
AaharAI NutriSync — Nutrient Gap Analyzer
Identifies chronic nutritional deficits by comparing logged intake vs RDA targets.
"""
import logging
from typing import Dict, List, Any


logger = logging.getLogger(__name__)

class GapAnalyzer:
    """Analyzes nutritional gaps over time."""

    def analyze_gaps(self, intake_logs: List[Dict], targets: Dict[str, float]) -> Dict[str, Any]:
        """Compare aggregated intake against RDA targets."""
        if not intake_logs:
            return {"status": "no_data", "message": "No food logs found for analysis."}

        # Aggregate total intake
        totals = {
            "calories": 0.0, "protein_g": 0.0, "fat_g": 0.0, 
            "carbs_g": 0.0, "iron_mg": 0.0, "calcium_mg": 0.0,
            "zinc_mg": 0.0, "folate_mcg": 0.0, "vit_b12_mcg": 0.0,
            "vit_d_mcg": 0.0
        }

        for log in intake_logs:
            for nut in totals.keys():
                totals[nut] += log.get(nut) or 0.0

        num_days = len(set(log.get("log_date") for log in intake_logs)) or 1
        avg_intake = {k: v / num_days for k, v in totals.items()}

        gaps = []
        for nut, target_val in targets.items():
            if nut not in avg_intake: continue
            
            actual = avg_intake[nut]
            if actual < (target_val * 0.75): # 25% deficit threshold
                deficit_pct = ((target_val - actual) / target_val) * 100
                gaps.append({
                    "nutrient": nut,
                    "target": target_val,
                    "actual": actual,
                    "deficit_pct": deficit_pct,
                    "severity": "CRITICAL" if actual < (target_val * 0.5) else "MODERATE"
                })

        return {
            "status": "success",
            "gaps": gaps,
            "summary": self._generate_summary(gaps),
            "recommendations": self._generate_recommendations(gaps)
        }

    def _generate_summary(self, gaps: List[Dict]) -> str:
        if not gaps:
            return "Your nutritional intake is well-aligned with your RDA targets."
        
        main_gaps = [g["nutrient"].replace("_", " ").title() for g in gaps[:3]]
        return f"Identified chronic deficits in: {', '.join(main_gaps)}."

    def _generate_recommendations(self, gaps: List[Dict]) -> List[str]:
        recs = []
        for gap in gaps:
            nut = gap["nutrient"]
            if nut == "vit_b12_mcg":
                recs.append("Increase intake of fermented foods (Idli/Dosa) or consider a B12 supplement (common in vegetarian diets).")
            elif nut == "iron_mg":
                recs.append("Include more green leafy vegetables (Palak, Methi) paired with Vitamin C (Lemon) for better absorption.")
            elif nut == "protein_g":
                recs.append("Add 1-2 portions of dal, pulses, or paneer to meet your daily protein floor.")
        return recs

gap_analyzer = GapAnalyzer()
