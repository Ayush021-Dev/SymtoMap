@echo off
title SymtoMap - Starting...
color 0A

echo ============================================
echo        SymtoMap - Health Risk Analyzer
echo ============================================
echo.

:: Get the directory where this script is located
set "ROOT_DIR=%~dp0"

:: ──────────────────────────────────────────────
::  Start Flask Backend
:: ──────────────────────────────────────────────
echo [1/2] Starting Flask backend on port 5000...
cd /d "%ROOT_DIR%backend"

if exist "venv\Scripts\activate.bat" (
    echo       Activating virtual environment...
    echo       Installing backend dependencies...
    start "SymtoMap Backend" cmd /k "title SymtoMap Backend & color 0B & venv\Scripts\activate.bat && pip install -r requirements.txt && python app.py"
) else (
    echo       [!] No venv found, running with system Python...
    start "SymtoMap Backend" cmd /k "title SymtoMap Backend & color 0B & pip install -r requirements.txt && python app.py"
)

:: Give the backend a moment to boot up
echo       Waiting for backend to install deps ^& start...
timeout /t 15 /nobreak >nul

:: ──────────────────────────────────────────────
::  Start Vite Frontend
:: ──────────────────────────────────────────────
echo [2/2] Starting Vite frontend dev server...
cd /d "%ROOT_DIR%frontend"

if not exist "node_modules" (
    echo       Installing dependencies first...
    start "SymtoMap Frontend" cmd /k "title SymtoMap Frontend & color 0D & npm install && npm run dev"
) else (
    start "SymtoMap Frontend" cmd /k "title SymtoMap Frontend & color 0D & npm run dev"
)

:: Wait a bit for frontend to start
timeout /t 5 /nobreak >nul

:: ──────────────────────────────────────────────
::  Open in browser
:: ──────────────────────────────────────────────
echo.
echo ============================================
echo   Backend  : http://localhost:5000
echo   Frontend : http://localhost:5173
echo ============================================
echo.
echo Opening browser...
start "" "http://localhost:5173"

echo.
echo SymtoMap is running! Close the terminal windows to stop.
echo.
pause
