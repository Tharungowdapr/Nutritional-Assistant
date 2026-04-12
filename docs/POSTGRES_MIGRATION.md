# PostgreSQL Migration Guide

This document explains how to migrate NutriSync from SQLite to PostgreSQL for production.

## Prerequisites

1. PostgreSQL 12+ installed and running
2. Python alembic>=1.13.0 (added to requirements.txt)
3. psycopg2-binary>=2.9.0 (added to requirements.txt)

## Setup Instructions

### 1. Create PostgreSQL Database

```sql
-- Connect to PostgreSQL as superuser
CREATE USER nutrisync WITH PASSWORD 'your_secure_password';
CREATE DATABASE nutrisync OWNER nutrisync;
GRANT ALL PRIVILEGES ON DATABASE nutrisync TO nutrisync;
```

### 2. Configure Environment Variables

Create or update your `.env` file:

```env
DATABASE_URL=postgresql://nutrisync:your_secure_password@localhost:5432/nutrisync
# OR set individual variables:
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=nutrisync
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=nutrisync
```

### 3. Initialize Alembic (One-time)

```bash
cd backend
alembic init migrations
```

This creates an `alembic/` directory with migration scripts.

### 4. Configure alembic.ini

Edit `alembic.ini` and ensure the database URL is set:

```ini
sqlalchemy.url = postgresql://nutrisync:your_secure_password@localhost:5432/nutrisync
```

Or use environment variable:

```ini
sqlalchemy.url = driver://user:password@localhost/dbname
```

### 5. Create Initial Migration

```bash
# Generate migration script from current models
alembic revision --autogenerate -m "Initial schema"

# Review the migration file in migrations/versions/
```

### 6. Apply Migrations

```bash
# Apply all pending migrations
alembic upgrade head

# Or upgrade to specific revision
alembic upgrade <revision_id>
```

### 7. Verify Migration

Connect to PostgreSQL and verify tables:

```sql
\c nutrisync
\dt  -- List all tables
\d users  -- Describe users table
```

## Migration Commands Reference

```bash
# View migration history
alembic history

# Check current revision
alembic current

# Rollback one migration
alembic downgrade -1

# Create new migration (after model changes)
alembic revision --autogenerate -m "Description of changes"

# Apply to specific revision
alembic upgrade <revision>
```

## Running with PostgreSQL

Once database is configured:

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Run migrations:
   ```bash
   alembic upgrade head
   ```

3. Start API server (will auto-use PostgreSQL):
   ```bash
   python -m uvicorn main:app --reload
   ```

## Database Connection Pooling

For production, configure connection pooling in `auth/database.py`:

```python
from sqlalchemy.pool import QueuePool

engine = create_engine(
    DATABASE_URL,
    poolclass=QueuePool,
    pool_size=20,
    max_overflow=40,
    pool_pre_ping=True,
)
```

## Backup & Restore

### Backup PostgreSQL Database

```bash
pg_dump -U nutrisync -h localhost nutrisync > backup.sql
```

### Restore PostgreSQL Database

```bash
psql -U nutrisync -h localhost nutrisync < backup.sql
```

## Troubleshooting

### Connection Refused
- Ensure PostgreSQL is running: `sudo systemctl start postgresql`
- Verify credentials in DATABASE_URL
- Check PostgreSQL port (default 5432)

### Permission Denied
- Verify user can connect: `psql -U nutrisync -h localhost`
- Check `/etc/postgresql/*/main/pg_hba.conf` for authentication method

### Migration Conflicts
- Review conflicting migrations in `migrations/versions/`
- Delete conflicting migration if necessary
- Re-run: `alembic upgrade head`

## Production Deployment

For production deployment with Docker Compose, refer to docker-compose.yml with PostgreSQL service.
