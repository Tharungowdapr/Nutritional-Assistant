"""
AaharAI NutriSync — Analysis API
Expose dataset-level analysis endpoints + Excel sheet dump.
All data comes from the NutriSync_Analysis_Report.xlsx in data/ and IFCT food sheet.
"""

import logging
import math
from fastapi import APIRouter, Query, Depends
from fastapi.responses import JSONResponse
from app.core.config import settings
from app.db.loader import db as nutri_db
from app.core.dependencies import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/analysis", tags=["Analysis"])


def _safe(val):
    """Convert NaN/None to 0 for JSON serialization."""
    if val is None:
        return 0
    try:
        if math.isnan(float(val)):
            return 0
    except (ValueError, TypeError):
        return val
    return round(float(val), 2) if isinstance(val, float) else val


# ── 1. Full Excel Report ──────────────────────────────────────────
@router.get("/report")
async def analysis_report():
    """Return full sheet data for NutriSync analysis report as JSON."""
    import pandas as pd

    path = settings.DATA_DIR / "NutriSync_Analysis_Report.xlsx"
    try:
        xls = pd.ExcelFile(path)
        sheets = []
        for sheet_name in xls.sheet_names:
            df = pd.read_excel(path, sheet_name=sheet_name)
            sheets.append(
                {
                    "name": sheet_name,
                    "columns": list(df.columns),
                    "rows": df.to_dict(orient="records"),
                }
            )
        summary = {
            "sheet_count": len(sheets),
            "rows_total": sum(len(s.get("rows", [])) for s in sheets),
        }
        return {"sheets": sheets, "summary": summary}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


# ── 2. Food Group Stats ──────────────────────────────────────────
@router.get("/food-group-stats")
async def food_group_stats():
    """Food count and average energy per food group."""
    if getattr(nutri_db, "food", None) is None:
        return {"groups": [], "total_foods": 0}

    food = nutri_db.food
    groups = []
    for group_name, grp in food.groupby("Food Group"):
        groups.append(
            {
                "group": str(group_name),
                "count": int(len(grp)),
                "avg_energy_kcal": _safe(grp["Energy (kcal)"].mean()),
                "avg_protein_g": _safe(grp["Protein (g)"].mean()),
                "avg_fat_g": _safe(grp["Fat (g)"].mean()),
                "avg_carbs_g": _safe(grp["Carbs (g)"].mean()),
            }
        )

    groups.sort(key=lambda x: x["count"], reverse=True)
    return {"groups": groups, "total_foods": int(len(food))}


# ── 3. Veg / Non-Veg Distribution ─────────────────────────────────
@router.get("/veg-nonveg")
async def veg_nonveg_stats():
    """VEG vs NON-VEG food distribution with macro averages."""
    if getattr(nutri_db, "food", None) is None:
        return {"distribution": []}

    food = nutri_db.food
    dist = []
    if "Diet Type" in food.columns:
        for dtype, grp in food.groupby("Diet Type"):
            dist.append(
                {
                    "diet_type": str(dtype),
                    "count": int(len(grp)),
                    "percentage": round(len(grp) / len(food) * 100, 1),
                    "avg_energy_kcal": _safe(grp["Energy (kcal)"].mean()),
                    "avg_protein_g": _safe(grp["Protein (g)"].mean()),
                    "avg_iron_mg": _safe(grp["Iron (mg)"].mean()) if "Iron (mg)" in grp.columns else 0,
                }
            )

    return {"distribution": dist, "total": int(len(food))}


# ── 4. Top Protein Foods ──────────────────────────────────────────
@router.get("/top-protein-foods")
async def top_protein_foods(limit: int = Query(default=10, ge=1, le=50)):
    """Top N foods by protein content per 100g."""
    if getattr(nutri_db, "food", None) is None:
        return {"foods": []}

    food = nutri_db.food
    top = food.nlargest(limit, "Protein (g)")
    foods = []
    for _, row in top.iterrows():
        foods.append(
            {
                "name": str(row.get("Food Name", "")),
                "food_group": str(row.get("Food Group", "")),
                "diet_type": str(row.get("Diet Type", "")),
                "protein_g": _safe(row.get("Protein (g)")),
                "energy_kcal": _safe(row.get("Energy (kcal)")),
                "iron_mg": _safe(row.get("Iron (mg)")),
            }
        )

    return {"foods": foods}


