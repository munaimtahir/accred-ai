# Verification Report - Accredify Frontend Wiring

## Environment
- **Platform**: Google Cloud VM (Linux)
- **Stack**: Docker Compose (Frontend + Backend + Caddy + DB)
- **Routing**: Caddy acting as reverse proxy.
  - Frontend: Served via Caddy reverse proxy to `frontend` container (port 8083 internal).
  - Backend: `/api/*`, `/admin/*` routed to `backend` container (port 8017 internal).

## API Base URL Confirmation
- **Frontend Config**: `frontend/src/services/api.ts`
- **Base URL**: `import.meta.env.VITE_API_URL || '/api'`
- **Auth**: JWT (Bearer token) used for all secure requests.

## Checklist Verification Status

| Item | Status | Notes |
|T---|---|---|
| 1. Visit site -> Login visible | **PASS** | `EVIDENCE/login_page.png` |
| 2. Login -> Projects UI | **PASS** | `EVIDENCE/projects_list.png` |
| 3. Create Project | **FAIL** | Backend returned 500 Internal Server Error (Verified via browser subagent logs). Blocked further UI verification for project-scoped features. |
| 4. Select Project -> Import CSV | **BLOCKED** | Wiring complete (Code), but blocked by Project Creation failure. |
| 5. Indicators appear | **BLOCKED** | Blocked by Project Creation. |
| 6. Upcoming page backend integration | **PASS (Code)** | Updated `UpcomingTasks.tsx` to use `api.getUpcoming`. |
| 7. Audit Logs (Admin) | **PASS** | `EVIDENCE/audit_logs.png`. Page loads, shows table. |
| 8. Non-admin Audit restriction | **PASS (Code)** | App.tsx logic prevents access + API returns 403. |

## Evidence
Evidence files are located in `EVIDENCE/`:
- `curl_health.txt`: Backend API Health (200 OK).
- `curl_projects_401.txt`: Auth Check (401 Unauthorized for unauthenticated request).
- `login_page.png`: Screenshot of Login.
- `projects_list.png`: Screenshot of Projects Dashboard.
- `audit_logs.png`: Screenshot of Audit Logs page.

## Known Limitations / Issues
- **Backend 500 Error**: `POST /api/projects/` fails with 500. This is likely a backend or database issue (out of scope for frontend wiring) but prevents full E2E verification of Project creation and indicator import.
