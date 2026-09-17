# ============================================
# Instagram Agent - One-Click Startup Script
# ============================================
# Run this script from the project root:
#   .\start.ps1
# Or with a flag:
#   .\start.ps1 -Mode backend    # Only backend
#   .\start.ps1 -Mode frontend   # Only frontend
#   .\start.ps1 -Mode both       # Both (default)
# ============================================

param(
    [string]$Mode = "both"
)

$ErrorActionPreference = "Stop"
$ProjectRoot = $PSScriptRoot

function Write-Header {
    param([string]$text)
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host "  $text" -ForegroundColor Cyan
    Write-Host "==========================================" -ForegroundColor Cyan
}

function Write-Step {
    param([string]$text)
    Write-Host "[*] $text" -ForegroundColor Yellow
}

function Write-Success {
    param([string]$text)
    Write-Host "[OK] $text" -ForegroundColor Green
}

Write-Header "Instagram Agent Launcher"

# ---- Start Backend ----
if ($Mode -eq "backend" -or $Mode -eq "both") {
    Write-Step "Setting up Backend (FastAPI)..."

    $BackendDir = Join-Path $ProjectRoot "backend"
    $VenvPython = Join-Path $BackendDir "venv\Scripts\python.exe"

    if (-not (Test-Path $VenvPython)) {
        Write-Step "Creating virtual environment..."
        python -m venv "$BackendDir\venv"
        Write-Success "Virtual environment created."
    }

    Write-Step "Installing backend dependencies..."
    & "$BackendDir\venv\Scripts\pip.exe" install -r "$BackendDir\requirements.txt" --quiet
    Write-Success "Backend dependencies ready."

    Write-Step "Starting backend server on http://localhost:8000 ..."
    Start-Process powershell -ArgumentList @(
        "-NoExit",
        "-Command",
        "Set-Location '$BackendDir'; .\venv\Scripts\Activate.ps1; uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
    ) -WindowStyle Normal
    Write-Success "Backend window launched."
}

# ---- Start Frontend ----
if ($Mode -eq "frontend" -or $Mode -eq "both") {
    Write-Step "Setting up Frontend (React + Vite)..."

    $FrontendDir = Join-Path $ProjectRoot "frontend"

    if (-not (Test-Path "$FrontendDir\node_modules")) {
        Write-Step "Installing frontend dependencies (npm install)..."
        Push-Location $FrontendDir
        npm install
        Pop-Location
        Write-Success "Frontend dependencies installed."
    }

    Write-Step "Starting frontend dev server on http://localhost:5173 ..."
    Start-Process powershell -ArgumentList @(
        "-NoExit",
        "-Command",
        "Set-Location '$FrontendDir'; npm run dev"
    ) -WindowStyle Normal
    Write-Success "Frontend window launched."
}

Write-Header "All services started!"
Write-Host "  Backend  -> http://localhost:8000" -ForegroundColor White
Write-Host "  API Docs -> http://localhost:8000/docs" -ForegroundColor White
Write-Host "  Frontend -> http://localhost:5173" -ForegroundColor White
Write-Host ""
Write-Host "Close the separate terminal windows to stop the servers." -ForegroundColor Gray
