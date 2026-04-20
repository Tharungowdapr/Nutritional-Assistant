"""
AaharAI NutriSync — User Memory Module
Long-term memory for user profile and preferences.
"""
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)


def format_user_profile(profile: Optional[Dict[str, Any]]) -> str:
    """Format user profile as text for prompt injection."""
    if not profile:
        return "No profile information available."
    
    parts = []
    
    # Basic info
    if profile.get("name"):
        parts.append(f"Name: {profile['name']}")
    if profile.get("age"):
        parts.append(f"Age: {profile['age']} years")
    if profile.get("sex"):
        parts.append(f"Sex: {profile['sex']}")
    
    # Body metrics
    if profile.get("weight_kg"):
        parts.append(f"Weight: {profile['weight_kg']} kg")
    if profile.get("height_cm"):
        parts.append(f"Height: {profile['height_cm']} cm")
    
    # Calculate BMI if available
    weight = profile.get("weight_kg")
    height = profile.get("height_cm")
    if weight and height:
        try:
            bmi = weight / ((height / 100) ** 2)
            bmi_cat = "Normal"
            if bmi < 18.5:
                bmi_cat = "Underweight"
            elif bmi >= 25:
                bmi_cat = "Overweight"
            elif bmi >= 30:
                bmi_cat = "Obese"
            parts.append(f"BMI: {bmi:.1f} ({bmi_cat})")
        except:
            pass
    
    # Diet type
    if profile.get("diet_type"):
        parts.append(f"Diet: {profile['diet_type']}")
    
    # Health goals
    if profile.get("goal"):
        parts.append(f"Goal: {profile['goal']}")
    
    # Health conditions
    if profile.get("conditions") and profile["conditions"]:
        parts.append(f"Conditions: {', '.join(profile['conditions'])}")
    
    # Allergies
    if profile.get("allergies"):
        parts.append(f"Allergies: {profile['allergies']}")
    
    # Lifestyle
    if profile.get("profession"):
        parts.append(f"Profession: {profile['profession']}")
    if profile.get("physical_activity"):
        parts.append(f"Activity: {profile['physical_activity']}")
    
    # Region
    if profile.get("region_zone"):
        parts.append(f"Region: {profile['region_zone']}")
        if profile.get("region_state"):
            parts[-1] += f" ({profile['region_state']})"
    
    # Budget
    if profile.get("daily_budget_inr"):
        parts.append(f"Daily budget: ₹{profile['daily_budget_inr']}")
    
    # Wellness
    if profile.get("energy_score"):
        parts.append(f"Energy level: {profile['energy_score']}/5")
    if profile.get("focus_score"):
        parts.append(f"Focus level: {profile['focus_score']}/5")
    if profile.get("sleep_hours"):
        parts.append(f"Sleep: {profile['sleep_hours']} hours")
    
    if not parts:
        return "No profile information available."
    
    return "User Profile:\n" + "\n".join(f"- {p}" for p in parts)


def get_user_preferences(profile: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """Extract key user preferences."""
    if not profile:
        return {}
    
    return {
        "diet_type": profile.get("diet_type"),
        "region": profile.get("region_zone"),
        "state": profile.get("region_state"),
        "budget": profile.get("daily_budget_inr"),
        "conditions": profile.get("conditions", []),
        "allergies": profile.get("allergies"),
        "goal": profile.get("goal"),
    }


def get_dietary_restrictions(profile: Optional[Dict[str, Any]]) -> list:
    """Get list of dietary restrictions."""
    restrictions = []
    
    if not profile:
        return restrictions
    
    diet = profile.get("diet_type", "").upper()
    if "VEG" in diet:
        restrictions.append("vegetarian")
    if "VEGAN" in diet:
        restrictions.append("vegan")
    
    allergies = profile.get("allergies", "")
    if allergies:
        restrictions.extend([a.strip() for a in allergies.split(",")])
    
    conditions = profile.get("conditions", [])
    if conditions:
        restrictions.extend(conditions)
    
    return restrictions