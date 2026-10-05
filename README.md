# morte

Ein schlanker KI-Arbeitsplatz für Lehrkräfte. Fahrplan: `ROADMAP.md`, Regeln: `CLAUDE.md`.

## Starten (Entwicklung)

```
npm install
npx playwright install chromium   # einmalig, für druckfertige PDFs
npm run dev
```

Dann im Browser `http://localhost:5173` öffnen. Beim ersten Start führt eine Seite durch die Einrichtung: Anbieter wählen, Zugangsschlüssel einfügen, "Verbindung testen". Der Schlüssel landet im Schlüsselbund des Betriebssystems. Wo es keinen gibt, liegt er in einer Datei nur für dich im Datenordner. Nie im Programmcode.

Anbieter: Claude, OpenAI, DeepSeek. "Erst einmal ohne KI ansehen" startet einen Demo-Modus ohne echte KI.

Der Datenordner ist `~/morte-daten` (änderbar mit `MORTE_HOME`).

Mit `MORTE_CHROMIUM=/Pfad/zu/chrome` lässt sich ein schon vorhandener Chromium-Browser für die PDFs nutzen.

## Prüfen

```
npm test
npm run typecheck
npm run build
```
