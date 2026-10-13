# Pult an Tester weitergeben (für Yannik)

## Die ZIP-Datei bauen

Im Pult-Ordner, mit einem Terminal:

```
npm run zip
```

Das baut die Oberfläche neu und packt alles in eine Datei `pult-<Version>-<Datum>-<Commit>.zip` im Projektordner (rund 3 MB). Darin liegt:

- der fertig gebaute Pult-Ordner mit **„Pult starten.bat“** (Windows) und **„Pult starten.command“** (Mac),
- die Anleitungen als **„Anleitung.html“** und **„OpenRouter einrichten.html“**. Das sind einzelne Dateien, die sich per Doppelklick im Browser öffnen, mit den Bildern darin. Sie entstehen aus `docs/anleitung-tester.md` und `docs/openrouter-anleitung.md`. Ändere den Text dort, nicht in der HTML-Datei.

Nicht dabei: der Ordner `docs/`, Tests, Prüfläufe (`evals`), deine Hinweise vom Stift und dein Datenordner. **Prüfe vor dem Verschicken**, dass die Datei keine Schlüssel enthält: Schlüssel liegen nie im Projekt (Schlüsselbund oder `~/pult-daten`), die ZIP packt nur die Dateien, die in Git stehen, plus die gebaute Oberfläche.

Wichtig: Der Befehl nimmt den **Stand deines Ordners**. Hast du etwas noch nicht gespeichert (committet), warnt er und packt es trotzdem ein.

## Verschicken

- **Am besten als Link** (OneDrive, Google Drive, Dropbox), nicht als Mailanhang. Manche Mailprogramme blockieren ZIP-Dateien mit Startdateien (`.bat`).
- Schick dazu den Hinweis: „Entpacke die Datei und öffne **Anleitung.html**.“ Am besten legst du die Anleitung zusätzlich als eigene Datei neben den Link, falls jemand die ZIP nicht entpacken kann.

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
