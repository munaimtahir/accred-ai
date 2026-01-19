# LOG INDEX

## Active Logs
Logs are captured via Docker JSON-file driver.

| Service | Log Source | How to access |
|---------|------------|---------------|
| `backend` | Docker logs | `docker compose logs backend` |
| `frontend`| Docker logs | `docker compose logs frontend` |
| `nginx` | Docker logs | `docker compose logs nginx` |
| `db` | Docker logs | `docker compose logs db` |

## Key Log Files in Volumes
- Static files: `static_volume` mapped to `/app/staticfiles`
- Media files: `media_volume` mapped to `/app/media`

## Critical Log Observations
- **Nginx**: Transitioned from `unhealthy` to `healthy` after healthcheck URL fix (`localhost` -> `127.0.0.1`).
- **Backend**: Successfully applied 4 migrations on startup.
- **Frontend**: Vite build successfully completed during Docker build.
