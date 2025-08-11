# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Dance Motion Analyzer is an AI-powered dance learning platform that uses Gemini API for analysis and MediaPipe for pose detection. The project has evolved from an AI Studio-generated MVP to a production-ready platform with both frontend and backend components.

## Development Commands

### Frontend Development
```bash
# Install dependencies
cd frontend && npm install

# Start development server
cd frontend && npm run dev

# Build for production
cd frontend && npm run build

# Run linting
cd frontend && npm run lint
```

### Backend Development
```bash
# Setup Python environment
cd backend && python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
cd backend && pip install -r requirements.txt

# Start development server
cd backend && uvicorn app.main:app --reload

# Run tests
cd backend && pytest

# Format code
cd backend && black .

# Type checking
cd backend && mypy .
```

### Full Stack Development
```bash
# Install all dependencies
npm install:all

# Run both frontend and backend concurrently
npm run dev

# Docker development
docker-compose up

# Docker build
docker-compose build
```

## Architecture Overview

### System Design Philosophy
The project follows a "Gemini-First" architecture where the Gemini API serves as the central AI engine, eliminating the need for complex ML infrastructure. The system is designed to be simple yet powerful.

### Key Components

1. **Frontend (React + TypeScript)**
   - Located in `/frontend`
   - Uses MediaPipe.js for client-side pose detection
   - Integrates YouTube player for dance video playback
   - Real-time pose tracking at 30 FPS
   - Direct Gemini API integration for AI feedback

2. **Backend (FastAPI)**
   - Located in `/backend`
   - Handles authentication and session management
   - Provides API proxy for Gemini to protect API keys
   - Manages PostgreSQL database for user data
   - Redis caching for performance optimization
   - Celery for async task processing

3. **Data Flow**
   - User inputs YouTube URL → Frontend embeds video
   - MediaPipe processes webcam frames → Extracts pose keypoints
   - Every 3 seconds: Frontend sends frame + timestamp to Gemini API
   - Gemini returns analysis → Frontend displays feedback

### API Integration Points

- **Gemini API**: Multimodal analysis (text + image)
  - Model: gemini-1.5-flash
  - Rate limiting: 3-second intervals
  - Input: YouTube URL + timestamp + webcam frame
  - Output: Score + Japanese feedback

- **YouTube API**: Video embedding and control
  - IFrame API for player integration
  - Real-time timestamp tracking

- **MediaPipe**: Browser-based pose detection
  - 33 keypoints detection
  - Runs entirely client-side

## Database Schema

The backend uses PostgreSQL with SQLAlchemy ORM. Key models are in `/backend/app/models/`.

## API Endpoints

Backend API structure (`/backend/app/api/`):
- `/api/v1/auth/*` - Authentication endpoints
- `/api/v1/analysis/*` - Dance analysis endpoints  
- `/api/v1/users/*` - User management endpoints

## Testing Strategy

- Frontend: Component testing with React Testing Library
- Backend: pytest for unit and integration tests
- E2E: Planned implementation

## Environment Variables

Required environment variables:
- `GEMINI_API_KEY` - Google Gemini API key
- `DATABASE_URL` - PostgreSQL connection string (backend)
- `REDIS_URL` - Redis connection string (backend)
- `VITE_API_URL` - Backend API URL (frontend)

## Docker Services

The `docker-compose.yml` defines:
- `frontend` - React app on port 3000
- `backend` - FastAPI on port 8000
- `db` - PostgreSQL on port 5432
- `redis` - Redis cache on port 6379
- `celery` - Async worker
- `flower` - Celery monitoring on port 5555

## Key Design Decisions

1. **Gemini-First Architecture**: Leverages Gemini's multimodal capabilities instead of building custom ML models
2. **Client-Side Pose Detection**: MediaPipe runs in browser for real-time performance
3. **Stateless Frontend**: MVP version operates without backend dependency
4. **Progressive Enhancement**: Backend adds security, persistence, and analytics without breaking MVP functionality