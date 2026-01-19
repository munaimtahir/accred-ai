# ENVIRONMENT CHECKLIST

## Required Variables
Based on `docker-compose.yml` and `backend/accredify_backend/settings.py`.

| Variable | Source | Status | Purpose | Default/Example |
|----------|--------|--------|---------|-----------------|
| `DJANGO_SECRET_KEY` | Compose/Settings | ✅ PRESENT | Security | `change-me-in-production` |
| `DEBUG` | Compose/Settings | ✅ PRESENT | Mode | `False` |
| `DB_PASSWORD` | Compose | ✅ PRESENT | Postgres Auth | `changeme` |
| `DATABASE_URL` | Compose/Settings | ✅ PRESENT | DB Connection | `postgresql://...` |
| `GEMINI_API_KEY` | Compose/Settings | ✅ PRESENT | AI Integration | - |
| `ALLOWED_HOSTS` | Compose/Settings | ✅ PRESENT | Web Security | `localhost,127.0.0.1` |
| `CORS_ALLOWED_ORIGINS`| Compose/Settings | ✅ PRESENT | CORS | - |
| `CSRF_TRUSTED_ORIGINS`| Compose/Settings | ✅ PRESENT | CSRF | - |

## Findings
*(To be populated after Phase 1 completion)*
