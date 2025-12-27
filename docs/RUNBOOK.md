# Runbook - Common Operations

This runbook provides step-by-step instructions for common operations on AccrediFy.

## Application Restart

### Restart All Services

```bash
docker-compose restart
```

### Restart Specific Service

```bash
# Restart backend only
docker-compose restart backend

# Restart database
docker-compose restart db
```

### Graceful Restart

```bash
# Stop services gracefully
docker-compose stop

# Start services
docker-compose up -d
```

## Deployment

### Deploy New Version

```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose up -d --build

# Run migrations
docker-compose exec backend python manage.py migrate

# Collect static files
docker-compose exec backend python manage.py collectstatic --noinput
```

### Rollback Deployment

```bash
# Checkout previous version
git checkout <previous-commit-hash>

# Rebuild and restart
docker-compose up -d --build

# Restore database if needed
docker-compose exec -T db psql -U accredify_user -d accredify < backup.sql
```

## Database Operations

### Run Migrations

```bash
# Apply migrations
docker-compose exec backend python manage.py migrate

# Check migration status
docker-compose exec backend python manage.py showmigrations

# Create new migration
docker-compose exec backend python manage.py makemigrations
```

### Create Superuser

```bash
docker-compose exec backend python manage.py createsuperuser
```

### Database Shell

```bash
# Django shell
docker-compose exec backend python manage.py shell

# PostgreSQL shell
docker-compose exec db psql -U accredify_user -d accredify
```

## Monitoring

### Check Service Status

```bash
# Container status
docker-compose ps

# Service health
curl http://localhost:8000/api/health/
curl http://localhost:8000/api/ready/
curl http://localhost:8000/api/live/
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend

# Last 100 lines
docker-compose logs --tail=100 backend
```

### Resource Usage

```bash
# Container stats
docker stats

# Disk usage
docker-compose exec backend df -h
docker-compose exec db df -h
```

## Maintenance

### Clear Cache

```bash
# Clear Django cache (if configured)
docker-compose exec backend python manage.py clear_cache
```

### Clean Up

```bash
# Remove unused containers and images
docker system prune -a

# Remove volumes (WARNING: deletes data)
docker-compose down -v
```

### Update Dependencies

```bash
# Update Python packages
docker-compose exec backend pip install --upgrade -r requirements.txt

# Update npm packages
cd frontend && npm update
```

## User Management

### Create User via API

```bash
curl -X POST http://localhost:8000/api/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "newuser",
    "email": "user@example.com",
    "password": "SecurePass123!",
    "passwordConfirm": "SecurePass123!"
  }'
```

### Change User Password

```bash
# Via API (requires authentication)
curl -X POST http://localhost:8000/api/auth/change-password/ \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "oldPassword": "oldpass",
    "newPassword": "NewSecurePass123!",
    "newPasswordConfirm": "NewSecurePass123!"
  }'
```

## Troubleshooting

### Service Won't Start

1. Check logs: `docker-compose logs backend`
2. Verify environment variables
3. Check health endpoint
4. Review troubleshooting guide

### Database Connection Issues

1. Verify database container is running
2. Check database credentials
3. Test connection: `docker-compose exec backend python manage.py dbshell`

### Performance Issues

1. Check resource usage: `docker stats`
2. Review slow query logs
3. Check application logs for errors
4. Verify resource limits in docker-compose.yml

## Emergency Procedures

### Complete System Restart

```bash
# Stop all services
docker-compose down

# Remove containers (keeps volumes)
docker-compose rm -f

# Start services
docker-compose up -d

# Verify health
curl http://localhost:8000/api/health/
```

### Database Recovery

```bash
# Stop application
docker-compose stop backend

# Restore database
docker-compose exec -T db psql -U accredify_user -d accredify < backup.sql

# Start application
docker-compose start backend
```

### Rollback to Previous Version

```bash
# Checkout previous commit
git checkout <commit-hash>

# Rebuild
docker-compose up -d --build

# Restore database if schema changed
docker-compose exec -T db psql -U accredify_user -d accredify < backup.sql
```

## Scheduled Tasks

### Daily Tasks

- Check backup status
- Review error logs
- Monitor disk space
- Verify service health

### Weekly Tasks

- Review security updates
- Check dependency updates
- Review performance metrics
- Verify backup integrity

### Monthly Tasks

- Review and rotate logs
- Update documentation
- Security audit
- Performance optimization review

