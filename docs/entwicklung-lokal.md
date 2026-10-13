# Mit Pult an Pult arbeiten (für Yannik)

So änderst du Pult an der Oberfläche mit dem Stift und lässt die Änderungen von Claude Code umsetzen, mit deinem eigenen Claude-Abo. Das ist erlaubt: Du meldest dich im **unveränderten Claude Code** mit deinem Konto an (siehe `docs/entscheidungen/023-abos-und-kosten.md`).

## Einmal einrichten

1. **Node.js 22 oder neuer** installieren (nodejs.org, Version „LTS“).
2. **Git** installieren, falls noch nicht da.
3. **Claude Code** installieren und mit deinem Claude-Konto anmelden (Anleitung: code.claude.com). Oder die Claude-Desktop-App, dort der Reiter „Code“ mit „Local“.
4. Repo holen und vorbereiten (Terminal, unter Windows PowerShell):
   ```
   git clone https://github.com/brandy299/morte.git
   cd morte
   npm install
   npm run build
   ```

## Jeden Tag

Zwei Fenster:

**Fenster 1: Pult mit Stift starten**
```
cd morte
npm start -- --stift
```
Dann im Browser `http://localhost:3001` öffnen. Oben erscheint der Stift.

**Fenster 2: Claude Code im selben Ordner**
```
cd morte
claude
```

## Ablauf

1. In Pult mit dem Stift auf die Stelle zeigen, die du ändern willst, Hinweis schreiben, speichern. Er landet im Ordner `Dev-Hinweise` in deinem Pult-Datenordner (`~/pult-daten`, nicht im Repo).
2. Im Claude-Code-Fenster `/hinweise` eingeben. Claude liest die Hinweise, setzt sie um, prüft sie und meldet, was es gemacht hat.
3. Pult neu bauen und starten (`npm run build`, dann `npm start -- --stift`) und die Änderung ansehen.
4. Gefällt es, darf Claude committen. Zum Ausprobieren kannst du statt `npm run build` auch `npm run dev` nehmen (Browser `http://localhost:5173`, lädt Änderungen von selbst nach).

## Vorsicht

- Der Stift ist nur für dich. Er ist ohne `--stift` nicht da und gehört nicht in den Probelauf für Kolleginnen und Kollegen.
- Das Bildschirmfoto im Stift ist in einem echten Chrome oder Edge noch nicht getestet. Geht es nicht, speichert der Stift ohne Bild und sagt es.
- In den Hinweisen darf kein Schülername und keine Note stehen.
