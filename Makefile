# AaharAI NutriSync — Makefile
# Run `make help` to see all commands.

SHELL := /bin/bash
.PHONY: help setup dev run run-backend run-frontend ingest test test-cov \
        lint format migrate migrate-create pre-commit clean clean-all \
        db-reset docker-up docker-down docker-logs status check-tools

# ─── Colors ──────────────────────────────────────────────────────
GREEN  := \033[0;32m
YELLOW := \033[1;33m
CYAN   := \033[0;36m
RESET  := \033[0m

help: ## Show this help message
	@echo ""
	@echo "$(CYAN)AaharAI NutriSync — Makefile$(RESET)"
	@echo "─────────────────────────────────────────────"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-20s$(RESET) %s\n", $$1, $$2}'
	@echo ""

check-tools: ## Verify required tools are installed
	@echo "$(CYAN)Checking required tools...$(RESET)"
	@command -v python3 >/dev/null 2>&1 || { echo "❌ python3 not found. Install from python.org"; exit 1; }
	@command -v node >/dev/null 2>&1 || { echo "❌ node not found. Install from nodejs.org"; exit 1; }
	@command -v npm >/dev/null 2>&1 || { echo "❌ npm not found. Install from nodejs.org"; exit 1; }
	@echo "$(GREEN)✅ All required tools found$(RESET)"

setup: check-tools ## Full one-command setup (installs all dependencies)
	@bash setup.sh

# ─── Run ─────────────────────────────────────────────────────────

dev: run ## Alias for make run

run: ## Run backend + frontend simultaneously (Ctrl+C to stop both)
	@if [ ! -d "backend/app/db/static/chroma_db" ]; then \
		echo "$(YELLOW)⚠️  Vector database (ChromaDB) not found!$(RESET)"; \
		echo "   Run $(GREEN)make ingest$(RESET) to populate the knowledge base."; \
		echo "   RAG features (Chat) will operate in degraded mode until ingestion is done."; \
		echo ""; \
	fi
	@echo "$(CYAN)Starting AaharAI NutriSync...$(RESET)"
	@echo "  Frontend : http://localhost:3001"
	@echo "  Backend  : http://localhost:8000"
	@echo "  API Docs : http://localhost:8000/docs"
	@echo ""
	@trap 'kill 0' SIGINT; \
	(cd backend && source venv/bin/activate && uvicorn main:app --host 0.0.0.0 --port 8000 --reload 2>&1 | sed 's/^/[BACKEND] /') & \
	(cd frontend && npm run dev 2>&1 | sed 's/^/[FRONTEND] /'); \
	wait

run-backend: ## Run only the FastAPI backend
	@echo "$(CYAN)Starting backend on http://localhost:8000$(RESET)"
	@echo "$(YELLOW)API Docs: http://localhost:8000/docs$(RESET)"
	cd backend && source venv/bin/activate && uvicorn main:app --reload --port 8000

run-frontend: ## Run only the Next.js frontend
	@echo "$(CYAN)Starting frontend on http://localhost:3001$(RESET)"
	cd frontend && npm run dev

ingest: ## Run RAG ingestion pipeline (populates ChromaDB from Excel + PDF)
	@echo "$(CYAN)Running RAG ingestion pipeline...$(RESET)"
	@echo "$(YELLOW)This may take 3-10 minutes for large datasets$(RESET)"
	cd backend && source venv/bin/activate && python3 -m app.services.rag.ingest

# ─── Testing ─────────────────────────────────────────────────────

test: ## Run backend test suite
	@echo "$(CYAN)Running tests...$(RESET)"
	cd backend && source venv/bin/activate && pytest tests/ -v --tb=short

test-cov: ## Run tests with HTML coverage report
	@echo "$(CYAN)Running tests with coverage...$(RESET)"
	cd backend && source venv/bin/activate && \
		pytest tests/ -v --cov=app --cov-report=html --cov-report=term-missing
	@echo "$(GREEN)✅ Coverage report: backend/htmlcov/index.html$(RESET)"

# ─── Code Quality ─────────────────────────────────────────────────

lint: ## Run Python linting (flake8 + black check)
	@echo "$(CYAN)Running linters...$(RESET)"
	cd backend && source venv/bin/activate && \
		flake8 app/ main.py && \
		black --check app/ main.py && \
		echo "$(GREEN)✅ Linting passed$(RESET)"

format: ## Auto-format Python code with black
	@echo "$(CYAN)Formatting code...$(RESET)"
	cd backend && source venv/bin/activate && black app/ main.py
	@echo "$(GREEN)✅ Code formatted$(RESET)"

pre-commit: ## Run all pre-commit hooks manually
	@echo "$(CYAN)Running pre-commit hooks...$(RESET)"
	cd backend && source venv/bin/activate && pre-commit run --all-files

# ─── Database ─────────────────────────────────────────────────────

migrate: ## Apply all pending Alembic migrations
	@echo "$(CYAN)Running database migrations...$(RESET)"
	cd backend && source venv/bin/activate && alembic upgrade head
	@echo "$(GREEN)✅ Migrations applied$(RESET)"

migrate-create: ## Create a new migration (usage: make migrate-create MSG="add user field")
	@[ "$(MSG)" ] || { echo "$(YELLOW)Usage: make migrate-create MSG=\"describe your change\"$(RESET)"; exit 1; }
	cd backend && source venv/bin/activate && alembic revision --autogenerate -m "$(MSG)"
	@echo "$(GREEN)✅ Migration created in backend/migrations/versions/$(RESET)"

db-reset: ## ⚠️  Reset SQLite database (deletes all data!)
	@echo "$(YELLOW)⚠️  WARNING: This will delete all user data!$(RESET)"
	@read -p "Are you sure? [y/N] " confirm && [ "$$confirm" = "y" ]
	rm -f backend/data/nutrisync.db
	cd backend && source venv/bin/activate && python3 -c "from app.models.user import init_db; init_db()"
	@echo "$(GREEN)✅ Database reset$(RESET)"

# ─── Cleanup ──────────────────────────────────────────────────────

clean: ## Remove caches, build artifacts, and compiled files
	@echo "$(CYAN)Cleaning project...$(RESET)"
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete 2>/dev/null || true
	find . -type f -name "*.pyo" -delete 2>/dev/null || true
	rm -rf backend/.pytest_cache backend/htmlcov backend/.coverage
	rm -rf frontend/.next frontend/node_modules/.cache
	@echo "$(GREEN)✅ Clean done$(RESET)"

clean-all: clean ## Remove everything including venv and node_modules (full reset)
	rm -rf backend/venv backend/.venv
	rm -rf frontend/node_modules
	@echo "$(GREEN)✅ Full clean done — run: make setup$(RESET)"

# ─── Docker ───────────────────────────────────────────────────────

docker-up: ## Start all services with Docker Compose
	@echo "$(CYAN)Starting Docker services...$(RESET)"
	docker compose up --build -d
	@echo "$(GREEN)✅ Services running$(RESET)"
	@echo "  Frontend: http://localhost:3001"
	@echo "  Backend:  http://localhost:8000"
	@echo "  API Docs: http://localhost:8000/docs"

docker-down: ## Stop all Docker services
	docker compose down

docker-logs: ## View Docker service logs
	docker compose logs -f

docker-push: ## Build NextJS standalone & FastAPI images and push to Docker Hub
	@echo "$(CYAN)Initiating Docker Build & Push Pipeline...$(RESET)"
	@bash scripts/push_docker.sh

# ─── Status ───────────────────────────────────────────────────────

status: ## Show health status of all running services
	@echo "$(CYAN)Checking service status...$(RESET)"
	@curl -sf http://localhost:8000/api/health | python3 -m json.tool 2>/dev/null || echo "$(YELLOW)Backend: Not running$(RESET)"
	@curl -sf http://localhost:3001 >/dev/null 2>&1 && echo "$(GREEN)Frontend: Running$(RESET)" || echo "$(YELLOW)Frontend: Not running$(RESET)"
	@curl -sf http://localhost:11434/api/tags >/dev/null 2>&1 && echo "$(GREEN)Ollama: Running$(RESET)" || echo "$(YELLOW)Ollama: Not running (optional)$(RESET)"
