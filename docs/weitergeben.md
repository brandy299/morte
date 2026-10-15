# Pult an Tester weitergeben (für Yannik)

Es gibt zwei Wege. **Der erste ist der empfohlene**, weil er ohne die Warnungen von Windows und Mac auskommt.

## Weg 1 (empfohlen): eine Zeile im Terminal

Das Repo ist öffentlich, die Tester holen Pult direkt von GitHub. Sie brauchen nur diese Zeile im Terminal. Fehlt **Node.js** (oder ist es zu alt), lädt das Skript selbst eine eigene Kopie in den Ordner „Pult“ (`node/`, von nodejs.org, mit Prüfsumme, ohne Installation und ohne Administratorrechte). Ein vorhandenes Node wird nicht angefasst:

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

Danach genügt ein Doppelklick auf **„Paket bauen“** im Ordner „scripts“ im Ordner „morte“ (Windows `.bat`, Mac `.command`). Neue Fassung: `git pull` und wieder „Paket bauen“.

Die ZIP (`pult-<Version>-<Datum>-<Commit>.zip`, rund 3 MB) enthält die fertig gebaute Oberfläche, „Pult starten.bat“ und „Pult starten.command“ sowie die Anleitungen als einzelne HTML-Dateien („Anleitung.html“, „OpenRouter einrichten.html“, mit Bildern darin, entstanden aus `docs/anleitung-tester.md` und `docs/openrouter-anleitung.md`). Nicht dabei: `docs/`, Tests, Prüfläufe, deine Hinweise vom Stift, dein Datenordner. Schlüssel liegen nie im Projekt, die ZIP packt nur Dateien aus Git plus die gebaute Oberfläche.

Als E-Mail-Anhang können manche Programme sie blockieren (Startdateien darin). Ein Cloud-Link ist sicherer.

**Mac:** Beim ersten Öffnen zeigt der Mac „‚Pult starten.command‘ nicht geöffnet“. Der Weg: „Fertig“, dann Systemeinstellungen, Datenschutz & Sicherheit, ganz unten „Trotzdem öffnen“ (auf einem echten Mac am 2026-10-14 gesehen, die Schritte danach nicht). **Windows:** SmartScreen „Der Computer wurde durch Windows geschützt“, „Weitere Informationen“, „Trotzdem ausführen“ (nicht gesehen).

## Nachricht an die Tester (zum Kopieren)

Reiner Text, ohne Formatierung: Kopieren (Knopf oben rechts im Kasten), in die Mail einfügen, ⟨Name⟩ und ⟨Dein Name⟩ ersetzen. Die Befehle stehen je in einer eigenen Zeile, damit das Mailprogramm sie nicht umbricht.

```text
Betreff: Pult ausprobieren, dein Feedback hilft

Hallo ⟨Name⟩,

kurz gesagt: Schlüssel bei OpenRouter holen, eine Zeile ins Terminal kopieren, drei Materialien ausprobieren und mir sagen, was hakt.

Pult ist ein KI-Arbeitsplatz für Lehrkräfte. Du sagst, was du brauchst (Arbeitsblatt, Klausur mit Erwartungshorizont, Stundenplanung …), und Pult erstellt druckfertiges Material. Es läuft auf deinem Computer, dein Material bleibt dort. Das ist ein Probelauf: Wenn etwas nicht klappt, liegt es an Pult, nicht an dir.

DU BRAUCHST
- einen Windows- oder Mac-Computer und beim ersten Mal etwa 30 Minuten
- einen Schlüssel von OpenRouter, wie eine Prepaid-Karte: einmal etwa 10 Dollar aufladen, kein Abo

SO GEHT ES
1. Schlüssel besorgen, Anleitung mit Bildern:
   https://github.com/brandy299/morte/blob/main/docs/openrouter-anleitung.md
2. Terminal öffnen (Windows: PowerShell, Mac: Terminal), die Zeile für dein System einfügen und Enter drücken.
   Windows:
   irm https://raw.githubusercontent.com/brandy299/morte/main/install.ps1 | iex
   Mac:
   curl -fsSL https://raw.githubusercontent.com/brandy299/morte/main/install.sh | bash
   Pult holt alles Nötige selbst und öffnet nach ein paar Minuten den Browser. Lass das Terminal offen, solange du arbeitest.
3. In Pult den Schlüssel einfügen, „Verbindung testen“ klicken, speichern.

Ganze Anleitung und Hilfe bei Problemen:
https://github.com/brandy299/morte/blob/main/docs/anleitung-tester.md

BITTE PROBIER AUS
1. ein Arbeitsblatt zu einem Thema aus deinem Unterricht
2. eine Stunde oder Reihe planen
3. eine Klausur mit Erwartungshorizont

DATENSCHUTZ
Keine Schülernamen, keine Noten, keine Fotos von Klassenarbeiten. Deine Eingaben gehen an den KI-Anbieter.

RÜCKMELDUNG
Unter jedem Material „Passt“ oder „Passt nicht“ klicken, bei „Passt nicht“ ein Satz, warum. Hakt etwas: ein Foto vom Bildschirm und ein Satz, was du gerade getan hast. Am Ende: Was war gut, was war nervig, was hat gefehlt?

Ich sitze gern beim ersten Start dabei, melde dich einfach. Danke!
⟨Dein Name⟩
```

## Was du beim ersten Tester selbst sagen und beobachten solltest

- **Vorher sagen:** „Das ist ein Probelauf. Wenn etwas nicht klappt, liegt es an Pult, nicht an dir.“ Und: „Keine Schülernamen oder Noten eingeben.“
- **Nicht helfen, solange es geht.** Schau zu, wo die Person hängen bleibt, und schreib es auf. Die Stellen, an denen du eingreifst, sind die Fehler in der Anleitung.
- **Typische Stolpersteine:** die Zeile kann Node.js nicht selbst laden, weil das Schulnetz den Download sperrt (FAQ 1 der Anleitung), „Eingabeaufforderung“ statt PowerShell, das Terminal-Fenster wird geschlossen, der Schlüssel wird beim falschen Anbieter eingefügt, die Ausgabengrenze oder der Ablauf des Schlüssels (30 Tage) wird vergessen, GitHub ist im Schulnetz gesperrt.
- **Danach fragen:** Wie lange bis zum ersten Material? Hat sie die Rückfragen verstanden? Würde sie das Material so im Unterricht benutzen?
