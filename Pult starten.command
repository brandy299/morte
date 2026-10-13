#!/bin/bash
# Doppelklick startet Pult (Mac). Beim ersten Start richtet sich Pult selbst ein.
cd "$(dirname "$0")" || exit 1
if ! command -v node >/dev/null 2>&1; then
  echo
  echo "Node.js ist noch nicht installiert. Pult braucht es einmalig."
  echo "Es öffnet sich gleich die Seite nodejs.org. Lade dort die Version „LTS“ herunter,"
  echo "installiere sie und starte Pult danach noch einmal."
  echo
  open https://nodejs.org
  read -n 1 -s -r -p "Zum Schließen eine Taste drücken."
  exit 1
fi
node scripts/los.mjs || { echo; read -n 1 -s -r -p "Zum Schließen eine Taste drücken."; }
