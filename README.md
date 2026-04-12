# 🧬 AaharAI NutriSync

A production-ready, AI-powered Indian nutritional assistant. Built with Retrieval-Augmented Generation (RAG) over the IFCT 2017 (Indian Food Composition Tables) and ICMR-NIN 2024 RDA guidelines.

This repository contains the backend (FastAPI + RAG pipeline), a Next.js frontend, and tooling to run local LLMs (Ollama). For full setup walkthrough see [`SETUP.md`](SETUP.md) and for system architecture details see [`ARCHITECTURE.md`](ARCHITECTURE.md).

---

## 🌟 What this project does
- RAG knowledge base using ChromaDB built from IFCT & ICMR-NIN sources.
- LLM-driven nutritional assistant with Indian food names, portion recommendations, and RDA-aware guidance.
- Local-first privacy model: data and LLMs run on your machine (Ollama) or in your chosen cloud.

---

## 🛠️ Tech Stack (high level)
- Backend: Python 3.12, FastAPI, SQLAlchemy (SQLite/postgres optional), ChromaDB
- Frontend: TypeScript, Next.js, Tailwind CSS
- LLMs: Ollama (local) with optional Groq fallback
- Storage: SQLite for app data, ChromaDB for vector index

---

## 🚀 Quickstart — Recommended (Docker Compose)
The easiest way to run a fully local stack (backend, frontend, Ollama, optional Postgres):

1. Ensure Docker is installed and running.
2. From the repository root run:

```bash
docker compose up --build -d
```

3. Wait until services show healthy. Then:

```bash
# Backend health
curl http://localhost:8000/api/health

# Frontend
open http://localhost:3000
```

For detailed manual steps and troubleshooting, see [`SETUP.md`](SETUP.md).

---

## 🧭 Developer — Manual (non-Docker) Quick Notes
- Backend: Create a Python venv, install `backend/requirements.txt`, then run `uvicorn backend.main:app --reload --port 8000`.
- Frontend: `cd frontend && npm install && npm run dev -p 3001`.
- Ingest RAG data: `python -m rag.ingest` (runs once to populate ChromaDB).

---

## 🏗️ Architecture & Docs
See [`ARCHITECTURE.md`](ARCHITECTURE.md) for system diagrams, component responsibilities, and how data flows from query → retrieval → generation.

---

## 🧾 License & Contributing
Contributions are welcome — open a PR with a clear description. See `CONTRIBUTING.md` (if present) for guidelines.

---

If something in this README feels outdated, please open an issue or submit a PR. Thank you for exploring AaharAI NutriSync!