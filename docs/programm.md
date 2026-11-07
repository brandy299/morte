# Pult als Programm installieren (für Tester)

## Mac

1. Lade die Datei „Pult-…-mac-….dmg“ herunter (Apple-Chip: „arm64“, älterer Mac mit Intel: „x64“).
2. Öffne sie und ziehe Pult in den Ordner „Programme“.
3. Beim ersten Öffnen kommt eine Warnung („nicht geöffnet“). Öffne **Systemeinstellungen → Datenschutz & Sicherheit**, scrolle nach unten und klicke bei Pult auf **Trotzdem öffnen**. Das ist nur beim ersten Mal nötig.

## Windows

1. Lade die Datei „Pult-…-win-x64.exe“ herunter und doppelklicke sie.
2. Kommt die blaue Warnung „Der Computer wurde durch Windows geschützt“, klicke auf **Weitere Informationen** und dann auf **Trotzdem ausführen**.
3. Pult installiert sich selbst und öffnet sich. Du findest es danach im Startmenü.

## Neue Version

Kleine Updates holt Pult beim Start von selbst im Hintergrund, du merkst nichts. Größere Updates meldet Pult mit einem Hinweis oben im Fenster („Es gibt eine neue Version von Pult“, mit „Jetzt aktualisieren“ und „Später“). Pult sieht beim Start und danach alle 30 Minuten nach. Ein Klick genügt: Eine Anzeige zeigt, wie weit es ist, dann schließt sich Pult, installiert die neue Version und öffnet sich von allein wieder. Du musst nichts herunterladen. Die Warnung von Mac oder Windows kommt dabei nicht noch einmal. Deine Daten bleiben.

## Warum die Warnung?

Pult ist noch nicht bei Apple und Microsoft eingetragen. Das kostet jährlich Geld und kommt später. Die Warnung heißt nicht, dass etwas nicht stimmt.

## Für Entwickler

`npm run app` baut die Oberfläche und öffnet das Fenster. `npm run app:bauen` baut das Programm für das eigene System nach `release-app/`. Bei jedem Stand auf `main` baut GitHub das kleine Update-Paket (Release „code“: `code.zip`, `code.json`), das der Update-Knopf holt. Die Installationsdateien für Mac und Windows baut GitHub (Actions, „Programm bauen“; mit einem Tag `v0.2.0` kommen sie zu den Releases). Siehe `docs/entscheidungen/025-desktop-app.md`.
