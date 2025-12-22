
# Security Model

This document outlines the security architecture and best practices for the AccrediFy application. It covers the current state and the necessary requirements for a production-ready deployment.

## 1. Current Security State (Development)

The application in its current form is intended for **development and demonstration purposes only**. It lacks the critical security features required for a production environment.

- **No Authentication**: There is no user login system. The API is open and does not differentiate between users.
- **No Authorization**: There are no permission checks. Any user can view, create, or delete any data.
- **API Key Handling**: The Google Gemini API key is managed via environment variables, which is a correct practice. However, it is loaded into the frontend for direct API calls in the standalone version, which is **unsafe for production**. The full-stack version correctly keeps the key on the backend.
- **Transport Security**: The default setup runs over HTTP, not HTTPS.

**Conclusion: The application is currently insecure and must not be deployed to a public-facing environment.**

## 2. Production Security Requirements

The following layers of security must be implemented before the application can be considered for production deployment.

### 2.1. Authentication

**Goal**: To verify the identity of users before granting them access.

- **Proposed Method**: **JSON Web Tokens (JWT)**.
  - **Why**: JWT is a stateless, industry-standard method ideal for decoupled frontend/backend applications.

- **Workflow**:
  1.  **User Registration**: A new user signs up with credentials (e.g., email and password).
  2.  **User Login**: A user submits their credentials to a `/api/token/` endpoint.
  3.  **Token Issuance**: If the credentials are valid, the Django backend generates a short-lived **access token** and a long-lived **refresh token**.
  4.  **Token Storage**: The frontend stores these tokens securely (e.g., access token in memory, refresh token in an `HttpOnly` cookie).
  5.  **Authenticated Requests**: For every subsequent API request, the frontend includes the access token in the `Authorization: Bearer <token>` header.
  6.  **Token Validation**: The backend validates the token on every request to identify the user.
  7.  **Token Refresh**: When the access token expires, the frontend uses the refresh token to silently obtain a new one from a `/api/token/refresh/` endpoint without requiring the user to log in again.

### 2.2. Authorization (Permissions)

**Goal**: To ensure that authenticated users can only access and modify data they are permitted to.

- **Proposed Method**: **Role-Based Access Control (RBAC)** and **Object-Level Permissions**.

- **Roles to Define**:
  - **Admin**: Full control over all projects and users within an organization.
  - **Project Manager / Lab Director**: Full control over projects they own or are assigned to. Can invite/manage members.
  - **Technician / Member**: Can view indicators, upload evidence, and change the status of assigned tasks within a project. Cannot create new projects or modify project settings.

- **Implementation**:
  - Django's built-in permission system will be extended.
  - Custom permission classes in Django REST Framework will check if a user (`request.user`) has the right to perform an action on a specific object (e.g., IsOwnerOfProject).

### 2.3. API Security

- **Rate Limiting**: Implement rate limiting on the Django backend to prevent abuse, especially for AI-related endpoints and login attempts.
- **Input Validation**: All data sent to the API must be rigorously validated by DRF Serializers to prevent injection attacks and ensure data integrity.
- **CORS Configuration**: In production, `CORS_ALLOWED_ORIGINS` must be strictly limited to the domain where the frontend is hosted.

### 2.4. Data Security

- **Encryption in Transit**: All traffic between the client, server, and external APIs must be encrypted using **HTTPS (SSL/TLS)**. This is enforced at the Nginx reverse proxy level.
- **Encryption at Rest**: Sensitive data stored in the PostgreSQL database should be encrypted. This is often handled at the cloud provider or filesystem level.
- **Secret Management**: All sensitive keys (e.g., `DJANGO_SECRET_KEY`, `GEMINI_API_KEY`, database passwords) must be managed through environment variables and never be committed to version control.

### 2.5. Dependency Security

- **Regular Scans**: The CI/CD pipeline should include steps to automatically scan for vulnerabilities in both frontend (`npm audit`) and backend (`pip-audit`) dependencies.
- **Update Policy**: A policy should be in place to regularly update dependencies to patch security vulnerabilities.

## 3. Security To-Do List for Production

- [ ] Implement user registration, login, and logout endpoints.
- [ ] Integrate `djangorestframework-simplejwt` for JWT authentication.
- [ ] Create custom DRF permission classes for role and object-level checks.
- [ ] Enforce HTTPS across the entire application via Nginx.
- [ ] Configure and enable rate limiting on all API endpoints.
- [ ] Conduct a thorough review of all serializers to ensure strict validation.
- [ ] Add security headers (CSP, HSTS, X-Frame-Options) in the Nginx configuration.
- [ ] Set `DEBUG = False` in the production Django settings.
- [ ] Set up automated dependency vulnerability scanning in the CI pipeline.