# ── 5. Iron Analysis ──────────────────────────────────────────────
@router.get("/iron-analysis")
async def iron_analysis():
    """Iron content analysis: top sources, VEG vs NON-VEG comparison."""
    if getattr(nutri_db, "food", None) is None:
        return {"top_sources": [], "by_diet": []}

    food = nutri_db.food
    col = "Iron (mg)"
    if col not in food.columns:
        return {"top_sources": [], "by_diet": []}

    # Top 15 iron sources
    top = food.nlargest(15, col)
    top_sources = []
    for _, row in top.iterrows():
        top_sources.append(
            {
                "name": str(row.get("Food Name", "")),
                "iron_mg": _safe(row.get(col)),
                "food_group": str(row.get("Food Group", "")),
                "diet_type": str(row.get("Diet Type", "")),
            }
        )

    # Average iron by diet type
    by_diet = []
    if "Diet Type" in food.columns:
        for dtype, grp in food.groupby("Diet Type"):
            by_diet.append(
                {
                    "diet_type": str(dtype),
                    "avg_iron_mg": _safe(grp[col].mean()),
                    "max_iron_mg": _safe(grp[col].max()),
                    "count_high_iron": int((grp[col] > 5).sum()),
                }
            )

    return {"top_sources": top_sources, "by_diet": by_diet}


# ── 6. B12 Analysis ──────────────────────────────────────────────
@router.get("/b12-analysis")
async def b12_analysis():
    """Vitamin B12 analysis for identifying vegetarian deficiency risks."""
    if getattr(nutri_db, "food", None) is None:
        return {"top_sources": [], "insight": ""}

    food = nutri_db.food
    col = "Vit B12 (mcg)"
    if col not in food.columns:
        return {"top_sources": [], "insight": "B12 column not found in dataset."}

    valid = food[food[col].notna() & (food[col] > 0)]
    top = valid.nlargest(15, col)
    top_sources = []
    for _, row in top.iterrows():
        top_sources.append(
            {
                "name": str(row.get("Food Name", "")),
                "b12_mcg": _safe(row.get(col)),
                "food_group": str(row.get("Food Group", "")),
                "diet_type": str(row.get("Diet Type", "")),
            }
        )

    # How many VEG foods have B12 > 0?
    veg_with_b12 = 0
    if "Diet Type" in food.columns:
        veg_foods = food[food["Diet Type"].str.upper() == "VEG"]
        veg_with_b12 = int((veg_foods[col] > 0).sum())

    insight = (
        f"Only {veg_with_b12} vegetarian foods contain measurable B12. "
        "ICMR recommends 2.2 mcg/day. Vegetarians should consider curd, paneer, "
        "and fortified foods or supplements."
    )

    return {"top_sources": top_sources, "veg_sources_count": veg_with_b12, "insight": insight}


# ── 7. GI Distribution ───────────────────────────────────────────
@router.get("/gi-distribution")
async def gi_distribution():
    """Glycaemic Index distribution across foods."""
    if getattr(nutri_db, "food", None) is None:
        return {"distribution": [], "summary": {}}

    food = nutri_db.food
    col = "GI (Glycaemic Index)"
    if col not in food.columns:
        return {"distribution": [], "summary": {"note": "GI column not in dataset"}}

    valid = food[food[col].notna()]
    low = int((valid[col] < 56).sum())
    medium = int(((valid[col] >= 56) & (valid[col] <= 69)).sum())
    high = int((valid[col] > 69).sum())

    distribution = [
        {"category": "Low GI (<56)", "count": low, "color": "#22c55e"},
        {"category": "Medium GI (56-69)", "count": medium, "color": "#f59e0b"},
        {"category": "High GI (>69)", "count": high, "color": "#ef4444"},
    ]

    return {
        "distribution": distribution,
        "summary": {
            "total_foods_with_gi": int(len(valid)),
            "avg_gi": _safe(valid[col].mean()),
            "median_gi": _safe(valid[col].median()),
        },
    }


