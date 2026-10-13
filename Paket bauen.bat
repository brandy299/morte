@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo Node.js ist noch nicht installiert. Lade es auf nodejs.org herunter, Version "LTS".
  start https://nodejs.org
  pause
  exit /b 1
)
if not exist node_modules (
  echo Beim ersten Mal richtet sich das Projekt ein. Das dauert einige Minuten.
  call npm install --no-audit --no-fund
  if errorlevel 1 goto fehler
)
call npm run zip
if errorlevel 1 goto fehler
echo.
echo Fertig. Der Ordner mit der ZIP-Datei oeffnet sich gleich.
explorer .
pause
exit /b 0
:fehler
echo.
echo Das hat nicht geklappt. Mach ein Foto von den roten Zeilen oben.
pause
exit /b 1
