# Pult

Ein schlanker KI-Arbeitsplatz für Lehrkräfte. Fahrplan: `ROADMAP.md`, Regeln: `CLAUDE.md`.

## Starten (Entwicklung)

```
npm install
npm run dev
```

Dann im Browser `http://localhost:5173` öffnen. (Als fertiges Programm ohne Entwicklungsserver: `npm run build`, dann `npm start` und `http://localhost:3001` öffnen.) Beim ersten Start führt eine Seite durch die Einrichtung: Anbieter wählen, Zugangsschlüssel einfügen, "Verbindung testen". Der Schlüssel landet im Schlüsselbund des Betriebssystems. Wo es keinen gibt, liegt er in einer Datei nur für dich im Datenordner. Nie im Programmcode.

Anbieter: Claude, OpenAI, OpenRouter, DeepSeek. "Erst einmal ohne KI ansehen" startet einen Demo-Modus ohne echte KI.

Der Datenordner ist `~/pult-daten` (änderbar mit `PULT_HOME`). Ein alter Ordner `~/morte-daten` wird beim ersten Start einmal umbenannt.


## Prüfen

```
npm test
npm run typecheck
npm run build
```

## Hinweis zu Bibliotheken

Der Stundenplan wird mit [ical.js](https://github.com/kewisch/ical.js) gelesen (MPL-2.0), unverändert als Abhängigkeit eingebunden. Word-Dateien schreibt [docx](https://github.com/dolanmiu/docx) (MIT) und liest [mammoth](https://github.com/mwilliamson/mammoth.js) (BSD-2-Clause).
