# STATUS SNAPSHOT - Accred-AI

## Repo Inventory
- **Root Directory**: `/home/munaim/srv/apps/accred-ai`
- **Backend**: Django (located in `/backend`)
- **Frontend**: React/Vite (located in `/frontend`)
- **Proxy**: Nginx (located in `/nginx`)
- **Orchestration**: Docker Compose
- **Database**: PostgreSQL (Dockerized)

## Component Status
| Component | Status | Last Checked | Note |
|-----------|--------|--------------|------|
| Backend   | 🟢 GREEN  | 2026-01-19 | Responding correctly to healthchecks |
| Frontend  | 🟢 GREEN  | 2026-01-19 | Responding correctly (200 OK) |
| Database  | 🟢 GREEN  | 2026-01-19 | Healthy; migrations applied (Phase 0 check) |
| Nginx     | 🟢 GREEN  | 2026-01-19 | Proxying correctly. Healthcheck fix applied. |

## Working User Journeys
- **Deployment**: `docker compose up` results in healthy containers.
- **Monitoring**: Health check endpoints (`/api/health/`, `/health`) are responding.
- **Static Assets**: Frontend is served via Nginx and reachable.
- **Database**: Backend connects and migrations apply successfully.

## Broken Journeys
- **AI Integration**: Gemini API reports `not_configured` in health check (requires valid key).
- **Admin Access**: Requires manual superuser creation (standard for new DB).

## Top Failure Points (Detected)
1. **Nginx Healthcheck**: (Fixed) resolved `localhost` to IPv6 `[::1]` which wasn't listening.
2. **Missing Env Vars**: Gemini API key is placeholder or missing.
3. **CORS/CSRF**: Production domains are hardcoded in `docker-compose.yml` (`phc.alshifalab.pk`). This might cause issues if accessing via IP.
4. **Obsolete Compose Version**: Minor warning in logs.

