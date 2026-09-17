@echo off
setlocal EnableDelayedExpansion
title Instagram Agent - Backend API Server
color 0B

echo ============================================================
echo         INSTAGRAM AGENT - BACKEND API LAUNCHER
echo ============================================================
echo.

:: 1. Resolve paths dynamically (independent of where clicked)
set "LAUNCHER_DIR=%~dp0"
pushd "%LAUNCHER_DIR%.."
set "PROJECT_ROOT=%CD%"
popd
set "BACKEND_DIR=%PROJECT_ROOT%\backend"
set "VENV_DIR=%BACKEND_DIR%\venv"
set "PYTHON_EXE=%VENV_DIR%\Scripts\python.exe"
set "UVICORN_EXE=%VENV_DIR%\Scripts\uvicorn.exe"

echo [*] Project Root : %PROJECT_ROOT%
echo [*] Backend Dir  : %BACKEND_DIR%
echo.

:: 2. Verify backend directory exists
if not exist "%BACKEND_DIR%" (
    color 0C
    echo [ERROR] Backend directory not found at:
    echo "%BACKEND_DIR%"
    echo.
    pause
    exit /b 1
)

:: 3. Check for .env file; create from .env.example if missing
if not exist "%BACKEND_DIR%\.env" (
    if exist "%BACKEND_DIR%\.env.example" (
        echo [*] .env not found. Creating default from .env.example...
        copy "%BACKEND_DIR%\.env.example" "%BACKEND_DIR%\.env" >nul
        echo [OK] Default backend\.env created.
    ) else (
        echo [!] Notice: No .env or .env.example file found.
    )
)

:: 4. Verify Python virtual environment
if not exist "%PYTHON_EXE%" (
    echo [*] Virtual environment not detected at backend\venv.
    echo [*] Checking for system Python...
    where python >nul 2>&1
    if errorlevel 1 (
        color 0C
        echo.
        echo [ERROR] Python was not found in your system PATH!
        echo Please install Python 3.10+ from https://www.python.org/downloads/
        echo Make sure to check the box "Add Python to PATH" during installation.
        echo.
        pause
        exit /b 1
    )
    echo [*] Creating virtual environment in: "%VENV_DIR%"...
    python -m venv "%VENV_DIR%"
    if errorlevel 1 (
        color 0C
        echo [ERROR] Failed to create virtual environment.
        echo.
        pause
        exit /b 1
    )
    echo [OK] Virtual environment created successfully.
    echo [*] Installing backend dependencies (this may take a minute on first run)...
    "%VENV_DIR%\Scripts\pip.exe" install -r "%BACKEND_DIR%\requirements.txt"
    if errorlevel 1 (
        echo [WARNING] Some dependencies had warnings during installation.
    ) else (
        echo [OK] Dependencies installed successfully.
    )
)

:: 5. Ensure uvicorn is available
if not exist "%UVICORN_EXE%" (
    echo [*] Installing uvicorn in virtual environment...
    "%VENV_DIR%\Scripts\pip.exe" install "uvicorn[standard]"
)

:: 6. Check if port 8000 is currently occupied
netstat -ano 2>nul | findstr /C:":8000" | findstr /I "LISTENING" >nul 2>&1
if not errorlevel 1 (
    echo.
    echo [!] WARNING: Port 8000 is already in use!
    echo An instance of the API or another service is already listening on port 8000.
    echo If startup fails, run launchers\stop_api.bat to free up the port.
    echo.
)

:: 7. Launch browser automatically to Swagger Docs after 2-second delay
start "" /b cmd /c "ping -n 3 127.0.0.1 >nul & start http://localhost:8000/api/docs"

:: 8. Print launch dashboard
echo ============================================================
echo               API SERVER IS READY TO RUN
echo ============================================================
echo   Interactive Docs (Swagger) : http://localhost:8000/api/docs
echo   Alternative Docs (ReDoc)   : http://localhost:8000/api/redoc
echo   Health Check Endpoint      : http://localhost:8000/api/health
echo   API Base URL               : http://localhost:8000
echo.
echo   * Opening API documentation in your browser automatically...
echo   * Press Ctrl+C in this window to stop the server anytime.
echo ============================================================
echo.

:: 9. Start uvicorn server from backend directory
cd /d "%BACKEND_DIR%"
"%UVICORN_EXE%" app.main:app --reload --host 127.0.0.1 --port 8000

if errorlevel 1 (
    echo.
    color 0C
    echo [ERROR] The API server stopped unexpectedly.
    echo Check the error messages above for details.
    echo.
    pause
) else (
    echo.
    echo [INFO] API server stopped cleanly.
    pause
)
