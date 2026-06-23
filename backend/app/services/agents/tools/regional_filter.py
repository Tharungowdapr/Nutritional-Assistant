"""
AaharAI NutriSync — Agent Tool: Regional Filter
Filters foods and provides recommendations based on the Regional Food Culture sheet.
Supports zone-specific dietary patterns for 5 Indian regions.
"""

import logging
from typing import List, Dict, Optional

from app.db.loader import db

logger = logging.getLogger(__name__)

# Zone-specific staple mappings (fallback when Excel data is insufficient)
ZONE_STAPLES = {
    "South": {
        "staples": ["Rice", "Ragi", "Jowar", "Sambar", "Rasam", "Coconut", "Curry leaves", "Tamarind"],
        "proteins": ["Sambar (dal)", "Rajma", "Soya chunks", "Paneer", "Egg", "Fish"],
        "vegetables": ["Drumstick", "Bitter gourd", "Snake gourd", "Ash gourd", "Moringa leaves"],
        "oils": ["Coconut oil", "Sesame oil (Gingelly)", "Groundnut oil"],
        "cuisine_notes": "Fermented foods (idli, dosa) improve nutrient bioavailability. Coconut-based curries are traditional.",
        "common_deficiencies": ["Iron", "Vitamin B12 (if vegetarian)", "Calcium"],
    },
    "North": {
        "staples": ["Wheat (Roti/Chapati)", "Rice", "Dal (Moong, Masoor, Chana)", "Paneer", "Ghee", "Milk"],
        "proteins": ["Paneer", "Chicken", "Mutton", "Egg", "Soya", "Rajma", "Chole"],
        "vegetables": ["Palak", "Methi", "Aloo", "Gobi", "Bhindi", "Louki"],
        "oils": ["Mustard oil", "Ghee", "Refined oil"],
        "cuisine_notes": "Tandoori cooking preserves nutrients better than deep frying. Dairy-heavy cuisine provides calcium.",
        "common_deficiencies": ["Iron", "Vitamin D", "Folate"],
    },
    "East": {
        "staples": ["Rice", "Fish", "Mustard", "Panch Phoron", "Jaggery"],
        "proteins": ["Fish (Hilsa, Rohu)", "Egg", "Dal (Masoor, Moong)", "Paneer"],
        "vegetables": ["Pumpkin", "Potol (Pointed gourd)", "Boron (Bottle gourd)", "Shak (Leafy greens)"],
        "oils": ["Mustard oil", "Refined oil"],
        "cuisine_notes": "Fish-based cuisine provides omega-3. Panch phoron (five-spice) aids digestion.",
        "common_deficiencies": ["Iron", "Calcium", "Vitamin B12"],
    },
    "West": {
        "staples": ["Wheat", "Rice", "Jowar", "Bajra", "Groundnut", "Coconut"],
        "proteins": ["Dal (Toor, Moong)", "Paneer", "Chicken", "Egg", "Groundnut"],
        "vegetables": ["Brinjal", "Pumpkin", "Surathi (Yam)", "Colocasia"],
        "oils": ["Groundnut oil", "Coconut oil", "Ghee"],
        "cuisine_notes": "Gujarati cuisine balances sweet-sour-spicy flavors. Rajasthani cuisine uses minimal water (desert adaptation).",
        "common_deficiencies": ["Iron", "Vitamin B12", "Zinc"],
    },
    "Central": {
        "staples": ["Wheat", "Rice", "Jowar", "Bajra", "Lentils"],
        "proteins": ["Dal (Arhar/Toor)", "Chicken", "Mutton", "Egg", "Paneer"],
        "vegetables": ["Potato", "Onion", "Tomato", "Brinjal", "Cauliflower"],
        "oils": ["Mustard oil", "Ghee", "Soybean oil"],
        "cuisine_notes": "Heartier portions for agricultural labor. Millets (jowar, bajra) provide sustained energy.",
        "common_deficiencies": ["Iron", "Calcium", "Vitamin A"],
    },
}

