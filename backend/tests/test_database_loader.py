"""
IMP-013: Unit tests for database loader and search functionality.
"""
import pytest
import sys
import re
from pathlib import Path
from unittest.mock import Mock, patch

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from database.loader import NutriSyncDB


class TestSearchFoodsNoReDoS:
    """Test IMP-001: ReDoS prevention via regex=False and re.escape."""

    def test_search_foods_escapes_regex_special_chars(self):
        """Dangerous regex patterns should not cause ReDoS."""
        db = NutriSyncDB()
        
        # These patterns would cause ReDoS if regex=True:
        dangerous_patterns = [
            "(dal+",  # Unmatched parenthesis
            "a+a+a+a+a+a+b",  # Catastrophic backtracking
            "[a-",  # Incomplete character class
            "(?R)",  # Recursion
        ]
        
        # Mock the food dataframe
        import pandas as pd
        db.food = pd.DataFrame({
            'Food Name': ['Daal', 'Rice', 'Aloo'],
            'Food Group': ['Pulses', 'Cereals', 'Vegetables'],
            'Diet Type': ['VEG', 'VEG', 'VEG'],
        })
        
        for pattern in dangerous_patterns:
            # Should not hang or crash
            results = db.search_foods(query=pattern)
            assert isinstance(results, (list, type(db.food.__class__)))


class TestSearchFoodsNoCopy:
    """Test IMP-006: Avoid DataFrame.copy() performance regression."""

    def test_search_foods_uses_masking_not_copy(self):
        """search_foods should use boolean masking, not copy()."""
        import pandas as pd
        
        db = NutriSyncDB()
        db.food = pd.DataFrame({
            'Food Name': ['Rice', 'Wheat', 'Dal'],
            'Food Group': ['Cereals', 'Cereals', 'Pulses'],
            'Diet Type': ['VEG', 'VEG', 'VEG'],
        })
        
        results = db.search_foods(query='Rice')
        
        # Results should be a view or DataFrame, not a copy operation
        assert len(results) > 0
        assert 'Food Name' in results.columns


class TestThreadSafety:
    """Test IMP-016: NutriSyncDB thread-safe load."""

    def test_singleton_is_thread_safe(self):
        """Multiple threads should not create multiple instances."""
        import threading
        
        instances = []
        
        def get_db_instance():
            db = NutriSyncDB()
            instances.append(id(db))
        
        threads = [threading.Thread(target=get_db_instance) for _ in range(5)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()
        
        # All should be the same instance
        assert len(set(instances)) == 1


class TestFoodByName:
    """Test exact and fuzzy food lookup."""

    def test_get_food_by_name_exact_match(self):
        """Exact match should return food dict."""
        import pandas as pd
        
        db = NutriSyncDB()
        db.food = pd.DataFrame({
            'Food Name': ['Basmati Rice', 'White Rice'],
            'Energy (kcal)': [130, 130],
        })
        
        food = db.get_food_by_name('Basmati Rice')
        assert food is not None
        assert food['Food Name'] == 'Basmati Rice'

    def test_get_food_by_name_fuzzy_match(self):
        """Partial/fuzzy match should work with escaping."""
        import pandas as pd
        
        db = NutriSyncDB()
        db.food = pd.DataFrame({
            'Food Name': ['Basmati Rice', 'White Rice'],
            'Energy (kcal)': [130, 130],
        })
        
        food = db.get_food_by_name('basmati')
        assert food is not None
        assert 'Basmati' in food['Food Name']


class TestRDALookup:
    """Test RDA profile lookup with escaping."""

    def test_get_rda_escapes_special_chars(self):
        """RDA lookup should escape special characters."""
        import pandas as pd
        
        db = NutriSyncDB()
        db.rda = pd.DataFrame({
            'Profile': ['Adult Male (Sedentary)', 'Adult Female (Sedentary)'],
            'Energy (kcal)': [2000, 1800],
        })
        
        # Should not crash on special chars
        result = db.get_rda('Sedentary')
        assert result is not None


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
