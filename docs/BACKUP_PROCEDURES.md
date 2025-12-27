# Backup Procedures

This document outlines backup and restore procedures for AccrediFy.

## Database Backups

### Manual Backup

```bash
# Using docker-compose
docker-compose exec db pg_dump -U accredify_user accredify > backup_$(date +%Y%m%d_%H%M%S).sql

# Or using docker directly
docker exec accred-ai-db-1 pg_dump -U accredify_user accredify > backup.sql
```

### Automated Backup Script

See `scripts/backup_db.sh` for automated backup script.

### Restore from Backup

```bash
# Restore database
docker-compose exec -T db psql -U accredify_user -d accredify < backup.sql

# Or using docker directly
docker exec -i accred-ai-db-1 psql -U accredify_user -d accredify < backup.sql
```

## Media Files Backup

### Backup Media Directory

```bash
# Create backup archive
docker-compose exec backend tar -czf /tmp/media_backup_$(date +%Y%m%d_%H%M%S).tar.gz /app/media

# Copy from container
docker cp accred-ai-backend-1:/tmp/media_backup.tar.gz ./backups/
```

### Restore Media Files

```bash
# Copy to container
docker cp ./backups/media_backup.tar.gz accred-ai-backend-1:/tmp/

# Extract in container
docker-compose exec backend tar -xzf /tmp/media_backup.tar.gz -C /
```

## Automated Backup Setup

### Using Cron (Linux)

Add to crontab:
```bash
# Daily backup at 2 AM
0 2 * * * /path/to/scripts/backup_db.sh
```

### Using Systemd Timer (Linux)

Create `/etc/systemd/system/accredify-backup.service`:
```ini
[Unit]
Description=AccrediFy Database Backup

[Service]
Type=oneshot
ExecStart=/path/to/scripts/backup_db.sh
```

Create `/etc/systemd/system/accredify-backup.timer`:
```ini
[Unit]
Description=Daily AccrediFy Backup

[Timer]
OnCalendar=daily
Persistent=true

[Install]
WantedBy=timers.target
```

Enable timer:
```bash
sudo systemctl enable accredify-backup.timer
sudo systemctl start accredify-backup.timer
```

## Backup Retention

Recommended retention policy:
- Daily backups: Keep for 7 days
- Weekly backups: Keep for 4 weeks
- Monthly backups: Keep for 12 months

## Backup Verification

### Verify Backup File

```bash
# Check backup file exists and is not empty
ls -lh backup.sql

# Verify SQL syntax
head -n 20 backup.sql
```

### Test Restore

Test restore procedure in a staging environment before relying on backups.

## Disaster Recovery

### Full System Restore

1. Restore database from backup
2. Restore media files
3. Verify application starts correctly
4. Test critical functionality

### Partial Restore

If only specific data needs restoration:
1. Identify affected records
2. Restore specific tables or records from backup
3. Verify data integrity

## Backup Storage

### Local Storage

Store backups on separate disk or filesystem from application.

### Remote Storage

Consider using:
- Cloud storage (S3, Google Cloud Storage)
- Network attached storage (NAS)
- Remote server

### Encryption

Encrypt backups containing sensitive data:
```bash
# Encrypt backup
gpg --symmetric --cipher-algo AES256 backup.sql

# Decrypt backup
gpg --decrypt backup.sql.gpg > backup.sql
```

## Monitoring Backups

### Check Backup Status

```bash
# List recent backups
ls -lth backups/

# Check backup script logs
tail -f /var/log/accredify-backup.log
```

### Backup Alerts

Set up monitoring to alert if backups fail or are missing.

