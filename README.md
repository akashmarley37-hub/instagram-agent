# Instagram Agent — AI-Powered Instagram Content Automation

> **A production-style, full-stack AI-powered Instagram content automation application.**
> Create → AI Generate → Preview → Edit → Schedule → Publish → Track

---

## Overview

Instagram Agent is an intelligent application that automates Instagram content creation and publishing by combining:

- 🤖 **AI-generated captions** (OpenAI GPT-4o)
- 🏷️ **AI-generated hashtags** with relevance scoring
- 📸 **Media management** with local upload + Google Drive integration
- 📅 **Smart scheduling** with APScheduler background jobs
- 📲 **Instagram Graph API** publishing
- 📊 **Activity logging** and history
- 🛡️ **Production-Ready Live Integrations** — Zero mock data, zero simulated publishing

---

## Architecture

```
┌─────────────────────────────────────────────┐
│          React Frontend (Vite + TS)         │
│   Home │ Studio │ Library │ Schedule │ ...  │
└──────────────────┬──────────────────────────┘
                   │ REST API
                   ▼
┌─────────────────────────────────────────────┐
│           FastAPI Backend                   │
│  /api/posts  /api/ai  /api/media  ...       │
└───────┬──────────────┬──────────────┬───────┘
        ▼              ▼              ▼
 ┌────────────┐ ┌────────────┐ ┌──────────────┐
 │ AI Service │ │MediaService│ │  Scheduler   │
 │  OpenAI    │ │ Drive/Local│ │  APScheduler │
 └────────────┘ └────────────┘ └──────┬───────┘
                                       ▼
                              ┌─────────────────┐
                              │ Instagram Service│
                              └─────────────────┘
                   ▼
         ┌─────────────────┐
         │  SQLite / PG DB │
         └─────────────────┘
```

---

## Features

| Feature | Status |
|---|---|
| Content Studio (3-column workspace) | ✅ |
| AI caption generation (GPT-4o) | ✅ |
| AI hashtag generation | ✅ |
| Content regeneration (shorten, professional, casual, engaging) | ✅ |
| Media upload (drag & drop) | ✅ |
| Media library with search/filter | ✅ |
| Google Drive media browser & import | ✅ (Live OAuth / Service Account) |
| Instagram preview mockup | ✅ |
| Draft save system | ✅ |
| Post scheduling (APScheduler) | ✅ |
| Instagram publishing | ✅ (Live Graph API) |
| Activity log | ✅ |
| Retry failed posts | ✅ |
| Integration status dashboard | ✅ |
| Live Mode (real credentials) | ✅ |
| Responsive layout (mobile/tablet) | ✅ |
| Dark mode UI | ✅ |

---

## Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18 + TypeScript + Vite 5 + Tailwind CSS 3 |
| **Backend** | Python FastAPI (async) |
| **Database** | SQLite (dev) / PostgreSQL (prod) via SQLAlchemy 2 |
| **AI** | OpenAI GPT-4o via service layer |
| **Scheduler** | APScheduler 3.x |
| **HTTP Client** | HTTPX (async) |
| **Media** | Local filesystem + Google Drive API |
| **Auth** | Google OAuth2 |
| **Container** | Docker + docker-compose |

---

## Folder Structure

```
instagram-agent/
├── backend/
│   ├── app/
│   │   ├── api/routes/          # FastAPI route handlers
│   │   │   ├── ai.py            # POST /api/ai/generate, /api/ai/regenerate
│   │   │   ├── media.py         # POST /api/media/upload, GET /api/media
│   │   │   ├── posts.py         # CRUD + publish + schedule + retry
│   │   │   ├── instagram.py     # GET /api/instagram/status, POST /test
│   │   │   ├── activity.py      # GET /api/activity
│   │   │   ├── integrations.py  # GET /api/integrations
│   │   │   └── google_drive.py  # GET /api/google-drive/media
│   │   ├── models/              # SQLAlchemy ORM models
│   │   ├── schemas/             # Pydantic validation schemas
│   │   ├── services/
│   │   │   ├── ai_service.py            # OpenAI + Demo Mode
│   │   │   ├── instagram_service.py     # Graph API + Demo Mode
│   │   │   ├── media_service.py         # File upload/management
│   │   │   ├── publish_service.py       # Publishing workflow
│   │   │   ├── scheduler_service.py     # APScheduler jobs
│   │   │   ├── activity_service.py      # Event logging
│   │   │   └── google_drive_service.py  # Drive API
│   │   ├── config/settings.py   # Pydantic settings from .env
│   │   ├── database/db.py       # Async SQLAlchemy setup
│   │   └── main.py              # FastAPI app entry point
│   ├── uploads/                 # Uploaded media files
│   ├── requirements.txt
│   ├── .env                     # Local environment (not committed)
│   └── .env.example             # Template for credentials
├── frontend/
│   ├── src/
│   │   ├── pages/               # 7 application screens
│   │   ├── layouts/             # AppLayout with sidebar
│   │   ├── services/api.ts      # Centralized API client
│   │   ├── types/index.ts       # TypeScript type definitions
│   │   └── index.css            # Tailwind + design system
│   ├── package.json
│   └── vite.config.ts
├── docker-compose.yml
├── .gitignore
└── README.md
```

