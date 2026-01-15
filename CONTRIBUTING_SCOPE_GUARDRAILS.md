# Contributing Scope Guardrails

These guardrails freeze scope during the RIMS stabilization effort.

## Phase Definition of Done (High-Level)
- **Phase 0 — Scope Freeze**: Reality baseline documented, scope locked, constraints stated.
- **Phase 1 — RIMS Happy Path E2E**: Registration → Performance → Verification → PDF works end-to-end.
- **Phase 2 — Frontend Legacy Cleanup**: Remove unused legacy dependencies and references.
- **Phase 3 — Desk RBAC Enforcement**: Role-based access enforced across UI and API.
- **Phase 4 — OPD Decision**: Finish OPD workflow or disable it.
- **Phase 5 — Deployment Hardening**: Reliability, observability, and secure defaults.
- **Phase 6 — Student Portal Decision**: Decide separate module/repo for student portal work.

## Forbidden Actions (Until Phase 6)
- Do **not** add student/faculty/admin models or migrations.
- Do **not** add student portal routes or role-based UI for student management.
- Do **not** rename the product or change product identity.

## Execution Rules
- **One phase = one PR**.
- **Touch as few files as possible**.
- Prefer **new documentation** over edits to functional code.
- Do not extend legacy endpoints (`/api/studies`, `/api/reports`, `/api/visits`).
