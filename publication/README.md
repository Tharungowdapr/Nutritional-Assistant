# AaharAI NutriSync — Q2 Journal Publication Package

This folder contains all materials required for submitting AaharAI NutriSync
to Q2 venues such as **Applied Sciences (MDPI)** or **JMIR AI**.

## Contents

| Path | Description |
|------|-------------|
| `features.md` | Novelty highlights — what makes NutriSync publishable |
| `results-summary.md` | Complete evaluation results with statistical significance |
| `evaluation/` | Raw evaluation data (JSON, reports) |
| `benchmark/` | NutriSyncBench — ground truth QA dataset (200 entries, 8 categories, v2.0) |
| `figures/` | Charts and visualizations |

## Quick Links

- **Backend source**: `backend/` at repo root
- **Frontend source**: `frontend/` at repo root
- **Live demo**: https://frontend-azure-omega-45f4cqwbni.vercel.app
- **API docs**: https://nutritional-assistant-jg6k.onrender.com/docs
- **LLM**: Groq `llama-3.3-70b-versatile` (via `REDACTED`)

## Journal Target: Applied Sciences (MDPI) — Q2

**Why NutriSync fits:**
- First open-source Indian clinical nutrition RAG combining IFCT 2017 + ICMR-NIN 2024
- Reproducible pipeline with documented evaluation framework
- Novel hybrid retrieval architecture with cross-encoder reranking
- 8 clinical nutrition protocols (Diabetes, PCOS, GLP-1, Anaemia, CKD, NAFLD, Thyroid, IBD)
- 200-entry ground truth benchmark dataset (NutriSyncBench v2.0)
- Cross-encoder citation verifier upgrade and chunk size ablation study

## Final Publication Checklist (Current Status)

| Criterion | Status | 
|-----------|--------|
| RAGAS evaluation (Groq judge) | ✅ **Done** — Faithfulness 0.512, Relevancy 0.518 |
| Statistical significance (Wilcoxon, Cohen's d) | ✅ **Done** |
| MRR@5 / nDCG@5 | ✅ **Done** — 0.440 |
| Cross-encoder ablation | ✅ **Done** — 44% positive-first rate |
| Failure mode analysis | ✅ **Done** — 13 cases |
| Component-level latency tracking | ✅ **Done** |
| NutriSyncBench ground truth dataset | ✅ **Done** — 200 entries, 8 categories (v2.0) |
| ROUGE-L answer quality | ✅ **Done** — 0.165 |
| BERTScore (roberta-large) | ✅ **Done** — 0.022 (length divergence noted) |
| **Total Q2 criteria met** | **10/11 (~91%)** |

### Still Needed Before Submission

1. **Human expert evaluation** — Recruit 2+ dietitians to rate 100 responses on accuracy/safety (4-6 weeks)

### Recommended Next Steps
1. Submit NutriSyncBench as standalone dataset to HuggingFace Datasets
2. Target: **Applied Sciences (MDPI)** or **JMIR AI** for Q2 publication
