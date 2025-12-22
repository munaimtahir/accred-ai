# AccrediFy - AI-Powered Compliance Platform

AccrediFy is an intelligent, AI-powered compliance management platform designed to simplify and standardize laboratory licensing and MSDS compliance processes.

## Features

- **Multi-Project Management**: Handle multiple accreditation processes simultaneously
- **AI Compliance Assistant**: Chat interface for instant answers about regulations
- **Automated Document Generation**: Create SOPs and policy documents with a single click
- **Smart Task Categorization**: AI automatically sorts tasks into manageable categories
- **Document-to-CSV Converter**: Convert compliance documents into importable checklists
- **Real-Time Dashboards**: Visual overview of compliance posture
- **Evidence Management**: Centralized document library with digital forms

## Tech Stack

### Frontend
- React 18 + TypeScript
- Vite for build tooling
- Tailwind CSS for styling
- Recharts for data visualization
- Lucide React for icons

### Backend
- Django 5 + Django REST Framework
- SQLite (development) / PostgreSQL (production)
- Google Gemini AI integration

### Deployment
- Docker & Docker Compose
- Nginx reverse proxy
- Gunicorn application server

## Quick Start

### Prerequisites
- Node.js 18+
- Python 3.12+
- Docker & Docker Compose (for production)

### Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd accredify
   ```

2. **Backend Setup**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   
   # Create .env file
   cp .env.example .env
   # Edit .env and add your GEMINI_API_KEY
   
   # Run migrations
   python manage.py migrate
   
   # Start development server
   python manage.py runserver
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   
   # Create .env file (optional)
   cp .env.example .env.local
   
   # Start development server
   npm run dev
   ```

4. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000/api
   - Admin: http://localhost:8000/admin

### Production Deployment

1. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with production values:
   # - DB_PASSWORD: Strong database password
   # - DJANGO_SECRET_KEY: Random 50+ character string
   # - GEMINI_API_KEY: Your Google Gemini API key
   ```

2. **Build and start services**
   ```bash
   docker-compose up -d --build
   ```

3. **Create admin user**
   ```bash
   docker-compose exec backend python manage.py createsuperuser
   ```

4. **Access the application**
   - Application: http://localhost
   - Admin: http://localhost/admin

## Project Structure

```
accredify/
├── backend/                 # Django backend
│   ├── api/                 # Main API app
│   │   ├── models.py        # Database models
│   │   ├── serializers.py   # DRF serializers
│   │   ├── views.py         # API views
│   │   ├── urls.py          # URL routing
│   │   └── ai_services.py   # Gemini AI integration
│   ├── accredify_backend/   # Django project settings
│   └── requirements.txt     # Python dependencies
├── frontend/                # React frontend
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── services/        # API service layer
│   │   ├── types.ts         # TypeScript types
│   │   └── App.tsx          # Main application
│   └── package.json         # Node dependencies
├── nginx/                   # Nginx configuration
├── docs/                    # Documentation
├── docker-compose.yml       # Production Docker config
└── docker-compose.dev.yml   # Development Docker config
```

## API Endpoints

### Projects
- `GET /api/projects/` - List all projects
- `POST /api/projects/` - Create project
- `GET /api/projects/{id}/` - Get project details
- `PATCH /api/projects/{id}/` - Update project
- `DELETE /api/projects/{id}/` - Delete project

### Indicators
- `GET /api/indicators/` - List indicators (filterable by project)
- `PATCH /api/indicators/{id}/` - Update indicator
- `POST /api/indicators/{id}/quick_log/` - Quick log compliance

### Evidence
- `GET /api/evidence/` - List evidence
- `POST /api/evidence/` - Upload evidence
- `DELETE /api/evidence/{id}/` - Delete evidence

### AI Services
- `POST /api/analyze-checklist/` - Enrich checklist with AI
- `POST /api/analyze-categorization/` - Categorize indicators
- `POST /api/ask-assistant/` - AI chat assistant
- `POST /api/report-summary/` - Generate report summary
- `POST /api/convert-document/` - Convert document to CSV
- `POST /api/compliance-guide/` - Generate compliance guide

## Environment Variables

### Backend (.env)
```
DJANGO_SECRET_KEY=<random-secret-key>
DEBUG=True/False
DATABASE_URL=<postgresql-connection-string>
GEMINI_API_KEY=<google-gemini-api-key>
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:5173
```

### Frontend (.env.local)
```
VITE_API_URL=http://localhost:8000/api
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For questions or issues, please open a GitHub issue or contact the development team.
