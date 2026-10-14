# Pult an Tester weitergeben (für Yannik)

Es gibt zwei Wege. **Der erste ist der empfohlene**, weil er ohne die Warnungen von Windows und Mac auskommt.

## Weg 1 (empfohlen): eine Zeile im Terminal

Das Repo ist öffentlich, die Tester holen Pult direkt von GitHub. Sie brauchen nur **Node.js** (nodejs.org, „LTS“) und diese Zeile im Terminal:

- Windows (PowerShell): `irm https://raw.githubusercontent.com/brandy299/morte/main/install.ps1 | iex`
- Mac (Terminal): `curl -fsSL https://raw.githubusercontent.com/brandy299/morte/main/install.sh | bash`

Das Skript (`install.sh`, `install.ps1` im Hauptordner des Repos) lädt den aktuellen Stand von `main` in den Ordner „Pult“ im Benutzerordner, richtet Pult beim ersten Mal ein (`npm install`, Oberfläche bauen, Anleitungen als HTML erzeugen) und startet es. Dieselbe Zeile noch einmal holt ein Update: Die Programmdateien werden erneuert, die installierten Teile und der Datenordner `pult-daten` bleiben. Dateien, die jemand selbst im Ordner „Pult“ ablegt, gehen dabei verloren (die Anleitung sagt es).

**Was die Tester bekommen, ist immer der aktuelle Stand von `main`.** Merge deshalb nur geprüfte Änderungen, solange der Probelauf läuft. Soll ein Stand eingefroren werden, kann das Skript später auf einen festen Zweig oder eine Version zeigen (`PULT_QUELLE`).

Weil nichts aus einem Browser oder per E-Mail kommt, gibt es keine Sperre von Apple (Gatekeeper) und kein SmartScreen von Windows. Die Datei „Pult starten“ im Ordner „Pult“ lässt sich später per Doppelklick öffnen.

## Weg 2: ZIP-Datei

Für Leute, die keine Zeile eintippen mögen, oder wenn GitHub gesperrt ist.

Voraussetzung auf deinem Rechner: **Node.js** und **Git**. Einmalig, alles in einer Zeile:

- Windows (PowerShell): `git clone https://github.com/brandy299/morte.git; cd morte; npm install; npm run zip`
- Mac: `git clone https://github.com/brandy299/morte.git && cd morte && npm install && npm run zip`

Danach genügt ein Doppelklick auf **„Paket bauen“** im Ordner „morte“ (Windows `.bat`, Mac `.command`). Neue Fassung: `git pull` und wieder „Paket bauen“.

Die ZIP (`pult-<Version>-<Datum>-<Commit>.zip`, rund 3 MB) enthält die fertig gebaute Oberfläche, „Pult starten.bat“ und „Pult starten.command“ sowie die Anleitungen als einzelne HTML-Dateien („Anleitung.html“, „OpenRouter einrichten.html“, mit Bildern darin, entstanden aus `docs/anleitung-tester.md` und `docs/openrouter-anleitung.md`). Nicht dabei: `docs/`, Tests, Prüfläufe, deine Hinweise vom Stift, dein Datenordner. Schlüssel liegen nie im Projekt, die ZIP packt nur Dateien aus Git plus die gebaute Oberfläche.

Als E-Mail-Anhang können manche Programme sie blockieren (Startdateien darin). Ein Cloud-Link ist sicherer.

**Mac:** Beim ersten Öffnen zeigt der Mac „‚Pult starten.command‘ nicht geöffnet“. Der Weg: „Fertig“, dann Systemeinstellungen, Datenschutz & Sicherheit, ganz unten „Trotzdem öffnen“ (auf einem echten Mac am 2026-10-14 gesehen, die Schritte danach nicht). **Windows:** SmartScreen „Der Computer wurde durch Windows geschützt“, „Weitere Informationen“, „Trotzdem ausführen“ (nicht gesehen).

