# Setup & Local Development

This document contains step-by-step instructions to set up the NutriSync project locally. It covers both a Docker Compose quickstart (recommended) and manual development setup.

## Quickstart (Docker Compose) — Recommended

Prerequisites:
- Docker Engine & Docker Compose
- Sufficient disk space (Ollama image can be large)

From the repository root:

```bash
# build and start services in detached mode
docker compose up --build -d

# view running services
docker compose ps

# follow backend logs
docker compose logs -f backend

# backend health check
curl http://localhost:8000/api/health

# open frontend
open http://localhost:3001
```

Notes:
- If you are running Ollama outside Docker, update `OLLAMA_BASE_URL` in `.env` to point to your host (e.g., `http://host.docker.internal:11434`).
- The first `docker compose up` may take a while as the Ollama image and Python dependencies are downloaded and built.

## Manual Development Setup (no Docker)

### Backend

1. Create and activate a virtual environment:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
```

2. Install Python dependencies:

```bash
pip install -r requirements.txt
```

3. Create a local `.env` (copy the repo `.env` or `.env.example`) and edit values if needed.

4. (Optional) Populate the ChromaDB vector store (run once):

```bash
python -m rag.ingest
```

5. Start the backend API:

```bash
# from repository root
python -m uvicorn backend.main:app --reload --port 8000
```

### Frontend

1. Open a new terminal and start the frontend dev server:

```bash
cd frontend
npm install
npm run dev -p 3001
```

2. Open `http://localhost:3001` in your browser.

## Environment variables

- Use the root `.env` file to set `OLLAMA_BASE_URL`, `OLLAMA_MODEL`, `GROQ_API_KEY`, and database settings.
- For local-only usage, you can leave `GROQ_API_KEY` empty and run Ollama locally.

## Troubleshooting

- Docker daemon not running: `sudo systemctl start docker` (Linux) or open Docker Desktop.
- Port collisions (3001/8000/11434): stop conflicting processes or adjust ports in `docker-compose.yml` / `.env`.
- If ChromaDB is missing, run `python -m rag.ingest` to (re)create the vector store.

## Running tests

Run backend tests (pytest):

```bash
cd backend
pytest -q
```

## Where data is stored

- Application DB (SQLite): `backend/nutrisync.db` (or PostgreSQL if `DATABASE_URL` configured)
- Vector DB (ChromaDB): `data/chroma_db` (persisted by Docker compose volume `chroma_data`)

----

If you need a tailored setup for deployment (cloud / k8s) or CI, open an issue and I can add recommended manifests.