# AccrediFy Repository Audit Truth Map

> **Scope:** Backend (Django/DRF) + Frontend (Vite/React) inventory with wiring status.
> **Status legend:**
> - **WORKING** = Implemented and wired in this repo.
> - **IMPLEMENTED BUT UNUSED** = Implemented but no clear call path or integration in this repo.
> - **PARTIALLY WIRED** = Implemented but missing required linkage (e.g., auth/token handling, external dependency) or only used in fallback mode.
> - **MISSING** = No implementation found in the repo.

---

## Backend Inventory

### Models
| Model / Enum | Purpose | Evidence in repo | Status |
| --- | --- | --- | --- |
| `UserRole` (TextChoices) | Role-based access control enums. | Defined in `api/models.py`. | **WORKING** (used by `UserProfile`, serializers, permissions). |
| `UserProfile` | Extends Django `User` with `role`, supports admin/PM/member. | `api/models.py`; created in registration serializer; referenced in permissions. | **WORKING** (wired via registration + permission checks). |
| `ComplianceStatus`, `Frequency`, `EvidenceType`, `AICategorization`, `SyncStatus` | Enum fields for indicator/evidence. | `api/models.py`. | **WORKING** (used in model fields). |
| `Project` | Core project entity with owner/members. | `api/models.py`, serializers, viewsets. | **WORKING** (used by APIs). |
| `Indicator` | Compliance indicator tied to project. | `api/models.py`, serializers, viewsets. | **WORKING** (used by APIs). |
| `Evidence` | Evidence attached to indicator; file URL/metadata. | `api/models.py`, serializers, viewsets, media serving. | **WORKING** (used by APIs). |
| `DriveConfig` | Stub for Google Drive integration. | `api/models.py` comment “stubbed for future…”, only read-only serializer. | **IMPLEMENTED BUT UNUSED** (no viewset or endpoints to create/manage). |

### Viewsets / API Resources
| Endpoint / Viewset | Purpose | Status |
| --- | --- | --- |
| `ProjectViewSet` (`/api/projects/`) | CRUD for projects; filters by owner/member. | **WORKING** (registered in router). |
| `IndicatorViewSet` (`/api/indicators/`) | CRUD + `quick_log` action. | **WORKING** (registered in router). |
| `EvidenceViewSet` (`/api/evidence/`) | CRUD with file upload/validation. | **WORKING** (registered in router). |

### Permissions / AuthZ
| Permission | Purpose | Status |
| --- | --- | --- |
| `IsProjectOwnerOrReadOnly` | Owners write; members read. | **WORKING** (used on `ProjectViewSet`). |
| `IsProjectMember` | Owners write; members read on indicators/evidence. | **WORKING** (used on `IndicatorViewSet`, `EvidenceViewSet`, and media access). |
| `IsAdmin` | Admin-only gate. | **IMPLEMENTED BUT UNUSED** (defined but not used in views). |
| `IsProjectOwner` | Owner-only check. | **IMPLEMENTED BUT UNUSED** (defined but not used in views). |
| `IsAuthenticatedReadOnly` | Authenticated read; owner/admin write. | **IMPLEMENTED BUT UNUSED** (defined but not used in views). |

### Auth / JWT
| Endpoint / Config | Purpose | Status |
| --- | --- | --- |
| `POST /api/auth/register/` | Create user + profile + tokens. | **IMPLEMENTED BUT UNUSED** (no frontend usage found). |
| `POST /api/auth/login/` | JWT login (token obtain). | **IMPLEMENTED BUT UNUSED** (no frontend usage found). |
| `POST /api/auth/logout/` | Token blacklist. | **IMPLEMENTED BUT UNUSED** (no frontend usage found). |
| `POST /api/auth/refresh/` | JWT refresh. | **IMPLEMENTED BUT UNUSED** (no frontend usage found). |
| `GET /api/auth/me/` | Current user profile. | **IMPLEMENTED BUT UNUSED** (no frontend usage found). |
| `POST /api/auth/change-password/` | Password change. | **IMPLEMENTED BUT UNUSED** (no frontend usage found). |
| `SIMPLE_JWT` settings | JWT auth configured; default permission `IsAuthenticated`. | **WORKING** (backend auth ready, but not integrated by frontend). |

### AI Service Endpoints
| Endpoint | Purpose | Status |
| --- | --- | --- |
| `POST /api/analyze-checklist/` | Enrich indicators. | **WORKING** (uses AI if configured; falls back). |
| `POST /api/analyze-categorization/` | AI manageability grouping. | **WORKING** (fallback logic present). |
| `POST /api/analyze-indicator-explanations/` | Explanations + evidence needs. | **WORKING** (fallback logic present). |
| `POST /api/analyze-frequency-grouping/` | Frequency grouping. | **WORKING** (fallback logic present). |
| `POST /api/ask-assistant/` | AI Q&A. | **WORKING** (fallback responses if no Gemini). |
| `POST /api/report-summary/` | AI summary for reports. | **WORKING** (fallback summary). |
| `POST /api/convert-document/` | Document → CSV conversion. | **WORKING** (fallback template). |
| `POST /api/compliance-guide/` | SOP/guide generation. | **WORKING** (fallback guide). |
| `POST /api/analyze-tasks/` | AI task suggestions. | **WORKING** (fallback suggestions). |

