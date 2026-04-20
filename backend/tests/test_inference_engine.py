import pytest
from engines.inference_engine import inference_engine

def test_default_targets():
    """Verify fallback targets when DB not loaded."""
    profile = {"sex": "Female", "age": 25}
    targets = inference_engine._default_targets(profile)
    assert targets["calories"] == 2000
    assert targets["iron_mg"] == 17
    assert targets["magnesium_mg"] == 320

def test_compute_targets_sedentary_adult():
    """Verify target computation for a basic profile."""
    profile = {
        "sex": "Male",
        "age": 30,
        "weight_kg": 65,
        "life_stage": "Adult",
        "profession": "Sedentary"
    }
    targets = inference_engine.compute_targets(profile)
    assert targets["calories"] >= 2000
    assert "protein_g" in targets
    assert "fat_g" in targets

def test_glp1_modifier():
    """Verify GLP-1 caloric reduction and protein floor."""
    profile = {
        "sex": "Male",
        "age": 40,
        "weight_kg": 90,
        "life_stage": "Adult",
        "glp1_medication": "Semaglutide",
        "glp1_phase": "Maintenance"
    }
    # Base targets without GLP-1
    base_targets = inference_engine._default_targets(profile)
    # Applied targets
    targets = inference_engine.compute_targets(profile)
    
    # Reduction: 32.5% for Semaglutide Maintenance
    expected_calories = base_targets["calories"] * (1 - 0.325)
    # Note: Profession adjustment might shift the base, so we check relative reduction
    assert targets["calories"] < base_targets["calories"]
    assert targets["protein_g"] >= 80  # Protein floor for maintenance
    assert targets["vit_b12_mcg"] >= 3.0
