# 🥗 AaharAI NutriSync

> **AI-powered Indian Nutritional Intelligence Platform** — grounded in ICMR-NIN 2024 standards and the IFCT 2017 food composition database.

---

## 📌 1. What is AaharAI NutriSync?

AaharAI NutriSync is a clinically-grounded, full-stack AI nutrition assistant built specifically for the **Indian dietary context**. It solves a critical gap: most AI health tools ignore Indian food data, regional dietary diversity, and clinical nutrition guidelines relevant to India.

### Core Problem It Solves
- Generic AI assistants give Westernized or inaccurate food/nutrition advice for Indian users.
- Dietitians are expensive and under-supplied.
- Tracking nutrition manually (with Indian foods) is incredibly tedious.

### Key Features
| Feature | Description |
|---|---|
| 🤖 **RAG-Powered Chat** | Ask any nutrition question — answers cite IFCT 2017 & ICMR-NIN 2024 |
| 🗓️ **AI Meal Planning** | 7-day personalized plans with grocery lists and cost estimates |
| 📊 **Food Tracker** | Log meals and track macros/micros against your personal RDA targets |
| 🧬 **Health Profiling** | BMI, TDEE, deficiency risk, disease protocols (Diabetes, PCOS, GLP-1) |
| 🔍 **Food Explorer** | 1600+ Indian foods searchable with full nutrient profiles |
| 👨‍🍳 **Recipe Engine** | AI-generated recipes from natural language instructions |
| 🔧 **Multi-LLM Support** | Ollama (local), Groq, OpenAI, Gemini, Claude — user-configurable |
| 🛡️ **Admin Dashboard** | User management, system stats, and usage analytics |

### Target Users
- **Patients** managing chronic conditions (Diabetes, PCOS, Anaemia, Obesity)
- **GLP-1 users** needing protein-focused, nausea-safe meal plans
- **Health-conscious individuals** wanting evidence-based Indian nutrition guidance
- **Dietitians** as a clinical support tool
- **Researchers** working on Indian nutrition and food data

---

## 🏗️ 2. System Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                        User Interface                          │
│                   Next.js 14 (TypeScript)                      │
│  Dashboard │ Chat │ Meal Plan │ Tracker │ Recipe │ Analytics   │
└─────────────────────────┬──────────────────────────────────────┘
                          │ HTTPS / REST / SSE
┌─────────────────────────▼──────────────────────────────────────┐
│                       API Gateway                              │
│              FastAPI (Python 3.11+) — Port 8000                │
│  /api/auth  /api/chat  /api/nutrition  /api/meal-plan          │
│  /api/tracker  /api/recipes  /api/analysis  /api/settings      │
└──┬─────────────┬────────────────┬──────────────┬───────────────┘
   │             │                │              │
   ▼             ▼                ▼              ▼
┌──────┐  ┌──────────────┐  ┌─────────┐  ┌──────────────┐
│ Auth │  │  RAG Service │  │  Meal   │  │  Nutrition   │
│  JWT │  │  (LangGraph) │  │  Agent  │  │   Service    │
└──────┘  └──────┬───────┘  └────┬────┘  └────────┬─────┘
                 │               │                  │
         ┌───────▼───────┐       │            ┌────▼─────────┐
         │ Vector Search │       │            │  Excel DB    │
         │  ChromaDB     │       │            │  (IFCT 2017) │
         │  (cosine sim) │       │            │  12 sheets   │
         └───────┬───────┘       │            └──────────────┘
                 │               │
         ┌───────▼───────────────▼──────────────────────────┐
         │               LLM Router                          │
         │  Priority: Ollama → Groq → OpenAI → Gemini       │
         │  (Auto-fallback with 60s health cache)            │
         └──────────────────────────────────────────────────┘
                 │
         ┌───────▼───────────────────────────────────────────┐
         │              Storage Layer                          │
         │  SQLite (dev) │ PostgreSQL (prod) │ ChromaDB       │
         └───────────────────────────────────────────────────┘
