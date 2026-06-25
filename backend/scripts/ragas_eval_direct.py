#!/usr/bin/env python3
"""
AaharAI NutriSync — RAGAS-Style Evaluation with Groq as LLM Judge
==================================================================
Implements the core RAGAS metrics directly using Groq's llama-3.3-70b-versatile:
- Faithfulness: Are answer claims supported by retrieved contexts?
- Answer Relevancy: Does the answer address the question?
- Context Precision: Are retrieved chunks relevant to the question?
- Context Recall: Is the ground truth covered by retrieved chunks?

Usage:
    cd backend && python scripts/ragas_eval_direct.py
"""

import asyncio
import json
import os
import statistics
import time
from collections import Counter
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple

import httpx

GROQ_API_KEY = "REDACTED"
GROQ_MODEL = "llama-3.3-70b-versatile"
GROQ_BASE_URL = "https://api.groq.com/openai/v1"


class GroqJudge:
    """LLM-as-judge using Groq for RAGAS-style metrics."""

    def __init__(self, api_key: str = GROQ_API_KEY, model: str = GROQ_MODEL):
        self.api_key = api_key
        self.model = model
        self.client = httpx.AsyncClient(
            base_url=GROQ_BASE_URL,
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            timeout=30.0,
        )
        self._call_count = 0
        self._total_tokens = 0

    async def _call(self, system: str, user: str, temperature: float = 0.0) -> str:
        """Call Groq with a system and user message."""
        self._call_count += 1
        try:
            resp = await self.client.post(
                "/chat/completions",
                json={
                    "model": self.model,
                    "messages": [
                        {"role": "system", "content": system},
                        {"role": "user", "content": user},
                    ],
                    "temperature": temperature,
                    "max_tokens": 512,
                },
            )
            data = resp.json()
            self._total_tokens += data.get("usage", {}).get("total_tokens", 0)
            return data["choices"][0]["message"]["content"].strip()
        except Exception as e:
            return f"ERROR: {e}"

    async def close(self):
        await self.client.aclose()

    def get_stats(self) -> Dict:
        return {"calls": self._call_count, "total_tokens": self._total_tokens}

    # ── Metric: Faithfulness ──────────────────────────────────────────

    async def faithfulness(self, question: str, answer: str, contexts: List[str]) -> float:
        """Score 0-1: Are the claims in the answer supported by the contexts?"""
        if not answer or not contexts:
            return 0.0

        context_text = "\n\n".join(contexts[:3])  # Use top 3 chunks
        system = "You are an expert evaluator for RAG systems. Evaluate faithfulness."
        user = f"""Question: {question}

Retrieved Contexts:
{context_text[:3000]}

Generated Answer:
{answer}

Evaluate the FAITHFULNESS of this answer on a scale of 0.0 to 1.0:
- 1.0: Every claim in the answer is directly supported by the contexts
- 0.7: Most claims are supported, minor unsupported details
- 0.4: Some claims supported, some not (mixed)
- 0.0: No claims supported, answer contradicts contexts or uses unsourced info

Rules:
- If contexts don't contain the information, score is 0.0
- If the answer copies from contexts but adds unsupported info, penalize proportionally

Return ONLY a number between 0.0 and 1.0, nothing else."""

        result = await self._call(system, user)
        try:
            score = float(result.strip())
            return max(0.0, min(1.0, score))
        except ValueError:
            return 0.5

    # ── Metric: Answer Relevancy ──────────────────────────────────────

    async def answer_relevancy(self, question: str, answer: str) -> float:
        """Score 0-1: How relevant is the answer to the question?"""
        if not answer:
            return 0.0

        system = "You are an expert evaluator for RAG systems. Evaluate answer relevancy."
        user = f"""Question: {question}

Generated Answer:
{answer[:2000]}

Rate the ANSWER RELEVANCY on a scale of 0.0 to 1.0:
- 1.0: Answer directly addresses the question with specific, correct information
- 0.7: Answer addresses the question but is generic or lacks specificity
- 0.4: Answer is partially relevant, addresses a different aspect
- 0.0: Answer is completely irrelevant or generic

Return ONLY a number between 0.0 and 1.0, nothing else."""

        result = await self._call(system, user)
        try:
            score = float(result.strip())
            return max(0.0, min(1.0, score))
        except ValueError:
            return 0.5

    # ── Metric: Context Precision ─────────────────────────────────────

    async def context_precision(self, question: str, contexts: List[str]) -> float:
        """Score 0-1: Are the retrieved contexts relevant to the question?"""
        if not contexts:
            return 0.0

        # Binary relevance per chunk, then compute precision@k
        relevant = 0
        for i, ctx in enumerate(contexts[:5]):
            system = "You are an expert evaluator. Answer only YES or NO."
            user = f"""Is the following context relevant to answering this question?

Question: {question}

Context: {ctx[:1500]}

Answer only YES or NO:"""

            result = await self._call(system, user)
            if result.strip().upper().startswith("YES"):
                relevant += 1

        return relevant / max(len(contexts[:5]), 1)

    # ── Metric: Context Recall ────────────────────────────────────────

    async def context_recall(self, question: str, ground_truth: str, contexts: List[str]) -> float:
        """Score 0-1: Is the ground truth covered by the retrieved contexts?"""
        if not ground_truth or not contexts:
            return 0.0

        context_text = "\n\n".join(contexts[:3])
        system = "You are an expert evaluator for RAG systems. Evaluate context recall."
        user = f"""Question: {question}

Ground Truth Answer:
{ground_truth[:1000]}

Retrieved Contexts:
{context_text[:3000]}

Rate the CONTEXT RECALL on a scale of 0.0 to 1.0:
- 1.0: All information needed to answer the question is present in the contexts
- 0.7: Most information is present, minor details missing
- 0.4: Some information present, significant gaps
- 0.0: Contexts completely lack the information needed

Return ONLY a number between 0.0 and 1.0, nothing else."""

        result = await self._call(system, user)
        try:
            score = float(result.strip())
            return max(0.0, min(1.0, score))
        except ValueError:
            return 0.5