## Nachricht an die Tester (zum Kopieren)

> **Betreff:** Pult ausprobieren, dein Feedback hilft
>
> Hallo ⟨Name⟩,
>
> danke, dass du mitmachst! Pult ist ein KI-Arbeitsplatz für Lehrkräfte: Du sagst, was du brauchst (ein Arbeitsblatt, eine Klausur mit Erwartungshorizont, eine Stundenplanung …), und Pult erstellt druckfertiges Material. Es läuft auf deinem eigenen Computer, deine Gespräche und dein Material bleiben dort.
>
> **Wichtig:** Das ist ein **Probelauf**. Pult kann Fehler machen oder etwas nicht können. Genau das will ich von dir wissen. Wenn etwas nicht klappt, liegt es an Pult, nicht an dir.
>
> **Was du brauchst:** einen Windows- oder Mac-Computer und beim ersten Mal etwa **30 Minuten**. **Node.js**, ein kleines Hilfsprogramm (einmal von nodejs.org installieren, Version „LTS“). Einen **Zugang zur KI** über OpenRouter, wie eine Prepaid-Karte: einmal etwa 10 Dollar aufladen, es wird nur abgezogen, was verbraucht wird, kein Abo.
>
> **So geht es:** Die Schritt-für-Schritt-Anleitung mit Bildern steht hier: https://github.com/brandy299/morte/blob/main/docs/anleitung-tester.md
> Kurz: Node.js installieren, bei OpenRouter einen Schlüssel besorgen, dann im Terminal (Windows: PowerShell, Mac: Terminal) **eine Zeile** einfügen:
> - Windows: `irm https://raw.githubusercontent.com/brandy299/morte/main/install.ps1 | iex`
> - Mac: `curl -fsSL https://raw.githubusercontent.com/brandy299/morte/main/install.sh | bash`
>
> Beim ersten Start richtet sich Pult selbst ein, das dauert ein paar Minuten, dann öffnet sich der Browser.
>
> **Bitte probier aus:** 1. ein Arbeitsblatt zu einem Thema aus deinem Unterricht, 2. eine Stunde oder Reihe planen, 3. eine Klausur mit Erwartungshorizont.
>
> **Datenschutz, bitte unbedingt:** **Keine Schülernamen, keine Noten, keine Fotos von Klassenarbeiten**, weder im Gespräch noch in Anhängen. Deine Eingaben gehen an den KI-Anbieter.
>
> **Rückmeldung:** Unter jedem Material auf „Passt“ oder „Passt nicht“ klicken (bei „Passt nicht“ ein Satz, warum). Wenn etwas hakt: ein Foto vom Bildschirm und ein Satz, was du gerade getan hast. Am Ende: Was war gut, was war nervig, was hat gefehlt?
>
> Ich sitze gern beim ersten Start dabei, melde dich einfach. Danke!
> ⟨Dein Name⟩

## Was du beim ersten Tester selbst sagen und beobachten solltest

- **Vorher sagen:** „Das ist ein Probelauf. Wenn etwas nicht klappt, liegt es an Pult, nicht an dir.“ Und: „Keine Schülernamen oder Noten eingeben.“
- **Nicht helfen, solange es geht.** Schau zu, wo die Person hängen bleibt, und schreib es auf. Die Stellen, an denen du eingreifst, sind die Fehler in der Anleitung.
- **Typische Stolpersteine:** Node.js fehlt oder das Terminal wurde nach der Installation nicht neu geöffnet, „Eingabeaufforderung“ statt PowerShell, das Terminal-Fenster wird geschlossen, der Schlüssel wird beim falschen Anbieter eingefügt, die Ausgabengrenze oder der Ablauf des Schlüssels (30 Tage) wird vergessen, GitHub ist im Schulnetz gesperrt.
- **Danach fragen:** Wie lange bis zum ersten Material? Hat sie die Rückfragen verstanden? Würde sie das Material so im Unterricht benutzen?