```

---

## 📁 3. Project Structure

```
Nutritional-Assistant/
├── 📄 README.md                    ← You are here
├── 📄 Makefile                     ← Task runner (make setup / make run)
├── 📄 setup.sh                     ← One-command bootstrap
├── 📄 docker-compose.yml           ← Full-stack containerization
├── 📄 .env.example                 ← Environment template
├── 📄 .gitignore
│
├── 🐍 backend/                     ← FastAPI Application
│   ├── main.py                     ← Entry point
│   ├── .env                        ← Your secrets (never commit!)
│   ├── requirements.txt            ← Python dependencies
│   ├── nutrisync.db                ← SQLite database (auto-created)
│   ├── Dockerfile
│   │
│   └── app/                        ← Core application package
│       ├── api/v1/                 ← HTTP route handlers
│       │   ├── router.py           ← Aggregates all routers
│       │   ├── auth.py             ← JWT signup/login/profile
│       │   ├── chat.py             ← RAG chat + streaming
│       │   ├── nutrition.py        ← Food search & comparison
│       │   ├── meal_plan.py        ← AI meal plan generation
│       │   ├── tracker.py          ← Daily food logging
│       │   ├── recipes.py          ← Recipe CRUD + AI generation
│       │   ├── analysis.py         ← Nutrition analytics
│       │   ├── settings.py         ← LLM provider config
│       │   ├── admin.py            ← Admin user management
│       │   ├── customer_profile.py ← Clinical profile analysis
│       │   └── chat_sessions.py    ← Multi-session chat history
│       │
│       ├── core/                   ← Cross-cutting concerns
│       │   ├── config.py           ← Pydantic settings (env-driven)
│       │   ├── logging.py          ← Structured logging setup
│       │   ├── security.py         ← JWT & password hashing
│       │   └── dependencies.py     ← FastAPI DI helpers
│       │
│       ├── db/                     ← Data access layer
│       │   ├── loader.py           ← NutriSyncDB singleton (Excel → memory)
│       │   └── static/             ← Data files
│       │       ├── AaharAI_NutriSync_Enhanced.xlsx  ← 12-sheet knowledge base
│       │       ├── IFCT.pdf        ← Source document for RAG ingestion
│       │       └── chroma_db/      ← ChromaDB vector store (auto-created)
│       │
│       ├── models/                 ← SQLAlchemy ORM models
│       │   └── user.py             ← User, MealPlan, ChatHistory, DailyLog, Recipe
│       │
│       ├── schemas/                ← Pydantic request/response schemas
│       │   └── auth.py             ← Auth DTOs
│       │
│       ├── services/               ← Business logic
│       │   ├── rag/                ← RAG pipeline (most critical)
│       │   │   ├── service.py      ← Main RAG orchestrator
│       │   │   ├── ingest.py       ← PDF+Excel → ChromaDB pipeline
│       │   │   ├── llm_router.py   ← Multi-provider LLM with fallback
│       │   │   ├── hybrid.py       ← BM25 + vector hybrid search
│       │   │   ├── reranker.py     ← Cross-encoder reranking
│       │   │   ├── override.py     ← Frontend-configured LLM passthrough
│       │   │   └── utils.py        ← Ollama health check (with cache)
│       │   ├── agents/
│       │   │   └── orchestrator.py ← LangGraph meal planning agent
│       │   └── memory/
│       │       ├── user_memory.py  ← User profile context for RAG
│       │       └── meal_memory.py  ← Recent meal context for RAG
│       │
│       └── utils/
│           ├── general.py          ← Profile completion, shared helpers
│           └── cache.py            ← In-memory caching utilities
│
├── ⚛️  frontend/                   ← Next.js 14 Application
│   ├── src/
│   │   ├── app/                    ← Next.js App Router pages
│   │   │   ├── page.tsx            ← Dashboard
│   │   │   ├── chat/               ← RAG chat interface
│   │   │   ├── meal-plan/          ← 7-day meal planner
│   │   │   ├── tracker/            ← Food diary
│   │   │   ├── explore/            ← Food database browser
│   │   │   ├── recipes/            ← Recipe library
│   │   │   ├── analytics/          ← Nutrition charts
│   │   │   ├── profile/            ← User health profile
│   │   │   ├── settings/           ← LLM provider configuration
│   │   │   ├── admin/              ← Admin panel
│   │   │   ├── login/ signup/ onboarding/
│   │   │   └── forgot-password/ reset-password/
│   │   ├── components/             ← Reusable React components
│   │   └── lib/
│   │       ├── api.ts              ← Centralized API client (typed)
│   │       ├── auth-context.tsx    ← React auth context
│   │       ├── llm-client.ts       ← Frontend LLM client (multi-provider)
│   │       └── llm-provider.ts     ← Provider config + localStorage
│   └── public/                     ← Static assets
│
├── 📜 scripts/
│   └── generate_recipes.js         ← Seed script for recipe data
│
└── 📚 docs/                        ← Additional documentation
```

---

## ⚙️ 4. Prerequisites

Install these tools before running the project.

| Tool | Version | Install |
|---|---|---|
| **Python** | 3.11+ | [python.org](https://python.org) |
| **Node.js** | 18+ | [nodejs.org](https://nodejs.org) |
| **npm** | 9+ | bundled with Node.js |
| **Git** | any | [git-scm.com](https://git-scm.com) |
| **Ollama** *(optional)* | latest | [ollama.ai](https://ollama.ai) |
| **Docker** *(optional)* | 24+ | [docker.com](https://docker.com) |

---

## 🚀 5. One-Command Setup

### Option A: Makefile (Recommended)

```bash
# Clone the repository
git clone <your-repo-url>
cd Nutritional-Assistant

