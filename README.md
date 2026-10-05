# morte

Ein schlanker KI-Arbeitsplatz für Lehrkräfte. Fahrplan: `ROADMAP.md`, Regeln: `CLAUDE.md`.

## Starten (Entwicklung)

```
npm install
npm run dev
```

Dann im Browser `http://localhost:5173` öffnen. (Als fertiges Programm ohne Entwicklungsserver: `npm run build`, dann `npm start` und `http://localhost:3001` öffnen.) Beim ersten Start führt eine Seite durch die Einrichtung: Anbieter wählen, Zugangsschlüssel einfügen, "Verbindung testen". Der Schlüssel landet im Schlüsselbund des Betriebssystems. Wo es keinen gibt, liegt er in einer Datei nur für dich im Datenordner. Nie im Programmcode.

Anbieter: Claude, OpenAI, DeepSeek. "Erst einmal ohne KI ansehen" startet einen Demo-Modus ohne echte KI.

Der Datenordner ist `~/morte-daten` (änderbar mit `MORTE_HOME`).


## Prüfen

```
npm test
npm run typecheck
npm run build
```
