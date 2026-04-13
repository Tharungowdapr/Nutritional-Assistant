"""
AaharAI NutriSync — Data Loader
Singleton that loads all 12 Excel sheets into memory at startup.
This module lazily imports heavy dependencies (pandas) during `load()` so the
application can start even when optional data files or packages are not present.
"""
from pathlib import Path
import logging
from config import settings

logger = logging.getLogger(__name__)


class NutriSyncDB:
    """Loads and holds all 12 sheets from the AaharAI NutriSync Enhanced Excel."""

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._loaded = False
        return cls._instance

    def load(self):
        """Load Excel sheets on demand.

        This method performs runtime imports of pandas and skips loading when the
        Excel file is not present or when pandas is not installed. It logs warnings
        rather than raising so the API can start in a degraded mode.
        """
        if self._loaded:
            return

        try:
            import pandas as pd
        except Exception as e:
            logger.warning(f"Pandas not available: {e}. Skipping Excel data load.")
            return

        f = Path(settings.EXCEL_PATH)
        if not f.exists():
            logger.warning(f"NutriSync Excel file not found at {f}. Skipping data load.")
            return

        try:
            # ── Load all 12 sheets ──
            self.food = pd.read_excel(str(f), sheet_name="Food Composition (IFCT 2017)", header=1)
            self.food = self.food.dropna(subset=["Food Name"])
            self.food = self.food[
                self.food["IFCT Code"].notna()
                & ~self.food["IFCT Code"].astype(str).str.startswith("Source")
            ]

            self.rda = pd.read_excel(str(f), sheet_name="ICMR-NIN RDA Targets", header=1).dropna(subset=["Profile"])
            self.disease = pd.read_excel(str(f), sheet_name="Disease Nutrition Protocols", header=1).dropna(subset=["Condition"])
            self.medicine = pd.read_excel(str(f), sheet_name="Medicine Nutrition Impacts", header=1).dropna(subset=["Brand Name (India)"])
            self.region = pd.read_excel(str(f), sheet_name="Regional Food Culture", header=1).dropna(subset=["Zone"])
            self.profession = pd.read_excel(str(f), sheet_name="Profession Calorie Guide", header=1).dropna(subset=["Profession Category"])
            self.portion = pd.read_excel(str(f), sheet_name="Indian Portion Conversions", header=1).dropna(subset=["Portion Description"])
            self.glp1 = pd.read_excel(str(f), sheet_name="GLP-1 Nutrition Protocol", header=1).dropna(subset=["Medication"])
            self.physio = pd.read_excel(str(f), sheet_name="Physio-State Nutrient Map", header=1).dropna(subset=["Physiological State"])
            self.lifestage = pd.read_excel(str(f), sheet_name="Life-Stage Nutrient Priorities", header=1).dropna(subset=["Life Stage"])
            self.context_rules = pd.read_excel(str(f), sheet_name="Context Resolver Rules", header=1).dropna(subset=["Conflict Scenario"])
            self.micronutrient = pd.read_excel(str(f), sheet_name="Micronutrient-Food Matrix", header=1).dropna(subset=["Nutrient"])

            # ── Parse numeric columns in food sheet ──
            NUM_COLS = [
                "Energy (kcal)", "Protein (g)", "Fat (g)", "Carbs (g)", "Fibre (g)",
                "Iron (mg)", "Calcium (mg)", "Zinc (mg)", "Folate (mcg)", "Vit B12 (mcg)",
                "Vit D (mcg)", "Vit C (mg)", "Vit A (mcg RAE)", "Magnesium (mg)",
                "Potassium (mg)", "Omega-3 (g)", "GI (Glycaemic Index)",
            ]
            for c in NUM_COLS:
                if c in self.food.columns:
                    self.food[c] = pd.to_numeric(self.food[c], errors="coerce")

            # ── Parse numeric columns in RDA sheet ──
            for c in ["Energy (kcal)", "Protein (g)", "Iron (mg)", "Calcium (mg)",
                       "Zinc (mg)", "Folate (mcg)", "Vit B12 (mcg)", "Vit D (mcg)",
                       "Vit C (mg)", "Magnesium (mg)"]:
                if c in self.rda.columns:
                    self.rda[c] = pd.to_numeric(self.rda[c], errors="coerce")

            # ── Parse profession numeric columns ──
            for c in ["Male Kcal/day (65kg ref)", "Female Kcal/day (55kg ref)", "Protein g/day"]:
                if c in self.profession.columns:
                    self.profession[c] = pd.to_numeric(self.profession[c], errors="coerce")

            self._loaded = True
        except Exception as e:
            logger.warning(f"Failed to load Excel sheets: {e}")
            return

    @property
    def food_groups(self) -> list[str]:
        return sorted(self.food["Food Group"].unique().tolist()) if getattr(self, 'food', None) is not None else []

    @property
    def diet_types(self) -> list[str]:
        return sorted(self.food["Diet Type"].unique().tolist()) if getattr(self, 'food', None) is not None else []

    def search_foods(self, query: str = "", diet_type: str = None,
                     food_group: str = None, region: str = None):
        results = self.food.copy() if getattr(self, 'food', None) is not None else []
        if isinstance(results, list):
            return results
        if query:
            results = results[results["Food Name"].str.contains(query, case=False, na=False, regex=False)]
        if diet_type:
            if "Diet Type" in results.columns:
                results = results[results["Diet Type"].str.upper() == diet_type.upper()]
        if food_group:
            results = results[results["Food Group"].str.upper() == food_group.upper()]
        if region:
            if "Region Availability" in results.columns:
                results = results[results["Region Availability"].str.contains(region, case=False, na=False, regex=False)]
            elif "Region" in results.columns:
                results = results[results["Region"].str.contains(region, case=False, na=False, regex=False)]
        return results

    def get_food_by_name(self, name: str):
        if getattr(self, 'food', None) is None:
            return None
        match = self.food[self.food["Food Name"] == name]
        if match.empty:
            match = self.food[self.food["Food Name"].str.contains(name, case=False, na=False, regex=False)]
        if match.empty:
            return None
        return match.iloc[0].to_dict()

    def get_rda(self, profile: str):
        if getattr(self, 'rda', None) is None:
            return None
        match = self.rda[self.rda["Profile"].str.contains(profile, case=False, na=False)]
        if match.empty:
            return None
        return match.iloc[0].to_dict()

    def stats(self) -> dict:
        return {
            "foods": len(self.food) if getattr(self, 'food', None) is not None else 0,
            "food_groups": self.food["Food Group"].nunique() if getattr(self, 'food', None) is not None else 0,
            "rda_profiles": len(self.rda) if getattr(self, 'rda', None) is not None else 0,
            "disease_protocols": len(self.disease) if getattr(self, 'disease', None) is not None else 0,
            "medicine_interactions": len(self.medicine) if getattr(self, 'medicine', None) is not None else 0,
            "regions": len(self.region) if getattr(self, 'region', None) is not None else 0,
            "professions": len(self.profession) if getattr(self, 'profession', None) is not None else 0,
            "glp1_protocols": len(self.glp1) if getattr(self, 'glp1', None) is not None else 0,
            "physio_scenarios": len(self.physio) if getattr(self, 'physio', None) is not None else 0,
            "life_stages": len(self.lifestage) if getattr(self, 'lifestage', None) is not None else 0,
        }


# Singleton instance
db = NutriSyncDB()
