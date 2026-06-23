# ── Stage 1: Builder ──────────────────────────────────────────────
FROM python:3.11-slim AS builder

WORKDIR /build

# Install system build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install dependencies in isolated layer for better caching
COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install --no-cache-dir --prefix=/install -r requirements.txt

# ── Stage 2: Runtime ──────────────────────────────────────────────
FROM python:3.11-slim AS runtime

WORKDIR /app

# Install only runtime system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy installed packages from builder
COPY --from=builder /install /usr/local

# Create non-root user for security
RUN groupadd -r nutrisync && useradd -r -g nutrisync nutrisync

# Copy application source (respects .dockerignore)
COPY . .

# Create data directory and set ownership
RUN mkdir -p /app/data && chown -R nutrisync:nutrisync /app /app/data

# Switch to non-root user
USER nutrisync

# Expose FastAPI port (Render uses PORT env var, default 10000)
EXPOSE 10000

# Health check uses PORT env var
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:${PORT:-10000}/api/health || exit 1

# Run with uvicorn using PORT env var (Render sets PORT=10000)
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-10000} --workers 1"]
