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

  # Kein passendes Node.js auf dem Rechner? Dann lädt dieses Skript eine eigene Kopie in den Pult-Ordner (nichts wird installiert, nichts anderes verändert).
  node_ok() { command -v node >/dev/null 2>&1 && [ "$(node -p "Number(process.versions.node.split('.')[0])" 2>/dev/null || echo 0)" -ge 22 ]; }
  if ! node_ok && [ -x "$ZIEL/node/bin/node" ]; then export PATH="$ZIEL/node/bin:$PATH"; fi
  if ! node_ok; then
    echo "Pult braucht das Hilfsprogramm Node.js. Ich lade es für Pult dazu (rund 40 MB) …"
    case "$(uname -s)-$(uname -m)" in
      Darwin-arm64) PLATTFORM=darwin-arm64 ;;
      Darwin-x86_64) PLATTFORM=darwin-x64 ;;
      Linux-x86_64) PLATTFORM=linux-x64 ;;
      *) echo "Dieses System kenne ich nicht. Installiere Node.js (Version „LTS“) von https://nodejs.org und füge die Zeile noch einmal ein."; exit 1 ;;
    esac
    NODEDIR="${PULT_NODE_QUELLE:-https://nodejs.org/dist/latest-v22.x}"
    NTMP="$(mktemp -d)"
    trap 'rm -rf "$NTMP" "${TMP:-}"' EXIT
    DATEI="$(curl -fsSL "$NODEDIR/SHASUMS256.txt" | awk -v p="$PLATTFORM.tar.gz" '$2 ~ p"$" { print $2 " " $1 }')" || DATEI=""
    NAME="${DATEI% *}"; SUMME="${DATEI#* }"
    if [ -z "$NAME" ] || ! curl -fsSL "$NODEDIR/$NAME" -o "$NTMP/node.tar.gz"; then
      echo "Der Download von Node.js hat nicht geklappt. Prüfe deine Internetverbindung oder installiere Node.js von https://nodejs.org."
      exit 1
    fi
    GOT="$( (shasum -a 256 "$NTMP/node.tar.gz" 2>/dev/null || sha256sum "$NTMP/node.tar.gz") | awk '{print $1}')"
    if [ "$GOT" != "$SUMME" ]; then
      echo "Die heruntergeladene Datei ist nicht in Ordnung (Prüfsumme stimmt nicht). Versuche es noch einmal."
      exit 1
    fi
    mkdir -p "$ZIEL"
    rm -rf "$ZIEL/node"
    mkdir "$ZIEL/node"
    tar -xz -C "$ZIEL/node" --strip-components=1 -f "$NTMP/node.tar.gz"
    export PATH="$ZIEL/node/bin:$PATH"
    node_ok || { echo "Node.js konnte nicht eingerichtet werden. Installiere es von https://nodejs.org."; exit 1; }
  fi

  echo "Ich hole Pult von GitHub …"
  TMP="$(mktemp -d)"
  trap 'rm -rf "$TMP" "${NTMP:-}"' EXIT
  if ! curl -fsSL "$QUELLE" | tar -xz -C "$TMP" --strip-components=1; then
    echo
    echo "Der Download hat nicht geklappt. Prüfe deine Internetverbindung und versuche es noch einmal."
    exit 1
  fi
  [ -f "$TMP/package.json" ] || { echo "Der Download sieht nicht richtig aus. Versuche es noch einmal."; exit 1; }

  mkdir -p "$ZIEL"
  # Alte Programmdateien weg (so bleibt nichts Veraltetes liegen), die installierten Teile und die eigene Node.js-Kopie bleiben.
  find "$ZIEL" -mindepth 1 -maxdepth 1 ! -name node_modules ! -name node -exec rm -rf {} +
  cp -R "$TMP"/. "$ZIEL"/
  chmod +x "$ZIEL/Pult starten.command" 2>/dev/null || true

  cd "$ZIEL"
  echo "Pult liegt in: $ZIEL"
  echo
  # Ohne Eingabe vom Terminal, damit nichts den Rest dieses Skripts liest.
  node scripts/los.mjs </dev/null
}
main "$@"