# One command to set everything up
make setup

# Start both backend and frontend
make run
```

### Option B: Shell Script

```bash
bash setup.sh
```

### Option C: Docker (Zero dependency install)

```bash
cp .env.example backend/.env
# Edit backend/.env with your API keys
docker compose up --build
```

---

## 🔧 6. Manual Step-by-Step Setup

If you prefer full control:

```bash
# 1. Clone
git clone <your-repo-url>
cd Nutritional-Assistant

# 2. Backend setup
cd backend
python3 -m venv venv
source venv/bin/activate          # Linux/macOS
# venv\Scripts\activate           # Windows

pip install --upgrade pip
pip install -r requirements.txt

# 3. Configure environment
cp ../.env.example .env
# Edit .env — at minimum, set SECRET_KEY:
python3 -c "import secrets; print('SECRET_KEY=' + secrets.token_hex(32))" >> .env

# 4. Initialize database
python3 -c "from app.models.user import init_db; init_db()"

# 5. (CRITICAL) Run RAG ingestion — populates ChromaDB
#    Requires: AaharAI_NutriSync_Enhanced.xlsx and IFCT.pdf in app/db/static/
python3 -m app.services.rag.ingest

# 6. Start backend
uvicorn main:app --reload --port 8000

# 7. Frontend (new terminal)
cd ../frontend
npm install
cp .env.example .env.local
npm run dev
```

Open:
- **Frontend**: http://localhost:3000
- **API Docs**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/api/health

---

## ⚡ 8. Speed & Performance: Local vs Cloud

One common question is: *"If I use a super-fast cloud API like Groq, why is the first response still taking a few seconds?"*

### Inference vs. Retrieval
The AaharAI RAG pipeline has two distinct stages:

1.  **Retrieval (Local)**: The system must convert your question into a "vector" (a list of numbers) to search the database. This **embedding** process happens locally on your machine using Ollama or a CPU-based model (`MiniLM`). Even if the LLM is in the cloud, the "searching" part is local.
2.  **Inference (Cloud)**: Once the relevant facts are found, they are sent to the cloud (Groq/OpenAI) to generate the readable answer. Groq is incredibly fast at this stage.

### How to make it faster:
*   **Use a GPU for Ollama**: If you have a GPU (NVIDIA or Mac M1/M2), ensure Ollama is using it. Embedding will take milliseconds instead of seconds.
*   **Embedding Model**: By default, we use `nomic-embed-text`. If it's too slow, you can switch to `all-MiniLM-L6-v2` which is optimized for CPUs.
*   **Skip RAG for simple chat**: If you don't need clinical data for a specific query, the system is faster (but less accurate).

---

## 🧠 7. Vector Database (ChromaDB) — Full Explanation

### What is a Vector Database?

A vector database stores numerical representations (embeddings) of text. Instead of keyword matching, it finds semantically similar content. For example:

- Query: *"foods high in iron for anaemia"*
- ChromaDB finds: *Ragi, Horsegram, Bajra* — even without those exact words in the query.

This is what makes NutriSync's chat intelligent and factually grounded.

### Why ChromaDB?

| Requirement | ChromaDB |
|---|---|
| Zero infra setup | ✅ Runs embedded in Python |
| Persistent storage | ✅ File-based on disk |
| Embedding support | ✅ Ollama + default (MiniLM) |
| Cosine similarity | ✅ Built-in HNSW index |
| Python native | ✅ Pure Python client |

### How the RAG Pipeline Works

```
User Question
     │
     ▼
┌─────────────┐     ┌──────────────────────────────┐
│   ChromaDB  │ ←── │  Embedding Model              │
│  (nutrisync │     │  (Ollama nomic-embed-text or  │
│  collection)│     │   ChromaDB default MiniLM)    │
└──────┬──────┘     └──────────────────────────────┘
       │
       │ Top-K candidates (vector similarity)
       ▼
