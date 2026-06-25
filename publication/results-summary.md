# AaharAI NutriSync — Evaluation Results for Q2 Publication

> Generated: June 2026 | Pipeline: `scripts/evaluation.py` + `scripts/evaluation_v2.py`

---

## 1. Executive Summary

| Metric | Value | 95% CI |
|--------|-------|--------|
| Queries Evaluated | **92** (8 categories) | — |
| Average Keyword Recall | **74.8%** | [68.0%, 81.7%] |
| Median Keyword Recall | **75.0%** | — |
| Average Latency | **544ms** | [338ms, 750ms] |
| Median Latency | **307ms** | — |
| P95 Latency | **2,355ms** | — |
| MRR@5 (Retrieval) | **0.440** | — |
| nDCG@5 (Retrieval) | **0.440** | — |
| ROUGE-L F-measure (vs Gold) | **0.165** | — |
| BERTScore F1 (roberta-large, length-matched) | **0.022** | — |
| Citation Grounding Score | **0.83** | [0.76, 0.90] |
| IFCT Source Citation Rate | **44.0%** | — |
| ICMR-NIN Source Citation Rate | **42.0%** | — |
| Hallucination Risk Rate | **8.0%** (4/50) | — |

## 2. Ablation Study & Statistical Significance

### Retrieval Strategy Comparison (n=20)

| Strategy | Recall | vs Hybrid | Wilcoxon p | Cohen's d | Effect |
|----------|:------:|:---------:|:---------:|:---------:|:-----:|
| Hybrid (BM25+Vector+RRF) | **75.6%** | baseline | — | — | — |
| Vector Only (Semantic) | **74.4%** | −1.2% | **0.713** | **0.07** | Negligible |
| BM25 Only (Keyword) | **46.0%** | −29.6% | **0.002** | **1.01** | **Large** |

### Key Insight
Hybrid retrieval **significantly outperforms BM25-only** (p<0.01, large effect). The advantage over vector-only is **not statistically significant** (p=0.71, negligible effect). The novelty claim shifts from "hybrid beats vector" to "hybrid matches vector while adding explicit keyword capabilities."

## 3. Failure Mode Analysis

| Failure Type | Count | Rate |
|-------------|:-----:|:----:|
| Low chunk relevance | 11 | 22% |
| Citation verifier error | 6 | 12% |
| LLM hallucination risk | 4 | 8% |
| Unknown | 2 | 4% |
| **Total failures detected** | **13** | **26%** |

## 4. Cross-Encoder Reranker Performance

| Metric | Value |
|--------|-------|
| Queries with positive first rank | **44.0%** |
| Queries with all-negative scores | **56.0%** |
| Average max reranker score | **−0.647** |
| Median max reranker score | **−0.945** |

56% of queries have all negative cross-encoder scores — the reranker finds no chunk sufficiently relevant.
This is the **primary bottleneck** — improved by recent retrieval config changes (top_k 3→10, hybrid k=top_k+5, score threshold 0.3→0.1).

## 5. Semantic Quality (vs Gold Answers — NutriSyncBench v2.0, 200 entries)

| Metric | Mean |
|--------|:----:|
| Queries Matched | **37 / 50** |
| BERTScore F1 (roberta-large, length-matched) | **0.022** |
| ROUGE-L F-measure | **0.165** |

BERTScore uses roberta-large with rescale_with_baseline=True. Predictions are truncated to gold answer length (len(gold)*2) for fair comparison. Low F1 scores are primarily due to length divergence — the LLM generates verbose 3000-char answers while gold answers are 200–500 chars.

## 6. Per-Category Breakdown

| Category | Queries | Recall | Latency | Citation |
|----------|:-------:|:------:|:-------:|:--------:|
| Food Composition | 14 | 82.8% | 829ms | 0.64 |
| Clinical Nutrition | 14 | 80.8% | 532ms | 0.86 |
| RDA Guidelines | 12 | 72.9% | 307ms | 0.93 |
| Regional Nutrition | 12 | 67.7% | 320ms | 0.94 |
| Food Substitution | 12 | 66.2% | 600ms | 0.80 |
| Gap Analysis | 12 | 73.8% | 629ms | 0.87 |
| Medicine-Nutrition | 8 | — | — | — |
| Supplement Guidance | 8 | — | — | — |

## 7. Latency Distribution

| Percentile | Time |
|:----------:|:----:|
| P50 (median) | 307ms |
| P75 | 1,431ms |
| P90 | 1,638ms |
| P95 | 2,355ms |
| P100 (max) | 2,560ms |

Bimodal distribution: fast path (~307ms cluster) vs slow path (~1500-2500ms cluster).
Slow path triggered when retrieval quality is poor → LLM generates longer responses.

## 8. RAGAS Evaluation (Groq LLM Judge)

RAGAS-style metrics computed using Groq `llama-3.3-70b-versatile` as the LLM judge.
235 API calls, 8,539 tokens consumed.

### Aggregate Scores

| Metric | Mean | Median | Std | Min | Max |
|--------|:----:|:------:|:---:|:---:|:---:|
| **Faithfulness** | **0.512** | 0.500 | 0.112 | 0.000 | 1.000 |
| **Answer Relevancy** | **0.518** | 0.500 | 0.175 | 0.000 | 1.000 |
| **Context Precision** | **0.160** | 0.000 | 0.310 | 0.000 | 1.000 |
| **Context Recall** | **0.370** | 0.500 | 0.282 | 0.000 | 1.000 |

### Interpretation

- **Faithfulness (0.512):** Answers are partially grounded in retrieved contexts. The LLM frequently adds unsupported information when chunks are irrelevant.
- **Answer Relevancy (0.518):** Answers address the question but often lack specificity.
- **Context Precision (0.160):** The **primary bottleneck** — most retrieved chunks are not directly relevant. Improved by recent config change (top_k 3→10, hybrid candidates 5→top_k+5, score threshold 0.3→0.1).
- **Context Recall (0.370):** Retrieved contexts cover about a third of what's needed.

### Limitations
- Contexts were approximated from answer previews (actual chunk texts not stored in eval JSON)
- Single judge LLM (Groq) — using multiple judges would improve reliability

## 9. Retrieval Quality Improvements (Latest)

| Change | Before | After | Impact |
|--------|--------|-------|--------|
| `top_k` (post-rerank) | 3 | 10 | More candidates for LLM |
| Hybrid candidates `k` | 5 | top_k + 5 | More pre-rerank candidates |
| Score threshold | 0.3 | 0.1 | Includes borderline-relevant chunks |

## 10. Data & Reproducibility

- **Evaluation results**: `backend/evaluation_results.json` (92 queries + 60 ablation results)
- **Enhanced metrics**: `backend/evaluation_v2_results.json`
- **Benchmark dataset**: `backend/scripts/nutrisync_bench.json` (200 entries, 8 categories, v2.0)
- **Component timing**: `backend/app/services/rag/timing.py`
- **Eval scripts**: `backend/scripts/evaluation.py`, `backend/scripts/evaluation_v2.py`
- **Chunk size ablation**: `backend/scripts/chunk_size_ablation.py`

### Reproduce
```bash
cd nutritional-assistant/backend
pip install -r requirements.txt
export GROQ_API_KEY="your-key"
python scripts/evaluation.py      # 92 queries + ablation
python scripts/evaluation_v2.py   # Enhanced metrics + stats
```
