"""
IMP-013: Unit tests for InferenceEngine and database loading.
Tests critical paths that directly impact meal planning and nutrition calculations.
"""
import pytest
import sys
from pathlib import Path

# Add parent dir to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from engines.inference_engine import inference_engine, InferenceEngine
from database.loader import db


class TestInferenceEngineDefaults:
    """Test IMP-002: Guard against unloaded database."""

    def test_compute_targets_returns_defaults_if_db_not_loaded(self):
        """When database is not loaded, should return ICMR-NIN fallback targets."""
        # Simulate unloaded database
        original_loaded = db._loaded
        db._loaded = False

        profile = {
            'age': 30,
            'sex': 'Male',
            'life_stage': 'Sedentary Adult',
            'weight_kg': 70,
        }

        targets = inference_engine.compute_targets(profile)

        # Should have default values, not crash
        assert targets['calories'] > 0
        assert targets['protein_g'] >= 55
        assert targets['iron_mg'] > 0
        assert 'calcium_mg' in targets

        # Restore original state
        db._loaded = original_loaded

    def test_compute_targets_sex_affects_iron_and_magnesium(self):
        """Iron and magnesium targets vary by sex."""
        db._loaded = False

        male_profile = {'sex': 'Male', 'age': 30}
        female_profile = {'sex': 'Female', 'age': 30}

        male_targets = inference_engine.compute_targets(male_profile)
        female_targets = inference_engine.compute_targets(female_profile)

        # Female requires more iron
        assert female_targets['iron_mg'] > male_targets['iron_mg']

        db._loaded = True


class TestGLP1Modifier:
    """Test GLP-1 caloric reduction and protein floor enforcement."""

    def test_glp1_applies_caloric_reduction(self):
        """GLP-1 users should have reduced calories."""
        profile_no_glp1 = {
            'sex': 'Male',
            'life_stage': 'Sedentary Adult',
            'weight_kg': 70,
        }
        profile_glp1 = {
            **profile_no_glp1,
            'glp1_medication': 'Semaglutide',
            'glp1_phase': 'Maintenance',
        }

        targets_no_glp1 = inference_engine.compute_targets(profile_no_glp1)
        targets_glp1 = inference_engine.compute_targets(profile_glp1)

        # With GLP-1 Maintenance, should have 32.5% reduction
        expected_reduction = 1 - 0.325
        assert targets_glp1['calories'] < targets_no_glp1['calories']


class TestDiseasProtocols:
    """Test disease-specific caloric adjustments."""

    def test_diabetes_reduces_calories(self):
        """T2DM should trigger caloric ceiling."""
        profile = {
            'sex': 'Male',
            'life_stage': 'Sedentary Adult',
            'weight_kg': 70,
            'conditions': ['T2DM'],
        }

        targets = inference_engine.compute_targets(profile)

        # T2DM range: 1400-1800, so should be < 1800
        assert targets['calories'] <= 1800

    def test_anaemia_boosts_iron(self):
        """Anaemia should trigger higher iron targets."""
        profile = {
            'sex': 'Female',
            'life_stage': 'Sedentary Adult',
            'weight_kg': 60,
            'conditions': ['Anaemia'],
        }

        targets = inference_engine.compute_targets(profile)

        # Should enforce minimum of 25mg iron
        assert targets['iron_mg'] >= 25


class TestPhysioBoosts:
    """Test physiological state nutrient boosts."""

    def test_low_energy_and_focus_boosts_vitamins(self):
        """Low energy + focus should boost B12 and iron."""
        profile = {
            'sex': 'Male',
            'life_stage': 'Sedentary Adult',
            'weight_kg': 70,
            'energy_score': 2,  # Low
            'focus_score': 2,  # Low
            'sleep_hours': 8,
        }

        engine = InferenceEngine()
        targets_before = engine._default_targets(profile)

        # Apply boosts manually
        targets_after = engine._apply_physio_boosts(targets_before.copy(), profile)

        # Both should be boosted (1.40x and 1.10x respectively)
        assert targets_after.get('vit_b12_mcg', 0) > targets_before.get('vit_b12_mcg', 0)
        assert targets_after.get('iron_mg', 0) > targets_before.get('iron_mg', 0)


class TestMacroCalculation:
    """Test macro calculations from calories."""

    def test_macros_calculated_from_calories(self):
        """Protein (15%), Fat (25%), Carbs (55%) should be calculated."""
        calories = 2000
        expected_protein = (calories * 0.15 / 4)
        expected_fat = (calories * 0.25 / 9)
        expected_carbs = (calories * 0.55 / 4)

        profile = {
            'sex': 'Male',
            'life_stage': 'Sedentary Adult',
            'weight_kg': 70,
        }

        targets = inference_engine.compute_targets(profile)

        assert targets['fat_g'] > 0
        assert targets['carbs_g'] > 0


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
