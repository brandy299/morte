@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 if exist "%~dp0node\node.exe" set "PATH=%~dp0node;%PATH%"
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo Node.js ist noch nicht installiert. Pult braucht es einmalig.
  echo Es oeffnet sich gleich die Seite nodejs.org. Lade dort die Version "LTS" herunter,
  echo installiere sie und starte Pult danach noch einmal.
  echo.
  start https://nodejs.org
  pause
  exit /b 1
)
node scripts\los.mjs
if errorlevel 1 pause
