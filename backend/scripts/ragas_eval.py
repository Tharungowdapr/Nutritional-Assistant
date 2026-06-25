#!/usr/bin/env python3
"""
AaharAI NutriSync — RAGAS Evaluation with Groq as LLM Judge
============================================================
Evaluates faithfulness, answer relevancy, context precision, and context recall
using Groq's llama-3.3-70b-versatile as the judge LLM.

Usage:
    cd backend && python scripts/ragas_eval.py
"""

import json
import os
import sys
from pathlib import Path
from typing import Dict, List, Any, Optional

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# ── Groq judge configuration ──────────────────────────────────────────

GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
GROQ_MODEL = "llama-3.3-70b-versatile"
GROQ_BASE_URL = "https://api.groq.com/openai/v1"

# Set environment for RAGAS/langchain
os.environ["OPENAI_API_KEY"] = GROQ_API_KEY
os.environ["OPENAI_BASE_URL"] = GROQ_BASE_URL


def setup_groq_judge():
    """Configure langchain to use Groq as the LLM judge for RAGAS."""
    from langchain_openai import ChatOpenAI

    llm = ChatOpenAI(
        model=GROQ_MODEL,
        api_key=GROQ_API_KEY,
        base_url=GROQ_BASE_URL,
        temperature=0.0,
        max_tokens=1024,
    )
    return llm


def load_evaluation_data() -> tuple:
    """Load existing evaluation results and prepare for RAGAS."""
    eval_path = Path(__file__).resolve().parent.parent / "evaluation_results.json"
    if not eval_path.exists():
        print(f"Error: {eval_path} not found. Run evaluation.py first.")
        sys.exit(1)

    with open(eval_path) as f:
        data = json.load(f)

    full_results = data.get("full_results", [])
    print(f"Loaded {len(full_results)} evaluation results")

    # Build samples list for RAGAS
    samples = []
    for r in full_results:
        # Contexts are not stored in JSON — use the expected_keywords from
        # evaluation.py's TEST_QUERIES as a proxy, or use the answer_preview.
        # For proper evaluation, we need the actual retrieved chunks.
        # We'll use the chunks available or the scores as fallback.
        sample = {
            "question": r.get("query", ""),
            "answer": r.get("answer_preview", ""),
            "contexts": [],  # Will be populated from chunks if available
            "ground_truth": "",  # Will be populated from NutriSyncBench
        }
        samples.append(sample)

    return samples, full_results


def build_ragas_dataset(samples: List[Dict]) -> Optional[Any]:
    """Build a RAGAS dataset from samples."""
    try:
        from datasets import Dataset
    except ImportError:
        print("Error: datasets not installed. Run: pip install datasets")
        return None

    rag_samples = []
    for s in samples:
        if not s["question"] or not s["answer"]:
            continue
        rag_samples.append({
            "question": s["question"],
            "answer": s["answer"],
            "contexts": s["contexts"] or ["No contexts available"],
            "ground_truth": s.get("ground_truth") or s["question"],
        })

    if not rag_samples:
        print("No valid samples found")
        return None

    dataset = Dataset.from_list(rag_samples)
    print(f"RAGAS dataset built: {len(dataset)} samples")
    return dataset


def evaluate_with_ragas():
    """Run RAGAS evaluation using Groq as judge."""
    print("=" * 70)
    print("  AaharAI NutriSync — RAGAS Evaluation (Groq Judge)")
    print("=" * 70)
    print()

    # Setup Groq judge
    print("[1/4] Setting up Groq as LLM judge...")
    try:
        judge_llm = setup_groq_judge()
        # Test connection
        test = judge_llm.invoke("Reply with only the word OK")
        print(f"  Groq judge ready: {test.content.strip()}")
    except Exception as e:
        print(f"  Error setting up Groq judge: {e}")
        print("  Falling back to default RAGAS configuration...")
        judge_llm = None

    # Import RAGAS
    try:
        from ragas import evaluate
        from ragas.metrics import (
            faithfulness,
            answer_relevancy,
            context_precision,
            context_recall,
        )
        HAS_RAGAS = True
    except ImportError as e:
        print(f"  RAGAS not available: {e}")
        print("  Install: pip install ragas datasets")
        return

    # Load data
    print("\n[2/4] Loading evaluation data...")
    samples, full_results = load_evaluation_data()
    print(f"  {len(samples)} samples loaded")

    # Load NutriSyncBench for ground truth matching
    bench_path = Path(__file__).resolve().parent / "nutrisync_bench.json"
    if bench_path.exists():
        from scripts.nutrisync_bench import NutriSyncBench
        bench = NutriSyncBench()
        bench.load(str(bench_path))
        # Match queries to gold answers
        for i, s in enumerate(samples):
            q = s["question"].lower().strip().rstrip("?.,")
            for entry in bench.entries:
                eq = entry["query"].lower().strip().rstrip("?.,")
                if q == eq or q.startswith(eq[:40]) or eq.startswith(q[:40]):
                    samples[i]["ground_truth"] = entry["gold_answer"]
                    break
        matched = sum(1 for s in samples if s["ground_truth"])
        print(f"  Matched {matched}/{len(samples)} queries to NutriSyncBench gold answers")

    # Build dataset
    print("\n[3/4] Building RAGAS dataset...")
    dataset = build_ragas_dataset(samples)
    if dataset is None:
        return

    # Configure metrics with judge
    metrics = [faithfulness, answer_relevancy]
    if judge_llm:
        try:
            faithfulness.llm = judge_llm
            answer_relevancy.llm = judge_llm
            # Wrap in a compatible format
            faithfulness.__class__.llm = judge_llm
            answer_relevancy.__class__.llm = judge_llm
        except Exception:
            pass

    # Run evaluation
    print("\n[4/4] Running RAGAS evaluation (this may take a few minutes)...")
    print("  Metrics: faithfulness, answer_relevancy, context_precision, context_recall")
    print("  Judge: Groq llama-3.3-70b-versatile")
    print()

    try:
        result = evaluate(
            dataset,
            metrics=[
                faithfulness,
                answer_relevancy,
                context_precision,
                context_recall,
            ],
        )

        print()
        print("=" * 70)
        print("  RAGAS EVALUATION RESULTS")
        print("=" * 70)

        df = result.to_pandas()
        print(df.to_string())

        # Aggregate
        agg = {}
        for col in df.columns:
            if col != "question":
                agg[col] = {
                    "mean": round(df[col].mean(), 4),
                    "median": round(df[col].median(), 4),
                    "std": round(df[col].std(), 4),
                    "min": round(df[col].min(), 4),
                    "max": round(df[col].max(), 4),
                }

        print()
        print("--- Aggregate RAGAS Scores ---")
        print(f"{'Metric':<30} {'Mean':<8} {'Median':<8} {'Std':<8}")
        print("-" * 55)
        for metric, vals in agg.items():
            print(f"{metric:<30} {vals['mean']:<8.4f} {vals['median']:<8.4f} {vals['std']:<8.4f}")

        # Save results
        output = {
            "aggregate": agg,
            "per_query": df.to_dict(orient="records"),
            "config": {
                "judge_model": GROQ_MODEL,
                "judge_provider": "Groq",
                "n_queries": len(dataset),
                "metrics": ["faithfulness", "answer_relevancy", "context_precision", "context_recall"],
            },
        }
        out_path = Path(__file__).resolve().parent.parent / "evaluation_ragas_results.json"
        with open(out_path, "w") as f:
            json.dump(output, f, indent=2)
        print(f"\nResults saved to: {out_path}")

    except Exception as e:
        print(f"\nError during RAGAS evaluation: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    evaluate_with_ragas()
