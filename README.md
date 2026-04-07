# 🧬 AaharAI NutriSync — AI-Powered Indian Nutritional Assistant

> RAG-based nutrition intelligence platform powered by IFCT 2017 + ICMR-NIN 2024 data, running locally via Ollama with Groq cloud fallback.

## ✨ Features

- **RAG Chat** — Ask nutrition questions grounded in IFCT 2017 data + ICMR-NIN 2024 RDA guidelines
- **Personalized Nutrient Targets** — 5-step inference pipeline: Life Stage → Profession → Disease → GLP-1 → Physio
- **Meal Planning Agent** — Budget-aware weekly meal plans optimized for nutrient density
- **Grocery List Generator** — Auto-generated shopping lists in Indian portions (katori, cup, tbsp)
- **Recipe Generator** — Step-by-step Indian recipes from available ingredients
- **LLM Fallback** — Ollama (local) ↔ Groq (free cloud) with circuit-breaker pattern
- **Notifications** — Email, SMS, WhatsApp, Push, and In-app notifications via Celery + Redis
- **86 Indian Foods** — 12 data sheets covering food composition, RDA, GLP-1 protocols, disease nutrition, and more

## 🏗️ Architecture

```
Layer 1: Frontend (Next.js + React + Tailwind + shadcn/ui)
Layer 2: API Gateway (FastAPI + Supabase Auth)
Layer 3: Core Backend (Inference Engine · LangChain Agent · Food DB · Notifications)
Layer 4: AI/LLM (Ollama primary → Groq fallback)
Layer 5: Data (PostgreSQL · MongoDB · Redis · ChromaDB)
Layer 6: MLOps (MLflow · DVC · Prometheus + Grafana)
Layer 7: Notifications (Email · WhatsApp · Push · SMS · In-app)
Layer 8: DevOps (Docker · GitHub Actions · Vercel · Railway)
```

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- [Ollama](https://ollama.ai) installed (or Groq API key)
- Node.js 18+ (for frontend)

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Run RAG ingestion (one-time)
python -m rag.ingest

# Start the API server
uvicorn main:app --reload --port 8000
```

### Pull Ollama Model
```bash
ollama pull gemma3:4b
ollama pull nomic-embed-text
```

### Docker (Full Stack)
```bash
docker-compose up -d
```

## 📊 Database

| Sheet | Records | Purpose |
|---|---|---|
| Food Composition (IFCT 2017) | 86 foods | Macro + micronutrient data |
| ICMR-NIN RDA Targets | 18 profiles | Life-stage RDAs |
| Disease Nutrition Protocols | 10 conditions | Clinical nutrition |
| GLP-1 Nutrition Protocol | 5 protocols | Medication nutrition |
| Physio-State Nutrient Map | 12 scenarios | Energy/sleep/focus boosts |
| + 7 more sheets | — | Regions, professions, portions, medicines |

## 📁 Project Structure

```
├── data/                    # IFCT PDF + Excel database
├── backend/
│   ├── main.py             # FastAPI entry point
│   ├── database/           # Data loader + Pydantic models
│   ├── rag/                # LLM router + ingestion + RAG service
│   ├── engines/            # Inference engine (RDA, GLP-1, physio)
│   ├── agent/              # Meal planning agent
│   ├── notifications/      # Email/SMS/WhatsApp/Push/In-app
│   └── routes/             # API endpoints
├── frontend/               # Next.js app (coming soon)
├── docker-compose.yml
└── NutriSync_Analysis.ipynb
```

## 📄 License

MIT