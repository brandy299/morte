# Entscheidung 025: Pult als Programm (Electron)

Datum: 2026-11-06 · Status: angenommen (Wunsch von Yannik: Tester sollen Pult ohne Terminal installieren können)

## Anlass

Die Installationszeile und die ZIP verlangen ein Terminal oder viele Klicks, und beim ersten Start richtet sich Pult zwei bis fünf Minuten ein. Das schreckt Tester ab.

## Entscheidung

- **Electron** (wie schon in der ROADMAP vorgesehen). Pult ist durchgehend Node und TypeScript. Electron bringt Node und einen Browser mit, der Code bleibt unverändert. Tauri hätte Rust und ein zusätzliches Node-Programm im Hintergrund verlangt, das für eine Person kaum zu pflegen ist.
- Das Fenster (`electron/main.mjs`) zeigt dieselbe Seite wie im Browser. Der Server läuft daneben als Kindprozess (das Electron-Programm als reines Node, mit `tsx`), genau wie bei `npm start`. Feste Adresse `127.0.0.1:38517`, damit Einstellungen der Seite zwischen Starts bleiben.
- Gebaut wird mit `electron-builder` in GitHub Actions (`.github/workflows/app.yml`): `.dmg` für Mac (Apple-Chip und Intel) und `Setup.exe` für Windows. Lokal: `npm run app` (Fenster ansehen), `npm run app:bauen`.
- Ohne Asar-Archiv: Quelltext und Bibliotheken liegen lose im Programm. Das hält Pfade (`import.meta.dirname`, Schriften, Skills) unverändert.
- **Update-Knopf im Programm, ohne Zertifikat:** Electron-Updater scheitert auf dem Mac ohne Signatur. Darum ersetzt Pult nur seinen eigenen Code (`src`, `skills`, `assets`, Oberfläche, rund 10 MB): GitHub baut bei jedem Stand auf `main` `code.zip` und `code.json` (Release „code“, `scripts/code-paket.mjs`). Der Knopf lädt es, prüft die Prüfsumme, legt es in `<Programmdaten>/code/aktuell` (die Bibliotheken des installierten Programms werden verlinkt) und startet den Server daraus neu. Startet der neue Code nicht, wird er verworfen und der installierte läuft wieder.
- **Ganzes Programm ohne Zertifikat (Aktualisierung vom 2026-11-07):** Ändert sich die „Basis“ (Hash von `package-lock.json` ohne Zeilenenden-Unterschied, plus `pultHuelle` in `package.json`; ändert man `electron/`, wird `pultHuelle` hochgezählt), lädt der Knopf den Installer der Version aus dem GitHub-Release (`SHA256SUMS.txt` prüft ihn) und startet ihn nach dem Schließen: Windows `Setup.exe /S --force-run`, Mac kopiert die App aus der `.dmg` über die alte und öffnet sie. Weil Pult selbst lädt (nicht der Browser), setzen Windows und macOS keine „aus dem Internet“-Markierung, die Warnung kommt nur beim allerersten Öffnen. Kleine Updates (nur Code) holt der Server beim Start selbst und startet neu (Ausnahme: nach einem Fehlstart des neuen Codes wird das automatische Holen für diesen Lauf abgeschaltet, damit nichts in einer Schleife hängt). Die Windows-Datei checkt `package-lock.json` mit CRLF aus; die Basis ignoriert das, sonst hielt Pult jede Version für „braucht Neuinstallation“ (Fehler in 0.2.0, deshalb braucht 0.2.0 einmal eine von-Hand-Installation von 0.2.1).
- **Nicht auf echtem Mac oder Windows ausgeführt:** die Skripte für den Installationsschritt (Windows `cmd`, Mac `sh`) sind nur auf Syntax geprüft. Läuft etwas schief, bleibt die alte App unverändert und die Meldung verweist auf die Download-Seite.
- Ordner zum Arbeiten: Der Ordner-Dialog kommt von Electron (`window.pultApp.ordnerWaehlen`), im Browser vom Mac-Dialog oder per Pfad. Die Prüfung steckt im Server (`src/core/arbeitsordner`).

## Folgen

- Offen: Signatur und Beglaubigung (Apple Developer ca. 99 $/Jahr, Windows-Zertifikat). Bis dahin zeigen Mac und Windows beim ersten Öffnen eine Warnung, Anleitung in `docs/programm.md`.
- Offen: Updates ganz ohne Klick und für Hülle und Bibliotheken (`electron-updater`), sobald signiert wird.
- Nicht auf einem echten Mac oder Windows ausgeführt. Unter Linux: Fenster startet, Server antwortet, Ordner-Dialog-Brücke ist da, gepacktes Programm läuft.
