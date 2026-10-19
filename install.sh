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

  # Temporäre Ordner dieses Skripts. Eigene Namen und leer vorbelegt, damit das Aufräumen nie einen fremden Ordner trifft.
  PULT_NTMP=""
  PULT_DTMP=""
  trap 'rm -rf ${PULT_NTMP:+"$PULT_NTMP"} ${PULT_DTMP:+"$PULT_DTMP"}' EXIT

  # Kein passendes Node.js auf dem Rechner? Dann hält dieses Skript eine eigene Kopie im Pult-Ordner (nichts wird installiert, nichts anderes verändert).
  # Eine Regel für alle Stellen: Gibt es "Pult/node", ist das Pults Node.js. Die Startdateien nehmen es immer zuerst,
  # und dieses Skript bringt es bei jedem Lauf auf die neueste Version 22 (Sicherheitsupdates).
  node_ok() { command -v node >/dev/null 2>&1 && [ "$(node -p "Number(process.versions.node.split('.')[0])" 2>/dev/null || echo 0)" -ge 22 ]; }
  if [ -d "$ZIEL/node" ] || ! node_ok; then
    eigene_node
    export PATH="$ZIEL/node/bin:$PATH"
    node_ok || { echo "Node.js konnte nicht eingerichtet werden. Installiere es von https://nodejs.org (Version „LTS“) und füge die Zeile noch einmal ein."; exit 1; }
  fi

  echo "Ich hole Pult von GitHub …"
  PULT_DTMP="$(mktemp -d)"
  if ! curl -fsSL "$QUELLE" | tar -xz -C "$PULT_DTMP" --strip-components=1; then
    echo
    echo "Der Download hat nicht geklappt. Prüfe deine Internetverbindung und versuche es noch einmal."
    exit 1
  fi
  [ -f "$PULT_DTMP/package.json" ] || { echo "Der Download sieht nicht richtig aus. Versuche es noch einmal."; exit 1; }

  mkdir -p "$ZIEL"
  # Alte Programmdateien weg (so bleibt nichts Veraltetes liegen), die installierten Teile und die eigene Node.js-Kopie bleiben.
  find "$ZIEL" -mindepth 1 -maxdepth 1 ! -name node_modules ! -name node -exec rm -rf {} +
  cp -R "$PULT_DTMP"/. "$ZIEL"/
  chmod +x "$ZIEL/Pult starten.command" 2>/dev/null || true

  cd "$ZIEL"
  echo "Pult liegt in: $ZIEL"
  echo
  # Ohne Eingabe vom Terminal, damit nichts den Rest dieses Skripts liest.
  node scripts/los.mjs </dev/null
}
# Holt oder erneuert die eigene Node.js-Kopie in "$ZIEL/node". Bricht mit einer Meldung in einfacher Sprache ab, wenn es nicht geht.
eigene_node() {
  local plattform nodedir liste name summe got vorhanden
  case "$(uname -s)-$(uname -m)" in
    Darwin-*)
      # Unter Rosetta meldet ein Mac mit Apple-Chip "x86_64". Der Chip selbst verrät sich über hw.optional.arm64.
      if [ "$(sysctl -n hw.optional.arm64 2>/dev/null)" = "1" ]; then plattform=darwin-arm64; else plattform=darwin-x64; fi ;;
    Linux-x86_64) plattform=linux-x64 ;;
    Linux-aarch64 | Linux-arm64) plattform=linux-arm64 ;;
    *) echo "Dieses System kenne ich nicht. Installiere Node.js (Version „LTS“) von https://nodejs.org und füge die Zeile noch einmal ein."; exit 1 ;;
  esac
  nodedir="${PULT_NODE_QUELLE:-https://nodejs.org/dist/latest-v22.x}"
  vorhanden=""
  [ -x "$ZIEL/node/bin/node" ] && vorhanden="$("$ZIEL/node/bin/node" -v 2>/dev/null || true)"

  liste="$(curl -fsSL "$nodedir/SHASUMS256.txt" 2>/dev/null || true)"
  name="$(printf '%s\n' "$liste" | awk -v p="-$plattform.tar.gz" '{ if (substr($2, length($2) - length(p) + 1) == p) { print $2; exit } }')"
  summe="$(printf '%s\n' "$liste" | awk -v n="$name" '$2 == n { print $1; exit }')"
  if [ -z "$name" ] || [ -z "$summe" ]; then
    # Ohne Internet geht es mit der vorhandenen Kopie weiter.
    [ -n "$vorhanden" ] && return 0
    echo "Der Download von Node.js hat nicht geklappt. Prüfe deine Internetverbindung oder installiere Node.js von https://nodejs.org."
    exit 1
  fi
  # Schon die neueste Version? Dann nichts zu tun.
  case "$name" in "node-$vorhanden-"*) return 0 ;; esac

  if [ -n "$vorhanden" ]; then echo "Ich erneuere das Hilfsprogramm Node.js für Pult …"; else echo "Pult braucht das Hilfsprogramm Node.js. Ich lade es für Pult dazu, das dauert einen Moment …"; fi
  PULT_NTMP="$(mktemp -d)"
  if ! curl -fsSL "$nodedir/$name" -o "$PULT_NTMP/node.tar.gz"; then
    [ -n "$vorhanden" ] && return 0
    echo "Der Download von Node.js hat nicht geklappt. Prüfe deine Internetverbindung oder installiere Node.js von https://nodejs.org."
    exit 1
  fi
  if command -v shasum >/dev/null 2>&1; then got="$(shasum -a 256 "$PULT_NTMP/node.tar.gz" | awk '{print $1}')"
  elif command -v sha256sum >/dev/null 2>&1; then got="$(sha256sum "$PULT_NTMP/node.tar.gz" | awk '{print $1}')"
  else
    echo "Auf diesem Computer fehlt ein Prüfprogramm (shasum oder sha256sum). Installiere Node.js von https://nodejs.org und füge die Zeile noch einmal ein."
    exit 1
  fi
  if [ "$got" != "$summe" ]; then
    echo "Die heruntergeladene Datei ist nicht in Ordnung (Prüfsumme stimmt nicht). Versuche es noch einmal."
    exit 1
  fi
  # Erst vollständig entpacken, dann austauschen: Bricht es ab, bleibt die alte Kopie heil.
  mkdir -p "$ZIEL" "$PULT_NTMP/x"
  if ! tar -xz -C "$PULT_NTMP/x" --strip-components=1 -f "$PULT_NTMP/node.tar.gz" || ! "$PULT_NTMP/x/bin/node" -v >/dev/null 2>&1; then
    echo "Node.js ließ sich nicht entpacken. Ist auf dem Computer noch genug Platz frei? Versuche es dann noch einmal."
    exit 1
  fi
  rm -rf "$ZIEL/node"
  mv "$PULT_NTMP/x" "$ZIEL/node"
}

main "$@"
