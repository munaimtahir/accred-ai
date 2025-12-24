# Keystone Deployment Quick Start

This is a quick reference guide for deploying AccrediFy on Keystone. For complete details, see `KEYSTONE_DEPLOYMENT.md` and `KEYSTONE_TEST_PLAN.md`.

## Prerequisites

- Keystone VPS with Traefik configured
- Docker and Docker Compose
- Your chosen APP_SLUG (e.g., `accred-ai`)

## 5-Minute Setup

### 1. Clone Repository

```bash
git clone https://github.com/munaimtahir/accred-ai.git
cd accred-ai
```

### 2. Create `.env` File

```bash
cp .env.example .env
```

Edit `.env` and set these **required** variables:

```bash
# YOUR APP SLUG (choose one)
FORCE_SCRIPT_NAME=/accred-ai
VITE_BASE_PATH=/accred-ai

# YOUR VPS IP or DOMAIN
ALLOWED_HOSTS=1.2.3.4,yourdomain.com
CORS_ALLOWED_ORIGINS=http://1.2.3.4,http://yourdomain.com
CSRF_TRUSTED_ORIGINS=http://1.2.3.4,http://yourdomain.com

# ENABLE REVERSE PROXY
USE_X_FORWARDED_HOST=True

# SECURITY (generate strong passwords!)
DB_PASSWORD=your-strong-db-password-here
DJANGO_SECRET_KEY=your-50-char-secret-key-here

# OPTIONAL
GEMINI_API_KEY=your-api-key-if-using-ai-features
DEBUG=False
```

### 3. Build with Subpath

```bash
docker-compose build --build-arg VITE_BASE_PATH=/accred-ai
```

### 4. Add Traefik Labels

In your Keystone configuration or `docker-compose.yml`, add these labels to the `nginx` service:

```yaml
services:
  nginx:
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.accredify.rule=PathPrefix(`/accred-ai`)"
      - "traefik.http.routers.accredify.middlewares=accredify-stripprefix"
      - "traefik.http.middlewares.accredify-stripprefix.stripprefix.prefixes=/accred-ai"
      - "traefik.http.services.accredify.loadbalancer.server.port=80"
```

**⚠️ CRITICAL:** Replace `/accred-ai` with your chosen APP_SLUG everywhere.

### 5. Start Services

```bash
docker-compose up -d
```

### 6. Run Migrations

```bash
docker-compose exec backend python manage.py migrate
docker-compose exec backend python manage.py collectstatic --noinput
```

### 7. Verify Deployment

Open browser to: `http://YOUR_VPS_IP/accred-ai/`

You should see the AccrediFy interface.

## Quick Test

```bash
# Test API endpoint
curl http://YOUR_VPS_IP/accred-ai/api/projects/

# Should return: []
```

## Troubleshooting

### CSS/JS Not Loading (404)

**Fix:** Rebuild with correct `VITE_BASE_PATH`:
```bash
docker-compose build --build-arg VITE_BASE_PATH=/accred-ai frontend
docker-compose up -d
```

### API Calls Failing (CORS)

**Fix:** Check `CORS_ALLOWED_ORIGINS` and `CSRF_TRUSTED_ORIGINS` in `.env` include your VPS IP with `http://`:
```bash
CORS_ALLOWED_ORIGINS=http://1.2.3.4
CSRF_TRUSTED_ORIGINS=http://1.2.3.4
```

### 404 on Page Refresh

**Fix:** Verify Traefik `PathPrefix` rule includes your APP_SLUG:
```yaml
- "traefik.http.routers.accredify.rule=PathPrefix(`/accred-ai`)"
```

### Database Connection Error

**Fix:** Check database is healthy:
```bash
docker-compose ps
docker-compose logs db
```

## Important Notes

1. **APP_SLUG must match everywhere:**
   - `FORCE_SCRIPT_NAME=/your-slug`
   - `VITE_BASE_PATH=/your-slug`
   - Traefik PathPrefix: `/your-slug`
   - Traefik stripprefix: `/your-slug`

2. **No trailing slash:** Use `/accred-ai` not `/accred-ai/`

3. **Protocol in CORS:** Include `http://` or `https://` in CORS/CSRF origins

4. **Build argument:** Must pass `VITE_BASE_PATH` during build, not just runtime

## For More Help

- **Full Deployment Guide:** `docs/KEYSTONE_DEPLOYMENT.md`
- **Test Plan:** `docs/KEYSTONE_TEST_PLAN.md`
- **Fix Report:** `docs/KEYSTONE_FIX_REPORT.md`

## Environment Variables Cheat Sheet

| Variable | Example | Required |
|----------|---------|----------|
| `FORCE_SCRIPT_NAME` | `/accred-ai` | ✅ Yes |
| `VITE_BASE_PATH` | `/accred-ai` | ✅ Yes |
| `ALLOWED_HOSTS` | `1.2.3.4` | ✅ Yes |
| `CORS_ALLOWED_ORIGINS` | `http://1.2.3.4` | ✅ Yes |
| `CSRF_TRUSTED_ORIGINS` | `http://1.2.3.4` | ✅ Yes |
| `USE_X_FORWARDED_HOST` | `True` | ✅ Yes |
| `DB_PASSWORD` | Strong password | ✅ Yes |
| `DJANGO_SECRET_KEY` | 50+ chars | ✅ Yes |
| `USE_HTTPS_PROXY` | `True` | If using HTTPS |
| `GEMINI_API_KEY` | Your key | If using AI |
| `DEBUG` | `False` | ✅ Yes |

## Success Indicators

✅ Home page loads at `http://VPS_IP/accred-ai/`  
✅ No 404 errors in browser console  
✅ Can create and view projects  
✅ API calls succeed (check Network tab)  
✅ Navigation stays within `/accred-ai/` path  

---

**Need Help?** Check the logs:
```bash
docker-compose logs backend
docker-compose logs frontend
docker logs traefik
```
