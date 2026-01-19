# FIX PLAN

## P0: Boot & Stability
- [x] **Status**: Resolved.
- [x] **Fix**: Corrected Nginx healthcheck in `docker-compose.yml` to use `127.0.0.1` instead of `localhost` to avoid IPv6 resolution issues.
- [x] **Verification**: `docker compose ps` shows `healthy` for all services.

## P1: Core Health & Admin Access
- [ ] **Goal**: Ensure Django Admin is accessible and superuser exists.
- [ ] **Action**: Create a superuser if none exists.
- [ ] **Command**: `docker exec -it accred-ai-backend-1 python manage.py createsuperuser`
- [ ] **Verification**: Login to `http://localhost:8016/admin/`.

## P2: Auth & Core API
- [ ] **Goal**: Verify frontend can talk to backend auth endpoints.
- [ ] **Action**: Test registration/login from the UI.
- [ ] **Verification**: Successful token acquisition (checked via Browser Network tab or backend logs).

## P3: AI Service Integration
- [ ] **Goal**: Unblock `gemini_api` healthcheck.
- [ ] **Action**: Ensure a valid `GEMINI_API_KEY` is provided in `.env`.
- [ ] **Verification**: `/api/health/` should report `gemini_api: healthy`.

## P4: Production Readiness (Cleanup)
- [ ] **Goal**: Remove obsolete version attributes and warnings.
- [ ] **Action**: Remove `version: '3.8'` from `docker-compose.yml` as it's obsolete in modern Compose.
- [ ] **Verification**: `docker compose config` should not show warnings.
