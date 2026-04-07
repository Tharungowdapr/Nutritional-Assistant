# NutriSync Implementation Tasks

## Phase 0 — GitHub Setup
- [x] Upload required files (Excel, IFCT PDF, fixed notebook) to GitHub
- [x] Set up project directory structure

## Phase 1 — Foundation
- [x] Create backend scaffold (FastAPI + config + requirements)
- [x] Implement data loader (Excel → DataFrames)
- [x] Build RAG ingestion pipeline (PDF + Excel → ChromaDB)
- [x] Implement LLM Router (Ollama ↔ Groq fallback)
- [x] Create basic chat endpoint with RAG

## Phase 2 — Inference Engines
- [x] Implement life-stage RDA engine
- [x] Implement GLP-1 modifier
- [x] Implement physio mapper
- [x] Implement disease protocol engine
- [x] Implement profession calorie engine
- [x] Implement regional food filter
- [x] Implement context resolver
- [x] Wire all engines into inference pipeline

## Phase 3 — Meal Planning Agent
- [x] Set up LangChain agent with tools
- [x] Implement budget-aware meal planner
- [x] Implement grocery list generator
- [x] Implement recipe generator

## Phase 4 — Frontend
- [x] Create Next.js project with Tailwind + shadcn/ui
- [x] Build dashboard page
- [x] Build onboarding page
- [x] Build meal plan + grocery + recipe pages
- [ ] Build food explorer + analysis pages
- [x] Build chat page

## Phase 5 — Notifications
- [x] Set up Celery + Redis
- [x] Implement notification channels (email, SMS, push, in-app)

## Phase 6 — Deploy
- [x] Create Docker Compose stack
- [x] Create Dockerfiles
- [x] Test full flow end-to-end
