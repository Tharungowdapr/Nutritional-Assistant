"""
Utility functions for profile, meal plans, recipes, and data processing.
"""

def calculate_profile_completion(profile: dict) -> int:
    """
    Calculate profile completion percentage (0-100).
    Based on essential and optional fields.
    """
    essential_fields = {
        'name': profile.get('name'),
        'age': profile.get('age'),
        'sex': profile.get('sex'),
        'weight_kg': profile.get('weight_kg'),
        'height_cm': profile.get('height_cm'),
        'diet_type': profile.get('diet_type'),
    }
    
    optional_fields = {
        'life_stage': profile.get('life_stage'),
        'region_zone': profile.get('region_zone'),
        'conditions': profile.get('conditions'),
        'allergies': profile.get('allergies'),
        'physical_activity': profile.get('physical_activity'),
        'sleep_hours': profile.get('sleep_hours'),
        'goals': profile.get('goals'),
        'glp1_medication': profile.get('glp1_medication'),
    }
    
    # Essential fields count as more weight
    essential_filled = sum(1 for v in essential_fields.values() if v)
    essential_pct = (essential_filled / len(essential_fields)) * 60  # 60% from essentials
    
    # Optional fields add remaining
    optional_filled = sum(1 for v in optional_fields.values() if v)
    optional_pct = (optional_filled / len(optional_fields)) * 40  # 40% from optional
    
    total = int(essential_pct + optional_pct)
    return min(100, max(0, total))


def format_grocery_list(items: list, include_cost=True) -> dict:
    """
    Format grocery list with prices and quantities.
    
    Args:
        items: List of {"name": str, "quantity": str, "price_per_unit": float}
        include_cost: Whether to add cost to each item
    
    Returns:
        Formatted dictionary with totals
    """
    by_category = {}
    total_cost = 0
    
    food_categories = {
        'Cereals': ['rice', 'wheat', 'flour', 'dal'],
        'Vegetables': ['tomato', 'onion', 'carrot', 'potato', 'spinach'],
        'Fruits': ['apple', 'banana', 'orange', 'mango'],
        'Proteins': ['dal', 'chicken', 'fish', 'egg', 'paneer', 'tofu'],
        'Dairy': ['milk', 'yogurt', 'curd', 'ghee', 'butter'],
        'Spices': ['turmeric', 'chili', 'salt', 'pepper'],
    }
    
    for item in items:
        category = 'Other'
        for cat, keywords in food_categories.items():
            if any(kw in item.get('name', '').lower() for kw in keywords):
                category = cat
                break
        
        if category not in by_category:
            by_category[category] = []
        
        cost = item.get('quantity_needed', 1) * item.get('price_per_unit', 0)
        total_cost += cost
        
        by_category[category].append({
            **item,
            'estimated_cost': round(cost, 2)
        })
    
    return {
        'items_by_category': by_category,
        'total_items': len(items),
        'total_cost': round(total_cost, 2),
        'estimated_budget': round(total_cost * 1.15, 2),  # Add 15% buffer
    }


def parse_meal_plan_response(llm_response: str) -> dict:
    """
    Parse LLM meal plan response into structured format.
    Extracts meals, recipes, estimated nutrition.
    """
    import re
    import json
    
    plan = {
        'daily_plans': [],
        'recipes': [],
        'nutrition_estimate': {},
        'total_cost_estimate': 0,
    }
    
    # Try to extract JSON if embedded
    json_match = re.search(r'\{.*\}', llm_response, re.DOTALL)
    if json_match:
        try:
            plan.update(json.loads(json_match.group()))
        except:
            pass
    
    return plan


def estimate_recipe_cost(ingredients: list, ingredient_prices_db: dict) -> float:
    """
    Estimate total cost of a recipe based on ingredients.
    
    Args:
        ingredients: [{"name": str, "quantity": float, "unit": str}]
        ingredient_prices_db: Database of ingredient names to prices
    
    Returns:
        Estimated cost in INR
    """
    total = 0
    for ing in ingredients:
        name = ing.get('name', '').lower()
        qty = ing.get('quantity', 1)
        # Simplified: assume average price per 100g/100ml
        base_price = ingredient_prices_db.get(name, 50)  # default ₹50 per 100g
        total += (qty / 100) * base_price
    
    return round(total, 2)


def generate_meal_plan_title(days: int, num_people: int, diet_type: str = "VEG") -> str:
    """
    Generate a descriptive title for a meal plan.
    """
    titles = {
        (3, 1, "VEG"): f"3-Day Vegetarian Plan for 1",
        (7, 1, "VEG"): f"Weekly Vegetarian Plan for 1",
        (7, 4, "VEG"): f"Weekly Vegetarian Family Plan (4 people)",
    }
    
    key = (days, num_people, diet_type)
    if key in titles:
        return titles[key]
    
    return f"{days}-Day {diet_type} Meal Plan for {num_people} {'person' if num_people == 1 else 'people'}"
