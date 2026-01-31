# SMOKE TEST GUIDE

## Prerequisites
- Docker & Docker Compose
- *OR* Python 3.10+ and Node.js 18+

## Quick Start (Docker)
```bash
cd accred-ai-main
docker compose up -d --build
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py createsuperuser --noinput --username admin --email admin@example.com
# Set password manually if needed or use script
```

## Manual Verification Steps

### 1. Auth & Base
- **Command**: `curl -X POST http://localhost:8000/api/token/ -d "username=admin&password=changeme"`
- **Expected**: JSON with `access` and `refresh` tokens.

### 2. Projects
- **Command**: `curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/projects/`
- **Expected**: 200 OK, empty list or list of projects.

### 3. Import CSV
- **Command**: `curl -X POST -H "Authorization: Bearer $TOKEN" -F "file=@INDICATORS_TEMPLATE.csv" http://localhost:8000/api/projects/1/import-indicators/`
- **Expected**: 200 OK, JSON with `created_count`.

### 4. Scheduling
- **Check**: Inspect Indicator for `next_due_date`.
- **Command**: `curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/projects/1/upcoming/`
- **Expected**: List of indicators due.

### 5. Audit Logic
- **Command**: `curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/audit/`
- **Expected**: List of recent actions (create project, import, etc).

## Frontend Checks
1. Go to `http://localhost:8016` (or configured port).
2. Login with `admin` / `changeme`.
3. Create a Project.
4. Click "Import CSV" inside Project.
5. Verify "Upcoming Tasks" panel.
6. Check "Audit Log" page.
