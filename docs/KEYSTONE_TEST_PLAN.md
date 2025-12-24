# Keystone Deployment Test Plan

This document outlines the testing steps required to verify that AccrediFy works correctly when deployed via Keystone with path-based routing.

## Overview

Keystone deploys apps under a subpath (e.g., `http://VPS_IP/{APP_SLUG}/`). Traefik strips the `{APP_SLUG}` prefix before forwarding requests to the container. The app must handle being accessed via this subpath.

## Test Environment Setup

### Option 1: Local Traefik Simulation (Recommended)

Create a local Traefik container that simulates Keystone's path-based routing:

1. Create a test docker-compose file (`docker-compose.keystone-test.yml`):
```yaml
version: '3.8'

services:
  traefik:
    image: traefik:v2.10
    command:
      - "--api.insecure=true"
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--entrypoints.web.address=:80"
    ports:
      - "80:80"
      - "8080:8080"  # Traefik dashboard
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    networks:
      - keystone-test

  accredify:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        VITE_BASE_PATH: /accred-ai
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.accredify.rule=PathPrefix(`/accred-ai`)"
      - "traefik.http.routers.accredify.middlewares=accredify-stripprefix"
      - "traefik.http.middlewares.accredify-stripprefix.stripprefix.prefixes=/accred-ai"
      - "traefik.http.services.accredify.loadbalancer.server.port=80"
    networks:
      - keystone-test

networks:
  keystone-test:
    driver: bridge
```

2. Set environment variables for Keystone deployment:
```bash
export VITE_BASE_PATH=/accred-ai
export FORCE_SCRIPT_NAME=/accred-ai
export ALLOWED_HOSTS=localhost,127.0.0.1
export CORS_ALLOWED_ORIGINS=http://localhost
export CSRF_TRUSTED_ORIGINS=http://localhost
export USE_X_FORWARDED_HOST=True
```

3. Start services:
```bash
docker-compose -f docker-compose.keystone-test.yml up --build
```

### Option 2: Manual Path Configuration

If you cannot run Traefik locally, you can test with environment variables:

```bash
export VITE_BASE_PATH=/accred-ai
export FORCE_SCRIPT_NAME=/accred-ai
```

Then access the app at `http://localhost:5173/accred-ai/` (dev mode)

## Test Checklist

### 1. Local Development Mode (Root Path)

Verify the app still works in standard development mode:

- [ ] Start app locally: `docker-compose up` or `npm run dev` (frontend) + `python manage.py runserver` (backend)
- [ ] Access: `http://localhost:5173/` or `http://localhost/`
- [ ] ✓ Home page loads without errors
- [ ] ✓ CSS and JS files load (check browser DevTools Network tab)
- [ ] ✓ Can create a new project
- [ ] ✓ Can navigate between views (Dashboard, Checklist, etc.)
- [ ] ✓ API calls succeed (check Network tab for `/api/...` requests)
- [ ] ✓ No console errors related to routing

### 2. Keystone Subpath Mode

Test the app under a subpath as it would be deployed via Keystone:

- [ ] Start app with Keystone simulation (see setup above)
- [ ] Access: `http://localhost/accred-ai/`
- [ ] ✓ Home page loads without errors (not 404)
- [ ] ✓ CSS loads correctly (no 404 for static assets in Network tab)
- [ ] ✓ JavaScript loads correctly (no 404 for JS bundles)
- [ ] ✓ Favicon loads (check for `/accred-ai/vite.svg`)
- [ ] ✓ Can create a new project
- [ ] ✓ Project creation redirects to dashboard within subpath (`/accred-ai/...`)
- [ ] ✓ Navigation stays within `/accred-ai/` subpath in browser URL
- [ ] ✓ API calls go to `/accred-ai/api/...` (check Network tab)
- [ ] ✓ All API endpoints return 200 OK (not 404)
- [ ] ✓ Can add indicators to project
- [ ] ✓ Can upload evidence files
- [ ] ✓ Can navigate between all views (Projects, Dashboard, Checklist, AI Analysis, etc.)
- [ ] ✓ Page refresh on deep links works (e.g., refresh on `/accred-ai/dashboard`)
- [ ] ✓ No console errors

### 3. API Endpoint Tests

Test critical API endpoints work correctly:

