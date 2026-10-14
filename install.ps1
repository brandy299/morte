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

  # Kein passendes Node.js auf dem Rechner? Dann laedt dieses Skript eine eigene Kopie in den Pult-Ordner (nichts wird installiert, nichts anderes veraendert).
  function Node-Ok {
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) { return $false }
    return ([int](& node -p "process.versions.node.split('.')[0]") -ge 22)
  }
  $eigenes = Join-Path $ziel "node"
  if (-not (Node-Ok) -and (Test-Path (Join-Path $eigenes "node.exe"))) { $env:Path = "$eigenes;$env:Path" }
  if (-not (Node-Ok)) {
    Write-Host "Pult braucht das Hilfsprogramm Node.js. Ich lade es fuer Pult dazu (rund 30 MB) ..."
    $plattform = if ($env:PROCESSOR_ARCHITECTURE -eq "ARM64") { "win-arm64" } else { "win-x64" }
    $nodedir = if ($env:PULT_NODE_QUELLE) { $env:PULT_NODE_QUELLE } else { "https://nodejs.org/dist/latest-v22.x" }
    $ntmp = Join-Path $env:TEMP "pult-node"
    if (Test-Path $ntmp) { Remove-Item $ntmp -Recurse -Force }
    New-Item -ItemType Directory -Path $ntmp | Out-Null
    try {
      $summen = (Invoke-WebRequest -Uri "$nodedir/SHASUMS256.txt" -UseBasicParsing).Content -split "`n"
      $zeile = $summen | Where-Object { $_ -match "$plattform\.zip\s*$" } | Select-Object -First 1
      $summe, $name = ($zeile.Trim() -split "\s+")
      $nzip = Join-Path $ntmp "node.zip"
      Invoke-WebRequest -Uri "$nodedir/$name" -OutFile $nzip -UseBasicParsing
    } catch {
      Write-Host ""
      Write-Host "Der Download von Node.js hat nicht geklappt. Pruefe deine Internetverbindung oder installiere Node.js von https://nodejs.org."
      return
    }
    if ((Get-FileHash $nzip -Algorithm SHA256).Hash.ToLower() -ne $summe.ToLower()) {
      Write-Host "Die heruntergeladene Datei ist nicht in Ordnung (Pruefsumme stimmt nicht). Versuche es noch einmal."
      return
    }
    Expand-Archive -Path $nzip -DestinationPath (Join-Path $ntmp "x") -Force
    New-Item -ItemType Directory -Path $ziel -Force | Out-Null
    if (Test-Path $eigenes) { Remove-Item $eigenes -Recurse -Force }
    Move-Item (Get-ChildItem (Join-Path $ntmp "x") -Directory | Select-Object -First 1).FullName $eigenes
    Remove-Item $ntmp -Recurse -Force -ErrorAction SilentlyContinue
    $env:Path = "$eigenes;$env:Path"
    if (-not (Node-Ok)) {
      Write-Host "Node.js konnte nicht eingerichtet werden. Installiere es von https://nodejs.org."
      return
    }
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
  # Alte Programmdateien weg (so bleibt nichts Veraltetes liegen), die installierten Teile und die eigene Node.js-Kopie bleiben.
  Get-ChildItem $ziel -Force | Where-Object { $_.Name -ne "node_modules" -and $_.Name -ne "node" } | Remove-Item -Recurse -Force
  Get-ChildItem $quellordner.FullName -Force | Copy-Item -Destination $ziel -Recurse -Force
  Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue

  Set-Location $ziel
  Write-Host "Pult liegt in: $ziel"
  Write-Host ""
  & node scripts\los.mjs
}
Install-Pult
