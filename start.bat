@echo off
title SymtoMap Combined - Launcher
color 0B

echo.
echo  ============================================
echo       SYMPTOMAP - Multi-Organ Risk Predictor
echo  ============================================
echo.

:: Get the directory where this bat file lives
cd /d "%~dp0"

echo  [1/3] Starting Flask Backend (port 5000)...
start "SymtoMap - Flask Backend" cmd /k "cd /d ""%~dp0backend"" && call envv\Scripts\activate && python app.py"

echo  [2/3] Starting Vite Frontend (port 5173)...
start "SymtoMap - Vite Frontend" cmd /k "cd /d ""%~dp0frontend"" && npm run dev"

echo  [3/3] Waiting for servers to start...
timeout /t 5 /nobreak >nul

echo.
echo  Opening browser at http://localhost:5173 ...
start http://localhost:5173

echo.
echo  ============================================
echo   Both servers are running!
echo   - Backend:  http://localhost:5000
echo   - Frontend: http://localhost:5173
echo.
echo   Close the server windows to stop.
echo  ============================================
echo.
pause