# Entscheidung 025: Pult als Programm (Electron)

Datum: 2026-11-06 · Status: angenommen (Wunsch von Yannik: Tester sollen Pult ohne Terminal installieren können)

## Anlass

Die Installationszeile und die ZIP verlangen ein Terminal oder viele Klicks, und beim ersten Start richtet sich Pult zwei bis fünf Minuten ein. Das schreckt Tester ab.

## Entscheidung

- **Electron** (wie schon in der ROADMAP vorgesehen). Pult ist durchgehend Node und TypeScript. Electron bringt Node und einen Browser mit, der Code bleibt unverändert. Tauri hätte Rust und ein zusätzliches Node-Programm im Hintergrund verlangt, das für eine Person kaum zu pflegen ist.
- Das Fenster (`electron/main.mjs`) zeigt dieselbe Seite wie im Browser. Der Server läuft daneben als Kindprozess (das Electron-Programm als reines Node, mit `tsx`), genau wie bei `npm start`. Feste Adresse `127.0.0.1:38517`, damit Einstellungen der Seite zwischen Starts bleiben.
- Gebaut wird mit `electron-builder` in GitHub Actions (`.github/workflows/app.yml`): `.dmg` für Mac (Apple-Chip und Intel) und `Setup.exe` für Windows. Lokal: `npm run app` (Fenster ansehen), `npm run app:bauen`.
- Ohne Asar-Archiv: Quelltext und Bibliotheken liegen lose im Programm. Das hält Pfade (`import.meta.dirname`, Schriften, Skills) unverändert.
- Der Update-Knopf ist im Programm aus, weil er Dateien im Programm selbst ersetzen müsste. Neue Version = neue Datei herunterladen und darüber installieren, die Daten (`~/pult-daten`) bleiben.
- Ordner zum Arbeiten: Der Ordner-Dialog kommt von Electron (`window.pultApp.ordnerWaehlen`), im Browser vom Mac-Dialog oder per Pfad. Die Prüfung steckt im Server (`src/core/arbeitsordner`).

## Folgen

- Offen: Signatur und Beglaubigung (Apple Developer ca. 99 $/Jahr, Windows-Zertifikat). Bis dahin zeigen Mac und Windows beim ersten Öffnen eine Warnung, Anleitung in `docs/programm.md`.
- Offen: automatische Updates (`electron-updater`), sobald signiert wird.
- Nicht auf einem echten Mac oder Windows ausgeführt. Unter Linux: Fenster startet, Server antwortet, Ordner-Dialog-Brücke ist da, gepacktes Programm läuft.
