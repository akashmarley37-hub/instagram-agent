@echo off
setlocal EnableDelayedExpansion
title Instagram Agent - Stop Services
color 0E

echo ============================================================
echo           STOPPING INSTAGRAM AGENT PROCESSES
echo ============================================================
echo.

set "FOUND=0"

:: Stop process on port 8000 (Backend API)
echo [*] Checking for processes listening on port 8000 (Backend)...
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr /C:":8000" ^| findstr /I "LISTENING"') do (
    echo [*] Terminating PID %%a on port 8000...
    taskkill /F /PID %%a >nul 2>&1
    set "FOUND=1"
)

:: Stop process on port 5173 (Frontend)
echo [*] Checking for processes listening on port 5173 (Frontend)...
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr /C:":5173" ^| findstr /I "LISTENING"') do (
    echo [*] Terminating PID %%a on port 5173...
    taskkill /F /PID %%a >nul 2>&1
    set "FOUND=1"
)

echo.
if "!FOUND!"=="1" (
    color 0A
    echo [OK] Stopped active services. Ports 8000 and 5173 are now free.
) else (
    echo [INFO] No active processes were found on port 8000 or 5173.
)

echo.
pause
