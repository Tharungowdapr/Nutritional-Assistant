"""
AaharAI NutriSync — GLP-1 Digital Twin Modeling
Simulates pharmacokinetic response and provides clinical guardrails for users on GLP-1 agonists.
"""
import logging
from typing import Dict, Any
from datetime import datetime, timedelta, timezone

logger = logging.getLogger(__name__)

class GLP1Engine:
    """Simulates the biological impact of GLP-1 medications."""

    PK_MODELS = {
        "Semaglutide": {"half_life_days": 7, "peak_hours": 24, "type": "weekly"},
        "Liraglutide": {"half_life_days": 1, "peak_hours": 10, "type": "daily"},
        "Tirzepatide": {"half_life_days": 5, "peak_hours": 12, "type": "weekly"},
    }

    def simulate_state(self, medication: str, dose_mg: float, last_dose_time: datetime) -> Dict[str, Any]:
        """Model the current estimated level and appetite suppression."""
        if medication not in self.PK_MODELS:
            return {"error": "Unsupported medication", "is_active": False}

        model = self.PK_MODELS[medication]
        now = datetime.now(timezone.utc)
        hours_since = (now - last_dose_time).total_seconds() / 3600
        hours_since / 24

        # Simplified decay/peak model
        # 1.0 at peak, decaying by half-life
        if hours_since < model["peak_hours"]:
            level = (hours_since / model["peak_hours"]) # Ramp up
        else:
            decay_days = (hours_since - model["peak_hours"]) / 24
            level = pow(0.5, (decay_days / model["half_life_days"]))

        # Guardrails logic
        appetite_suppression = "HIGH" if level > 0.7 else "MODERATE" if level > 0.3 else "LOW"
        nausea_risk = "HIGH" if hours_since < 48 and level > 0.8 else "LOW"

        return {
            "medication": medication,
            "estimated_level": round(level, 2),
            "appetite_suppression": appetite_suppression,
            "nausea_risk": nausea_risk,
            "clinical_advice": self._get_advice(nausea_risk, appetite_suppression),
            "next_dose_due": (last_dose_time + timedelta(days=7 if model["type"] == "weekly" else 1)).isoformat()
        }

    def _get_advice(self, nausea_risk: str, suppression: str) -> str:
        if nausea_risk == "HIGH":
            return "Risk of GI distress is high. Prioritize small, frequent, bland meals. Avoid high-fat or spicy foods today."
        if suppression == "HIGH":
            return "Appetite suppression is strong. Ensure you are meeting your protein floor (min 60g) to prevent muscle loss."
        return "Medication levels are stable. Maintain consistent high-protein, high-fiber intake."

glp1_engine = GLP1Engine()
