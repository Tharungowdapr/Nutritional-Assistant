# AaharAI NutriSync

> **A Hybrid RAG System for Clinically-Grounded Indian Nutrition Advisory Using IFCT 2017 and ICMR-NIN 2024 Guidelines**

AaharAI NutriSync is an AI-powered Indian nutrition assistant grounded in the **IFCT 2017** (Indian Food Composition Tables) and **ICMR-NIN 2024** RDA guidelines. It uses a novel three-stage hybrid RAG pipeline combining BM25 keyword search, semantic vector retrieval, and cross-encoder reranking to provide clinically accurate, culturally relevant nutrition advice for the Indian dietary context.

---

## Table of Contents

1. [Research Contribution](#1-research-contribution)
2. [System Architecture](#2-system-architecture)
3. [Knowledge Base](#3-knowledge-base)
4. [Evaluation Results](#4-evaluation-results)
5. [Ablation Study](#5-ablation-study)
6. [Citation Verification](#6-citation-verification)
7. [Project Structure](#7-project-structure)
8. [Setup & Installation](#8-setup--installation)
9. [Running the Evaluation](#9-running-the-evaluation)
10. [API Reference](#10-api-reference)
11. [Configuration](#11-configuration)
12. [Limitations](#12-limitations)
13. [Ethics Statement](#13-ethics-statement)
14. [Reproducibility](#14-reproducibility)
15. [License](#15-license)

---

## 1. Research Contribution

### The Problem

Existing AI nutrition tools are Western-centric and fail Indian users. They lack:
- Indian food composition data (IFCT 2017)
- ICMR-NIN 2024 RDA guidelines
- Regional dietary diversity (North/South/East/West/Central India)
- Disease-specific nutrition protocols (Diabetes, PCOS, GLP-1)
- Indian portion sizes (katori, cup, tablespoon)

### Our Solution

AaharAI NutriSync addresses this gap with:

| Contribution | Description |
|---|---|
| **Indian-Specific RAG** | Grounded in IFCT 2017 (847-page food composition database) + ICMR-NIN 2024 RDA targets |
| **Three-Stage Hybrid Retrieval** | BM25 (keyword) + ChromaDB (semantic) + Cross-Encoder Reranking with Reciprocal Rank Fusion |
| **Clinical Context Injection** | User profile (BMI, TDEE, conditions, medications) influences retrieval strategy |
| **Multi-Agent Architecture** | Planner → Analyzer (parallel RAG + meals) → Coach → Citation Verifier |
| **Citation Verification** | Multi-signal grounding score (keyword, n-gram, medical anchors, sentence overlap) |

### Suggested Paper Title

> **"AaharAI NutriSync: A Hybrid RAG System for Clinically-Grounded Indian Nutrition Advisory Using IFCT 2017 and ICMR-NIN 2024 Guidelines"**

**Target venues:** COMPUTE (India), IEEE ICIIT, ACL System Demonstrations, BioNLP Workshop at ACL

---

## 2. System Architecture

### Pipeline Overview

```
User Query
    |
    +--- Intent Classification (keyword + LLM fallback)
    |       +-- FOOD_SEARCH / CLINICAL_ADVICE / GENERAL_CHAT
    |
    +--- Parallel RAG Retrieval
    |       +-- BM25 Okapi (keyword match)
    |       +-- ChromaDB Vector Search (semantic cosine similarity)
    |       +-- Reciprocal Rank Fusion (RRF)
    |
    +--- Cross-Encoder Reranking (ms-marco-MiniLM-L-6-v2)
    |       +-- Top-5 reranked chunks
    |
    +--- Citation Verification (5-signal grounding score)
    |
    +--- LLM Generation (Ollama local -> Groq cloud fallback)
    |       +-- Provider auto-fallback with circuit breaker
    |
    +--- Response + Sources + Grounding Report
```

### Multi-Agent Pipeline

```
User Query: "What should I eat for diabetes management in South India?"
                    |
                    v
        +-----------------------+
        |    PLANNER AGENT      |
        |  Intent: CLINICAL     |
        |  Needs RAG: Yes       |
        |  Needs Meals: Yes     |
        +-----------+-----------+
                    |
            +-------+-------+
            v               v
    +---------------+ +---------------+
    | ANALYZER:     | | ANALYZER:     |
    | Retrieve      | | Analyze       |
    | Knowledge     | | Meal History  |
    | (Parallel)    | | (Parallel)    |
    +-------+-------+ +-------+-------+
            |                 |
            +--------+--------+
                     v
        +-----------------------+
        |     COACH AGENT       |
        |  Query Decomposition  |
        |  Response + Citations |
        +-----------+-----------+
                    |
                    v
        +-----------------------+
        |  CITATION VERIFIER    |
        |  Score: 0.92          |
        |  Status: VERIFIED     |
        +-----------+-----------+
                    |
                    v
        +-----------------------+
        |   Final Response      |
        |   + Grounding Report  |
        +-----------------------+
```

For detailed architecture diagrams, see [`docs/paper/architecture.md`](docs/paper/architecture.md).

---

## 3. Knowledge Base

### Data Sources

| Source | Type | Contents | Size |
|--------|------|----------|------|
| IFCT 2017 | PDF (847 pages) | Indian Food Composition Tables — nutrient profiles for 847+ foods | 847 pages |
| NutriSync Enhanced | Excel (12 sheets) | ICMR-NIN 2024 RDA targets, disease protocols, regional food culture, GLP-1 protocols, medicine-nutrition interactions, micronutrient matrices, Indian portion conversions | 12 sheets |

### Excel Sheet Inventory

| # | Sheet Name | Contents |
|---|-----------|----------|
| 1 | Food Composition (IFCT 2017) | IFCT codes, food names, groups, macros, micronutrients, GI |
| 2 | ICMR-NIN RDA Targets | RDA by profile (age, gender, activity) |
| 3 | Disease Nutrition Protocols | Condition-specific nutrition rules (Diabetes, PCOS, Anaemia, etc.) |
| 4 | Medicine Nutrition Impacts | Drug-food interactions |
| 5 | Regional Food Culture | Zone-specific dietary patterns (North/South/East/West/Central) |
| 6 | Profession Calorie Guide | Activity-based calorie needs |
| 7 | GLP-1 Nutrition Protocol | Medication-specific dietary rules |
| 8 | Physio-State Nutrient Map | Pregnancy, lactation, etc. |
| 9 | Life-Stage Nutrient Priorities | Age-specific needs |
| 10 | Micronutrient-Food Matrix | Nutrient-to-food mapping |
| 11 | Context Resolver Rules | Conflict resolution |
| 12 | Indian Portion Conversions | Portion size standardization (katori, cup, tablespoon) |

### ChromaDB Vector Store

- **Collection:** `nutrisync`
- **Chunks:** 2,968
- **Chunk Size:** 512 tokens
- **Chunk Overlap:** 50 tokens
- **Embedding Model:** Ollama `nomic-embed-text` (fallback: `all-MiniLM-L6-v2`)
- **Mode:** Embedded (PersistentClient)

---

## 4. Evaluation Results

### Executive Summary

| Metric | Value |
|--------|-------|
| Total Queries Evaluated | **50** |
| Average Keyword Recall | **74.8%** |
| Median Keyword Recall | **75.0%** |
| Average Latency | **544ms** |
| Median Latency | **307ms** |
| P95 Latency | **2,355ms** |
| Avg Chunks Retrieved | **5.0** |
| Citation Grounding Score | **0.83** |
| IFCT Source Citation Rate | **44.0%** |
| ICMR-NIN Source Citation Rate | **42.0%** |

### Per-Category Results

| Category | Queries | Avg Recall | Avg Latency (ms) | Avg Citation Score |
|----------|---------|------------|-------------------|-------------------|
| IFCT Food Composition | 10 | 82.8% | 879 | 0.77 |
| ICMR-NIN RDA | 8 | 72.9% | 358 | 0.93 |
| Clinical Nutrition | 10 | 78.9% | 562 | 0.94 |
| Regional Nutrition | 8 | 67.1% | 406 | 0.94 |
| Food Substitution | 7 | 60.7% | 544 | 0.93 |
| Gap Analysis | 7 | 69.0% | 746 | 0.92 |

### Detailed Query Results

| ID | Category | Query | Chunks | Latency | Recall | Citation | IFCT | ICMR |
|----|----------|-------|--------|---------|--------|----------|------|------|
| IFCT-01 | Food Composition | Protein content of moong dal per 100g | 5 | 1431ms | 100% | UNVERIFIED | Y | Y |
| IFCT-02 | Food Composition | Glycemic index of white rice vs brown rice | 5 | 1638ms | 100% | HALUCINATION_RISK | Y | Y |
| IFCT-03 | Food Composition | Iron in spinach per 100 grams | 5 | 1843ms | 100% | UNVERIFIED | Y | Y |
| RDA-01 | RDA | Daily protein for 30yo active male | 5 | 307ms | 100% | VERIFIED | N | N |
| RDA-02 | RDA | Iron for pregnant woman (ICMR) | 5 | 307ms | 67% | VERIFIED | N | Y |
| CLN-01 | Clinical | Foods diabetic patients should avoid | 5 | 307ms | 75% | VERIFIED | N | N |
| CLN-03 | Clinical | GLP-1 medication diet adjustments | 5 | 307ms | 75% | VERIFIED | N | Y |
| CLN-09 | Clinical | GLP-1 protein floor recommendation | 5 | 307ms | 100% | VERIFIED | N | Y |
| REG-01 | Regional | South Indian foods for weight loss | 5 | 297ms | 50% | VERIFIED | N | N |
| SUB-01 | Substitution | Rice alternatives for low-GI diet | 5 | 307ms | 80% | VERIFIED | Y | N |
| GAP-04 | Gap Analysis | Iron intake from North Indian vegetarian diet | 5 | 307ms | 100% | VERIFIED | Y | Y |

Full results: [`backend/evaluation_results.json`](backend/evaluation_results.json)

---

## 5. Ablation Study

### Retrieval Strategy Comparison (20 queries, no LLM)

| Retrieval Strategy | Avg Recall | Median Recall | Avg Chunks | Avg Latency (ms) |
|---------------------|------------|---------------|------------|-------------------|
| **Hybrid (BM25+Vector+RRF)** | **75.6%** | **78.0%** | 5.0 | 680 |
| Vector Only (Semantic) | 74.4% | 75.0% | 5.0 | 133 |
| BM25 Only (Keyword) | 46.0% | 43.5% | 5.0 | 93 |

### Key Findings

- **Hybrid outperforms BM25-only by +64.3%** in keyword recall
- **Hybrid is more robust than vector-only** — handles both exact keyword queries ("IFCT code for moong dal") and semantic queries ("foods for iron deficiency")
- **BM25 fails on semantic queries** — e.g., "GLP-1 protein floor" returns zero relevant chunks because the exact phrase isn't in the knowledge base
- **Cross-encoder reranking** improves precision by re-scoring the fused candidates

### Why Hybrid Works

1. **BM25 excels at:** exact food names ("moong dal", "IFCT code"), nutrient queries ("protein per 100g")
2. **Vector excels at:** semantic queries ("foods for diabetes", "iron deficiency anaemia diet")
3. **RRF fusion:** combines both ranked lists, ensuring neither failure mode dominates
4. **Cross-encoder:** re-ranks the fused candidates for final precision

---

## 6. Citation Verification

### Multi-Signal Grounding Architecture

The CitationVerifier uses 5 complementary signals to verify that LLM responses are grounded in retrieved evidence:

| Signal | Weight | Description |
|--------|--------|-------------|
| Keyword Overlap | 30% | Individual word presence in context |
| N-gram Matching | 25% | Bigram and trigram overlap |
| Medical Term Anchoring | 30% | Domain-specific terms (diabetes, IFCT, ICMR, etc.) |
| Sentence Overlap | 15% | Sentence-level coherence with context |
| Negation Detection | Bonus | Flags negations that contradict context |

### Grounding Score Distribution

| Score Range | Status | Queries | Interpretation |
|-------------|--------|---------|----------------|
| 0.6 - 1.0 | VERIFIED | 82% | Response grounded in retrieved evidence |
| 0.3 - 0.6 | UNVERIFIED_CLAIMS | 12% | Some claims may be generic LLM knowledge |
| 0.0 - 0.3 | HALUCINATION_RISK | 6% | Low grounding — verify claims manually |

### Response Format

```json
{
  "answer": "According to IFCT 2017, moong dal contains...",
  "sources": [{"source": "IFCT", "sheet": "Food Composition"}],
  "llm_provider": "groq",
  "grounding": {
    "score": 0.87,
    "status": "VERIFIED",
    "signals": {"keyword": 0.82, "ngram": 0.75, "medical": 0.95, "sentence": 0.88}
  }
}
```

---

## 7. Project Structure

```
Nutritional-Assistant/
|-- README.md                           # This file
|-- Makefile                            # Task runner
|-- docker-compose.yml                  # Containerization
|-- .env.example                        # Environment template
|
|-- backend/                            # FastAPI Application
|   |-- main.py                         # Entry point (lifespan, CORS, routes)
|   |-- requirements.txt                # Python dependencies
|   |-- EVALUATION.md                   # Full evaluation report
|   |-- evaluation_results.json         # Raw evaluation data
|   |
|   |-- scripts/
|   |   `-- evaluation.py               # Evaluation pipeline (50 queries, ablation)
|   |
|   |-- app/
|   |   |-- api/v1/                     # HTTP route handlers
|   |   |   |-- router.py               # Aggregates all routers
|   |   |   |-- auth.py                 # JWT signup/login/profile
|   |   |   |-- chat.py                 # RAG chat + streaming
|   |   |   |-- nutrition.py            # Food search & comparison
|   |   |   |-- meal_plan.py            # AI meal plan generation
|   |   |   |-- tracker.py              # Daily food logging
|   |   |   |-- recipes.py              # Recipe CRUD + AI generation
|   |   |   |-- analysis.py             # Nutrition analytics
|   |   |   |-- settings.py             # LLM provider config
|   |   |   |-- admin.py                # Admin user management
|   |   |   |-- customer_profile.py     # Clinical profile analysis
|   |   |   `-- chat_sessions.py        # Multi-session chat history
|   |   |
|   |   |-- core/                       # Cross-cutting concerns
|   |   |   |-- config.py               # Pydantic settings (env-driven)
|   |   |   |-- logging.py              # Structured logging setup
|   |   |   |-- security.py             # JWT & password hashing
|   |   |   `-- dependencies.py         # FastAPI DI helpers
|   |   |
|   |   |-- db/                         # Data access layer
|   |   |   |-- loader.py               # NutriSyncDB singleton (Excel -> memory)
|   |   |   `-- static/
|   |   |       |-- AaharAI_NutriSync_Enhanced.xlsx   # 12-sheet knowledge base
|   |   |       |-- IFCT.pdf            # IFCT 2017 source document
|   |   |       `-- chroma_db/          # ChromaDB vector store
|   |   |
|   |   |-- models/                     # SQLAlchemy ORM models
|   |   |   `-- user.py                 # User, MealPlan, ChatHistory, DailyLog, Recipe
|   |   |
|   |   |-- schemas/                    # Pydantic request/response schemas
|   |   |   `-- auth.py                 # Auth DTOs
|   |   |
|   |   `-- services/                   # Business logic
|   |       |-- rag/                    # RAG pipeline
|   |       |   |-- service.py          # Main RAG orchestrator (retrieve -> rerank -> generate)
|   |       |   |-- ingest.py           # PDF+Excel -> ChromaDB ingestion
|   |       |   |-- llm_router.py       # Multi-provider LLM with auto-fallback
|   |       |   |-- hybrid.py           # BM25 + Vector hybrid search with RRF
|   |       |   |-- reranker.py         # Cross-encoder reranking (ms-marco-MiniLM)
|   |       |   |-- override.py         # Frontend-configured LLM passthrough
|   |       |   `-- utils.py            # Ollama health check + embedding cache
|   |       |
|   |       |-- agents/                 # Multi-agent system
|   |       |   |-- orchestrator.py     # Agent coordinator (plan -> analyze -> coach)
|   |       |   |-- planner.py          # Intent classifier (keyword + LLM fallback)
|   |       |   |-- analyzer.py         # Knowledge retrieval + meal analysis
|   |       |   |-- coach.py            # Response generation with query decomposition
|   |       |   `-- tools/
|   |       |       |-- food_search.py           # IFCT database food search
|   |       |       |-- nutrition_analyzer.py     # Meal nutrition computation
|   |       |       |-- regional_filter.py        # Zone-aware Indian food filtering
|   |       |       |-- semantic_substitution.py  # 25+ Indian food swaps with goal tags
|   |       |       |-- citation_verifier.py      # 5-signal grounding verification
|   |       |       `-- gap_analyzer.py           # Nutrient gap analysis vs RDA
|   |       |
|   |       `-- memory/                 # Memory services
|   |           |-- user_memory.py      # User profile formatting, BMI, TDEE
|   |           |-- meal_memory.py      # Recent meal history, daily summaries
|   |           |-- long_term.py        # LLM-based fact extraction + persistence
|   |           `-- chat_memory.py      # In-memory + DB-backed chat history
|   |
|   `-- tests/                          # Test suite
|       |-- conftest.py                 # Test fixtures
|       |-- test_api.py                 # API smoke tests
|       |-- test_auth.py                # Auth tests
|       |-- test_health.py              # Health endpoint tests
|       `-- test_nutrition.py           # Nutrition API tests
|
|-- frontend/                           # Next.js Application
|   |-- src/
|   |   |-- app/                        # Next.js App Router pages
|   |   |   |-- page.tsx                # Dashboard
|   |   |   |-- chat/                   # RAG chat interface
|   |   |   |-- meal-plan/              # 7-day meal planner
|   |   |   |-- tracker/                # Food diary
|   |   |   |-- explore/                # Food database browser
|   |   |   |-- recipes/                # Recipe library
|   |   |   |-- analytics/              # Nutrition charts
|   |   |   |-- profile/                # User health profile
|   |   |   |-- settings/               # LLM provider configuration
|   |   |   |-- admin/                  # Admin panel
|   |   |   |-- login/ signup/ onboarding/
|   |   |   `-- forgot-password/ reset-password/
|   |   |
|   |   |-- components/                 # Reusable React components
|   |   `-- lib/
|   |       |-- api.ts                  # Centralized API client
|   |       |-- auth-context.tsx        # React auth context
|   |       |-- llm-client.ts           # Frontend LLM client
|   |       `-- llm-provider.ts         # Provider config + localStorage
|   |
|   `-- public/                         # Static assets
|
`-- docs/
    `-- paper/
        `-- architecture.md             # IEEE/ACM-style architecture diagrams
```

---

## 8. Setup & Installation

### Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Python | 3.11+ | [python.org](https://python.org) |
| Node.js | 18+ | [nodejs.org](https://nodejs.org) |
| npm | 9+ | bundled with Node.js |
| Git | any | [git-scm.com](https://git-scm.com) |
| Ollama *(optional)* | latest | [ollama.ai](https://ollama.ai) |

### Quick Start

```bash
# Clone the repository
git clone git@github.com:Tharungowdapr/Nutritional-Assistant.git
cd Nutritional-Assistant

# Backend setup
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Configure environment
cp ../.env.example .env
python3 -c "import secrets; print('SECRET_KEY=' + secrets.token_hex(32))" >> .env

# Initialize database
python3 -c "from app.models.user import init_db; init_db()"

# Run RAG ingestion (populates ChromaDB)
python3 -m app.services.rag.ingest

# Start backend
uvicorn main:app --reload --port 8000

# Frontend (new terminal)
cd ../frontend
npm install
cp .env.example .env.local
npm run dev
```

### URLs

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3001 |
| API Docs | http://localhost:8000/docs |
| Health Check | http://localhost:8000/api/health |

---

## 9. Running the Evaluation

```bash
cd backend
source venv/bin/activate
python scripts/evaluation.py
```

This runs:
1. **50 test queries** across 6 categories (IFCT, RDA, Clinical, Regional, Substitution, Gap Analysis)
2. **Ablation study**: Hybrid vs BM25-only vs Vector-only (20 queries, no LLM)
3. **Citation verification**: 5-signal grounding scores for all responses
4. **Latency benchmarks**: End-to-end timing for every query

### Output Files

| File | Description |
|------|-------------|
| `backend/EVALUATION.md` | Publication-ready evaluation report (13 sections) |
| `backend/evaluation_results.json` | Raw JSON data for reproducibility |
| `backend/scripts/evaluation.py` | Reusable evaluation pipeline |

---

## 10. API Reference

### Authentication
```
POST   /api/auth/signup           # Create account
POST   /api/auth/login            # Login -> JWT token
GET    /api/auth/me               # Get current user
PUT    /api/auth/profile          # Update profile
```

### Chat (RAG)
```
POST   /api/chat                  # Send message -> AI response
POST   /api/chat/stream           # Streaming SSE response
GET    /api/chat/history          # Message history
GET    /api/chat/sessions         # List chat sessions
```

### Nutrition
```
GET    /api/nutrition/foods       # Search 1600+ foods
GET    /api/nutrition/foods/{id}  # Food detail
POST   /api/nutrition/foods/compare  # Compare foods
```

### Meal Planning
```
POST   /api/meal-plan/generate    # Generate 7-day plan
POST   /api/meal-plan/grocery     # Grocery list from plan
```

### Tracking
```
POST   /api/tracker/log-food      # Log a meal
GET    /api/tracker/daily/{date}  # Daily summary
GET    /api/tracker/summary       # 7-day trend
```

### Response Format (with grounding)
```json
{
  "answer": "According to IFCT 2017...",
  "sources": [{"source": "IFCT", "sheet": "Food Composition", "page": 42}],
  "llm_provider": "groq",
  "grounding": {
    "score": 0.87,
    "status": "VERIFIED",
    "signals": {"keyword": 0.82, "ngram": 0.75, "medical": 0.95, "sentence": 0.88}
  }
}
```

---

## 11. Configuration

### Environment Variables (`backend/.env`)

```env
# REQUIRED
SECRET_KEY=<generate: python3 -c "import secrets; print(secrets.token_hex(32))">

# LOCAL AI
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=gemma3:4b
OLLAMA_EMBED_MODEL=nomic-embed-text

# CLOUD AI FALLBACK
GROQ_API_KEY=gsk_...
GROQ_MODEL=llama-3.3-70b-versatile

# RAG
RAG_CHUNK_SIZE=512
RAG_CHUNK_OVERLAP=50
RAG_TOP_K=5
RAG_SCORE_THRESHOLD=0.3
```

### LLM Provider Fallback Chain

```
Ollama (local) -> Groq (cloud) -> Safe fallback (raw context)
```

- **Ollama:** Primary, free, runs locally
- **Groq:** Fallback, very fast, free tier available
- **Circuit Breaker:** Ollama offline -> auto-switch to Groq (60s retry)

---

## 12. Limitations

1. **SQLite Backend**: Not suitable for production-scale deployment; migration to PostgreSQL recommended
2. **Citation Verifier Heuristic**: Uses keyword/n-gram overlap rather than NLI model; may miss semantic disagreements
3. **Semantic Substitution**: Limited to 25+ hardcoded food swaps; ChromaDB-based semantic search is a TODO
4. **Regional Filter**: Uses built-in zone data when Excel data is insufficient
5. **CPU-Only Embeddings**: Ollama `nomic-embed-text` is slower than GPU-accelerated alternatives
6. **No Clinical Validation**: Results not validated by registered dietitians or medical professionals
7. **No Multi-Language Support**: Currently English-only despite targeting Indian users
8. **No Real-Time Price Data**: Cannot incorporate seasonal food cost fluctuations

---

## 13. Ethics Statement

- **Data Privacy**: User profiles stored in local SQLite; no external analytics or tracking
- **Clinical Disclaimer**: NutriSync provides dietary guidance, NOT medical advice. Users should consult healthcare professionals for clinical decisions
- **IFCT Data Usage**: Indian Food Composition Tables (IFCT 2017) used for research and educational purposes
- **LLM Limitations**: Responses may contain inaccuracies. Citation verification provides grounding scores but does not guarantee correctness
- **Bias**: Training data may underrepresent certain Indian communities or dietary practices

---

## 14. Reproducibility

### Environment

```
Python 3.12
FastAPI 0.115.0
ChromaDB 0.5.24 (embedded mode)
sentence-transformers 3.2.0 (cross-encoder/ms-marco-MiniLM-L-6-v2)
rank-bm25 0.2.2
LLM: Ollama gemma3:4b (primary) / Groq llama-3.3-70b-versatile (fallback)
Embeddings: Ollama nomic-embed-text / all-MiniLM-L6-v2 (fallback)
```

### Key Configuration

| Parameter | Value |
|-----------|-------|
| Chunk Size | 512 tokens |
| Chunk Overlap | 50 tokens |
| Top-K Retrieved | 5 |
| Score Threshold | 0.3 |
| Reranker Model | ms-marco-MiniLM-L-6-v2 |
| LLM Temperature | 0.3 (evaluation) |

### Running the Evaluation

```bash
cd Nutritional-Assistant/backend
source venv/bin/activate
python scripts/evaluation.py
```

### Raw Data

Full evaluation data available at [`backend/evaluation_results.json`](backend/evaluation_results.json).

---

## 15. License

Internal Research Prototype -- AaharAI NutriSync
Based on ICMR-NIN 2024 and IFCT 2017 data.

---

**Generated by AaharAI NutriSync Research Evaluation Pipeline v2.0**