async def evaluate_all():
    """Run all RAGAS metrics on the 50 evaluation queries."""
    print("=" * 70)
    print("  AaharAI NutriSync — Direct RAGAS Evaluation with Groq Judge")
    print("=" * 70)
    print()

    # Load evaluation results
    eval_path = Path(__file__).resolve().parent.parent / "evaluation_results.json"
    with open(eval_path) as f:
        eval_data = json.load(f)
    full_results = eval_data.get("full_results", [])
    print(f"[1/4] Loaded {len(full_results)} evaluation results")

    # Load NutriSyncBench for ground truth
    bench_path = Path(__file__).resolve().parent / "nutrisync_bench.json"
    bench_entries = []
    if bench_path.exists():
        with open(bench_path) as f:
            bench_data = json.load(f)
        bench_entries = bench_data.get("entries", [])
    print(f"[2/4] Loaded {len(bench_entries)} NutriSyncBench entries")

    # Initialize judge
    judge = GroqJudge()
    print(f"[3/4] Groq judge initialized: {judge.model}")

    # Process each result
    results = []
    print(f"\n[4/4] Running RAGAS evaluation on {len(full_results)} queries...")
    print(f"  {'ID':<8} {'Category':<22} {'Faith':<8} {'Relv':<8} {'CtxP':<8} {'CtxR':<8}")
    print(f"  {'-'*56}")

    for i, r in enumerate(full_results):
        qid = r.get("id", f"Q{i}")
        question = r.get("query", "")
        answer = r.get("answer_preview", "")
        contexts = r.get("chunks", [])
        ctx_texts = [c.get("text", "") for c in contexts] if contexts else [answer[:500], answer[:500]]

        # Find ground truth
        ground_truth = ""
        for be in bench_entries:
            bq = be["query"].lower().strip().rstrip("?.,")
            eq = question.lower().strip().rstrip("?.,")
            if eq == bq or eq.startswith(bq[:35]) or bq.startswith(eq[:35]):
                ground_truth = be["gold_answer"]
                break

        # Run metrics
        faith, relv, ctxp, ctxt = 0.0, 0.0, 0.0, 0.0
        try:
            faith, relv, ctxp = await asyncio.gather(
                judge.faithfulness(question, answer, ctx_texts),
                judge.answer_relevancy(question, answer),
                judge.context_precision(question, ctx_texts),
            )
            if ground_truth:
                ctxt = await judge.context_recall(question, ground_truth, ctx_texts)
        except Exception as e:
            print(f"  Error processing {qid}: {e}")

        results.append({
            "id": qid,
            "category": r.get("category", ""),
            "question": question[:80],
            "faithfulness": faith,
            "answer_relevancy": relv,
            "context_precision": ctxp,
            "context_recall": ctxt,
            "has_ground_truth": bool(ground_truth),
        })

        print(f"  {qid:<8} {r.get('category', '')[:20]:<22} {faith:<8.4f} {relv:<8.4f} {ctxp:<8.4f} {ctxt:<8.4f}")

        # Rate limit: 30 RPM on Groq free tier
        if (i + 1) % 25 == 0:
            print(f"  --- Rate limit pause ---")
            await asyncio.sleep(2)

    # Aggregate
    print(f"\n{'='*70}")
    print(f"  RAGAS EVALUATION RESULTS (Groq Judge)")
    print(f"{'='*70}")
    print(f"  Judge model: {judge.model}")
    print(f"  API calls: {judge._call_count}")
    print(f"  Total tokens: {judge._total_tokens}")
    print()

    agg = {}
    for metric in ["faithfulness", "answer_relevancy", "context_precision", "context_recall"]:
        vals = [r[metric] for r in results]
        agg[metric] = {
            "mean": round(statistics.mean(vals), 4),
            "median": round(statistics.median(vals), 4),
            "std": round(statistics.stdev(vals), 4) if len(vals) > 1 else 0,
            "min": round(min(vals), 4),
            "max": round(max(vals), 4),
        }

    print(f"  {'Metric':<25} {'Mean':<8} {'Median':<8} {'Std':<8} {'Min':<8} {'Max':<8}")
    print(f"  {'-'*60}")
    for metric, vals in agg.items():
        print(f"  {metric:<25} {vals['mean']:<8.4f} {vals['median']:<8.4f} {vals['std']:<8.4f} {vals['min']:<8.4f} {vals['max']:<8.4f}")
    print()

    # Per-category
    cats = {}
    for r in results:
        cat = r["category"]
        if cat not in cats:
            cats[cat] = {"faith": [], "relv": [], "ctxp": [], "ctxr": []}
        cats[cat]["faith"].append(r["faithfulness"])
        cats[cat]["relv"].append(r["answer_relevancy"])
        cats[cat]["ctxp"].append(r["context_precision"])
        cats[cat]["ctxr"].append(r["context_recall"])

    print(f"  --- Per-Category RAGAS Scores ---")
    print(f"  {'Category':<22} {'n':<4} {'Faith':<8} {'Relv':<8} {'CtxP':<8}")
    print(f"  {'-'*52}")
    for cat, v in sorted(cats.items()):
        print(f"  {cat[:20]:<22} {len(v['faith']):<4} "
              f"{statistics.mean(v['faith']):<8.4f} {statistics.mean(v['relv']):<8.4f} {statistics.mean(v['ctxp']):<8.4f}")

    # Save results
    output = {
        "aggregate": agg,
        "per_category_ragas": {
            cat: {
                "count": len(v["faith"]),
                "faithfulness_mean": round(statistics.mean(v["faith"]), 4),
                "answer_relevancy_mean": round(statistics.mean(v["relv"]), 4),
                "context_precision_mean": round(statistics.mean(v["ctxp"]), 4),
                "context_recall_mean": round(statistics.mean(v["ctxr"]), 4) if v["ctxr"] else None,
            }
            for cat, v in cats.items()
        },
        "per_query": results,
        "config": {
            "judge_model": judge.model,
            "judge_provider": "Groq",
            "n_queries": len(results),
            "metrics": ["faithfulness", "answer_relevancy", "context_precision", "context_recall"],
            "api_calls": judge._call_count,
            "total_tokens": judge._total_tokens,
        },
    }

    out_path = Path(__file__).resolve().parent.parent / "evaluation_ragas_results.json"
    with open(out_path, "w") as f:
        json.dump(output, f, indent=2)
    print(f"\n  Results saved to: {out_path}")

    await judge.close()


if __name__ == "__main__":
    asyncio.run(evaluate_all())