┌─────────────┐
│  BM25 Index │  ← Keyword search on same corpus
│  (hybrid)   │
└──────┬──────┘
       │ Combined candidates
       ▼
┌─────────────┐
│  Reranker   │  ← Cross-encoder scores final relevance
└──────┬──────┘
       │ Top-5 reranked chunks
       ▼
┌───────────────────────────────────────────────┐
│  Augmented Prompt                              │
│  = User Profile + Chat History + Retrieved    │
│    Knowledge + User Question                  │
└──────┬────────────────────────────────────────┘
       │
       ▼
┌─────────────┐
│  LLM Router │  → Ollama / Groq / OpenAI / Gemini
└──────┬──────┘
       │
       ▼
  Final Answer (with source citations)
```

### Running the Ingestion Pipeline

```bash
# From the backend directory, with venv activated
python3 -m app.services.rag.ingest
```

This:
1. Reads `IFCT.pdf` (page by page)
2. Reads all 12 sheets from the Excel knowledge base
3. Splits content into 512-char chunks with 50-char overlap
4. Generates embeddings via Ollama (or MiniLM fallback)
5. Stores ~15,000+ chunks in ChromaDB at `app/db/static/chroma_db/`

**Expected output:**
```
✅ Extracted 847 pages from IFCT PDF
✅ Created 4,231 documents from Excel sheets
✅ Created 18,402 chunks
✅ Ingested 18,402 chunks into ChromaDB collection 'nutrisync'
```

---

## 🤖 8. AI / LLM Configuration

### Supported Providers

| Provider | Type | Speed | Cost | Setup |
|---|---|---|---|---|
| **Ollama** | Local | Fast (GPU) / Slow (CPU) | Free | Install + pull model |
| **Groq** | Cloud | Very Fast | Free tier | API key |
| **OpenAI** | Cloud | Fast | Paid | API key |
| **Google Gemini** | Cloud | Fast | Free tier | API key |
| **Anthropic Claude** | Cloud | Fast | Paid | API key |
| **OpenRouter** | Cloud | Varies | Free tier | API key |
| **Mistral** | Cloud | Fast | Free trial | API key |

### Backend LLM Router (Auto-Fallback)

The backend uses an **automatic fallback chain**: Ollama → Groq → no-LLM mode.

Configure in `backend/.env`:
```env
# Primary (local)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=gemma3:4b

# Fallback (cloud)
GROQ_API_KEY=gsk_your_key_here
GROQ_MODEL=llama-3.3-70b-versatile
```

### Frontend LLM (User-Configurable)

Users can configure their own LLM from **Settings → AI Configuration**. Keys are stored in `localStorage` (never sent to the backend). The frontend directly calls the provider API.

### Setting Up Ollama (Local AI)

```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Pull required models
ollama pull gemma3:4b             # Chat model (~2.5GB)
ollama pull nomic-embed-text      # Embedding model (~274MB)

# Verify
ollama list
```

---

## ⚠️ 9. Error Handling & Logging

### Logging Architecture

- **Development**: Human-readable logs to stdout
- **Production**: Structured JSON-ready format

Log format:
```
2026-05-03 14:22:01 | INFO     | nutrisync:chat:246 - RAG Intent: FOOD_SEARCH | Chunks: 5
2026-05-03 14:22:02 | INFO     | nutrisync:llm_router:89 - Using Ollama (gemma3:4b)
```

### Resilience Design

| Failure | Behavior |
|---|---|
| Ollama offline | Auto-fallback to Groq; health cached 60s |
| ChromaDB missing | Graceful degradation; LLM answers without RAG |
| No LLM provider | Returns retrieved chunks as fallback response |
| Database error | Request fails with clear 500 + logged stack trace |
| Bad JWT | 401 with automatic token refresh attempt |

---

## 📦 10. Makefile Commands

```bash
make help          # List all commands
make setup         # Full one-command setup
make run           # Run backend + frontend simultaneously
make run-backend   # Run only FastAPI backend
make run-frontend  # Run only Next.js frontend
make ingest        # Run RAG ingestion pipeline
make test          # Run pytest suite
make lint          # Run flake8 + black check
make clean         # Remove all caches and build artifacts
make docker-up     # Start with Docker Compose
make docker-down   # Stop Docker services
```

---

## ▶️ 11. Running the Project

### Development (Recommended)

```bash
# Terminal 1: Start backend
cd backend
source venv/bin/activate
uvicorn main:app --reload --port 8000

