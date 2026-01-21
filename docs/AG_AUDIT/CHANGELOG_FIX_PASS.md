# CHANGELOG - FIX PASS

## [2026-01-21]

### Configuration
- **.env**: Generated and set `DJANGO_SECRET_KEY`, `DB_PASSWORD`, `DATABASE_URL`, and `GEMINI_API_KEY`.
- **.env**: Configured `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`, and `CSRF_TRUSTED_ORIGINS` to match Caddyfile (`phc.alshifalab.pk`).
- **.env**: Fixed variable names (added `DB_PASSWORD`) to ensure alignment with `docker-compose.yml`.

### Database
- **Password Migration**: Manually updated `accredify_user` password in PostgreSQL container to match the new `.env` value.
- **Migrations**: Created and applied missing migrations for `api` app (migration `0005`).

### Backend
- **Security**: Updated `IndicatorViewSet`, `ProjectViewSet`, and `EvidenceViewSet` in `api/views.py` to include `IsAuthenticated` permission class.
- **Health Checks**: Verified that health checks return 503 when DB is disconnected and 200 when connected.

### Infrastructure
- **Docker Compose**: Restarted the entire stack with `--build` to apply environment changes.
- **Nginx**: Verified that proxying to backend and frontend works correctly via port 8016.
