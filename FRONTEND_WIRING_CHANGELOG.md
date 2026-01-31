# Frontend Wiring Changelog

## Changes
- **src/services/api.ts**:
  - Added `importIndicators(projectId, file)`
  - Added `getUpcoming(projectId)`
  - Added `getAuditLogs()`
  - Added `getUserInfo()`
  - Purpose: Connect frontend to existing backend endpoints.

- **src/types.ts**:
  - Added `audit` to `View` type.
  - Purpose: Support new Audit Logs view.

- **src/components/Checklist.tsx**:
  - Added "Import CSV" button in the header.
  - Wired `onImportIndicators` prop to handle file upload.
  - Purpose: Enable CSV import from UI.

- **src/components/UpcomingTasks.tsx**:
  - Replaced heuristic logic with `api.getUpcoming` call.
  - Added `projectId` prop.
  - Purpose: Use backend "ground truth" for upcoming tasks.

- **src/components/Sidebar.tsx**:
  - Added "Audit Logs" navigation item.
  - Added `requiresAdmin` logic to hide it for non-staff users.
  - Purpose: Admin-only access to audit logs.

- **src/components/AuditLogs.tsx** (New File):
  - Created Audit Logs view with table display.
  - Fetches data from `api.getAuditLogs`.
  - Purpose: Display audit logs.

- **src/App.tsx**:
  - Wired `AuditLogs` component.
  - Wired `onImportIndicators` handler in `Checklist`.
  - Passed `projectId` to `UpcomingTasks`.
  - Implemented role-based access check for `audit` view.
  - Purpose: Integrate all new components and logic.

## Backend Status
- **Unchanged**: No backend code was modified.
- **Issue Observation**: `POST /api/projects/` returns 500 in deployment.
