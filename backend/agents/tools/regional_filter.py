"""
AaharAI NutriSync — Agent Tool: Regional Filter
Filters foods based on the Regional Food Culture sheet.
"""
from database.loader import db


def get_regional_foods(zone: str) -> dict:
    """Get region-specific food recommendations.
    
    Args:
        zone: One of South, North, East, West, Central
    
    Returns:
        Dict with regional dietary info and recommended staples
    """
    if getattr(db, 'region', None) is None:
        return {"zone": zone, "found": False, "recommendations": []}

    match = db.region[db.region["Zone"].str.contains(zone, case=False, na=False)]
    if match.empty:
        return {"zone": zone, "found": False, "recommendations": []}

    results = []
    for _, row in match.iterrows():
        entry = {}
        for col in match.columns:
            val = row[col]
            if val is not None and str(val).strip():
                entry[col] = str(val)
        results.append(entry)

    return {
        "zone": zone,
        "found": True,
        "count": len(results),
        "recommendations": results,
    }


def filter_foods_by_region(zone: str, diet_type: str = None) -> list[dict]:
    """Get foods commonly available in a specific Indian region.
    
    For now, returns all IFCT foods filtered by diet type.
    Regional food mapping can be extended later.
    """
    from agents.tools.food_search import search_foods_tool
    return search_foods_tool(query="", diet_type=diet_type)
