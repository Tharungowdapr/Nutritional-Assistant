"""
AaharAI NutriSync — Step 2: Excel Data Enhancement
Run once: python3 scripts/enhance_excel.py
Adds to IFCT sheet:
  - allergen boolean columns (gluten, dairy, nuts, soy, shellfish, egg)
  - regional availability boolean columns (north, south, east, west, central)
  - GI category column (Low/Medium/High)
"""
import pandas as pd
from pathlib import Path
import re

EXCEL_PATH = Path(__file__).parent.parent / "data" / "AaharAI_NutriSync_Enhanced.xlsx"
OUTPUT_PATH = EXCEL_PATH  # overwrite in place


def region_to_booleans(region_str: str) -> dict:
    """Convert 'South/East India' → {north:False, south:True, east:True, west:False, central:False}"""
    if pd.isna(region_str):
        r = ""
    else:
        r = str(region_str).lower()

    all_india = "all india" in r
    return {
        "avail_north":    all_india or "north" in r,
        "avail_south":    all_india or "south" in r,
        "avail_east":     all_india or "east" in r,
        "avail_west":     all_india or "west" in r,
        "avail_central":  all_india or "central" in r,
    }


def detect_allergens(food_name: str, food_group: str, notes: str) -> dict:
    """
    Rule-based allergen detection for 86 IFCT foods.
    Based on FSSAI 14 major allergens + common Indian food patterns.
    """
    name = str(food_name).lower()
    group = str(food_group).lower()
    note = str(notes).lower() if not pd.isna(notes) else ""
    combined = f"{name} {group} {note}"

    gluten_keywords = [
        "wheat", "atta", "maida", "dalia", "suji", "semolina", "barley",
        "rye", "oats", "bread", "biscuit", "pasta", "noodle", "roti", "seitan"
    ]
    dairy_keywords = [
        "milk", "curd", "dahi", "paneer", "ghee", "butter", "cream", "cheese",
        "khoa", "mawa", "lassi", "chaas", "buttermilk", "whey"
    ]
    nuts_keywords = [
        "groundnut", "peanut", "almond", "cashew", "walnut", "pistachio",
        "coconut", "chestnut", "hazelnut", "pecan", "pine nut", "macadamia"
    ]
    soy_keywords = ["soybean", "soya", "tofu", "tempeh", "edamame", "soy"]
    shellfish_keywords = [
        "prawn", "shrimp", "crab", "lobster", "mussel", "oyster", "clam",
        "scallop", "squid", "octopus"
    ]
    egg_keywords = ["egg", "anda", "whole egg", "egg white", "egg yolk"]
    fish_keywords = [
        "fish", "rohu", "catla", "hilsa", "pomfret", "sardine", "mackerel",
        "tuna", "salmon", "cod", "anchovy", "tilapia"
    ]

    return {
        "allergen_gluten":    any(k in combined for k in gluten_keywords),
        "allergen_dairy":     any(k in combined for k in dairy_keywords),
        "allergen_nuts":      any(k in combined for k in nuts_keywords),
        "allergen_soy":       any(k in combined for k in soy_keywords),
        "allergen_shellfish": any(k in combined for k in shellfish_keywords),
        "allergen_egg":       any(k in combined for k in egg_keywords),
        "allergen_fish":      any(k in combined for k in fish_keywords),
    }


def gi_category(gi_val) -> str:
    """Low ≤55, Medium 56–69, High ≥70"""
    try:
        v = float(gi_val)
        if v <= 55: return "Low"
        if v <= 69: return "Medium"
        return "High"
    except Exception:
        return "Unknown"


def main():
    print(f"Loading {EXCEL_PATH}...")
    xl = pd.ExcelFile(str(EXCEL_PATH))
    sheets = {}

    for sheet_name in xl.sheet_names:
        sheets[sheet_name] = pd.read_excel(str(EXCEL_PATH), sheet_name=sheet_name, header=None)

    # ── Work on IFCT sheet with header=1 ──
    ifct = pd.read_excel(str(EXCEL_PATH), sheet_name="Food Composition (IFCT 2017)", header=1)
    ifct = ifct.dropna(subset=["Food Name"])
    ifct = ifct[ifct["IFCT Code"].notna() & ~ifct["IFCT Code"].astype(str).str.startswith("Source")]

    print(f"  IFCT: {len(ifct)} foods loaded")

    # Add regional boolean columns
    region_data = ifct["Region Availability"].apply(region_to_booleans)
    for col in ["avail_north", "avail_south", "avail_east", "avail_west", "avail_central"]:
        ifct[col] = region_data.apply(lambda x: x[col])

    # Add allergen boolean columns
    allergen_data = ifct.apply(
        lambda row: detect_allergens(
            row.get("Food Name", ""),
            row.get("Food Group", ""),
            row.get("Notes", "")
        ), axis=1
    )
    for col in ["allergen_gluten", "allergen_dairy", "allergen_nuts",
                "allergen_soy", "allergen_shellfish", "allergen_egg", "allergen_fish"]:
        ifct[col] = allergen_data.apply(lambda x: x[col])

    # Add GI category
    ifct["GI_Category"] = ifct["GI (Glycaemic Index)"].apply(gi_category)

    # Add omega-6 estimates (g/100g) — sourced from USDA SR Legacy cross-reference
    # These are approximate values for the most common foods
    omega6_map = {
        "Rice, raw, milled": 0.18,
        "Wheat flour, whole": 0.67,
        "Bajra (Pearl Millet)": 1.10,
        "Ragi (Finger Millet)": 0.23,
        "Groundnut (peanut, raw)": 15.60,
        "Coconut (fresh, grated)": 0.37,
        "Sesame seeds (til)": 21.37,
        "Mustard seeds": 5.90,
        "Sunflower seeds": 23.05,
        "Soybean (raw)": 9.93,
        "Whole milk (cow)": 0.12,
        "Hen egg (whole, raw)": 1.75,
        "Chicken (breast, raw)": 0.74,
        "Mutton (goat, raw)": 0.58,
    }
    ifct["Omega-6 (g)"] = ifct["Food Name"].map(omega6_map).fillna(0.0)

    # Print summary
    print(f"  Added columns: avail_north/south/east/west/central, allergen_* (7), GI_Category, Omega-6")
    print(f"  Allergen flags sample:")
    flagged = ifct[(ifct["allergen_gluten"] | ifct["allergen_dairy"] | ifct["allergen_nuts"])]
    print(f"    Gluten: {ifct['allergen_gluten'].sum()} | Dairy: {ifct['allergen_dairy'].sum()} | Nuts: {ifct['allergen_nuts'].sum()}")

    # ── Write back: replace just the IFCT sheet ──
    with pd.ExcelWriter(str(OUTPUT_PATH), engine="openpyxl", mode="a", if_sheet_exists="replace") as writer:
        # Write with 2-row header format (row0=title, row1=columns)
        # We preserve the original title row
        title_row = pd.read_excel(str(EXCEL_PATH), sheet_name="Food Composition (IFCT 2017)", header=None).iloc[0, 0]
        ifct.to_excel(writer, sheet_name="Food Composition (IFCT 2017)", index=False, startrow=1)
        ws = writer.sheets["Food Composition (IFCT 2017)"]
        ws.cell(row=1, column=1, value=title_row)

    print(f"✅ Enhanced Excel saved to {OUTPUT_PATH}")
    print(f"   New column count: {len(ifct.columns)}")


if __name__ == "__main__":
    main()
