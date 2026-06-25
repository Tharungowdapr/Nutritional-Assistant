# AaharAI NutriSync — Novelty & Feature Highlights

## Why This Is Publishable (Q2)

### 1. First Indian-Specific Hybrid RAG for Clinical Nutrition

**No existing system combines IFCT 2017 + ICMR-NIN 2024 in a RAG pipeline.**

| Existing System | Indian Food Data | Clinical Protocols | Open Source |
|---------------|:---------------:|:-----------------:|:----------:|
| ChatGPT/GPT-4 | Training data only | ✗ | ✗ |
| HealthifyMe | Proprietary | Partial | ✗ |
| MyFitnessPal | Western DB | ✗ | ✗ |
| Nutrify India | Partial IFCT | ✗ | ✗ |
| **AaharAI NutriSync** | **IFCT 2017 + 12 Excel sheets** | **8 protocols** | **✓** |

**Evidence:**
- IFCT source citation rate: **44.0%** across 50 queries
- ICMR-NIN source citation rate: **42.0%** across 50 queries
- 847+ foods from IFCT 2017
- 12 curated Excel sheets covering RDA, diseases, regional food, GLP-1, medicine interactions

### 2. Three-Stage Hybrid Retrieval Architecture

```
User Query → BM25 Okapi (keyword) + ChromaDB Vector (semantic)
           → RRF Fusion → Cross-Encoder Reranker (ms-marco-MiniLM-L-6-v2)
```

**Novelty:** Most RAG papers use either BM25 OR vector search — NutriSync uses **both** with RRF fusion AND cross-encoder reranking.

**Results:**
- Hybrid significantly outperforms BM25-only: **+29.6%** (p=0.002, d=1.01)
- Hybrid matches vector-only performance: **+1.2%** (p=0.71, d=0.07, n.s.)
- Cross-encoder assigns positive scores to top chunk in **44%** of queries

### 3. Clinical Context-Aware Retrieval

NutriSync conditions retrieval on **user health profile**:

| Profile Dimension | Used For |
|-------------------|----------|
| Age / Gender / Life Stage | RDA targeting (pregnancy, lactation, elderly) |
| Diet Type (VEG/NON-VEG) | Source filtering (B12 for vegetarians) |
| Health Conditions | Protocol-specific chunk retrieval |
| GLP-1 Medication | Protein floor enforcement |
| Region | Regional food culture matching |

**Impact:**
- Disease-specific queries (diabetes, PCOS, GLP-1, anaemia, CKD, NAFLD, thyroid, IBD)
  retrieve **protocol-specific chunks** from the 12-sheet knowledge base.
- **8 clinical protocols** implemented and retrievable.

### 4. Multi-Agent Orchestration with Parallel Execution

```
Intent Classification ←→ RAG Retrieval → Reranking → Citation Verification → LLM Generation
        (async gather)          (async gather)        (synchronous stages)
```

**Novelty:** Intent classification and retrieval run concurrently via `asyncio.gather` — ~~30% faster than sequential pipeline.

### 5. Citation Verification as Grounding Guard

Lightweight keyword-overlap verifier applied to every LLM response:

| Status | Rate | Action |
|--------|:----:|--------|
| VERIFIED | 86% | Response grounded in retrieved chunks |
| HALUCINATION_RISK | 8% | LLM likely generated from parametric knowledge |
| UNVERIFIED_CLAIMS | 6% | Partial grounding — needs improvement |

**Caveat:** Current verifier uses keyword overlap, not NLI. Improvement planned.

### 6. NutriSyncBench — Ground Truth Dataset

| Metric | Value |
|--------|-------|
| Total QA pairs | **100** |
| Categories | **8** (Food Composition, Clinical Nutrition, RDA Guidelines, Regional Nutrition, Food Substitution, Gap Analysis, Medicine-Nutrition, Supplement Guidance) |
| Difficulty levels | Easy / Medium / Hard |
| Sources | IFCT 2017, ICMR-NIN 2024 RDA |
| Verification | All 100 entries verified against authoritative sources |

This is itself a **separate dataset contribution** publishable on HuggingFace Datasets.

### 7. Performance (Groq-Powered)

| Metric | Value |
|--------|-------|
| Median response time | **307ms** |
| Mean response time | **544ms** |
| P95 response time | **2,355ms** |
| LLM Provider | Groq `llama-3.3-70b-versatile` |
| Embeddings | all-MiniLM-L6-v2 (ChromaDB ONNX default) |

### 8. Reproducible & Open Source

```bash
git clone https://github.com/mindfrixion/nutritional-assistant
pip install -r requirements.txt
# Set GROQ_API_KEY
python scripts/evaluation.py    # Full 50-query evaluation
python scripts/evaluation_v2.py # Enhanced with stats + failure analysis
```

- Full evaluation pipeline in `scripts/`
- Component-level timing via `app/services/rag/timing.py`
- Docker-ready with pre-seeded ChromaDB vector store
- CI pipeline (black, flake8) passing

---

## Comparison: What Makes This Q2-Worthy

| Criterion | NutriSync | Typical Q2 Paper |
|-----------|-----------|-----------------|
| Novel dataset (IFCT+ICMR) | ✓ | Required |
| Novel system architecture | ✓ (Hybrid RAG) | Preferred |
| Quantitative evaluation | ✓ (50 queries) | Bar is ~200+ |
| Statistical significance | ✓ (Wilcoxon, Cohen's d) | Required |
| Ground truth dataset | ✓ (100 pairs) | Preferred |
| Ablation study | ✓ (3 retrieval modes) | Required |
| Failure analysis | ✓ (13 cases) | Preferred |
| Open source code | ✓ | Preferred |
| Human expert eval | ✗ | Required for clinical AI |
| Clinical validation | ✗ | Required for Q1 |

**Realistic path:** Submit to **Applied Sciences (MDPI)** or **JMIR AI** with:
1. These features as the core contribution
2. Add human evaluation as future work
3. Frame NutriSyncBench as separate dataset paper