# ── 8. Calorie Distribution ──────────────────────────────────────
@router.get("/calorie-distribution")
async def calorie_distribution():
    """Energy (kcal) distribution by food group, bucketed."""
    if getattr(nutri_db, "food", None) is None:
        return {"buckets": [], "by_group": []}

    food = nutri_db.food
    col = "Energy (kcal)"
    valid = food[food[col].notna()]

    # Buckets
    buckets = [
        {"range": "0-100 kcal", "count": int((valid[col] < 100).sum())},
        {"range": "100-200 kcal", "count": int(((valid[col] >= 100) & (valid[col] < 200)).sum())},
        {"range": "200-300 kcal", "count": int(((valid[col] >= 200) & (valid[col] < 300)).sum())},
        {"range": "300-400 kcal", "count": int(((valid[col] >= 300) & (valid[col] < 400)).sum())},
        {"range": "400+ kcal", "count": int((valid[col] >= 400).sum())},
    ]

    # Average cal per group
    by_group = []
    for group_name, grp in valid.groupby("Food Group"):
        by_group.append(
            {
                "group": str(group_name),
                "avg_kcal": _safe(grp[col].mean()),
                "min_kcal": _safe(grp[col].min()),
                "max_kcal": _safe(grp[col].max()),
                "count": int(len(grp)),
            }
        )
    by_group.sort(key=lambda x: x["avg_kcal"], reverse=True)

    return {"buckets": buckets, "by_group": by_group}


# ── 9. Nutrient Summary ──────────────────────────────────────────
@router.get("/nutrient-summary")
async def nutrient_summary():
    """Database-wide nutrient averages and ranges."""
    if getattr(nutri_db, "food", None) is None:
        return {"nutrients": []}

    food = nutri_db.food
    nutrient_cols = [
        ("Energy (kcal)", "kcal"),
        ("Protein (g)", "g"),
        ("Fat (g)", "g"),
        ("Carbs (g)", "g"),
        ("Fibre (g)", "g"),
        ("Iron (mg)", "mg"),
        ("Calcium (mg)", "mg"),
        ("Zinc (mg)", "mg"),
        ("Folate (mcg)", "mcg"),
        ("Vit B12 (mcg)", "mcg"),
        ("Vit C (mg)", "mg"),
    ]

    nutrients = []
    for col, unit in nutrient_cols:
        if col not in food.columns:
            continue
        valid = food[food[col].notna()]
        nutrients.append(
            {
                "nutrient": col,
                "unit": unit,
                "mean": _safe(valid[col].mean()),
                "median": _safe(valid[col].median()),
                "min": _safe(valid[col].min()),
                "max": _safe(valid[col].max()),
                "foods_with_data": int(len(valid)),
            }
        )

    return {"nutrients": nutrients, "total_foods": int(len(food))}


# ── 10. Personal Analysis (authenticated) ─────────────────────────
@router.get("/personal")
async def personal_analysis(user=Depends(get_current_user)):
    """Redirect to customer-profile for backward compatibility."""
    if user is None:
        return {"error": "Login required for personal analysis"}

    return {
        "redirect": "/api/analysis/customer-profile",
        "note": "Use /api/analysis/customer-profile for full personal data.",
    }


# ── 11. Intelligence (lightweight LLM wrap) ───────────────────────
@router.get("/intelligence")
async def intelligence_analysis(user=Depends(get_current_user)):
    """Returns dataset insights without LLM (static pre-computed)."""
    stats = nutri_db.stats() if getattr(nutri_db, "_loaded", False) else {}

    insights = []
    if getattr(nutri_db, "food", None) is not None:
        food = nutri_db.food
        # Insight 1: Protein leaders
        if "Protein (g)" in food.columns:
            top_prot = food.nlargest(3, "Protein (g)")
            names = ", ".join(top_prot["Food Name"].tolist())
            insights.append(f"Highest protein foods in IFCT: {names}")

        # Insight 2: Iron-rich VEG foods
        if "Iron (mg)" in food.columns and "Diet Type" in food.columns:
            veg_iron = food[food["Diet Type"].str.upper() == "VEG"].nlargest(3, "Iron (mg)")
            if not veg_iron.empty:
                names = ", ".join(veg_iron["Food Name"].tolist())
                insights.append(f"Top vegetarian iron sources: {names}")

        # Insight 3: Low-cal high-protein
        if "Energy (kcal)" in food.columns and "Protein (g)" in food.columns:
            efficient = food[(food["Energy (kcal)"] < 200) & (food["Protein (g)"] > 15)]
            if not efficient.empty:
                names = ", ".join(efficient["Food Name"].head(3).tolist())
                insights.append(f"Low-calorie, high-protein foods: {names}")

    return {
        "stats": stats,
        "insights": insights,
        "source": "IFCT 2017 + ICMR-NIN 2024",
    }
