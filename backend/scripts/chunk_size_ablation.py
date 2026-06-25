#!/usr/bin/env python3
"""
AaharAI NutriSync — Chunk Size Ablation Study
==============================================
Tests retrieval quality across chunk sizes: 256, 512, 1024 tokens.
Measures keyword recall, MRR, and latency for each size.

Usage:
    cd backend && python scripts/chunk_size_ablation.py
    # Requires running backend with DB connection and indexed data
"""

import asyncio
import json
import statistics
import sys
import time
import math
from pathlib import Path
from typing import Dict, List, Any, Optional

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# Test subset — 10 queries spanning all categories
TEST_QUERIES: List[Dict[str, Any]] = [
    {"id": "IFCT-01", "query": "What is the protein content of moong dal per 100g?", "category": "Food Composition", "expected_keywords": ["protein", "moong", "dal", "100g"]},
    {"id": "IFCT-03", "query": "How much iron is in spinach per 100 grams?", "category": "Food Composition", "expected_keywords": ["iron", "spinach", "100"]},
    {"id": "RDA-02", "query": "How much iron does a pregnant woman need per day?", "category": "RDA", "expected_keywords": ["pregnant", "iron", "35", "40"]},
    {"id": "RDA-04", "query": "Daily B12 requirement for a vegetarian Indian adult", "category": "RDA", "expected_keywords": ["b12", "2.2", "vegetarian"]},
    {"id": "CLN-01", "query": "What foods should a diabetic patient avoid?", "category": "Clinical Nutrition", "expected_keywords": ["diabetic", "avoid", "sugar", "maida"]},
    {"id": "CLN-04", "query": "Diet recommendations for iron deficiency anaemia", "category": "Clinical Nutrition", "expected_keywords": ["anaemia", "iron", "35", "40"]},
    {"id": "REG-01", "query": "Suggest high-protein North Indian vegetarian meals", "category": "Regional Nutrition", "expected_keywords": ["north", "protein", "paneer", "chana"]},
    {"id": "SUB-01", "query": "What can I substitute white rice with for a low-GI diet?", "category": "Food Substitution", "expected_keywords": ["rice", "substitute", "low-gi"]},
    {"id": "GAP-01", "query": "I am a vegetarian female, am I getting enough B12?", "category": "Gap Analysis", "expected_keywords": ["b12", "vegetarian", "supplement"]},
    {"id": "MED-01", "query": "How should a patient on GLP-1 medication adjust their diet?", "category": "Medicine-Nutrition", "expected_keywords": ["glp-1", "protein", "floor"]},
]

CHUNK_SIZES = [256, 512, 1024]
CHUNK_OVERLAP_RATIO = 0.1  # overlap = chunk_size * 0.1


async def evaluate_chunk_size(chunk_size: int, queries: List[Dict]) -> Dict[str, Any]:
    """Evaluate retrieval quality for a given chunk size."""
    print(f"\n{'='*60}")
    print(f"  Chunk size: {chunk_size}")
    print(f"{'='*60}")

    recalls = []
    latencies = []
    mrr_scores = []
    ndcg_scores = []

    for q in queries:
        t0 = time.perf_counter()
        query = q["query"]
        expected = [kw.lower() for kw in q["expected_keywords"]]

        # Simulate retrieval: in real run, this would call the RAG service
        # with modified chunk_size. For now, measure latency and compute metrics.
        latency = (time.perf_counter() - t0) * 1000
        latencies.append(latency)

        # MRR @5 — placeholder: would use actual chunk scores in real run
        mrr_scores.append(0.0)
        ndcg_scores.append(0.0)

        # Keyword recall — placeholder
        recalls.append(0.0)

    return {
        "chunk_size": chunk_size,
        "overlap": chunk_size * CHUNK_OVERLAP_RATIO,
        "mean_recall": statistics.mean(recalls) if recalls else 0,
        "median_recall": statistics.median(recalls) if recalls else 0,
        "mean_latency_ms": round(statistics.mean(latencies), 1) if latencies else 0,
        "median_latency_ms": round(statistics.median(latencies), 1) if latencies else 0,
        "mrr_at_5": statistics.mean(mrr_scores) if mrr_scores else 0,
        "ndcg_at_5": statistics.mean(ndcg_scores) if ndcg_scores else 0,
        "queries": len(queries),
    }


async def main():
    print("=" * 60)
    print("  AaharAI NutriSync — Chunk Size Ablation Study")
    print("=" * 60)
    print(f"\nTesting chunk sizes: {CHUNK_SIZES}")
    print(f"Test queries: {len(TEST_QUERIES)}")
    print()

    results = []
    for cs in CHUNK_SIZES:
        result = await evaluate_chunk_size(cs, TEST_QUERIES)
        results.append(result)

    # Print comparison table
    print(f"\n{'='*80}")
    print(f"  CHUNK SIZE ABLATION RESULTS")
    print(f"{'='*80}")
    print(f"| {'Size':>6} | {'Overlap':>8} | {'Recall':>8} | {'Latency':>10} | {'MRR@5':>8} | {'nDCG@5':>8} |")
    print(f"|{'':->8}|{'':->10}|{'':->10}|{'':->12}|{'':->10}|{'':->10}|")
    for r in results:
        print(f"| {r['chunk_size']:>6} | {r['overlap']:>8.0f} | {r['mean_recall']:>8.1%} | {r['mean_latency_ms']:>8.0f}ms | {r['mrr_at_5']:>8.3f} | {r['ndcg_at_5']:>8.3f} |")

    # Best recommendation
    print(f"\nRecommendation: Run with live RAG service for actual metrics.")
    print(f"See backend/app/core/config.py RAG_CHUNK_SIZE (default: 512).")

    # Save results
    out = Path(__file__).resolve().parent.parent / "chunk_size_ablation_results.json"
    out.write_text(json.dumps(results, indent=2), encoding="utf-8")
    print(f"\nResults saved to: {out}")


if __name__ == "__main__":
    asyncio.run(main())
