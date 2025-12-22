
# System Architecture

## 1. High-Level Overview

AccrediFy is a modern web application with a decoupled architecture, consisting of a Single-Page Application (SPA) frontend and a RESTful backend API. This separation of concerns allows for independent development, deployment, and scaling of the client and server.

```
+------------------------+        +------------------------+
|   Browser (Client)     |        |      Server / Cloud    |
|------------------------|        |------------------------|
|                        |        |                        |
|   React + TypeScript   |        |   +----------------+   |
|   (Vite Build)         |<------>|   |     Nginx      |   |
|                        |  HTTPS |   +----------------+   |
|                        | (API)  |           |            |
+------------------------+        |           v            |
                                  |   +----------------+   |
                                  |   | Gunicorn /     |   |
                                  |   | Django (API)   |   |
                                  |   +----------------+   |
                                  |     |          ^       |
                                  |     v          |       |
                                  |   +----------------+   |
                                  |   |  PostgreSQL DB |   |
                                  |   +----------------+   |
                                  |           ^            |
                                  |           |            |
                                  |   +----------------+   |
                                  |   |  Gemini AI API |   |
                                  |   +----------------+   |
                                  +------------------------+
```

## 2. Frontend Architecture

The frontend is a **React Single-Page Application (SPA)** built with TypeScript and Vite.

### Core Principles
- **Component-Based**: The UI is built from a hierarchy of reusable React components located in the `/components` directory.
- **State Management**: State is managed locally within components using React Hooks (`useState`, `useMemo`, `useEffect`). For global state (like the current user or active project), this is handled in the root `App.tsx` component and passed down via props. For a larger application, a state management library like Zustand or React Context would be considered.
- **Service Abstraction**: All communication with the backend API is handled through a dedicated service layer (`/services/api.ts`). This decouples components from the data fetching logic and makes it easy to manage API calls.
- **Type Safety**: TypeScript (`/types.ts`) is used to define all data models, ensuring type safety throughout the application and providing clear contracts for API responses.

### Data Flow Example (Updating an Indicator)

1.  **User Interaction**: A user changes the status of an indicator in the `Checklist` component.
2.  **Event Handler**: The `onChange` event handler in the component is triggered.
3.  **State Update (Optimistic)**: The `App.tsx` component's state is immediately updated to reflect the change in the UI, providing a responsive user experience.
4.  **API Call**: The `api.updateIndicator()` function is called from the service layer.
5.  **HTTP Request**: An asynchronous `PATCH` request is sent to the backend API endpoint (`/api/indicators/{id}/`).
6.  **Backend Response**: The backend processes the request and responds. If successful, the frontend does nothing further. If it fails, the application should roll back the optimistic UI update and display an error message.

## 3. Backend Architecture

The backend is a **monolithic application** built with Python, Django, and the Django REST Framework (DRF).

### Core Principles
- **RESTful API**: The backend exposes a set of RESTful endpoints for the frontend to consume. It uses standard HTTP verbs (`GET`, `POST`, `PATCH`, `DELETE`) and status codes.
- **Model-View-Serializer (MVS)**: Following DRF conventions:
    - **Models** (`api/models.py`): Define the database schema and data relationships.
    - **Serializers** (`api/serializers.py`): Handle the conversion of complex data types (like Django model instances) to and from JSON. They also perform data validation.
    - **Views** (`api/views.py`): Contain the business logic for each API endpoint, processing requests and returning responses.
- **Service Layer Pattern**: For complex business logic, especially interactions with external services like the Gemini API, a service layer (`api/ai_services.py`) is used. This keeps the views thin and focused on handling HTTP-related tasks.
- **ORM**: The Django ORM (Object-Relational Mapper) is used for all database interactions, providing an abstraction layer over SQL and helping to prevent SQL injection vulnerabilities.

### AI Integration
- All calls to the Google Gemini API are made exclusively from the backend.
- This is a critical security measure to protect the API key, which is stored as an environment variable on the server and is never exposed to the client.
- The `ai_services.py` module acts as a dedicated service to handle prompt engineering, API calls, and response parsing, providing a clean interface for the views.

## 4. Database Schema

The database consists of several related tables. The primary models are:

- **Project**: The top-level container for a compliance initiative.
- **Indicator**: A specific compliance requirement within a Project.
- **Evidence**: A file, note, or link that serves as proof of compliance for an Indicator.

**Relationships:**
- A `Project` can have many `Indicator`s (One-to-Many).
- An `Indicator` can have many `Evidence` items (One-to-Many).

For a detailed breakdown of each field, see the [DATA_MODEL.md](DATA_MODEL.md) document.

## 5. Deployment Architecture (Production)

The recommended production setup uses Docker Compose to orchestrate three main services:

1.  **Nginx (Web Server)**:
    - The public-facing entry point.
    - Serves the static, optimized React frontend build.
    - Acts as a reverse proxy, forwarding all API requests (e.g., `/api/*`) to the Gunicorn service.
    - Handles SSL/TLS termination (HTTPS).

2.  **Gunicorn / Django (Application Server)**:
    - Runs the Python backend application.
    - Listens for requests from Nginx on an internal Docker network port.
    - Executes the business logic and communicates with the database and AI services.

3.  **PostgreSQL (Database)**:
    - The persistent data store.
    - Runs in its own container and is only accessible from the Django application container.
