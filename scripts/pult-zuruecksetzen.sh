#!/bin/bash
# Pult auf dem Mac komplett zurücksetzen, damit eine Neuinstallation wie beim ersten Mal startet.
# Nichts wird endgültig gelöscht: Datenordner wandern in einen Sicherungsordner auf dem Schreibtisch.
# Aufruf im Terminal:  curl -fsSL https://raw.githubusercontent.com/brandy299/morte/main/scripts/pult-zuruecksetzen.sh | bash
set -u
STEMPEL="$(date +%Y-%m-%d_%H-%M-%S)"
SICHERUNG="${PULT_SICHERUNG:-$HOME/Desktop/Pult-Sicherung-$STEMPEL}"

echo "Pult wird zurückgesetzt."
echo

# 1. Läuft Pult noch? Dann zuerst beenden (sonst schreibt es die Einstellungen gleich wieder).
if lsof -nP -iTCP:3001 -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Pult läuft noch (Port 3001). Schließe das Pult-Fenster im Terminal und starte dieses Skript dann noch einmal."
  exit 1
fi

sichere() { # verschiebt eine Datei oder einen Ordner in die Sicherung
  [ -e "$1" ] || return 0
  mkdir -p "$SICHERUNG"
  ziel="$SICHERUNG/$(basename "$1")"; i=2
  while [ -e "$ziel" ]; do ziel="$SICHERUNG/$(basename "$1")-$i"; i=$((i+1)); done
  mv "$1" "$ziel" && echo "  gesichert: $1"
}

# 2. Datenordner: der gewählte (Zeigerdatei), der Standardordner und der alte Ordner aus der Zeit vor der Umbenennung.
#    Der alte Ordner ~/morte-daten muss mit weg, sonst holt Pult ihn beim nächsten Start automatisch zurück.
echo "Datenordner und Einstellungen:"
for zeiger in "$HOME/.pult-ordner" "$HOME/.morte-ordner"; do
  if [ -f "$zeiger" ]; then
    gewaehlt="$(tr -d '\r' < "$zeiger" | head -n 1)"
    gewaehlt="${gewaehlt%"${gewaehlt##*[![:space:]]}"}"
    [ -n "$gewaehlt" ] && [ "$gewaehlt" != "$HOME" ] && sichere "$gewaehlt"
    sichere "$zeiger"
  fi
done
sichere "$HOME/pult-daten"
sichere "$HOME/morte-daten"

# 3. Zugangsschlüssel im Schlüsselbund (Dienst "pult", früher "morte").
echo "Schlüsselbund:"
if command -v security >/dev/null 2>&1; then
  for dienst in pult morte; do
    n=0
    while security delete-generic-password -s "$dienst" >/dev/null 2>&1; do n=$((n+1)); [ $n -ge 50 ] && break; done
    echo "  $n Eintrag/Einträge unter \"$dienst\" entfernt"
  done
else
  echo "  übersprungen (kein Mac)"
fi

# 4. Programmordner ~/Pult samt installierten Teilen und eigener Node.js-Kopie (wird bei der Installation neu geholt).
echo "Programm:"
if [ -d "$HOME/Pult" ]; then rm -rf "$HOME/Pult" && echo "  entfernt: $HOME/Pult"; fi

# 5. Hinweis, falls PULT_HOME fest eingetragen ist (dann nimmt Pult immer diesen Ordner).
if [ -n "${PULT_HOME:-}${MORTE_HOME:-}" ] || grep -qsE 'PULT_HOME|MORTE_HOME' "$HOME/.zshrc" "$HOME/.zprofile" "$HOME/.bash_profile" "$HOME/.bashrc" "$HOME/.profile"; then
  echo
  echo "Achtung: PULT_HOME (oder MORTE_HOME) ist gesetzt. Entferne die Zeile aus deiner Shell-Datei, sonst nimmt Pult wieder diesen Ordner."
fi

echo
[ -d "$SICHERUNG" ] && echo "Deine bisherigen Daten liegen in: $SICHERUNG" || echo "Es gab keine alten Daten."
echo "Fertig. Jetzt die Installationszeile neu einfügen:"
echo "  curl -fsSL https://raw.githubusercontent.com/brandy299/morte/main/install.sh | bash"
