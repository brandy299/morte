# Pult

Ein schlanker KI-Arbeitsplatz für Lehrkräfte. Fahrplan: `ROADMAP.md`, Regeln: `CLAUDE.md`.

## Starten (Entwicklung)

```
npm install
npm run dev
```

Dann im Browser `http://localhost:5173` öffnen. Beim ersten Start führt eine Seite durch die Einrichtung: Anbieter wählen, Zugangsschlüssel einfügen, "Verbindung testen". Der Schlüssel landet im Schlüsselbund des Betriebssystems. Wo es keinen gibt, liegt er in einer Datei nur für dich im Datenordner. Nie im Programmcode.

Anbieter: Claude, OpenAI, DeepSeek. "Erst einmal ohne KI ansehen" startet einen Demo-Modus ohne echte KI.

Der Datenordner ist `~/pult-daten` (änderbar mit `PULT_HOME`). Ein alter Ordner `~/morte-daten` wird beim ersten Start einmal umbenannt.


## Prüfen

```
npm test
npm run typecheck
npm run build
```
