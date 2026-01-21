# SECURITY INTENT

## API Authorization Policy
- **Protected Endpoints**: `/api/indicators/`, `/api/projects/`, `/api/evidence/` and all AI-integration endpoints require valid JWT authentication.
- **Anonymous Endpoints**: `/api/health/`, `/api/ready/`, `/api/live/` are publicly accessible for monitoring.
- **Admin Access**: `/admin/` is protected by Django session/auth and requires superuser privileges.

## CORS/CSRF Policy
- Access is restricted to `phc.alshifalab.pk` and `api.phc.alshifalab.pk`.
- HTTPS is enforced via Caddy proxy and reflected in Django settings.

## Decision Record
- **Auth Decision**: It was decided to explicitly add `IsAuthenticated` to `IndicatorViewSet`, `ProjectViewSet`, and `EvidenceViewSet` to ensure a strict 401 response for unauthenticated access, rather than relying on empty querysets.