---

## Environment Variables

Copy `backend/.env.example` to `backend/.env` and fill in your values:

| Variable | Description | Required |
|---|---|---|
| `OPENAI_API_KEY` | OpenAI API key for GPT-4o | Yes (for AI generation) |
| `OPENAI_MODEL` | OpenAI model (default: `gpt-4o`) | Optional |
| `INSTAGRAM_ACCESS_TOKEN` | Meta Graph API user/page access token | Yes (for publishing) |
| `INSTAGRAM_BUSINESS_ACCOUNT_ID` | Instagram Business Account ID | Yes (for publishing) |
| `PUBLIC_BASE_URL` | Public URL for media hosting (accessible to Instagram) | Yes (for publishing) |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | Optional (for Drive/Sheets) |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | Optional (for Drive/Sheets) |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Path to Google Service Account JSON | Optional (for Drive/Sheets) |
| `GOOGLE_SHEETS_SPREADSHEET_ID` | Google Sheet ID for publishing logs | Optional (for Sheets sync) |
| `DATABASE_URL` | SQLAlchemy DB URL | Yes |

---

## Quick Start (Windows One-Click)

The easiest way to run the application on Windows without terminal commands:

1. **Double-click `run_api.bat`** (or go to [`launchers/run_api.bat`](launchers/run_api.bat)):
   - Automatically sets up Python virtual environment (`backend\venv`)
   - Installs backend dependencies
   - Configures default `.env` if missing
   - Starts FastAPI on `http://localhost:8000`
   - Automatically opens API Swagger Documentation in your browser (`http://localhost:8000/api/docs`)

2. **Additional Launchers** (in [`launchers/`](launchers/)):
   - **`run_all.bat`**: Launches both Backend API and React Frontend concurrently
   - **`run_frontend.bat`**: Launches only the Frontend dev server (`http://localhost:5173`)
   - **`stop_api.bat`**: Instantly terminates active servers on ports 8000 and 5173

---

## Installation & Running Locally (Manual)

### Prerequisites

- Python 3.10+
- Node.js 18+ / npm

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Copy env file
copy .env.example .env
# Edit .env — at minimum, set DEMO_MODE=true

# Start backend
uvicorn app.main:app --reload --port 8000
```

Backend runs at: http://localhost:8000
API docs at: http://localhost:8000/api/docs

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

Frontend runs at: http://localhost:5173

### Docker (Both services)

```bash
# Copy env file
copy backend\.env.example backend\.env

# Start everything
docker compose up --build

