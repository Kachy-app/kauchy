# Kauchy

Kauchy is a full-stack marketplace application with:

- **Backend:** Django + Django REST Framework + Channels (WebSocket support)
- **Frontend:** Next.js (React)

## Repository Structure

- `./backend` — Django API and real-time services
- `./frontend` — Next.js web client

## Prerequisites

- Python 3.11+ (recommended)
- Node.js 18+ and npm
- Redis (required for Django Channels)
- PostgreSQL (or another DB URL compatible with `dj-database-url`)

## Backend Setup

1. Go to backend:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv .venv
   source .venv/bin/activate
   ```
   On Windows (PowerShell), use:
   ```powershell
   .venv\Scripts\Activate.ps1
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Set required environment variables (example keys used by settings):
   - `SECRET_KEY`
   - `DATABASE_URL`
   - `REDIS_URL`
   - `PAYSTACK_SECRET_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_SECRET`
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`
5. Run migrations:
   ```bash
   python manage.py migrate
   ```
6. Start the backend:
   ```bash
   daphne -b 0.0.0.0 -p 8000 Pymarket.asgi:application
   ```
   Or for local Django development:
   ```bash
   python manage.py runserver
   ```

## Frontend Setup

1. Go to frontend:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the frontend:
   ```bash
   npm run dev
   ```
4. Open `http://localhost:3000`.

## Useful Commands

### Frontend

```bash
cd frontend
npm run dev
npm run build
npm run lint
```

### Backend

```bash
cd backend
python manage.py migrate
python manage.py test
```

## API Docs and Health Check

- OpenAPI schema: `http://localhost:8000/api/schema/`
- Swagger UI: `http://localhost:8000/api/schema/swagger-ui/`
- Health check: `http://localhost:8000/health/`