```bash
# Root mode - Direct backend testing (backend not behind Traefik)
curl http://localhost:8000/api/projects/

# Keystone mode - Through Traefik reverse proxy (production setup)
curl http://localhost/accred-ai/api/projects/
```

- [ ] ✓ GET `/api/projects/` returns empty array or project list
- [ ] ✓ POST `/api/projects/` creates a project
- [ ] ✓ GET `/api/projects/{id}/` returns project details
- [ ] ✓ PATCH `/api/indicators/{id}/` updates indicator
- [ ] ✓ POST `/api/indicators/{id}/quick_log/` sets status to Compliant

### 4. Static Files

- [ ] ✓ Django static files accessible at `/static/...` (for admin)
- [ ] ✓ Frontend assets load from correct path
- [ ] ✓ No hardcoded absolute paths like `src="/static/..."` in browser HTML

### 5. Admin Panel

- [ ] ✓ Django admin accessible at `/admin/` (root) or `/accred-ai/admin/` (subpath)
- [ ] ✓ Admin static files load correctly
- [ ] ✓ Can log in to admin panel

### 6. Negative Checks (Security)

Search codebase for dangerous patterns:

```bash
# These should NOT appear in browser-facing code:
grep -r 'src="/' frontend/src --include="*.tsx" --include="*.ts"
grep -r 'href="/' frontend/src --include="*.tsx" --include="*.ts"
grep -r 'fetch("/' frontend/src --include="*.tsx" --include="*.ts"

# Exception: Server-internal code is OK
```

- [ ] ✓ No hardcoded `src="/..."` in TSX/JSX files
- [ ] ✓ No hardcoded `href="/..."` in TSX/JSX files  
- [ ] ✓ No hardcoded `fetch("/...")` except in API service with BASE_PATH handling
- [ ] ✓ All asset references use relative paths or configured base path

## Automated Test Execution

Run automated tests to ensure nothing broke:

```bash
# Backend tests
cd backend
python manage.py test

# Expected output: All tests pass
```

## Known Limitations

### What Cannot Be Fully Tested Without Real Keystone

- Traefik's actual header forwarding (X-Forwarded-Host, X-Forwarded-Proto)
- Real VPS networking and firewall rules
- Production HTTPS termination at Traefik
- Multiple apps sharing the same VPS
- Keystone's specific Traefik middleware configuration

### Workarounds

For production deployment, monitor:
1. Traefik access logs
2. Backend application logs
3. Browser DevTools Console for client-side errors
4. Browser DevTools Network tab for failed requests

## Success Criteria

✅ **Ready for Keystone** if all of the following are true:

1. ✓ App works in local dev mode at root path (`/`)
2. ✓ App works in subpath mode (`/{APP_SLUG}/`)
3. ✓ No hardcoded absolute paths in frontend code
4. ✓ API calls route correctly through subpath
5. ✓ Static assets load from correct paths
6. ✓ Page refresh/direct navigation works
7. ✓ All automated tests pass
8. ✓ No console errors in either mode

## Troubleshooting

### Issue: 404 on Static Assets

**Symptoms:** CSS/JS files return 404

**Fix:** 
- Check `VITE_BASE_PATH` matches `FORCE_SCRIPT_NAME`
- Verify Vite build used correct base path
- Rebuild frontend with `--build-arg VITE_BASE_PATH=/accred-ai`

### Issue: API Calls Go to Root

**Symptoms:** API calls hit `http://VPS_IP/api/` instead of `http://VPS_IP/accred-ai/api/`

**Fix:**
- Verify `BASE_PATH` is set in `frontend/src/services/api.ts`
- Check browser console for API_BASE_URL value
- Ensure `VITE_BASE_PATH` was set during build

### Issue: Login Redirect to Root

**Symptoms:** After login, browser goes to `/` instead of `/accred-ai/`

**Fix:**
- Check Django `FORCE_SCRIPT_NAME` is set
- Verify no hardcoded `redirect('/')` in backend code

### Issue: Page Refresh Returns 404

**Symptoms:** Refreshing `/accred-ai/dashboard` returns 404

**Fix:**
- Ensure Traefik forwards all subpath requests to frontend
- Verify frontend nginx config has `try_files $uri $uri/ /index.html`
- Check SPA routing is configured correctly

## Contact

For issues specific to Keystone deployment, contact the Keystone team or refer to Keystone documentation.
