"""
AaharAI NutriSync — Component-Level Timing Instrumentation
Provides context managers and decorators for per-component latency tracking.
Usage: wrap any function or code block with ComponentTimer.
"""

import time
import logging
import threading
from typing import Optional

logger = logging.getLogger(__name__)


class ComponentTimer:
    """Collects per-component timing data. Uses thread-local storage for request isolation."""

    _local = threading.local()
    _lock = threading.Lock()

    def __init__(self, component: str, enabled: bool = True):
        self.component = component
        self.enabled = enabled
        self._start: Optional[float] = None
        self._elapsed: Optional[float] = None

    def __enter__(self):
        if self.enabled:
            self._start = time.perf_counter()
        return self

    def __exit__(self, *args):
        if self.enabled and self._start is not None:
            self._elapsed = (time.perf_counter() - self._start) * 1000  # ms
            timings = self._get_thread_timings()
            timings.append({
                "component": self.component,
                "elapsed_ms": round(self._elapsed, 2),
                "timestamp": time.time(),
            })

    @classmethod
    def _get_thread_timings(cls) -> list:
        """Get or create the timings list for the current thread."""
        if not hasattr(cls._local, "timings"):
            cls._local.timings = []
        return cls._local.timings

    @classmethod
    def get_and_clear(cls) -> list:
        """Return all accumulated timings for the current thread and reset."""
        timings = cls._get_thread_timings()
        result = list(timings)
        timings.clear()
        return result

    @classmethod
    def get_summary(cls, timings: Optional[list] = None) -> dict:
        """Aggregate timings by component name."""
        if timings is None:
            timings = cls._get_thread_timings()
        if not timings:
            return {}
        by_component: dict = {}
        for t in timings:
            c = t["component"]
            if c not in by_component:
                by_component[c] = []
            by_component[c].append(t["elapsed_ms"])
        summary = {}
        for c, vals in by_component.items():
            summary[c] = {
                "count": len(vals),
                "total_ms": round(sum(vals), 2),
                "avg_ms": round(sum(vals) / len(vals), 2),
                "min_ms": round(min(vals), 2),
                "max_ms": round(max(vals), 2),
            }
        return summary
