@echo off
setlocal EnableExtensions
title Fitness Coach - model check launcher

set "PORT=5199"
set "URL=http://localhost:%PORT%/model-check.html"
cd /d "%~dp0"

echo ============================================
echo   Fitness Coach - form model checker
echo   %URL%
echo ============================================
echo.

rem ---- 1. sanity checks -------------------------------------------------
where node >nul 2>nul
if errorlevel 1 (
  echo [X] Node.js was not found on PATH.
  echo     Install it from https://nodejs.org and run this file again.
  echo.
  pause
  exit /b 1
)
if not exist "model-check.html" if not exist "public\model-check.html" (
  echo [X] model-check.html is missing. Are you running this from the project root?
  pause
  exit /b 1
)
if not exist "node_modules" (
  echo [.] First run - installing dependencies, this takes a minute...
  call npm install
  if errorlevel 1 (
    echo [X] npm install failed.
    pause
    exit /b 1
  )
)

rem ---- 2. is the server already up? -------------------------------------
netstat -ano | findstr /R /C:":%PORT% .*LISTENING" >nul 2>nul
if not errorlevel 1 (
  echo [i] Dev server already running on port %PORT%.
  goto open
)

rem ---- 3. start vite in its own window ----------------------------------
echo [.] Starting dev server on port %PORT% ...
start "Fitness Coach dev server (close this window to stop)" cmd /k "npx vite --port %PORT% --strictPort"

rem ---- 4. wait until the port answers (max 40s) -------------------------
set /a WAITED=0
:wait
set /a WAITED+=1
curl -s -o nul -m 2 "http://localhost:%PORT%/" >nul 2>nul
if not errorlevel 1 goto open
if %WAITED% GEQ 40 (
  echo [X] Server did not start within 40 seconds.
  echo     Check the dev-server window for the error message.
  echo.
  pause
  exit /b 1
)
ping -n 2 127.0.0.1 >nul
goto wait

rem ---- 5. open the checker ----------------------------------------------
:open
echo [.] Opening %URL%
start "" "%URL%"
echo.
echo [ok] Camera access works on localhost, so the webcam button will work.
echo      Close the "dev server" window when you are finished testing.
echo.
ping -n 4 127.0.0.1 >nul
exit /b 0
