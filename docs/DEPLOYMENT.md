# Deployment Guide - Coolify

This guide covers deploying AccrediFy to a VPS using Coolify.

## Prerequisites

- VPS with Docker installed
- Coolify installed and configured
- Domain name pointing to your VPS
- SSH access to VPS

## Coolify Setup

### 1. Create New Application

1. Log into Coolify dashboard
2. Navigate to "Applications"
3. Click "New Application"
4. Select "Docker Compose" as deployment method

### 2. Connect Repository

1. Connect your GitHub/GitLab repository
2. Select the `accred-ai` repository
3. Choose the branch (usually `main` or `develop`)

### 3. Configure Environment Variables

In Coolify, set the following environment variables:

```
DJANGO_SECRET_KEY=<generate-secure-key>
DEBUG=False
DATABASE_URL=postgresql://accredify_user:<password>@db:5432/accredify
DB_PASSWORD=<strong-password>
GEMINI_API_KEY=<your-gemini-key>
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
CORS_ALLOWED_ORIGINS=https://yourdomain.com
SENTRY_DSN=<your-sentry-dsn>  # Optional
```

### 4. Configure Docker Compose

Coolify will use the `docker-compose.yml` file from your repository. Ensure:
- Services are properly configured
- Health checks are set up
- Resource limits are appropriate

### 5. SSL Configuration

Coolify automatically handles SSL certificates via Let's Encrypt:
1. Enter your domain in Coolify
2. Coolify will automatically request and renew certificates
3. HTTPS will be enabled automatically

### 6. Database Setup

Coolify can manage PostgreSQL:
1. Create a PostgreSQL service in Coolify
2. Use the connection string in `DATABASE_URL`
3. Or use the `db` service from docker-compose.yml

## Deployment Steps

### Initial Deployment

1. **Push code to repository**
   ```bash
   git push origin main
   ```

2. **Coolify will automatically:**
   - Pull latest code
   - Build Docker images
   - Start services
   - Set up SSL

3. **Run initial setup:**
   ```bash
   # Access backend container via Coolify terminal
   python manage.py migrate
   python manage.py collectstatic --noinput
   python manage.py createsuperuser
   ```

### Subsequent Deployments

1. Push changes to repository
2. Coolify detects changes and redeploys
3. Services restart automatically
4. Health checks verify deployment

## Post-Deployment

### Verify Deployment

1. **Check health endpoints:**
   ```bash
   curl https://yourdomain.com/api/health/
   curl https://yourdomain.com/api/ready/
   ```

2. **Test authentication:**
   ```bash
   curl -X POST https://yourdomain.com/api/auth/register/ \
     -H "Content-Type: application/json" \
     -d '{"username":"test","email":"test@test.com","password":"Test123!","passwordConfirm":"Test123!"}'
   ```

3. **Access admin panel:**
   - Navigate to `https://yourdomain.com/admin/`
   - Login with superuser credentials

### Monitor Application

1. **View logs in Coolify:**
   - Navigate to application logs
   - Monitor for errors

2. **Check metrics:**
   - Use `/api/metrics/` endpoint (admin only)
   - Monitor resource usage in Coolify

## Coolify-Specific Configuration

### Environment Variables

Coolify allows setting environment variables per service:
- Set `DJANGO_SECRET_KEY` as a secret
- Configure `ALLOWED_HOSTS` with your domain
- Set `CORS_ALLOWED_ORIGINS` to your frontend URL

### Resource Limits

Adjust in Coolify dashboard:
- CPU limits
- Memory limits
- Storage limits

### Health Checks

Coolify uses health checks from docker-compose.yml:
- `/api/health/` for general health
- `/api/ready/` for readiness
- `/api/live/` for liveness

### Auto-Deploy

Configure in Coolify:
- Enable auto-deploy on push
- Set branch to monitor
- Configure deployment strategy

## Troubleshooting

### Deployment Fails

1. Check Coolify logs
2. Verify environment variables
3. Check Docker build logs
4. Review application logs

### SSL Issues

1. Verify domain DNS settings
2. Check Coolify SSL configuration
3. Allow time for certificate generation
4. Review Coolify SSL logs

### Database Connection

1. Verify database service is running
2. Check `DATABASE_URL` format
3. Test connection from backend container
4. Review database logs

## Maintenance

### Update Application

1. Push changes to repository
2. Coolify auto-deploys
3. Monitor deployment logs
4. Verify health endpoints

### Backup

1. Configure backups in Coolify
2. Or use manual backup scripts
3. Store backups securely

### Scaling

1. Adjust resource limits in Coolify
2. Scale services horizontally if needed
3. Monitor resource usage

## Best Practices

1. **Always test in staging first**
2. **Keep environment variables secure**
3. **Monitor application logs regularly**
4. **Set up backup automation**
5. **Keep dependencies updated**
6. **Review security updates**
7. **Monitor resource usage**

## Support

For Coolify-specific issues:
- Check Coolify documentation
- Review Coolify logs
- Contact Coolify support

For application issues:
- Review troubleshooting guide
- Check application logs
- Review runbook for common operations

