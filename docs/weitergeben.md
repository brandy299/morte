# Pult an Tester weitergeben (für Yannik)

## Die ZIP-Datei bauen

Voraussetzung auf deinem Rechner: **Node.js** (nodejs.org, „LTS“) und **Git** (git-scm.com). Beides einmal installieren.

**Einmalig, alles in einer Zeile.** Terminal öffnen (Windows: „PowerShell“, Mac: „Terminal“), diese Zeile einfügen, Enter:

- Windows (PowerShell):
  ```
  git clone https://github.com/brandy299/morte.git; cd morte; npm install; npm run zip
  ```
- Mac:
  ```
  git clone https://github.com/brandy299/morte.git && cd morte && npm install && npm run zip
  ```

Ist das Repo privat, fragt Git beim ersten Mal nach deinem GitHub-Login. Die ZIP-Datei liegt danach im Ordner „morte“.

**Danach per Doppelklick.** Im Ordner „morte“ liegt **„Paket bauen“** (Windows: `.bat`, Mac: `.command`, beim ersten Mal Rechtsklick, „Öffnen“). Ein Doppelklick richtet sich bei Bedarf selbst ein, baut die ZIP-Datei und öffnet den Ordner, in dem sie liegt.

**Neue Fassung holen und neu bauen** (eine Zeile, im Ordner „morte“):

- Windows: `git pull; npm install; npm run zip`
- Mac: `git pull && npm install && npm run zip`

Oder: `git pull` im Terminal, dann Doppelklick auf „Paket bauen“.

Der Befehl `npm run zip` selbst baut die Oberfläche neu und packt alles in eine Datei `pult-<Version>-<Datum>-<Commit>.zip` im Projektordner (rund 3 MB). Darin liegt:

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

## Nachricht an die Tester (zum Kopieren)

Schick die Datei als **Link** (OneDrive, Google Drive, Dropbox), nicht als Mailanhang. Dazu diesen Text, den du nach Bedarf anpasst:

> **Betreff:** Pult ausprobieren, dein Feedback hilft
>
> Hallo ⟨Name⟩,
>
> danke, dass du mitmachst! Pult ist ein KI-Arbeitsplatz für Lehrkräfte: Du sagst, was du brauchst (ein Arbeitsblatt, eine Klausur mit Erwartungshorizont, eine Stundenplanung …), und Pult erstellt druckfertiges Material. Es läuft auf deinem eigenen Computer, deine Gespräche und dein Material bleiben dort.
>
> **Wichtig:** Das ist ein **Probelauf**. Pult kann Fehler machen oder etwas nicht können. Genau das will ich von dir wissen.
>
> **Was du brauchst:**
> 1. Einen Windows- oder Mac-Computer und etwa **30 Minuten** Zeit beim ersten Mal.
> 2. **Node.js** (ein kleines Hilfsprogramm, einmal von nodejs.org installieren, Version „LTS“).
> 3. Einen **Zugang zur KI** über OpenRouter. Das ist wie eine Prepaid-Karte: Du lädst einmal etwa 10 Dollar auf, und es wird nur abgezogen, was verbraucht wird. Kein Abo. Wie das geht, steht in der Anleitung mit Bildern.
>
> **So geht es:**
> 1. Lade die Datei hier herunter: ⟨Link⟩
> 2. Entpacke sie (Windows: Rechtsklick, „Alle extrahieren“).
> 3. Öffne **„Anleitung.html“** und folge ihr Schritt für Schritt. Beim ersten Start richtet sich Pult selbst ein, das dauert ein paar Minuten.
>
> **Bitte probier drei Dinge aus:**
> 1. Ein **Arbeitsblatt** zu einem Thema aus deinem Unterricht.
> 2. Eine **Stunde oder Reihe planen** für eine deiner Klassen.
> 3. Eine **Klausur** mit Erwartungshorizont. Pult fragt nach deinen Bewertungsregeln.
>
> **Datenschutz, bitte unbedingt:** **Keine Schülernamen, keine Noten und keine Fotos von Klassenarbeiten**, weder im Gespräch noch in angehängten Dateien. Deine Eingaben gehen an den KI-Anbieter.
>
> **Mir zurückmelden:**
> - Klick unter jedem Material auf **„Passt“** oder **„Passt nicht“** (bei „Passt nicht“ ein Satz, warum).
> - Wenn etwas hakt: Foto vom Bildschirm, und schreib auf, was du gerade gemacht hast.
> - Am Ende: Was war gut, was war nervig, was hat gefehlt?
>
> Ich sitze gern beim ersten Start dabei. Melde dich einfach.
>
> Danke!
> ⟨Dein Name⟩

## Was du beim ersten Tester selbst sagen und beobachten solltest

- **Vorher sagen:** „Das ist ein Probelauf. Wenn etwas nicht klappt, liegt es an Pult, nicht an dir.“ Und: „Keine Schülernamen oder Noten eingeben.“
- **Nicht helfen, solange es geht.** Schau zu, wo die Person hängen bleibt, und schreib es auf. Die Stellen, an denen du eingreifst, sind die Fehler in der Anleitung.
- **Typische Stolpersteine:** Warnung von Windows oder Mac beim ersten Öffnen, Node.js fehlt, das schwarze Fenster wird geschlossen, der Schlüssel wird beim falschen Anbieter eingefügt, die Ausgabengrenze oder der Ablauf des Schlüssels (30 Tage) wird vergessen.
- **Danach fragen:** Wie lange hat es bis zum ersten Material gedauert? Hat sie die Rückfragen verstanden? Würde sie das Material so im Unterricht benutzen?
