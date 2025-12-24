# AccrediFy Keystone Deployment Guide

This guide provides instructions for deploying AccrediFy on a Keystone VPS with Traefik reverse proxy and path-based routing.

## Overview

**Keystone Architecture:**
- Multiple apps deployed on one VPS
- Traefik reverse proxy with PATH-BASED routing
- Apps accessed via: `http://VPS_IP/{APP_SLUG}/`
- Traefik strips `{APP_SLUG}` before forwarding to containers

**AccrediFy Stack:**
- Django backend (port 8000 internal)
- React/Vite frontend (port 80 internal)
- PostgreSQL database
- Nginx serving frontend static files

## Prerequisites

- Access to Keystone VPS
- Docker and Docker Compose installed on VPS
- Domain or VPS IP address
- Required API keys (Gemini API for AI features)

## Step 1: Choose Your APP_SLUG

Pick a unique slug for your deployment (e.g., `accred-ai`, `compliance`, `mylab-compliance`).

**Example:** `accred-ai`

Your app will be accessible at: `http://VPS_IP/accred-ai/`

## Step 2: Environment Configuration

Create a `.env` file with the following variables:

```bash
# Database
DB_PASSWORD=your-secure-database-password-here

# Django
DJANGO_SECRET_KEY=your-very-long-random-secret-key-at-least-50-chars
DEBUG=False

# Google Gemini AI
GEMINI_API_KEY=your-gemini-api-key-here

# Keystone Deployment - IMPORTANT!
# Replace "accred-ai" with your chosen APP_SLUG
FORCE_SCRIPT_NAME=/accred-ai
VITE_BASE_PATH=/accred-ai

# Network Configuration
# Replace with your VPS IP or domain
ALLOWED_HOSTS=1.2.3.4,yourdomain.com,localhost
CORS_ALLOWED_ORIGINS=http://1.2.3.4,http://yourdomain.com
CSRF_TRUSTED_ORIGINS=http://1.2.3.4,http://yourdomain.com

# Reverse Proxy Settings
USE_X_FORWARDED_HOST=True

# If using HTTPS (recommended for production)
USE_HTTPS_PROXY=True
```

### Environment Variable Reference

| Variable | Required | Purpose | Example |
|----------|----------|---------|---------|
| `FORCE_SCRIPT_NAME` | **YES** | Django subpath prefix | `/accred-ai` |
| `VITE_BASE_PATH` | **YES** | Frontend base path (must match above) | `/accred-ai` |
| `ALLOWED_HOSTS` | **YES** | Django allowed hosts | `1.2.3.4,domain.com` |
| `CORS_ALLOWED_ORIGINS` | **YES** | CORS origins | `http://1.2.3.4` |
| `CSRF_TRUSTED_ORIGINS` | **YES** | CSRF trusted origins | `http://1.2.3.4` |
| `USE_X_FORWARDED_HOST` | **YES** | Enable reverse proxy headers | `True` |
| `USE_HTTPS_PROXY` | Optional | If Traefik terminates TLS | `True` |
| `DB_PASSWORD` | **YES** | PostgreSQL password | Strong password |
| `DJANGO_SECRET_KEY` | **YES** | Django secret key | 50+ char random string |
| `GEMINI_API_KEY` | Optional | For AI features | Your API key |
| `DEBUG` | **YES** | Debug mode (False in prod) | `False` |

## Step 3: Build the Application

Build the Docker images with the correct base path:

```bash
# Build frontend with subpath support
docker-compose build --build-arg VITE_BASE_PATH=/accred-ai frontend

# Build backend
docker-compose build backend
```

## Step 4: Traefik Labels

Add these labels to your `docker-compose.yml` or Keystone configuration:

```yaml
services:
  nginx:
    labels:
      # Enable Traefik
      - "traefik.enable=true"
      
      # Router configuration
      - "traefik.http.routers.accredify.rule=PathPrefix(`/accred-ai`)"
      - "traefik.http.routers.accredify.entrypoints=web"
      
      # Strip prefix middleware (CRITICAL!)
      - "traefik.http.routers.accredify.middlewares=accredify-stripprefix"
      - "traefik.http.middlewares.accredify-stripprefix.stripprefix.prefixes=/accred-ai"
      
      # Service configuration
      - "traefik.http.services.accredify.loadbalancer.server.port=80"
      
      # Optional: HTTPS redirect
      # - "traefik.http.routers.accredify-secure.rule=PathPrefix(`/accred-ai`)"
      # - "traefik.http.routers.accredify-secure.entrypoints=websecure"
      # - "traefik.http.routers.accredify-secure.tls=true"
```

**⚠️ CRITICAL:** The `stripprefix` middleware is essential. Traefik must strip `/accred-ai` before forwarding to the container.

## Step 5: Run Migrations and Collect Static Files

```bash
# Run database migrations
docker-compose exec backend python manage.py migrate

# Collect static files for Django admin
docker-compose exec backend python manage.py collectstatic --noinput

# Optional: Create superuser for admin access
docker-compose exec backend python manage.py createsuperuser
```

