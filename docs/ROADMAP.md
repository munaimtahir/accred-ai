# Roadmap

## Phases (0–6)
- **Phase 0 — Scope Freeze**: Document truth and lock scope.
- **Phase 1 — RIMS Happy Path E2E**: Make Registration → Performance → Verification → PDF work end-to-end.
- **Phase 2 — Remove Frontend Legacy Deps**: Eliminate unused/legacy client dependencies.
- **Phase 3 — Desk RBAC End-to-End**: Enforce role-based access across UI and API.
- **Phase 4 — OPD Finish or Disable**: Either complete OPD workflow or remove/disable it.
- **Phase 5 — Deployment Hardening**: Reliability, observability, security defaults.
- **Phase 6 — Student Portal Decision**: Decide separate module/repo approach.

## Why This Order
- Establishes a stable baseline before any engineering changes.
- Validates the core RIMS workflow early to reduce rework.
- Removes legacy UI dependencies before hardening authorization.
- Adds RBAC only after the happy path is verified.
- Avoids investing in OPD until core flows are stable.
- Hardening happens once functional behavior is confirmed.
- Student portal decisions wait until RIMS scope is solid.