### Health / Observability
| Endpoint | Purpose | Status |
| --- | --- | --- |
| `GET /api/health/` | Health check + DB + Gemini config. | **IMPLEMENTED BUT UNUSED** (not referenced by frontend). |
| `GET /api/ready/` | Readiness with DB + migrations check. | **IMPLEMENTED BUT UNUSED** (not referenced by frontend). |
| `GET /api/live/` | Liveness check. | **IMPLEMENTED BUT UNUSED** (not referenced by frontend). |
| `GET /api/metrics/` | Authenticated metrics; admin-only. | **IMPLEMENTED BUT UNUSED** (not referenced by frontend). |
| `GET /api/media/<path>` | Authenticated media serving. | **PARTIALLY WIRED** (endpoint exists; frontend opens `fileUrl` directly, relying on infra to map `/media/*` to `/api/media/*`). |

---

## Frontend Inventory

### Screens / Views (App.tsx routing)
| View ID | Component | Purpose | Status |
| --- | --- | --- | --- |
| `projects` | `ProjectHub` | Project list + create/edit/delete actions. | **WORKING** (wired in App). |
| `dashboard` | `Dashboard` | Stats + charts for active project. | **WORKING** (derived from in-memory data). |
| `checklist` | `Checklist` | Indicator list + status updates + evidence links. | **WORKING** (API updates with local fallback). |
| `upcoming` | `UpcomingTasks` | Recurring task schedule + quick log. | **WORKING** (uses indicator data). |
| `analysis` | `AIAnalysis` | AI categorization/explanations/frequency grouping. | **WORKING** (uses API with fallback). |
| `library` | `DocumentLibrary` | Evidence browsing by section/indicator. | **WORKING** (uses indicator evidence data). |
| `ai` | `AIAssistant` | AI chat with indicators context. | **WORKING** (uses API with fallback). |
| `reports` | `Reports` | Report view + PDF export + AI summary. | **WORKING** (AI summary uses API with fallback). |
| `converter` | `Converter` | Document → CSV + import to new project. | **WORKING** (uses API with fallback). |

### API Layer
| API Functionality | Implementation | Status |
| --- | --- | --- |
| Base API client (`apiRequest`) | `fetch` with `VITE_API_URL`; handles JSON + FormData. | **WORKING**. |
| Projects/Indicators/Evidence CRUD | `api.getProjects`, `createProject`, `updateProject`, `deleteProject`, `updateIndicator`, `createEvidence`, `deleteEvidence`, `quickLogIndicator`. | **PARTIALLY WIRED** (backend endpoints require JWT auth; client sends no auth headers; falls back to localStorage on failure). |
| AI endpoints | analyze/categorize/explain/frequency/assistant/report/convert/guide/tasks | **WORKING** (client calls backend; fallback responses in client). |
| Offline/local mode | `localStorage` storage for `accredify_data`. | **WORKING** (used when API fails). |
| Debug logging | `localStorage` storage for `accredify_debug` + dev ingest endpoint. | **WORKING** (used in API layer). |

### Auth Handling
| Feature | Evidence | Status |
| --- | --- | --- |
| App-level auth (JWT login, token storage, auth headers) | No auth UI in `App.tsx` and no Authorization headers in API client. | **MISSING** (frontend does not integrate backend JWT auth). |
| Legacy/other auth UI | `frontend/src/main.jsx` implements `keystone_token` login flow and `/api/auth/token` calls, but is not used by `main.tsx`. | **IMPLEMENTED BUT UNUSED** (standalone/legacy UI not wired into app entry). |

### LocalStorage Usage
| Key | Usage | Status |
| --- | --- | --- |
| `accredify_data` | Offline storage for projects/indicators/evidence. | **WORKING**. |
| `accredify_debug` | Debug log ring buffer for API failures. | **WORKING**. |
| `keystone_token` | Token storage in unused `main.jsx`. | **IMPLEMENTED BUT UNUSED**. |

---

## Cross-Cut Observations (Wiring vs. Usage)

- **Backend JWT auth is enforced by default**, but the primary frontend app **does not send Authorization headers**, so the frontend relies on **localStorage fallback** instead of live backend data for core CRUD flows.
- **AI endpoints are wired on both sides**, and the frontend includes **fallback behavior** for AI responses when the backend or Gemini API is unavailable.
- **DriveConfig model is stubbed** and exposed only as read-only data in project serialization, with no create/update endpoints.

