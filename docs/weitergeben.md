# Pult an Tester weitergeben (für Yannik)

## Die ZIP-Datei bauen

Im Pult-Ordner, mit einem Terminal:

```
npm run zip
```

Das baut die Oberfläche neu und packt alles in eine Datei `pult-<Version>-<Datum>-<Commit>.zip` im Projektordner (rund 3 MB). Darin liegt:

- der fertig gebaute Pult-Ordner mit **„Pult starten.bat“** (Windows) und **„Pult starten.command“** (Mac),
- die Anleitungen unter `docs/` (`anleitung-tester.md`, `openrouter-anleitung.md` mit Bildern, `schluessel-empfehlung.md`).

Nicht dabei: Tests, Prüfläufe (`evals`), Recherche, deine Hinweise vom Stift und dein Datenordner. **Prüfe vor dem Verschicken**, dass die Datei keine Schlüssel enthält: Schlüssel liegen nie im Projekt (Schlüsselbund oder `~/pult-daten`), die ZIP packt nur die Dateien, die in Git stehen, plus die gebaute Oberfläche.

Wichtig: Der Befehl nimmt den **Stand deines Ordners**. Hast du etwas noch nicht gespeichert (committet), warnt er und packt es trotzdem ein.

## Verschicken

- **Am besten als Link** (OneDrive, Google Drive, Dropbox), nicht als Mailanhang. Manche Mailprogramme blockieren ZIP-Dateien mit Startdateien (`.bat`).
- Schick dazu den Hinweis: „Entpacke die Datei und lies `docs/anleitung-tester.md`.“ Am besten als eigene Datei, falls sie die ZIP noch nicht öffnen können.

## Was die Tester brauchen

1. Node.js (einmalig, nodejs.org, „LTS“).
2. Einen OpenRouter-Schlüssel (ungefähr 10 Dollar Guthaben, siehe `docs/openrouter-anleitung.md`).
3. Beim ersten Mal Internet, da sich Pult beim Start einrichtet (zwei bis fünf Minuten).

## Bekannte Stolpersteine

- **Mac:** Beim ersten Öffnen lehnt der Mac „Pult starten.command“ ab (nicht von Apple geprüft). Lösung steht in der Anleitung (Rechtsklick, „Öffnen“).
- **Windows:** SmartScreen zeigt „Der Computer wurde durch Windows geschützt“. Lösung steht in der Anleitung.
- **Schul-Rechner:** Dort sperrt die IT oft das Ausführen von Startdateien oder das Herunterladen. Dann zu Hause probieren.
- **Nicht getestet:** Der Doppelklick auf echtem Windows und echtem Mac. Der Ablauf (auspacken, einrichten, starten) ist auf Linux durchgespielt.

## Ein späterer Installer

Eine Fassung ohne Node.js und ohne Einrichtung beim Start ist die Phase „Installer“ in `ROADMAP.md`. Bis dahin ist das hier der einfachste Weg.