# Mapping of common region keywords to zone names
ZONE_KEYWORDS = {
    "south": "South",
    "tamil": "South",
    "kerala": "South",
    "karnataka": "South",
    "andhra": "South",
    "telangana": "South",
    "chennai": "South",
    "bangalore": "South",
    "hyderabad": "South",
    "mysore": "South",
    "coimbatore": "South",
    "north": "North",
    "delhi": "North",
    "punjab": "North",
    "haryana": "North",
    "up": "North",
    "uttar pradesh": "North",
    "rajasthan": "North",
    "jammu": "North",
    "kashmir": "North",
    "himachal": "North",
    "chandigarh": "North",
    "lucknow": "North",
    "east": "East",
    "bengal": "East",
    "bihar": "East",
    "odisha": "East",
    "assam": "East",
    "northeast": "East",
    "kolkata": "East",
    "patna": "East",
    "gujarat": "West",
    "maharashtra": "West",
    "mumbai": "West",
    "pune": "West",
    "goa": "West",
    "west": "West",
    "central": "Central",
    "madhya pradesh": "Central",
    "chhattisgarh": "Central",
    "jabalpur": "Central",
    "bhopal": "Central",
}


def detect_zone_from_text(text: str) -> Optional[str]:
    """Detect Indian zone from user text (region, city, state mention)."""
    text_lower = text.lower()
    for keyword, zone in ZONE_KEYWORDS.items():
        if keyword in text_lower:
            return zone
    return None


def get_regional_foods(zone: str) -> dict:
    """Get region-specific food recommendations with zone-aware filtering.

    Args:
        zone: One of South, North, East, West, Central

    Returns:
        Dict with regional dietary info and recommended staples
    """
    # Normalize zone
    zone_normalized = zone.strip().title()
    if zone_normalized not in ZONE_STAPLES:
        # Try matching from keywords
        for keyword, mapped_zone in ZONE_KEYWORDS.items():
            if keyword in zone.lower():
                zone_normalized = mapped_zone
                break

    # Try Excel data first
    if getattr(db, "region", None) is not None:
        try:
            match = db.region[db.region["Zone"].str.contains(zone_normalized, case=False, na=False)]
            if not match.empty:
                results = []
                for _, row in match.iterrows():
                    entry = {}
                    for col in match.columns:
                        val = row[col]
                        if val is not None and str(val).strip():
                            entry[col] = str(val)
                    results.append(entry)
                return {
                    "zone": zone_normalized,
                    "found": True,
                    "source": "excel",
                    "count": len(results),
                    "recommendations": results,
                }
        except Exception as e:
            logger.warning(f"Excel regional lookup failed: {e}")

    # Fallback to hardcoded zone data
    zone_data = ZONE_STAPLES.get(zone_normalized)
    if zone_data:
        return {
            "zone": zone_normalized,
            "found": True,
            "source": "builtin",
            "count": len(zone_data["staples"]),
            "recommendations": [zone_data],
        }

    return {"zone": zone_normalized, "found": False, "recommendations": []}


def filter_foods_by_region(zone: str, diet_type: str = None) -> List[Dict]:
    """Get foods commonly available in a specific Indian region.

    Filters IFCT foods by zone availability, falling back to diet-type filtering.
    """
    from app.services.agents.tools.food_search import search_foods_tool

    # Get zone staples for filtering
    zone_normalized = zone.strip().title()
    for keyword, mapped_zone in ZONE_KEYWORDS.items():
        if keyword in zone.lower():
            zone_normalized = mapped_zone
            break

    zone_data = ZONE_STAPLES.get(zone_normalized, {})
    staple_keywords = [s.lower() for s in zone_data.get("staples", [])]

    # Get all foods, then filter by zone relevance
    all_foods = search_foods_tool(query="", diet_type=diet_type)

    if not staple_keywords or not all_foods:
        return all_foods

    # Score each food by zone relevance
    scored = []
    for food in all_foods:
        food_name = str(food.get("Food Name", "") or food.get("food_name", "")).lower()
        food_group = str(food.get("Food Group", "") or food.get("food_group", "")).lower()
        score = 0
        for kw in staple_keywords:
            if kw in food_name or kw in food_group:
                score += 1
        if score > 0:
            food["_zone_relevance"] = score
            scored.append(food)

    # Sort by zone relevance, return top results
    scored.sort(key=lambda x: x.get("_zone_relevance", 0), reverse=True)
    for f in scored:
        f.pop("_zone_relevance", None)

    return scored[:20] if scored else all_foods[:10]
