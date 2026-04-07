"""
AaharAI NutriSync — Inference Engine
Orchestrates the full nutrient target computation pipeline:
1. Life-Stage RDA → base nutrient targets
2. Profession Calorie → PAL-adjusted calories
3. Disease Protocol → condition-specific overrides
4. GLP-1 Modifier → caloric reduction + protein floor
5. Physio Mapper → energy/sleep/focus boosts
6. Context Resolver → multi-context conflict resolution
"""
import pandas as pd
from database.loader import db


class InferenceEngine:
    """Computes personalized nutrient targets from a user profile."""

    # ── GLP-1 Configuration ──
    GLP1_CALORIC_REDUCTION = {
        ("Semaglutide", "Titration"): 0.20,
        ("Semaglutide", "Maintenance"): 0.325,
        ("Wegovy", "High Dose"): 0.40,
        ("Tirzepatide", "Titration"): 0.25,
        ("Tirzepatide", "Maintenance"): 0.45,
    }
    GLP1_PROTEIN_FLOOR = {
        ("Semaglutide", "Titration"): 75,
        ("Semaglutide", "Maintenance"): 80,
        ("Wegovy", "High Dose"): 85,
        ("Tirzepatide", "Titration"): 75,
        ("Tirzepatide", "Maintenance"): 90,
    }

    # ── Physio Boost Matrix ──
    BOOST_MATRIX = {
        # (energy_low, sleep_low, focus_low): {nutrient: multiplier}
        (True, False, False): {"vit_b12_mcg": 1.30, "iron_mg": 1.25, "magnesium_mg": 1.20},
        (False, True, False): {"magnesium_mg": 1.30, "zinc_mg": 1.15},
        (False, False, True): {"vit_b12_mcg": 1.20, "iron_mg": 1.10, "omega3_g": 1.30},
        (True, True, False): {"vit_b12_mcg": 1.35, "iron_mg": 1.30, "magnesium_mg": 1.40, "zinc_mg": 1.15},
        (True, True, True): {"vit_b12_mcg": 1.40, "iron_mg": 1.35, "magnesium_mg": 1.45, "omega3_g": 1.30, "zinc_mg": 1.15},
    }

    def compute_targets(self, profile: dict) -> dict:
        """Full pipeline: profile → personalized nutrient targets."""
        targets = self._get_base_rda(profile)
        targets = self._adjust_profession_calories(targets, profile)
        targets = self._apply_disease_overrides(targets, profile)
        targets = self._apply_glp1_modifier(targets, profile)
        targets = self._apply_physio_boosts(targets, profile)
        return targets

    def _get_base_rda(self, profile: dict) -> dict:
        """Step 1: Get base RDA from life-stage + sex."""
        life_stage = profile.get("life_stage", "")
        rda_match = db.rda[db.rda["Profile"].str.contains(life_stage, case=False, na=False)]

        if rda_match.empty:
            # Default to sedentary adult
            sex = profile.get("sex", "Male")
            rda_match = db.rda[db.rda["Profile"].str.contains(f"Sedentary.*{sex}", case=False, na=False)]

        if rda_match.empty:
            rda_match = db.rda.head(1)  # absolute fallback

        row = rda_match.iloc[0]
        return {
            "calories": float(row.get("Energy (kcal)", 2000) or 2000),
            "protein_g": float(row.get("Protein (g)", 55) or 55),
            "iron_mg": float(row.get("Iron (mg)", 17) or 17),
            "calcium_mg": float(row.get("Calcium (mg)", 1000) or 1000),
            "zinc_mg": float(row.get("Zinc (mg)", 12) or 12),
            "folate_mcg": float(row.get("Folate (mcg)", 400) or 400),
            "vit_b12_mcg": float(row.get("Vit B12 (mcg)", 2.4) or 2.4),
            "vit_d_mcg": float(row.get("Vit D (mcg)", 15) or 15),
            "vit_c_mg": float(row.get("Vit C (mg)", 80) or 80),
            "magnesium_mg": float(row.get("Magnesium (mg)", 420) or 420),
            "fat_g": 0,  # calculated later
            "carbs_g": 0,
            "fibre_g": 30,
            "omega3_g": 1.6,
            "life_stage": life_stage,
        }

    def _adjust_profession_calories(self, targets: dict, profile: dict) -> dict:
        """Step 2: Adjust calories based on profession PAL."""
        prof = profile.get("profession", "Sedentary")
        match = db.profession[db.profession["Profession Category"].str.contains(prof, case=False, na=False)]

        if not match.empty:
            row = match.iloc[0]
            sex = profile.get("sex", "Male")
            cal_col = "Male Kcal/day (65kg ref)" if sex == "Male" else "Female Kcal/day (55kg ref)"
            pal_calories = float(row.get(cal_col, targets["calories"]) or targets["calories"])

            # Adjust for actual weight
            ref_weight = 65 if sex == "Male" else 55
            actual_weight = profile.get("weight_kg", ref_weight)
            weight_factor = actual_weight / ref_weight
            targets["calories"] = pal_calories * weight_factor

        # Calculate macros from calories
        targets["protein_g"] = max(targets["protein_g"], targets["calories"] * 0.15 / 4)
        targets["fat_g"] = targets["calories"] * 0.25 / 9
        targets["carbs_g"] = targets["calories"] * 0.55 / 4

        return targets

    def _apply_disease_overrides(self, targets: dict, profile: dict) -> dict:
        """Step 3: Apply disease-specific caloric ranges and nutrient overrides."""
        conditions = profile.get("conditions", [])
        if not conditions:
            return targets

        DISEASE_CAL_RANGES = {
            "T2DM": (1400, 1800), "Hypertension": (1800, 2200),
            "Anaemia": (2200, 2600), "Hypothyroidism": (1600, 2000),
            "PCOS": (1400, 1800), "Tuberculosis": (2500, 2900),
            "CKD": (1500, 2000), "Pregnancy": (2200, 2550),
            "Osteoporosis": (1800, 2200), "Obesity": (1200, 1500),
        }

        for condition in conditions:
            for key, (cal_min, cal_max) in DISEASE_CAL_RANGES.items():
                if key.lower() in condition.lower():
                    cal_mid = (cal_min + cal_max) / 2
                    targets["calories"] = min(targets["calories"], cal_mid)
                    break

            # Specific nutrient boosts
            if "anaemia" in condition.lower():
                targets["iron_mg"] = max(targets["iron_mg"], 25)
            if "osteoporosis" in condition.lower():
                targets["calcium_mg"] = max(targets["calcium_mg"], 1200)
                targets["vit_d_mcg"] = max(targets["vit_d_mcg"], 20)

        return targets

    def _apply_glp1_modifier(self, targets: dict, profile: dict) -> dict:
        """Step 4: Apply GLP-1 caloric reduction and enforce protein floor."""
        medication = profile.get("glp1_medication")
        phase = profile.get("glp1_phase")
        if not medication or not phase:
            return targets

        # Caloric reduction
        key = (medication, phase)
        reduction = self.GLP1_CALORIC_REDUCTION.get(key, 0.25)
        targets["calories"] *= (1 - reduction)

        # Protein floor (NON-NEGOTIABLE)
        protein_floor = self.GLP1_PROTEIN_FLOOR.get(key, 75)
        targets["protein_g"] = max(targets["protein_g"], protein_floor)

        # B12 boost for GLP-1 users
        targets["vit_b12_mcg"] = max(targets["vit_b12_mcg"], 3.0)

        return targets

    def _apply_physio_boosts(self, targets: dict, profile: dict) -> dict:
        """Step 5: Apply nutrient boosts based on energy/sleep/focus scores."""
        energy_low = profile.get("energy_score", 3) <= 2
        sleep_low = profile.get("sleep_hours", 7) < 6
        focus_low = profile.get("focus_score", 3) <= 2

        state = (energy_low, sleep_low, focus_low)
        boosts = self.BOOST_MATRIX.get(state, {})

        for nutrient, multiplier in boosts.items():
            if nutrient in targets:
                targets[nutrient] *= multiplier

        return targets


# Singleton
inference_engine = InferenceEngine()
