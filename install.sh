#!/bin/bash
# Pult installieren und starten (Mac, Linux). Eine Zeile im Terminal:
#   curl -fsSL https://raw.githubusercontent.com/brandy299/morte/main/install.sh | bash
# Holt den aktuellen Stand von GitHub in den Ordner "Pult" im Benutzerordner (Daten und installierte Teile bleiben erhalten),
# richtet Pult beim ersten Mal ein und startet es. Dieselbe Zeile später noch einmal holt ein Update.
# Alles steht in einer Funktion, damit bash das ganze Skript gelesen hat, bevor etwas passiert (bei einem abgebrochenen Download passiert nichts).
main() {
  set -e
  ZIEL="${PULT_ZIEL:-$HOME/Pult}"
  QUELLE="${PULT_QUELLE:-https://codeload.github.com/brandy299/morte/tar.gz/refs/heads/main}"

  if ! command -v node >/dev/null 2>&1; then
    echo
    echo "Node.js ist noch nicht installiert. Pult braucht es einmalig."
    echo "Lade auf https://nodejs.org die Version „LTS“ herunter, installiere sie, öffne dann ein NEUES Terminal-Fenster"
    echo "und füge die Zeile noch einmal ein."
    command -v open >/dev/null 2>&1 && open https://nodejs.org
    exit 1
  fi
  if [ "$(node -p "Number(process.versions.node.split('.')[0])")" -lt 22 ]; then
    echo
    echo "Dein Node.js ist zu alt (Version $(node -v)). Pult braucht Version 22 oder neuer."
    echo "Lade auf https://nodejs.org die Version „LTS“ herunter, installiere sie und füge die Zeile noch einmal ein."
    command -v open >/dev/null 2>&1 && open https://nodejs.org
    exit 1
  fi

  echo "Ich hole Pult von GitHub …"
  TMP="$(mktemp -d)"
  trap 'rm -rf "$TMP"' EXIT
  if ! curl -fsSL "$QUELLE" | tar -xz -C "$TMP" --strip-components=1; then
    echo
    echo "Der Download hat nicht geklappt. Prüfe deine Internetverbindung und versuche es noch einmal."
    exit 1
  fi
  [ -f "$TMP/package.json" ] || { echo "Der Download sieht nicht richtig aus. Versuche es noch einmal."; exit 1; }

  mkdir -p "$ZIEL"
  # Alte Programmdateien weg (so bleibt nichts Veraltetes liegen), die installierten Teile bleiben.
  find "$ZIEL" -mindepth 1 -maxdepth 1 ! -name node_modules -exec rm -rf {} +
  cp -R "$TMP"/. "$ZIEL"/
  chmod +x "$ZIEL/Pult starten.command" 2>/dev/null || true

  cd "$ZIEL"
  echo "Pult liegt in: $ZIEL"
  echo
  # Ohne Eingabe vom Terminal, damit nichts den Rest dieses Skripts liest.
  node scripts/los.mjs </dev/null
}
main "$@"