## Step 6: Start Services

```bash
docker-compose up -d
```

## Step 7: Verify Deployment

### Quick Verification

1. **Access the app:** `http://VPS_IP/accred-ai/`
   - Should show AccrediFy home page
   
2. **Check API:** `http://VPS_IP/accred-ai/api/projects/`
   - Should return `[]` or project list (JSON)
   
3. **Check admin:** `http://VPS_IP/accred-ai/admin/`
   - Should show Django admin login

### Detailed Verification

Follow the complete test plan: `docs/KEYSTONE_TEST_PLAN.md`

## Exposed Ports

**Internal ports (container):**
- Backend: 8000 (Gunicorn)
- Frontend: 80 (Nginx)
- Database: 5432 (PostgreSQL)

**External access:**
- All traffic goes through Traefik on port 80/443
- No ports need to be exposed to the host

## Network Architecture

```
Internet
  ↓
Traefik (port 80/443)
  ↓
Request: http://VPS_IP/accred-ai/api/projects
  ↓
Traefik strips /accred-ai
  ↓
Nginx (port 80) receives: /api/projects
  ↓
Proxies to Backend (port 8000)
  ↓
Django processes: /api/projects
```

## Troubleshooting

### CSS/JS Not Loading (404 errors)

**Issue:** Static assets return 404

**Solution:**
1. Verify `VITE_BASE_PATH=/accred-ai` was set during build
2. Rebuild frontend: `docker-compose build --build-arg VITE_BASE_PATH=/accred-ai frontend`
3. Check browser DevTools → Network tab for actual request URLs

### API Calls Failing (CORS errors)

**Issue:** Frontend can't reach backend

**Solution:**
1. Check `CORS_ALLOWED_ORIGINS` includes VPS IP/domain with protocol
2. Verify `CSRF_TRUSTED_ORIGINS` is set correctly
3. Ensure `USE_X_FORWARDED_HOST=True` in backend

### 404 on Page Refresh

**Issue:** Deep links return 404 (e.g., `/accred-ai/dashboard`)

**Solution:**
1. Verify Traefik is forwarding all `/accred-ai/*` requests to nginx
2. Check nginx config has `try_files $uri $uri/ /index.html`
3. Verify `PathPrefix` rule in Traefik labels

### Database Connection Errors

**Issue:** Backend can't connect to database

**Solution:**
1. Check `DATABASE_URL` is correct
2. Verify database service is healthy: `docker-compose ps`
3. Check database password matches in `.env`

### Admin Static Files Not Loading

**Issue:** Django admin has no styling

**Solution:**
1. Run: `docker-compose exec backend python manage.py collectstatic --noinput`
2. Verify `STATIC_ROOT=/app/staticfiles` is mounted
3. Check nginx serves `/static/` correctly

## Security Checklist

- [ ] `DEBUG=False` in production
- [ ] Strong `DJANGO_SECRET_KEY` (50+ characters)
- [ ] Strong `DB_PASSWORD`
- [ ] `ALLOWED_HOSTS` limited to VPS IP/domain (no wildcards)
- [ ] HTTPS enabled via Traefik (recommended)
- [ ] Regular security updates: `docker-compose pull`
- [ ] Database backups configured
- [ ] Environment file permissions: `chmod 600 .env`

## Backup and Restore

### Backup Database

```bash
docker-compose exec db pg_dump -U accredify_user accredify > backup.sql
```

### Restore Database

```bash
cat backup.sql | docker-compose exec -T db psql -U accredify_user accredify
```

### Backup Media Files

```bash
docker-compose exec backend tar czf - /app/media > media-backup.tar.gz
```

## Updating the Application

```bash
# Pull latest code
git pull origin main

# Rebuild containers
docker-compose build

# Restart services
docker-compose up -d

# Run migrations
docker-compose exec backend python manage.py migrate

# Collect static files
docker-compose exec backend python manage.py collectstatic --noinput
```

## Performance Tuning

### Gunicorn Workers

Adjust workers based on CPU cores:

```bash
# In docker-compose.yml backend command:
gunicorn --bind 0.0.0.0:8000 --workers 4 accredify_backend.wsgi:application
```

Rule of thumb: `workers = (2 * CPU_cores) + 1`

### Database Connection Pooling

For high traffic, consider adding connection pooling (e.g., PgBouncer).

## Monitoring

### Health Checks

- Endpoint: `http://VPS_IP/accred-ai/health` (if enabled)
- Database: `docker-compose exec db pg_isready -U accredify_user`

### Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f db

# Traefik logs (from Keystone/host)
docker logs traefik -f
```

## Support

For issues:
1. Check logs: `docker-compose logs`
2. Review test plan: `docs/KEYSTONE_TEST_PLAN.md`
3. Check environment variables are correct
4. Verify Traefik labels are properly configured

## Additional Resources

- Django Deployment Checklist: https://docs.djangoproject.com/en/stable/howto/deployment/checklist/
- Traefik Documentation: https://doc.traefik.io/traefik/
- Docker Compose Reference: https://docs.docker.com/compose/
