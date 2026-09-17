@echo off
setlocal
title Instagram Agent - Full App Launcher
color 0A

echo ============================================================
echo      INSTAGRAM AGENT - LAUNCHING ALL SERVICES
echo ============================================================
echo.

set "LAUNCHER_DIR=%~dp0"

echo [*] Starting Backend API in separate window...
start "Instagram Agent - API Server" cmd /c ""%LAUNCHER_DIR%run_api.bat""

echo [*] Starting Frontend Dev Server in separate window...
start "Instagram Agent - Frontend Dev Server" cmd /c ""%LAUNCHER_DIR%run_frontend.bat""

echo.
echo ============================================================
echo [OK] Both Backend and Frontend services launched!
echo ============================================================
echo   * Backend API : http://localhost:8000
echo   * API Docs    : http://localhost:8000/api/docs
echo   * Frontend UI : http://localhost:5173
echo ============================================================
echo.
echo You can close this launcher window now.
echo Use the opened windows to view logs or stop the servers (Ctrl+C).
echo Or run launchers\stop_api.bat to stop all services.
echo.
pause