# Terminal 2: Start frontend
cd frontend
npm run dev
```

Or with one command from the root:
```bash
make run
```

### Production

```bash
# Backend
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4

# Frontend
cd frontend && npm run build && npm start
```

### Docker

```bash
docker compose up --build -d     # Start in background
docker compose logs -f           # View logs
docker compose down              # Stop

### Build & Push to Docker Hub

```bash
chmod +x scripts/push_docker.sh
./scripts/push_docker.sh         # Builds Next.js & FastAPI and pushes to Docker Hub
```

---

## 🔌 12. API Reference

### Authentication
```http
POST   /api/auth/signup        # Create account → JWT token
POST   /api/auth/login         # Login → JWT token
POST   /api/auth/refresh       # Refresh token
GET    /api/auth/me            # Get current user
PUT    /api/auth/profile       # Update profile
POST   /api/auth/forgot-password
POST   /api/auth/reset-password
```

### Chat (RAG)
```http
POST   /api/chat               # Send message → AI response
POST   /api/chat/stream        # Streaming SSE response
GET    /api/chat/history       # Message history
GET    /api/chat/sessions      # List chat sessions
DELETE /api/chat/sessions/{id} # Delete session
```

### Nutrition & Meal Planning
```http
GET    /api/nutrition/foods           # Search 1600+ foods
GET    /api/nutrition/foods/{name}    # Food detail
POST   /api/nutrition/foods/compare   # Compare foods
POST   /api/meal-plan/generate        # Generate 7-day plan
POST   /api/meal-plan/grocery         # Grocery list from plan
GET    /api/meal-plan/history         # Past meal plans
```

### Tracking
```http
POST   /api/tracker/log-food      # Log a meal
GET    /api/tracker/daily/{date}  # Daily summary
GET    /api/tracker/summary       # 7-day trend
DELETE /api/tracker/logs/{id}     # Delete log
```

### System
```http
GET    /api/health   # Component health status
GET    /docs         # Interactive Swagger UI
```

---

## 🔐 13. Environment Variables

Copy `.env.example` to `backend/.env` and configure:

```env
# REQUIRED
SECRET_KEY=<generate with: python3 -c "import secrets; print(secrets.token_hex(32))">

# DATABASE (leave empty for SQLite development)
DATABASE_URL=

# LOCAL AI (optional but recommended)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=gemma3:4b
OLLAMA_EMBED_MODEL=nomic-embed-text

# CLOUD AI FALLBACK (optional but recommended)
GROQ_API_KEY=gsk_...
GROQ_MODEL=llama-3.3-70b-versatile

# DEBUG
DEBUG=false
```

---

## 🧪 14. Testing

```bash
cd backend
source venv/bin/activate
pytest tests/ -v

# With coverage
pytest tests/ --cov=app --cov-report=html
```

---

## 🐛 15. Troubleshooting

### "LLM not available" error
1. Check if Ollama is running: `ollama list`
2. If not: `ollama serve` in a terminal
3. Or configure a cloud provider in **Settings → AI Configuration**

### "ChromaDB collection not found"
```bash
cd backend
source venv/bin/activate
python3 -m app.services.rag.ingest
```
This re-builds the vector database from your Excel/PDF data.

### "Database error" on startup
```bash
# Reset the database (WARNING: deletes all data)
rm backend/data/nutrisync.db
# Then restart — it will auto-create a fresh one
```

### Slow chat responses
- Ollama on CPU is slow (5-30s). Switch to Groq (free) in Settings for cloud speed.
- Verify Ollama GPU is enabled: `ollama ps`

### Frontend can't reach backend
- Check `frontend/.env.local` has: `NEXT_PUBLIC_API_URL=http://localhost:8000`
- Ensure backend is running on port 8000

### Port conflicts
```bash
# Backend on different port
uvicorn main:app --port 8001

# Update frontend env
echo "NEXT_PUBLIC_API_URL=http://localhost:8001" > frontend/.env.local
```

---

## 🌐 16. Platform Support

| Platform | Status | Notes |
|---|---|---|
| **Linux** | ✅ Full support | Primary development target |
| **macOS** | ✅ Full support | Works with Apple Silicon (Ollama native) |
| **Windows** | ⚠️ Supported | Use WSL2 for best experience; `setup.sh` requires bash |

---

## 📜 License

Internal Research Prototype — AaharAI NutriSync  
Based on ICMR-NIN 2024 and IFCT 2017 data.
