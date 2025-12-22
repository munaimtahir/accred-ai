
# Deployment Conventions

This document outlines the standard procedures and conventions for deploying the AccrediFy application. The recommended method for production is using Docker and Docker Compose.

## 1. Environment Variables

A critical convention is the strict separation of configuration from code using environment variables.

- **Template Files**: The repository contains `.env.example` files for both the frontend and backend. These files serve as templates.
- **Local Environment Files**: For local development, create `.env.local` (frontend) and `.env` (backend) by copying the examples. These files are listed in `.gitignore` and should **never be committed to version control**.
- **Production**: In a production environment, these variables must be provided to the application through the deployment platform's secret management system (e.g., Docker Compose `env_file`, Kubernetes Secrets, or server-level environment variables).

### Key Backend Variables (`backend/.env`)
- `DJANGO_SECRET_KEY`: A long, random string crucial for cryptographic signing.
- `DEBUG`: Must be set to `False` in production.
- `DATABASE_URL`: The connection string for the PostgreSQL database.
- `GEMINI_API_KEY`: The API key for Google Gemini services.
- `ALLOWED_HOSTS`: A comma-separated list of domains that can serve the site (e.g., `yourdomain.com,www.yourdomain.com`).

### Key Frontend Variables (`.env.production`)
- `VITE_API_URL`: The absolute URL to the backend API (e.g., `https://yourdomain.com/api`).

## 2. Docker-Based Deployment (Recommended)

The `docker-compose.yml` file in the root directory defines the production services.

### Services

1.  **`db` (PostgreSQL)**: The database service. Its port is not exposed to the host machine; it only communicates with the `backend` service over the internal Docker network.
2.  **`backend` (Django/Gunicorn)**: The application server. It runs migrations on startup and serves the Django application via Gunicorn. It is not exposed publicly; it receives traffic from the `nginx` service.
3.  **`nginx` (Nginx)**: The public-facing web server and reverse proxy.
    - It listens on ports 80 (HTTP) and 443 (HTTPS).
    - Serves the static React frontend build from `/dist`.
    - Forwards all requests starting with `/api/` to the `backend` service.
    - Handles SSL/TLS termination.

### Deployment Steps

1.  **Configure `.env`**: Create a `.env` file in the project root with all the required production variables.
2.  **Build Frontend Assets**: Before building the Docker images, you must build the static frontend files.
    ```bash
    npm install
    npm run build
    ```
    This creates a `dist` directory which will be served by Nginx.
3.  **Run Docker Compose**:
    ```bash
    docker-compose up -d --build
    ```
    This command builds the images and starts all services in detached mode.
4.  **Initial Setup (First-time only)**:
    - **Create Superuser**: To access the Django admin, you need to create a superuser.
      ```bash
      docker-compose exec backend python manage.py createsuperuser
      ```

## 3. Manual Deployment Conventions

While Docker is recommended, a manual deployment should follow this structure:

- **User**: The application should run under a dedicated, non-root user (e.g., `accredify`).
- **Code Location**: The repository should be cloned to a standard location, such as `/home/accredify/app`.
- **Gunicorn**: The Django application should be run by Gunicorn, managed by a `systemd` service for reliability and automatic restarts. Gunicorn should bind to a Unix socket (e.g., `/run/accredify.sock`), not a TCP port, for security and performance.
- **Nginx**: Nginx acts as a reverse proxy, forwarding requests from the public internet to Gunicorn's Unix socket. It is also responsible for serving static (`/static/`) and media (`/media/`) files directly for better performance.
- **Database**: PostgreSQL should be running on the same server or a dedicated database server, with access restricted to the application server's IP address.

## 4. CI/CD (Continuous Integration / Continuous Deployment)

The project includes a basic CI workflow in `.github/workflows/ci.yml`.

- **On Push/Pull Request**: The workflow is triggered automatically.
- **Jobs**:
    1.  **Frontend CI**: Installs dependencies, runs the TypeScript compiler to check for type errors, and performs a production build.
    2.  **Backend CI**: Installs Python dependencies and runs Django checks. (This should be expanded to run a full test suite).
    3.  **Security Scan**: Runs `npm audit` and `safety check` to find known vulnerabilities in dependencies.

A full CD (Continuous Deployment) pipeline would extend this to automatically deploy the application to a staging or production environment upon a successful merge to the `main` branch.
