@echo off
setlocal EnableDelayedExpansion
title Instagram Agent - Frontend Dev Server
color 0D

echo ============================================================
echo       INSTAGRAM AGENT - REACT FRONTEND LAUNCHER
echo ============================================================
echo.

set "LAUNCHER_DIR=%~dp0"
pushd "%LAUNCHER_DIR%.."
set "PROJECT_ROOT=%CD%"
popd
set "FRONTEND_DIR=%PROJECT_ROOT%\frontend"

echo [*] Project Root  : %PROJECT_ROOT%
echo [*] Frontend Dir  : %FRONTEND_DIR%
echo.

if not exist "%FRONTEND_DIR%" (
    color 0C
    echo [ERROR] Frontend directory not found at:
    echo "%FRONTEND_DIR%"
    echo.
    pause
    exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
    color 0C
    echo.
    echo [ERROR] Node.js / npm was not found in your system PATH!
    echo Please install Node.js from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

if not exist "%FRONTEND_DIR%\node_modules" (
    echo [*] Frontend dependencies not found. Running npm install...
    cd /d "%FRONTEND_DIR%"
    call npm install
    if errorlevel 1 (
        color 0C
        echo [ERROR] npm install failed.
        pause
        exit /b 1
    )
    echo [OK] Frontend dependencies installed.
)

:: Automatically open browser after short delay
start "" /b cmd /c "ping -n 3 127.0.0.1 >nul & start http://localhost:5173"

echo ============================================================
echo   Frontend URL : http://localhost:5173
echo   (Press Ctrl+C in this window to stop the server)
echo ============================================================
echo.

cd /d "%FRONTEND_DIR%"
call npm run dev

if errorlevel 1 (
    echo.
    color 0C
    echo [ERROR] Frontend server stopped unexpectedly.
    pause
) else (
    echo.
    echo [INFO] Frontend server stopped cleanly.
    pause
)
