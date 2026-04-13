"""
Enhancement features for AaharAI NutriSync
Implements: Profile completion, Recipe history, RAG chat, Meal plans, Food DB
"""

# ==================== 1. PROFILE COMPLETION CALCULATION ====================

def calculate_profile_completion(profile: dict) -> float:
    """
    Calculate profile completion percentage based on filled fields.
    Returns 0-100 percentage.
    """
    fields_required = {
        'name': profile.get('name'),
        'age': profile.get('age'),
        'sex': profile.get('sex'),
        'height_cm': profile.get('height_cm'),
        'weight_kg': profile.get('weight_kg'),
        'diet_type': profile.get('diet_type'),
        'life_stage': profile.get('life_stage'),
        'region_zone': profile.get('region_zone'),
        'goals': profile.get('goals'),
        'conditions': profile.get('conditions'),
        'physical_activity': profile.get('physical_activity'),
        'sleep_hours': profile.get('sleep_hours'),
    }
    
    # Count non-empty fields
    filled = sum(1 for v in fields_required.values() if v is not None and v != '' and v != [])
    total = len(fields_required)
    
    # Return percentage (minimum 10% to avoid showing 0)
    return max(10, round((filled / total) * 100, 0))


# ==================== 2. RECIPE DATABASE SCHEMA ====================

"""
NEW TABLES:

recipe_views (history):
- id: int (PK)
- user_id: int (FK to users)
- recipe_id: str
- recipe_name: str
- recipe_content: JSON (full recipe object)
- recipe_source: str (IFCT/Custom/AI)
- viewed_at: datetime
- time_spent_seconds: int (optional)

recipe_custom:
- id: int (PK)
- user_id: int (FK)
- name: str
- ingredients: JSON
- instructions: str
- nutrition_facts: JSON
- created_at: datetime
- updated_at: datetime
"""

# ==================== 3. RAG CHAT HISTORY SCHEMA ====================

"""
NEW TABLES:

chat_sessions (replaces old chat_history):
- id: int (PK)
- user_id: int (FK)
- title: str (auto-generated from first message or custom)
- is_archived: bool
- created_at: datetime
- updated_at: datetime

chat_messages:
- id: int (PK)
- session_id: int (FK to chat_sessions)
- user_id: int (FK)
- role: str (user/assistant)
- content: str
- sources: JSON (RAG sources cited)
- created_at: datetime
- updated_at: datetime
"""

# ==================== 4. MEAL PLAN UPGRADED SCHEMA ====================

"""
NEW TABLES:

meal_plans:
- id: int (PK)
- user_id: int (FK)
- num_people: int
- num_days: int
- budget_per_day_inr: float
- meals_json: JSON (structured meal plan)
- recipes_json: JSON (recipes used)
- grocery_list_json: JSON (with prices)
- total_cost: float
- created_at: datetime

meals_history:
- id: int (PK)
- meal_plan_id: int (FK)
- user_id: int (FK)
- meal_date: date
- feedback: str (liked/disliked/skipped)
"""

# ==================== 5. FOOD DATABASE TABLES ====================

"""
Store Excel data in DB for web access:

foods_view:
- id: int
- ifct_code: str
- name: str
- food_group: str
- diet_type: str
- energy_kcal: float
- protein_g: float
- ... (all nutrients)
- excel_row_id: int (reference to Excel source)

nutrient_reference:
- id: int
- nutrient_name: str
- unit: str
- rda_male: float
- rda_female: float
"""
