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

  # Kein passendes Node.js auf dem Rechner? Dann haelt dieses Skript eine eigene Kopie im Pult-Ordner (nichts wird installiert, nichts anderes veraendert).
  # Eine Regel fuer alle Stellen: Gibt es "Pult\node", ist das Pults Node.js. "Pult starten" nimmt es immer zuerst,
  # und dieses Skript bringt es bei jedem Lauf auf die neueste Version 22 (Sicherheitsupdates).
  function Node-Ok {
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) { return $false }
    try { return ([int](& node -p "process.versions.node.split('.')[0]") -ge 22) } catch { return $false }
  }
  $eigenes = Join-Path $ziel "node"
  if ((Test-Path $eigenes) -or -not (Node-Ok)) {
    if (-not (Eigene-Node $ziel)) { return }
    $env:PATH = $eigenes + [IO.Path]::PathSeparator + $env:PATH
    if (-not (Node-Ok)) {
      Write-Host "Node.js konnte nicht eingerichtet werden. Installiere es von https://nodejs.org (Version LTS) und fuege die Zeile noch einmal ein."
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
  Get-ChildItem $ziel -Force | Where-Object { $_.Name -ne "node_modules" -and $_.Name -ne "node" -and $_.Name -ne ".node-neu" } | Remove-Item -Recurse -Force
  Get-ChildItem $quellordner.FullName -Force | Copy-Item -Destination $ziel -Recurse -Force
  Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue

  Set-Location $ziel
  Write-Host "Pult liegt in: $ziel"
  Write-Host ""
  & node scripts\los.mjs
}
# Holt oder erneuert die eigene Node.js-Kopie in "<ziel>\node". Gibt $false zurueck (nach einer Meldung), wenn es nicht geht.
function Eigene-Node($ziel) {
  $eigenes = Join-Path $ziel "node"
  $plattform = if ($env:PROCESSOR_ARCHITECTURE -eq "ARM64" -or $env:PROCESSOR_ARCHITEW6432 -eq "ARM64") { "win-arm64" } else { "win-x64" }
  $nodedir = if ($env:PULT_NODE_QUELLE) { $env:PULT_NODE_QUELLE } else { "https://nodejs.org/dist/latest-v22.x" }
  $vorhanden = $null
  $exe = Join-Path $eigenes "node.exe"
  if (Test-Path $exe) { try { $vorhanden = (& $exe -v).Trim() } catch { $vorhanden = $null } }
  $fehler = "Der Download von Node.js hat nicht geklappt. Pruefe deine Internetverbindung oder installiere Node.js von https://nodejs.org."

  $name = $null; $summe = $null
  try {
    $inhalt = (Invoke-WebRequest -Uri "$nodedir/SHASUMS256.txt" -UseBasicParsing).Content
    # Je nach Server kommt die Liste als Text oder als Bytes.
    if ($inhalt -is [byte[]]) { $inhalt = [System.Text.Encoding]::UTF8.GetString($inhalt) }
    $summen = $inhalt -split "`n"
    $zeile = $summen | Where-Object { $_ -match "-$plattform\.zip\s*$" } | Select-Object -First 1
    if ($zeile) { $summe, $name = ($zeile.Trim() -split "\s+") }
  } catch { }
  if (-not $name) {
    # Ohne Internet geht es mit der vorhandenen Kopie weiter.
    if ($vorhanden) { return $true }
    Write-Host ""; Write-Host $fehler; return $false
  }
  # Schon die neueste Version? Dann nichts zu tun.
  if ($vorhanden -and $name.StartsWith("node-$vorhanden-")) { return $true }

  if ($vorhanden) { Write-Host "Ich erneuere das Hilfsprogramm Node.js fuer Pult ..." } else { Write-Host "Pult braucht das Hilfsprogramm Node.js. Ich lade es fuer Pult dazu, das dauert einen Moment ..." }
  # Arbeitsordner im Pult-Ordner selbst: so liegt alles auf demselben Laufwerk, und das Austauschen am Ende ist ein Umbenennen.
  New-Item -ItemType Directory -Path $ziel -Force | Out-Null
  $arbeit = Join-Path $ziel ".node-neu"
  try {
    if (Test-Path $arbeit) { Remove-Item $arbeit -Recurse -Force }
    New-Item -ItemType Directory -Path $arbeit | Out-Null
    $nzip = Join-Path $arbeit "node.zip"
    Invoke-WebRequest -Uri "$nodedir/$name" -OutFile $nzip -UseBasicParsing
  } catch {
    Remove-Item $arbeit -Recurse -Force -ErrorAction SilentlyContinue
    if ($vorhanden) { return $true }
    Write-Host ""; Write-Host $fehler; return $false
  }
  if ((Get-FileHash $nzip -Algorithm SHA256).Hash.ToLower() -ne $summe.ToLower()) {
    Remove-Item $arbeit -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "Die heruntergeladene Datei ist nicht in Ordnung (Pruefsumme stimmt nicht). Versuche es noch einmal."
    return $false
  }
  # Erst vollstaendig entpacken, dann austauschen: Bricht es ab, bleibt die alte Kopie heil.
  try {
    Expand-Archive -Path $nzip -DestinationPath (Join-Path $arbeit "x") -Force
    $neu = Get-ChildItem (Join-Path $arbeit "x") -Directory | Select-Object -First 1
    if (-not $neu -or -not (Test-Path (Join-Path $neu.FullName "node.exe"))) { throw "kein node.exe" }
    if (Test-Path $eigenes) { Remove-Item $eigenes -Recurse -Force }
    Move-Item $neu.FullName $eigenes
  } catch {
    Write-Host ""
    Write-Host "Node.js liess sich nicht entpacken. Ist auf dem Computer noch genug Platz frei? Schliesse andere Pult-Fenster und versuche es noch einmal."
    return $false
  } finally {
    Remove-Item $arbeit -Recurse -Force -ErrorAction SilentlyContinue
  }
  return $true
}

Install-Pult
