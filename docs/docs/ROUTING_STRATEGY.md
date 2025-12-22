
# Routing Strategy

AccrediFy employs a dual routing strategy: client-side routing for the frontend user interface and server-side routing for the backend API.

## 1. Frontend Routing (Client-Side)

The frontend is a **Single-Page Application (SPA)** built with React. This means that once the initial `index.html` is loaded, navigation between different sections of the application happens on the client-side without full page reloads.

### Mechanism

- **State-Based Routing**: Instead of using a traditional routing library like React Router, the application uses a state variable `currentView` within the main `App.tsx` component.
- **`View` Type**: The possible views are defined by the `View` type exported from `App.tsx`:
  ```typescript
  export type View = 'projects' | 'dashboard' | 'checklist' | 'reports' | 'ai' | 'converter' | 'analysis' | 'library';
  ```
- **Conditional Rendering**: The `App.tsx` component contains a `renderView()` function that acts as a router. It uses a `switch` statement on the `currentView` state to determine which main component to render.

```typescript
// Simplified example from App.tsx
const renderView = () => {
  // ...
  switch (currentView) {
    case 'dashboard':
      return <Dashboard ... />;
    case 'checklist':
      return <Checklist ... />;
    case 'projects':
      return <ProjectHub ... />;
    // ... other cases
    default:
      return null;
  }
};
```

- **Navigation**: Navigation is triggered by calling the `setCurrentView` state setter function, which is passed down as a prop (`onChangeView`) to components like the `Sidebar`. When a user clicks a navigation link, it updates the state, causing `App.tsx` to re-render and display the new view.

### Advantages of this Approach

- **Simplicity**: For an application with a fixed set of views and no complex URL parameters, this state-based approach is simple and easy to manage.
- **Centralized Control**: All main view transitions are managed within the root `App.tsx` component.

### Future Considerations

- If the application requires deep-linking (e.g., sharing a URL to a specific indicator), a library like **React Router** should be implemented. This would map browser URLs (e.g., `/project/123/indicator/456`) to specific component views.

## 2. Backend Routing (API Endpoints)

The backend uses **server-side routing** to expose its RESTful API. The routing is defined in Django.

### Mechanism

- **Root URLConf**: The entry point for all backend routing is `backend/accredify_backend/urls.py`. This file delegates all API-related traffic to the `api` app.

```python
# accredify_backend/urls.py
urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('api.urls')), # All API routes are prefixed with /api/
]
```

- **App URLConf**: The specific API endpoints are defined in `backend/api/urls.py`. This file uses the **Django REST Framework (DRF) `DefaultRouter`** to automatically generate standard routes for `ViewSet`s.

```python
# api/urls.py
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'projects', views.ProjectViewSet)
router.register(r'indicators', views.IndicatorViewSet)
# ...

urlpatterns = [
    path('', include(router.urls)),
    # Custom function-based views for AI services
    path('analyze-checklist/', views.analyze_checklist),
    # ...
]
```

### Generated Routes

The `DefaultRouter` automatically creates the following types of routes for a `ViewSet` like `ProjectViewSet`:

- `GET /api/projects/`: List all projects.
- `POST /api/projects/`: Create a new project.
- `GET /api/projects/{id}/`: Retrieve a specific project.
- `PATCH /api/projects/{id}/`: Partially update a specific project.
- `DELETE /api/projects/{id}/`: Delete a specific project.

### Custom Routes

- **`@action` Decorator**: For custom actions on a specific resource (e.g., "quick logging" an indicator), the `@action` decorator is used within the `ViewSet`. This creates a nested route like `POST /api/indicators/{id}/quick_log/`.
- **Function-Based Views**: For standalone actions that don't fit the standard CRUD model (like the AI services), simple function-based views are defined and wired up directly in `api/urls.py` (e.g., `POST /api/analyze-checklist/`).
