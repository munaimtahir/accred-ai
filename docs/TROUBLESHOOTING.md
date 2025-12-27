# Troubleshooting Guide

Common issues and solutions for AccrediFy deployment and development.

## Database Issues

### Migration Errors

**Problem:** `django.db.utils.OperationalError: no such table`

**Solution:**
```bash
docker-compose exec backend python manage.py migrate
```

### Database Connection Refused

**Problem:** Cannot connect to PostgreSQL

**Solutions:**
1. Check if database container is running: `docker-compose ps`
2. Verify database credentials in `.env` file
3. Check network connectivity: `docker-compose exec backend ping db`
4. Restart database: `docker-compose restart db`

## Authentication Issues

### JWT Token Expired

**Problem:** `401 Unauthorized` errors after some time

**Solution:** Refresh the token using `/api/auth/refresh/` endpoint

### Cannot Register User

**Problem:** Registration fails with validation errors

**Solutions:**
1. Ensure password meets requirements (minimum length, complexity)
2. Check username/email uniqueness
3. Verify CORS settings allow frontend origin

## File Upload Issues

### File Upload Fails

**Problem:** `400 Bad Request` when uploading files

**Solutions:**
1. Check file size (max 10MB)
2. Verify file type is allowed (PDF, DOC, images, etc.)
3. Check disk space: `docker-compose exec backend df -h`

### Cannot Access Uploaded Files

**Problem:** `404 Not Found` when accessing media files

**Solutions:**
1. Verify user has permission to access the file
2. Check nginx configuration for media proxying
3. Verify file exists: `docker-compose exec backend ls -la /app/media/`

## Performance Issues

### Slow API Responses

**Problem:** API endpoints are slow

**Solutions:**
1. Check database query performance
2. Review slow query logs
3. Verify resource limits in docker-compose.yml
4. Check for N+1 queries in views

### High Memory Usage

**Problem:** Container memory usage is high

**Solutions:**
1. Adjust Gunicorn worker count
2. Review resource limits in docker-compose.yml
3. Check for memory leaks in application code

## Docker Issues

### Container Won't Start

**Problem:** Container exits immediately

**Solutions:**
1. Check logs: `docker-compose logs backend`
2. Verify environment variables are set
3. Check health check endpoint: `curl http://localhost:8000/api/health/`

### Build Fails

**Problem:** `docker-compose build` fails

**Solutions:**
1. Check Dockerfile syntax
2. Verify all dependencies in requirements.txt
3. Clear Docker cache: `docker-compose build --no-cache`

## Frontend Issues

### Cannot Connect to API

**Problem:** Frontend cannot reach backend API

**Solutions:**
1. Verify `VITE_API_URL` environment variable
2. Check CORS settings in backend
3. Verify nginx proxy configuration
4. Check browser console for CORS errors

### Build Fails

**Problem:** `npm run build` fails

**Solutions:**
1. Clear node_modules: `rm -rf node_modules && npm install`
2. Check TypeScript errors: `npm run lint`
3. Verify all dependencies are installed

## SSL/HTTPS Issues (Coolify)

### SSL Certificate Not Working

**Problem:** HTTPS not working in Coolify

**Solutions:**
1. Verify domain is correctly configured in Coolify
2. Check DNS settings point to Coolify server
3. Allow time for Let's Encrypt certificate generation
4. Check Coolify logs for SSL errors

## Logging and Debugging

### View Application Logs

```bash
# Backend logs
docker-compose logs -f backend

# All services
docker-compose logs -f

# Last 100 lines
docker-compose logs --tail=100 backend
```

### Enable Debug Mode

**Warning:** Only for development!

Set in `.env`:
```
DEBUG=True
```

### Check Health Status

```bash
# Health check
curl http://localhost:8000/api/health/

# Readiness check
curl http://localhost:8000/api/ready/

# Liveness check
curl http://localhost:8000/api/live/
```

## Common Error Messages

### `SECURITY ERROR: You must set DJANGO_SECRET_KEY`

**Solution:** Set `DJANGO_SECRET_KEY` in `.env` file

### `SECURITY ERROR: You must set ALLOWED_HOSTS`

**Solution:** Set `ALLOWED_HOSTS` in `.env` file with your domain

### `Permission denied` on API endpoints

**Solution:** Ensure you're authenticated and have proper JWT token

### `Rate limit exceeded`

**Solution:** Wait before making more requests, or adjust rate limits in settings

## Getting Help

1. Check application logs
2. Review health check endpoints
3. Verify environment variables
4. Check Docker container status
5. Review this troubleshooting guide
6. Check GitHub issues for similar problems

