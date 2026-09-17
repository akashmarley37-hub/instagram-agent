# Instagram Agent — Windows Launchers

This folder contains one-click Windows Batch (`.bat`) files to start and manage the Instagram Agent without using terminal commands.

## Available Launchers

| File | What it Does |
| :--- | :--- |
| **`run_api.bat`** | **Starts the FastAPI Backend API Server**. Automatically sets up Python venv, checks dependencies, verifies port 8000, starts uvicorn, and opens the interactive Swagger docs in your default browser. |
| **`run_all.bat`** | **Starts both Backend API and React Frontend** in two separate, organized windows, and opens both the API Docs and Frontend UI in your browser. |
| **`run_frontend.bat`** | **Starts only the React + Vite Frontend Dev Server** on `http://localhost:5173`. |
| **`stop_api.bat`** | **Stops all running instances** of the backend (port 8000) and frontend (port 5173) safely. |

---

## How to Use

1. **Double-click** any `.bat` file directly from Windows File Explorer.
2. The script will automatically:
   - Find your project directory.
   - Detect or create the virtual environment (`backend\venv`).
   - Check and configure your `.env` settings file.
   - Launch the server.
   - Open your browser to the right page automatically!

---

## Endpoints

- **Swagger API Docs**: [http://localhost:8000/api/docs](http://localhost:8000/api/docs)
- **ReDoc API Docs**: [http://localhost:8000/api/redoc](http://localhost:8000/api/redoc)
- **Health Check**: [http://localhost:8000/api/health](http://localhost:8000/api/health)
- **Frontend Dashboard**: [http://localhost:5173](http://localhost:5173)

---

## How to Create a Desktop Shortcut

1. Right-click on `run_api.bat` (or `run_all.bat`).
2. Select **Show more options** (if Windows 11) -> **Send to** -> **Desktop (create shortcut)**.
3. You can now launch the Instagram Agent API directly from your desktop with one click!