# Access:
# Frontend: http://localhost:3000
# Backend:  http://localhost:8000/api/docs
```

---

## 🚀 Public Production Deployment

To deploy the Instagram Agent for public use with live Instagram Graph API publishing:

👉 **See the complete [Public Deployment Guide (DEPLOYMENT.md)](DEPLOYMENT.md)**

Supported deployment pathways:
- **Cloud PaaS (Render.com + Vercel)**: 1-click cloud deployment using [`render.yaml`](render.yaml) and Vercel with automated CDN and HTTPS.
- **Single Server / VPS (Docker + Caddy)**: Production setup with automated Let's Encrypt SSL certificates via [`docker-compose.prod.yml`](docker-compose.prod.yml) and [`Caddyfile`](Caddyfile).
- **Instant Live Testing**: Expose your local machine publicly in 2 minutes via Cloudflare Tunnel or ngrok for immediate live Instagram testing.
- **Meta Developer Guide**: Step-by-step instructions to create your Meta App, get your Instagram Business Account ID, and generate 60-day Long-Lived Access Tokens.

---

## Real External Integrations

All features use real API integrations. When credentials are not provided, the application displays **Configuration Required** and refuses to fabricate data or fake successful posts.

### 1. OpenAI (GPT-4o)
- Real async calls to OpenAI API using `OPENAI_API_KEY`.
- Generates captions, hashtags, and CTAs tailored to selected tone and language.
- Rewrites and refines content (shorten, professional, casual, engaging).

### 2. Instagram Graph API
- Real Meta Graph API calls to `/media` (container creation) and `/media_publish`.
- Supports image and video publishing.
- Verifies public media URL accessibility.

### 3. Google Drive & Google Sheets
- Real Google Drive API v3: lists files and downloads/imports media directly into local library.
- Real Google Sheets API v4: appends log of published posts.
- Supports Google OAuth 2.0 and Service Account authentication.

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Health check |
| GET | `/api/config` | App configuration (no secrets) |
| POST | `/api/ai/generate` | Generate caption + hashtags |
| POST | `/api/ai/regenerate` | Adjust existing content |
| POST | `/api/media/upload` | Upload media file |
| GET | `/api/media` | List media library |
| GET | `/api/media/file/{filename}` | Serve media file |
| DELETE | `/api/media/{id}` | Delete media |
| GET | `/api/posts` | List posts |
| POST | `/api/posts` | Create post/draft |
| GET | `/api/posts/{id}` | Get post details |
| PUT | `/api/posts/{id}` | Update post |
| DELETE | `/api/posts/{id}` | Delete post |
| POST | `/api/posts/{id}/publish` | Publish now |
| POST | `/api/posts/{id}/schedule` | Schedule post |
| POST | `/api/posts/{id}/retry` | Retry failed post |
| GET | `/api/instagram/status` | Instagram connection status |
| POST | `/api/instagram/test` | Test Instagram connection |
| GET | `/api/activity` | Activity log |
| GET | `/api/integrations` | All integration statuses |
| POST | `/api/integrations/{service}/test` | Test specific integration |
| GET | `/api/google-drive/media` | List Drive files |

---

## Database Models

- **Media** — uploaded files (local + Drive)
- **Post** — content with caption, hashtags, status
- **PublishingAttempt** — record of each publish attempt
- **ActivityLog** — chronological event log
- **Integration** — external service connection state

---

## Security

- ✅ API keys stored only in server `.env` file
- ✅ No secrets exposed to frontend JavaScript
- ✅ Input validation on all API endpoints
- ✅ File type and size validation for uploads
- ✅ CORS configured for allowed origins only
- ✅ Demo Mode prevents accidental live publishing
- ✅ Publish confirmation dialog before every post

---

## Troubleshooting

**Backend won't start:**
```bash
pip install -r requirements.txt
# Check Python version: python --version (needs 3.11+)
```

**Frontend shows API errors:**
- Make sure backend is running on port 8000
- Check that CORS allows `http://localhost:5173`

**AI generation fails:**
- Check `OPENAI_API_KEY` in `.env`
- Or set `DEMO_MODE=true` to use mock responses

**Instagram publishing fails:**
- Check token expiry (Instagram tokens expire)
- Use Demo Mode for demonstration without a real account

---

## Project Modules

| Module | Description |
|---|---|
| **Module 1** | System Architecture and Content Workflow |
| **Module 2** | AI Caption and Hashtag Generation |
| **Module 3** | Backend Automation and Instagram API Integration |
| **Module 4** | Scheduling, Logging, Security and Maintainability |

---

## Future Enhancements

- [ ] Multiple Instagram accounts
- [ ] AI image analysis (vision)
- [ ] Content templates library
- [ ] Content calendar view
- [ ] Analytics dashboard
- [ ] Approval workflow
- [ ] Team collaboration
- [ ] Facebook & LinkedIn publishing
- [ ] Brand voice profiles
- [ ] Bulk scheduling

---

*Built with ❤️ as an AI-powered Instagram automation project.*
