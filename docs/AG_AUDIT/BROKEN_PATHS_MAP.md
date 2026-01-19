# BROKEN PATHS MAP

## Backend API Endpoints (Discovered via `backend/api/urls.py`)

| Endpoint | Method | Expected Status | Actual Status (Unauth) | Notes |
|----------|--------|-----------------|------------------------|-------|
| `/api/health/` | GET | 200 | 200 OK | Public |
| `/api/ready/` | GET | 200 | 200 OK | Public |
| `/api/live/` | GET | 200 | 200 OK | Public |
| `/api/metrics/` | GET | 200 | 401 Unauthorized | Protected |
| `/api/projects/` | GET | 200 | 401 Unauthorized | Protected |
| `/api/indicators/`| GET | 200 | 200 OK (empty list) | Returns `[]` if unauth? (Need to verify if intended) |
| `/api/auth/login/`| POST | 200 | 405 Method Not Allowed | Expects POST |
| `/api/ask-assistant/`| POST | 200 | 401 Unauthorized | AI Service |
| `/api/report-summary/`| POST | 200 | 401 Unauthorized | AI Service |
| `/admin/` | GET | 302 | 302 Redirect | Redirects to login |

## Frontend Routes (Discovered via `frontend/src/App.tsx`)

| Route (Internal) | Component | Status | Note |
|------------------|-----------|--------|------|
| `/` | `Login` or `ProjectHub` | ✅ 200 | Base URL works |
| `projects` | `ProjectHub` | ✅ | State-based routing |
| `dashboard` | `Dashboard` | ✅ | State-based routing |
| `checklist` | `Checklist` | ✅ | State-based routing |
| `upcoming` | `UpcomingTasks` | ✅ | State-based routing |
| `analysis` | `AIAnalysis` | ✅ | State-based routing |
| `library` | `DocumentLibrary`| ✅ | State-based routing |
| `ai` | `AIAssistant` | ✅ | State-based routing |

## Summary of Connectivity
- **CORS**: Configured in Django via `CORS_ALLOWED_ORIGINS`. Current values: `https://phc.alshifalab.pk` (Production). 
- **Note**: Locally accessing via `localhost:8016` might trigger CORS if the frontend was served from a different port, but since they are proxied under the same Nginx server, they should be on the same origin (port 80 inside, 8016 outside).
- **CSRF**: `CSRF_TRUSTED_ORIGINS` includes `https://phc.alshifalab.pk`.
