#!/bin/bash
# Doppelklick baut die ZIP-Datei für Tester (Mac). Beim ersten Mal richtet sich das Projekt selbst ein.
cd "$(dirname "$0")/.." || exit 1
warten() { echo; read -n 1 -s -r -p "Zum Schließen eine Taste drücken."; }
if ! command -v node >/dev/null 2>&1; then
  echo
  echo "Node.js ist noch nicht installiert. Lade es auf nodejs.org herunter, Version „LTS“."
  command -v open >/dev/null 2>&1 && open https://nodejs.org
  warten
  exit 1
fi
if [ ! -d node_modules ]; then
  echo "Beim ersten Mal richtet sich das Projekt ein. Das dauert einige Minuten."
  npm install --no-audit --no-fund || { echo; echo "Das hat nicht geklappt. Mach ein Foto von den roten Zeilen oben."; warten; exit 1; }
fi
npm run zip || { echo; echo "Das hat nicht geklappt. Mach ein Foto von den roten Zeilen oben."; warten; exit 1; }
echo
echo "Fertig. Der Ordner mit der ZIP-Datei öffnet sich gleich."
command -v open >/dev/null 2>&1 && open .
warten
