
# Technology Stack

AccrediFy is built on a modern, robust technology stack chosen for performance, scalability, and developer experience.

## Frontend

- **Framework**: **React 18.2.0**
  - *Why*: A powerful and popular library for building interactive user interfaces with a component-based architecture.

- **Language**: **TypeScript 5.2.2**
  - *Why*: Adds static typing to JavaScript, which helps catch errors early, improves code quality, and makes the codebase easier to maintain and refactor.

- **Build Tool**: **Vite 5.2.0**
  - *Why*: Offers an extremely fast development server with Hot Module Replacement (HMR) and an optimized build process for production.

- **Styling**: **Tailwind CSS**
  - *Why*: A utility-first CSS framework that allows for rapid UI development without writing custom CSS. It ensures design consistency and maintainability.

- **Data Visualization**: **Recharts 2.12.7**
  - *Why*: A composable charting library built on React components, making it easy to create beautiful and interactive dashboards.

- **Icons**: **Lucide React 0.378.0**
  - *Why*: Provides a large set of clean, consistent, and highly customizable SVG icons.

- **Client-Side Document Processing**:
  - **jsPDF & jspdf-autotable**: For generating PDF reports and log sheets directly in the browser.
  - **pdfjs-dist & mammoth**: For parsing `.pdf` and `.docx` files on the client-side for the Document-to-CSV Converter feature.

## Backend

- **Framework**: **Django 5.0**
  - *Why*: A high-level Python web framework that encourages rapid development and clean, pragmatic design. Its "batteries-included" philosophy provides an admin interface, ORM, and security features out of the box.

- **API Framework**: **Django REST Framework (DRF) 3.14.0**
  - *Why*: A powerful and flexible toolkit for building Web APIs on top of Django. It provides serializers, authentication, and viewsets for quickly creating RESTful endpoints.

- **Language**: **Python**
  - *Why*: A versatile, high-level language with a vast ecosystem of libraries, especially in the data science and AI fields. It is the natural choice for integrating with the Gemini API.

## Database

- **Development**: **SQLite**
  - *Why*: A lightweight, serverless, file-based database that is built into Python, making it perfect for local development and testing without complex setup.

- **Production (Recommended)**: **PostgreSQL**
  - *Why*: A powerful, open-source object-relational database system with a strong reputation for reliability, feature robustness, and performance. It is the recommended choice for production Django applications.

## AI & Services

- **AI Engine**: **Google Gemini API**
  - *Why*: Provides access to a family of powerful, multimodal large language models. The application uses different models based on the task:
    - `gemini-3-pro-preview`: For complex, high-quality generation tasks like document drafting and CSV conversion.
    - `gemini-3-flash-preview`: For faster, lower-latency tasks like AI chat responses and task categorization.

- **Cloud Storage (Future)**: **Google Drive API**
  - *Why*: Planned for secure, scalable cloud storage and backup of all evidence files. The backend includes stubs for this integration.

## DevOps & Deployment

- **Containerization**: **Docker & Docker Compose**
  - *Why*: To package the application and its dependencies into isolated containers, ensuring consistency across development, testing, and production environments. Docker Compose orchestrates the multi-container setup (backend, database, web server).

- **Web Server / Reverse Proxy**: **Nginx**
  - *Why*: A high-performance web server used to serve the frontend's static files, act as a reverse proxy for the Django backend, and handle SSL termination in production.

- **Application Server**: **Gunicorn**
  - *Why*: A production-grade WSGI HTTP server for Python applications, used to run the Django backend efficiently.
