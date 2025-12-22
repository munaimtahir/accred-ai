# Final Master Prompt: AccrediFy AI-Powered Compliance Platform (Version 3.0)

**Project Codename**: AccrediFy  
**Version**: 3.0  
**Date**: 2024  
**Reference Application**: [AI Studio Preview](https://ai.studio/apps/drive/1hQfMmoTCZHIfw4UVlkEF-BInwBmQo9kS?fullscreenApplet=true)

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Core Purpose & Guiding Principles](#1-core-purpose--guiding-principles)
3. [Technology Stack](#2-technology-stack-strict-adherence)
4. [System Architecture](#3-system-architecture)
5. [Data Model & Database Schema](#4-data-model--database-schema)
6. [Backend API Specification](#5-backend-api-specification)
7. [Frontend Implementation Details](#6-frontend-implementation-details)
8. [Key User Workflows](#7-key-user-workflows)
9. [Security & Authentication](#8-security--authentication)
10. [Deployment & DevOps](#9-deployment--devops)
11. [Deliverables & Acceptance Criteria](#10-deliverables--acceptance-criteria)
12. [Implementation Plan & Phases](#11-implementation-plan--phases)
13. [Quality Checklist](#12-quality-checklist)

---

## Project Overview

Build a pixel-perfect replica of the AccrediFy compliance management platform. This is a full-stack, AI-augmented system for laboratory compliance management, serving as a "single source of truth" for PHC (Primary Health Centre) laboratories.

**Architecture**: Decoupled React 18/TypeScript/Vite frontend + Python/Django 5/DRF backend with Google Gemini AI integration.

**Goal**: Create a functionally identical and visually matching replica of the reference application with all features working as specified.

---

## 1. Core Purpose & Guiding Principles

### Problem Domain

Address inefficiencies in laboratory compliance management:

- **Manual Tracking**: Using spreadsheets or paper checklists prone to error
- **Scattered Evidence**: Compliance documents stored in various locations, making audits difficult
- **Lack of Clarity**: Ambiguous requirements lead to inconsistent interpretations
- **Repetitive Tasks**: Generating SOPs, filling logs, creating reports consume valuable time

### Solution Pillars

1. **Clarity**: Structured digital checklists derived from complex regulations
2. **Efficiency**: AI-powered automation for document drafting, task categorization, and data entry assistance
3. **Control**: Unified evidence library where every document is digitally linked to its corresponding compliance indicator
4. **Insight**: Real-time dashboards and on-demand reports for clear compliance posture

### Target Audience

- **Lab Directors**: High-level overview and delegation
- **Quality Assurance Officers**: Day-to-day compliance management
- **Technicians**: Complete recurring tasks and upload evidence

### Design Philosophy

- **Clean, Modern, Intuitive, Responsive UI**
- **Color Palette**: 
  - Slate grays for backgrounds and text (`bg-slate-50`, `text-slate-700`, `text-slate-900`)
  - Indigo as primary accent (`bg-indigo-600`, `text-indigo-600`, `border-indigo-600`)
- **Visual Elements**:
  - Soft corners: `rounded-xl` or `rounded-2xl`
  - Subtle shadows: `shadow-sm`
  - Smooth transitions: `transition-all`
  - Hover effects: `group-hover:`
  - Clear focus states for accessibility

---

## 2. Technology Stack (Strict Adherence)

### Frontend

- **Framework**: React 18.2.0
- **Language**: TypeScript 5.2.2
- **Build Tool**: Vite 5.2.0
- **Styling**: Tailwind CSS (utility-first approach)
- **Data Visualization**: Recharts 2.12.7
- **Icons**: Lucide React 0.378.0
- **Document Processing**:
  - `jspdf@2.5.1` & `jspdf-autotable@3.8.2` (PDF generation)
  - `pdfjs-dist@4.3.136` (PDF parsing)
  - `mammoth@1.7.2` (DOCX parsing)

### Backend

- **Framework**: Django 5.0
- **API Framework**: Django REST Framework 3.14.0
- **Language**: Python
- **Database**: SQLite (development), PostgreSQL (production)
- **CORS**: django-cors-headers
- **Authentication**: djangorestframework-simplejwt (for production)

### AI Engine

- **Provider**: Google Gemini API via `@google/genai` SDK
- **Security**: All AI calls from backend only (API key stored as server-side environment variable)
- **Models**:
  - `gemini-3-pro-preview`: Complex, high-quality generation tasks (guides, CSV conversion)
  - `gemini-3-flash-preview`: Faster, lower-latency interactive tasks (chat, categorization)

### Deployment

- **Containerization**: Docker & Docker Compose
- **Web Server**: Nginx
- **Application Server**: Gunicorn
- **Database**: PostgreSQL (production)

---

## 3. System Architecture

### Architecture Pattern

Implement a **decoupled client-server architecture**:

- **Frontend (SPA)**: Pure client-side React application responsible for all UI rendering, state management, and user interactions. Communicates with backend exclusively via REST API calls defined in `services/api.ts`.

- **Backend (REST API)**: Monolithic Django application exposing RESTful API. Responsible for all business logic, data persistence (database interactions), and secure communication with external Google Gemini API.

### Data Flow

1. React components trigger event handlers
2. Handlers call functions in the `services/api.ts` layer
3. API service makes fetch requests to Django backend
4. Django views process requests, perform business logic, interact with database models, and call `ai_services.py` when necessary
5. Backend returns JSON responses
6. Frontend uses responses to update state and UI

### Naming Conventions

- **Frontend**: camelCase for all object properties
- **Backend**: Python's standard snake_case
- **Conversion**: Implement DRF utility or middleware to automatically handle camelCase ↔ snake_case conversion during serialization and deserialization

### Routing Strategy

#### Frontend (State-Based Routing)

- **No React Router** in initial version
- Use `currentView` state in `App.tsx` (useState)
- View type: `'projects' | 'dashboard' | 'checklist' | 'reports' | 'ai' | 'converter' | 'analysis' | 'library'`
- `renderView()` function uses switch statement to conditionally render components
- Navigation via `setCurrentView` passed to Sidebar as `onChangeView` prop
- **Future**: Consider React Router for deep-linking if needed

#### Backend (DRF Routing)

- Root URLConf: `backend/accredify_backend/urls.py`
- API routes: `backend/api/urls.py` using `DefaultRouter`
- Custom actions: `@action` decorator for ViewSet methods
- Function-based views: For standalone AI endpoints

### State Management

- **Local State**: React Hooks (`useState`, `useMemo`, `useEffect`) in components
- **Global State**: Managed in root `App.tsx`, passed down via props
- **Optimistic Updates**: Update UI immediately, rollback on API failure
- **No External Library**: No Context API or Zustand in initial version (consider for future if needed)

---

## 4. Data Model & Database Schema

### Enums (Django TextChoices)

#### ComplianceStatus

| Value | Description |
|-------|-------------|
| `'Not Started'` | The task has not yet been addressed |
| `'In Progress'` | The task is currently being worked on |
| `'Compliant'` | The task is complete and meets requirements |
| `'Non-Compliant'` | The task was attempted but failed to meet requirements |
| `'Not Applicable'` | The task does not apply to this specific context |

#### Frequency

| Value | Description |
|-------|-------------|
| `'One-time'` | A task that only needs to be completed once |
| `'Daily'` | A task that must be performed every day |
| `'Weekly'` | A task that must be performed every week |
| `'Monthly'` | A task that must be performed every month |
| `'Quarterly'` | A task that must be performed every four months |
| `'Annually'` | A task that must be performed every year |

### Models (backend/api/models.py)

#### Project

Represents a single compliance effort.

**Fields**:
- `id`: UUID (primary key)
- `name`: CharField
- `description`: TextField
- `createdAt`: DateTimeField (auto_now_add)

**Relationships**:
- Reverse relation: `indicators` (many Indicators)

#### Indicator

A specific compliance task.

**Fields**:
- `id`: UUID (primary key)
- `project`: ForeignKey(Project)
- `section`: CharField
- `standard`: CharField
- `indicator`: CharField
- `description`: TextField
- `score`: IntegerField (default=10)
- `responsiblePerson`: CharField (optional, null=True, blank=True)
- `frequency`: CharField (choices=Frequency, optional, null=True, blank=True)
- `assignee`: CharField (optional, null=True, blank=True)
- `status`: CharField (choices=ComplianceStatus)
- `notes`: TextField (optional, null=True, blank=True)
- `lastUpdated`: DateTimeField (optional, null=True, blank=True)
- `formSchema`: JSONField (optional, stores FormField[] array)
- `aiAnalysis`: JSONField (optional, stores analysis data with timestamp)
- `aiCategorization`: CharField (optional, choices: `'ai_fully_manageable' | 'ai_assisted' | 'manual'`, null=True, blank=True)
- `isAICompleted`: BooleanField (default=False)
- `isHumanVerified`: BooleanField (default=False)

**Relationships**:
- Reverse relation: `evidence` (many Evidence items)

#### Evidence

A piece of proof linked to an Indicator.

**Fields**:
- `id`: UUID (primary key)
- `indicator`: ForeignKey(Indicator)
- `dateUploaded`: DateTimeField (auto_now_add)
- `type`: CharField (choices: `'document' | 'image' | 'certificate' | 'note' | 'link'`)
- `fileName`: CharField (optional, null=True, blank=True)
- `fileUrl`: CharField (optional, stores file path/URL)
- `content`: TextField (optional, for 'note' type evidence)
- `driveFileId`: CharField (optional, for future Google Drive integration)
- `driveViewLink`: CharField (optional, for future Google Drive integration)
- `syncStatus`: CharField (optional, choices: `'synced' | 'pending' | 'error'`, null=True, blank=True)
- `fileSize`: CharField (optional, e.g., "1.2 MB")

#### FormField (Stored in Indicator.formSchema as JSON)

Defines a single field within a dynamic digital form.

```typescript
{
  name: string;        // Machine-readable identifier (e.g., "waste_weight_kg")
  label: string;       // Human-readable display text (e.g., "Waste Weight (kg)")
  type: 'text' | 'number' | 'date' | 'textarea';
  required?: boolean;  // Optional flag
}
```

#### DriveConfig (Stubbed for Future Implementation)

- `project`: OneToOneField(Project)
- `isConnected`: BooleanField
- `accountName`: CharField (optional)
- `rootFolderId`: CharField (optional)
- `lastSync`: DateTimeField (optional)

### Database Optimization

- Use `prefetch_related` for indicators and indicators__evidence to avoid N+1 query problems
- Add database indexes on frequently queried fields (project, status, frequency)

---

## 5. Backend API Specification

### Standard REST Endpoints

#### Projects (`/api/projects/`)

- `GET /`: List all projects (with prefetched indicators and evidence)
- `POST /`: Create project (supports nested indicator creation)
- `GET /{id}/`: Retrieve specific project
- `PATCH /{id}/`: Partially update project
- `DELETE /{id}/`: Delete project

#### Indicators (`/api/indicators/`)

- `GET /`: List all indicators (filterable by project)
- `GET /{id}/`: Retrieve specific indicator
- `PATCH /{id}/`: Partially update indicator
- `POST /{id}/quick_log/`: Custom action - set status to 'Compliant', update lastUpdated

#### Evidence (`/api/evidence/`)

- `GET /`: List evidence (filterable by indicator)
- `POST /`: Create evidence (handles multipart/form-data for file uploads)
- `GET /{id}/`: Retrieve specific evidence
- `DELETE /{id}/`: Delete evidence

**Evidence Creation Logic**:
- For 'note' type: Store text in 'content' field, no file upload required
- For file types: Handle multipart/form-data, save file, generate fileUrl
- For digital logs: Generate PDF from formSchema data, save as Evidence

### AI Service Endpoints (Function-Based Views)

#### POST `/api/analyze-checklist/`

**Input**: `{ indicators: IndicatorData[] }`  
**Process**: Send to Gemini API to enrich/standardize indicator data  
**Output**: `{ indicators: EnrichedIndicatorData[] }`

#### POST `/api/analyze-categorization/`

**Input**: `{ indicators: Indicator[] }`  
**Process**: Use Gemini to classify indicators  
**Output**: `{ ai_fully_manageable: [id1, ...], ai_assisted: [id2, ...], manual: [id3, ...] }`

#### POST `/api/ask-assistant/`

**Input**: `{ query: string, indicators?: Indicator[] }`  
**Process**: Construct detailed prompt for Gemini, get response  
**Output**: `{ response: string }`

#### POST `/api/report-summary/`

**Input**: `{ indicators: Indicator[] }`  
**Process**: Generate concise summary via Gemini  
**Output**: `{ summary: string }`

#### POST `/api/convert-document/`

**Input**: `{ document_text: string }`  
**Process**: Parse text with Gemini, structure into CSV  
**Output**: `{ csv_content: string }`

#### POST `/api/compliance-guide/`

**Input**: `{ indicator: Indicator }`  
**Process**: Generate detailed compliance guide via Gemini  
**Output**: `{ guide: string }`

#### POST `/api/analyze-tasks/`

**Input**: `{ indicators: Indicator[] }`  
**Process**: Get AI suggestions for actions  
**Output**: `[{ indicatorId: string, suggestion: string, isActionableByAI: boolean }, ...]`

### API Response Format

#### Success Response

```json
{
  "data": { ... },
  "message": "Optional success message"
}
```

#### Error Response

```json
{
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

### API Contract Requirements

- All responses must match TypeScript interfaces in `frontend/types.ts`
- Automatic camelCase conversion for JSON keys
- Nested data structures (projects → indicators → evidence) properly serialized

---

## 6. Frontend Implementation Details

### Root Component (App.tsx)

**Responsibilities**:
- Manage primary state: `projects`, `isLoading`, `activeProjectId`, `currentView`, modal visibility states
- Fetch initial project data on mount (`useEffect`)
- Contain all primary event handlers:
  - `handleSaveProject`
  - `handleUpdateIndicator`
  - `handleAddEvidence`
  - `handleDeleteProject`
  - `handleQuickLog`
  - etc.
- Implement optimistic updates with rollback on failure
- Routing logic via `renderView()` function

**State Structure**:

```typescript
const [projects, setProjects] = useState<Project[]>([]);
const [isLoading, setIsLoading] = useState<boolean>(false);
const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
const [currentView, setCurrentView] = useState<View>('projects');
const [showAddProjectModal, setShowAddProjectModal] = useState<boolean>(false);
// ... other modal states
```

### Component Breakdown

#### Sidebar (`components/Sidebar.tsx`)

- Fixed width: `w-72` (288px)
- Navigation menu with icons
- Dynamic visibility: Show/hide project-specific items based on `isProjectActive`
- Highlights active view
- Project selector dropdown

#### ProjectHub (`components/ProjectHub.tsx`)

- Landing page when no project active
- Project summary cards with:
  - Project name and description
  - Progress bar (calculated from indicator statuses)
  - Context menu (MoreVertical icon) for edit/delete
- "New Project" button (opens AddProjectModal)

#### Dashboard (`components/Dashboard.tsx`)

- Project overview page
- Two Recharts visualizations:
  - Vertical BarChart: "Section Readiness" (by section, showing compliance %)
  - PieChart: "Task Categories" (by frequency distribution)
- Summary statistics cards
- Recent activity feed

#### Checklist (`components/Checklist.tsx`)

- Core compliance management UI
- Tabs for filtering:
  - `'Action Required'`: Non-compliant indicators
  - `'AI Review'`: Indicators with `isAICompleted=true, isHumanVerified=false`
  - `'AI Assisted'`: Indicators with `aiCategorization='ai_assisted'`
  - `'Compliant'`: Status='Compliant'
  - `'Frequency Log'`: Recurring tasks
- Section filter dropdown
- Expandable accordion for each indicator:
  - Indicator details (section, standard, description, score)
  - Status dropdown
  - Assignee/responsible person fields
  - Evidence list with upload button
  - Notes field
  - AI analysis section (if available)
- Bulk selection checkbox
- Bulk actions toolbar (when items selected)
- "Final Approve" / "Reject" buttons for AI Review items

#### UpcomingTasks (`components/UpcomingTasks.tsx`)

- Dedicated view for recurring tasks
- Categorization:
  - "Overdue" (past due date based on frequency + lastUpdated)
  - "Due Today"
  - "Daily"
  - "Weekly"
  - "Monthly"
  - "Quarterly"
  - "Annually"
- Task cards with:
  - Task name and description
  - Due date calculation
  - "Log Evidence" button
  - "Mark Compliant" button (enabled if recent evidence exists)

#### AIAnalysis (`components/AIAnalysis.tsx`)

- AI categorization view
- "Categorize Indicators" button (triggers `/api/analyze-categorization/`)
- Three columns after analysis:
  - "Fully AI Manageable" (with "Auto-Write SOPs" bulk action)
  - "AI Assisted" (with "Deploy All Forms" bulk action)
  - "Physical Action" (manual tasks)
- Progress indicators for bulk operations

#### DocumentLibrary (`components/DocumentLibrary.tsx`)

- File explorer interface
- Left sidebar: Collapsible folder tree (organized by sections)
- Right panel: File grid with:
  - File icons/thumbnails
  - File names
  - Upload dates
  - Evidence type badges
  - Actions (view, download, delete)

#### AIAssistant (`components/AIAssistant.tsx`)

- Full-featured chat interface
- Message history
- Input field with send button
- Context awareness (current project/indicators)
- Streaming response support (if possible)

#### Reports (`components/Reports.tsx`)

- Printable report view
- AI-generated summary section (from `/api/report-summary/`)
- Detailed tabular log of all indicators:
  - Section, Standard, Indicator, Status, Score, Last Updated
- Export to PDF button
- Print-friendly styling

#### Converter (`components/Converter.tsx`)

- Document-to-CSV conversion tool
- File upload area (accepts PDF, DOCX)
- "Convert" button
- Textarea displaying resulting CSV
- "Download CSV" button
- "Import to Project" button (creates new project from CSV)

### Modals

#### AddProjectModal

- Project name input
- Description textarea
- CSV upload area (optional)
- "Create Project" button

#### EditProjectModal

- Pre-filled form with existing project data
- Update/Delete buttons

#### EvidenceModal

- Tabs: "Upload File", "Digital Log", "Add Note", "Add Link"
- File upload (for Upload File tab)
- Dynamic form fields (for Digital Log tab, based on formSchema)
- Textarea (for Add Note tab)
- URL input (for Add Link tab)
- "Save Evidence" button

#### AIReviewModal

- Display AI-generated document (PDF viewer or text)
- "Final Approve" button
- "Reject" button (with reason textarea)

#### DeleteConfirmationModal

- Warning message
- "Cancel" / "Delete" buttons

### Service Layer (services/api.ts)

**Structure**:

```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export const api = {
  // Projects
  getProjects: () => Promise<Project[]>,
  createProject: (data: CreateProjectData) => Promise<Project>,
  updateProject: (id: string, data: Partial<Project>) => Promise<Project>,
  deleteProject: (id: string) => Promise<void>,
  
  // Indicators
  updateIndicator: (id: string, data: Partial<Indicator>) => Promise<Indicator>,
  quickLogIndicator: (id: string) => Promise<Indicator>,
  
  // Evidence
  createEvidence: (data: CreateEvidenceData) => Promise<Evidence>,
  deleteEvidence: (id: string) => Promise<void>,
  
  // AI Services
  analyzeChecklist: (indicators: IndicatorData[]) => Promise<IndicatorData[]>,
  analyzeCategorization: (indicators: Indicator[]) => Promise<CategorizationResult>,
  askAssistant: (query: string, context?: Indicator[]) => Promise<string>,
  generateReportSummary: (indicators: Indicator[]) => Promise<string>,
  convertDocument: (text: string) => Promise<string>,
  generateComplianceGuide: (indicator: Indicator) => Promise<string>,
  analyzeTasks: (indicators: Indicator[]) => Promise<TaskSuggestion[]>,
};
```

**Fallback Mechanism**:
- If backend unreachable, use localStorage for basic CRUD operations
- Show warning message to user
- Sync to backend when connection restored

### Styling & UI/UX

#### Layout

- Fixed sidebar: `w-72` (288px)
- Main content: `flex-1` with padding
- Responsive: Sidebar collapses on mobile (hamburger menu)

#### Color Palette

- Background: `bg-slate-50` or `bg-white`
- Text: `text-slate-700`, `text-slate-900`
- Primary accent: `bg-indigo-600`, `text-indigo-600`, `border-indigo-600`
- Hover: `hover:bg-indigo-700`
- Success: `bg-green-500`
- Warning: `bg-yellow-500`
- Error: `bg-red-500`

#### Interactive Elements

- Buttons: `rounded-lg`, `px-4 py-2`, `transition-all`, `hover:shadow-md`
- Cards: `rounded-xl`, `shadow-sm`, `bg-white`, `p-6`
- Inputs: `rounded-lg`, `border-slate-300`, `focus:border-indigo-500`, `focus:ring-2`

#### Animations

- Fade in: `animate-fade-in` (custom Tailwind animation)
- Smooth transitions: `transition-all duration-200`

---

## 7. Key User Workflows

### Workflow 1: Project Creation via CSV Upload

1. User clicks "New Project" on ProjectHub
2. AddProjectModal opens
3. User enters project name and description
4. User uploads CSV file
5. Frontend parses CSV, sends to `/api/analyze-checklist/`
6. Backend enriches data via Gemini, creates Project and Indicators
7. Backend returns complete project object
8. Modal closes, app navigates to Dashboard for new project

### Workflow 2: Daily Log Task

1. User navigates to UpcomingTasks (or Checklist "Frequency Log" tab)
2. User finds overdue daily task (e.g., "Record Refrigerator Temperature")
3. User clicks "Log Evidence"
4. EvidenceModal opens with "Digital Log" tab
5. Dynamic form fields displayed (based on formSchema)
6. User enters data (e.g., temperature: 4.5°C)
7. User clicks "Save Log"
8. Backend generates PDF from form data, creates Evidence record
9. User clicks "Mark Compliant" (now enabled)
10. Frontend calls `/api/indicators/{id}/quick_log/`
11. Backend updates status to 'Compliant', sets lastUpdated
12. Task card updates, no longer flagged as overdue

### Workflow 3: AI-Powered SOP Generation

1. User navigates to AIAnalysis view
2. User clicks "Categorize Indicators"
3. Backend calls Gemini API, returns categorization
4. Indicators displayed in three columns
5. User clicks "Auto-Write SOPs" for "Fully AI Manageable" column
6. Frontend iterates through indicator IDs
7. For each: Calls `/api/compliance-guide/`
8. Backend generates SOP via Gemini, creates PDF Evidence
9. Backend updates indicator: status='Compliant', isAICompleted=true, isHumanVerified=false
10. Progress bar shows completion
11. User navigates to Checklist "AI Review" tab
12. Generated SOPs appear in queue
13. User clicks "Final Approve" on an item
14. Backend sets isHumanVerified=true
15. Item moves to "Compliant" tab

---

## 8. Security & Authentication

### Current State (Development)

- **No Authentication**: Development/demo only
- **API is Open**: No user differentiation
- **Not Production-Ready**: Must implement security before deployment

### Production Requirements

#### Authentication

- **Method**: JWT tokens via `djangorestframework-simplejwt`
- **Endpoints**: 
  - `/api/token/` (login)
  - `/api/token/refresh/` (refresh)
- **Token Storage**: Access token in memory, refresh token in HttpOnly cookie
- **Authorization Header**: `Authorization: Bearer <token>`

#### Authorization

- **Role-Based Access Control (RBAC)**:
  - **Admin**: Full control over all projects and users
  - **Project Manager/Lab Director**: Full control over assigned projects
  - **Technician/Member**: View, upload evidence, update assigned tasks
- **Object-Level Permissions**: Custom DRF permission classes

#### API Security

- **Rate Limiting**: On all endpoints (especially AI endpoints)
- **Input Validation**: Via DRF serializers
- **CORS**: Strict `CORS_ALLOWED_ORIGINS` in production

#### Data Security

- **HTTPS/TLS**: Enforced via Nginx
- **Encryption at Rest**: Database level
- **Secret Management**: Environment variables only

#### Security Headers (Nginx)

- CSP (Content Security Policy)
- HSTS (HTTP Strict Transport Security)
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff

---

## 9. Deployment & DevOps

### Environment Variables

#### Backend (`backend/.env`)

```
DJANGO_SECRET_KEY=<long-random-string>
DEBUG=False
DATABASE_URL=postgresql://user:pass@db:5432/accredify
GEMINI_API_KEY=<google-gemini-api-key>
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
CORS_ALLOWED_ORIGINS=https://yourdomain.com
```

#### Frontend (`.env.production`)

```
VITE_API_URL=https://yourdomain.com/api
```

### Docker Deployment

#### Pre-Build Steps

```bash
cd frontend
npm install
npm run build  # Creates dist/ directory
```

#### Docker Compose Services

1. **`db` (PostgreSQL)**: Internal network only
2. **`backend` (Django/Gunicorn)**: Runs migrations on startup, internal network only
3. **`nginx`**: Public-facing, serves `/dist`, proxies `/api/*` to backend

#### Deployment Commands

```bash
docker-compose up -d --build
docker-compose exec backend python manage.py createsuperuser
```

### CI/CD Pipeline

**GitHub Actions** (`.github/workflows/ci.yml`):

- **Frontend CI**: Install deps, type check, build
- **Backend CI**: Install deps, Django checks, run tests
- **Security Scan**: `npm audit`, `pip-audit`

---

## 10. Deliverables & Acceptance Criteria

### Deliverable 1: Fully Functional React Frontend

**Process**:
- Create all components specified in Section 6.2
- Implement state management in App.tsx
- Build service layer with fallback to localStorage
- Style with Tailwind CSS per design specifications

**Acceptance**:
- ✅ Frontend runs without errors (`npm run dev`)
- ✅ All UI elements are interactive
- ✅ All workflows from Section 7 complete successfully
- ✅ Responsive design works on mobile/tablet/desktop
- ✅ Optimistic updates work with rollback on failure

### Deliverable 2: Complete Django Backend

**Process**:
- Create Django project structure
- Implement models in `api/models.py` (exact match to Section 4)
- Create serializers with camelCase conversion
- Implement all ViewSets and function-based views
- Create `ai_services.py` module for Gemini integration

**Acceptance**:
- ✅ Backend runs without errors (`python manage.py runserver`)
- ✅ All database migrations apply successfully
- ✅ All 14+ API endpoints are reachable and functional
- ✅ API responses match TypeScript interfaces exactly
- ✅ N+1 query problems avoided (prefetch_related used)

### Deliverable 3: Perfect API Contract Adherence

**Process**:
- Serializers produce JSON matching `types.ts` interfaces
- Automatic camelCase conversion implemented
- Nested structures properly serialized
- Error responses follow standard format

**Acceptance**:
- ✅ All API responses validate against TypeScript types
- ✅ No field name mismatches (camelCase in JSON)
- ✅ Nested data (projects → indicators → evidence) works correctly

### Deliverable 4: Functional AI Integration

**Process**:
- Implement all functions in `ai_services.py`
- Use correct Gemini models per task type
- Handle errors gracefully (fallback responses)
- Secure API key management

**Acceptance**:
- ✅ All AI features work (Assistant, Analysis, Guide generation, etc.)
- ✅ Responses are context-aware and intelligent
- ✅ System degrades gracefully if API key missing
- ✅ Rate limiting handled appropriately

### Deliverable 5: Comprehensive Documentation

**Process**:
- Create/update all markdown files in `docs/` directory
- Include README.md with setup instructions
- Document API endpoints
- Provide architecture diagrams

**Acceptance**:
- ✅ All documentation files present and accurate
- ✅ New developer can set up environment from docs
- ✅ API documentation complete

### Deliverable 6: Containerized Deployment

**Process**:
- Create `Dockerfile` for frontend and backend
- Create `docker-compose.yml` with all services
- Configure Nginx for static files and reverse proxy
- Set up environment variable management

**Acceptance**:
- ✅ `docker-compose up` builds and starts all services
- ✅ Application fully accessible via browser
- ✅ Database migrations run automatically
- ✅ Static files served correctly

---

## 11. Implementation Plan & Phases

### Phase 1: Foundation (Week 1-2)

- [ ] Set up project structure (frontend + backend)
- [ ] Configure build tools (Vite, Django)
- [ ] Set up database models
- [ ] Create TypeScript types matching models
- [ ] Implement basic API endpoints (Projects, Indicators, Evidence)
- [ ] Create service layer with localStorage fallback

### Phase 2: Core UI Components (Week 3-4)

- [ ] Build Sidebar component
- [ ] Build ProjectHub component
- [ ] Build Dashboard with charts
- [ ] Build Checklist component (basic structure)
- [ ] Implement routing logic in App.tsx
- [ ] Create basic modals

### Phase 3: Advanced Features (Week 5-6)

- [ ] Complete Checklist component (tabs, filters, accordion)
- [ ] Build UpcomingTasks component
- [ ] Build AIAnalysis component
- [ ] Build DocumentLibrary component
- [ ] Build AIAssistant component
- [ ] Build Reports component
- [ ] Build Converter component

### Phase 4: AI Integration (Week 7)

- [ ] Implement `ai_services.py` module
- [ ] Create all AI endpoints
- [ ] Integrate Gemini API calls
- [ ] Implement error handling and fallbacks
- [ ] Test all AI workflows

### Phase 5: Polish & Testing (Week 8)

- [ ] Implement optimistic updates
- [ ] Add loading states and error handling
- [ ] Polish UI/UX (animations, transitions)
- [ ] Test all workflows end-to-end
- [ ] Fix bugs and edge cases

### Phase 6: Deployment Preparation (Week 9)

- [ ] Create Dockerfiles
- [ ] Create docker-compose.yml
- [ ] Configure Nginx
- [ ] Set up environment variables
- [ ] Test deployment locally
- [ ] Write deployment documentation

### Phase 7: Security & Production Readiness (Week 10+)

- [ ] Implement JWT authentication
- [ ] Add role-based authorization
- [ ] Implement rate limiting
- [ ] Add security headers
- [ ] Conduct security audit
- [ ] Performance optimization

---

## 12. Quality Checklist

### Code Quality

- [ ] TypeScript strict mode enabled
- [ ] No `any` types (use proper types)
- [ ] ESLint configured and passing
- [ ] Python type hints where applicable
- [ ] DRF serializers validate all inputs
- [ ] Database queries optimized (no N+1)

### Testing

- [ ] Unit tests for critical business logic
- [ ] Integration tests for API endpoints
- [ ] E2E tests for key workflows
- [ ] Test coverage > 70%

### Documentation

- [ ] README.md with setup instructions
- [ ] API documentation (OpenAPI/Swagger)
- [ ] Code comments for complex logic
- [ ] Architecture diagrams
- [ ] Deployment guide

### Performance

- [ ] Page load time < 2 seconds
- [ ] API response time < 500ms (non-AI endpoints)
- [ ] Database indexes on frequently queried fields
- [ ] Frontend code splitting implemented
- [ ] Image optimization

### Security

- [ ] No secrets in code
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (ORM used)
- [ ] XSS prevention (React escapes by default)
- [ ] CORS properly configured
- [ ] HTTPS enforced in production

---

## Final Notes

This prompt is designed to produce a **pixel-perfect replica** of the AccrediFy application. Follow the specifications exactly, especially:

- Exact field names matching the data model
- UI/UX design specifications (colors, spacing, rounded corners)
- API contract adherence (camelCase JSON)
- Workflow implementations matching Section 7

**Reference Documentation**: The `docs/` directory contains additional details and clarifications. Refer to these documents when implementing:

- `ARCHITECTURE.md`: System architecture details
- `DATA_MODEL.md`: Complete data structure reference
- `ROUTING_STRATEGY.md`: Routing implementation details
- `WORKFLOWS.md`: Detailed user workflow descriptions
- `SECURITY_MODEL.md`: Security requirements and implementation
- `DEPLOYMENT_CONVENTIONS.md`: Deployment procedures
- `TECH_STACK.md`: Technology choices and rationale

**Success Criteria**: The final application should be functionally identical to the reference app at the provided URL, with all features working as specified in this prompt and the supporting documentation.

---

**Document Version**: 3.0  
**Last Updated**: 2024  
**Status**: Production-Ready Specification

