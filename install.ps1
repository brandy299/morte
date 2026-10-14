# Pult installieren und starten (Windows). Eine Zeile in der PowerShell:
#   irm https://raw.githubusercontent.com/brandy299/morte/main/install.ps1 | iex
# Holt den aktuellen Stand von GitHub in den Ordner "Pult" im Benutzerordner (Daten und installierte Teile bleiben erhalten),
# richtet Pult beim ersten Mal ein und startet es. Dieselbe Zeile spaeter noch einmal holt ein Update.
function Install-Pult {
  $ErrorActionPreference = "Stop"
  $ProgressPreference = "SilentlyContinue"
  [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
  $ziel = if ($env:PULT_ZIEL) { $env:PULT_ZIEL } else { Join-Path $HOME "Pult" }
  $quelle = if ($env:PULT_QUELLE) { $env:PULT_QUELLE } else { "https://codeload.github.com/brandy299/morte/zip/refs/heads/main" }

  if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host ""
    Write-Host "Node.js ist noch nicht installiert. Pult braucht es einmalig."
    Write-Host "Lade auf https://nodejs.org die Version LTS herunter, installiere sie, schliesse dieses Fenster,"
    Write-Host "oeffne die PowerShell NEU und fuege die Zeile noch einmal ein."
    Start-Process "https://nodejs.org"
    return
  }
  $major = [int](& node -p "process.versions.node.split('.')[0]")
  if ($major -lt 22) {
    Write-Host ""
    Write-Host "Dein Node.js ist zu alt (Version $(& node -v)). Pult braucht Version 22 oder neuer."
    Write-Host "Lade auf https://nodejs.org die Version LTS herunter, installiere sie und fuege die Zeile noch einmal ein."
    Start-Process "https://nodejs.org"
    return
  }

  Write-Host "Ich hole Pult von GitHub ..."
  $tmp = Join-Path $env:TEMP "pult-install"
  if (Test-Path $tmp) { Remove-Item $tmp -Recurse -Force }
  New-Item -ItemType Directory -Path $tmp | Out-Null
  try {
    $zip = Join-Path $tmp "pult.zip"
    Invoke-WebRequest -Uri $quelle -OutFile $zip -UseBasicParsing
    Expand-Archive -Path $zip -DestinationPath (Join-Path $tmp "x") -Force
  } catch {
    Write-Host ""
    Write-Host "Der Download hat nicht geklappt. Pruefe deine Internetverbindung und versuche es noch einmal."
    return
  }
  $quellordner = Get-ChildItem (Join-Path $tmp "x") -Directory | Select-Object -First 1
  if (-not $quellordner -or -not (Test-Path (Join-Path $quellordner.FullName "package.json"))) {
    Write-Host "Der Download sieht nicht richtig aus. Versuche es noch einmal."
    return
  }

  New-Item -ItemType Directory -Path $ziel -Force | Out-Null
  # Alte Programmdateien weg (so bleibt nichts Veraltetes liegen), die installierten Teile bleiben.
  Get-ChildItem $ziel -Force | Where-Object { $_.Name -ne "node_modules" } | Remove-Item -Recurse -Force
  Get-ChildItem $quellordner.FullName -Force | Copy-Item -Destination $ziel -Recurse -Force
  Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue

  Set-Location $ziel
  Write-Host "Pult liegt in: $ziel"
  Write-Host ""
  & node scripts\los.mjs
}
Install-Pult
