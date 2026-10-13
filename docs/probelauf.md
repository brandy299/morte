# Pult ausprobieren

**Die ausführliche Anleitung mit Fragen und Antworten steht in `docs/anleitung-tester.md`.** Diese Seite ist die Kurzfassung.

**Das ist ein Probelauf. Pult ist noch kein fertiges Programm.** Es kann Fehler machen und etwas nicht können. Genau dafür brauchen wir dich. Yannik sitzt bei den ersten Malen dabei.

## Was Pult kann

Arbeitsblätter, Klausuren mit Erwartungshorizont, Stunden und Reihen planen, Lernsituationen und Verständnis-Checks. Du kannst Dateien und Fotos anhängen. Dazu gibt es Erklärstücke (kleine Animationen als Datei) und interaktive Übungen zum Anklicken. Das Material kommt als PDF in Graustufen, auf Wunsch auch als Word-Datei. **Das kann Pult nicht:** Erklärvideos als Datei (MP4), im Internet suchen. Erklärstücke und Übungen sind neu und noch kaum erprobt. Formeln stehen nur im PDF richtig, in Word noch nicht.

## Was du brauchst

1. **Node.js** (ein kleines Hilfsprogramm, ohne das Pult nicht startet). Lade auf nodejs.org die Version „LTS“ herunter, mindestens Version 22, und installiere sie wie jedes Programm. Das ist nur für den Probelauf nötig.
2. **Den Pult-Ordner** von Yannik (eine ZIP-Datei, entpacke sie irgendwo, zum Beispiel in „Dokumente“).
3. **Einen Zugangsschlüssel** (API-Schlüssel, kein Abo). Wir empfehlen **OpenRouter** mit dem vorausgewählten Modell. Warum und wie: `docs/schluessel-empfehlung.md`. Ein Claude- oder ChatGPT-Abo lässt sich nicht eintragen.

## Starten

Öffne im Pult-Ordner ein Terminal (Mac: Programm „Terminal“, Windows: „PowerShell“) und tippe nacheinander:

```
npm install
npm run build
npm start
```

Das erste braucht etwa eine Minute. Danach öffnest du **http://localhost:3001** im Browser. Pult führt dich durch die Einrichtung. Beenden: im Terminal Strg + C. Beim nächsten Mal genügt `npm start`. Hakt etwas, schreib dir auf, was du getan hast und was angezeigt wurde. Das hilft mehr als jede Erklärung.

## Drei Aufgaben zum Ausprobieren

Schreib, wie du es einer Kollegin sagen würdest. Pult fragt nach, wenn etwas fehlt.

1. **Ein Arbeitsblatt** zu einem Thema aus deinem Unterricht.
2. **Eine Reihe planen** für eine deiner Klassen.
3. **Eine Klausur mit Erwartungshorizont.** Pult fragt nach deinen Bewertungsregeln. Gib deinen eigenen Notenschlüssel an.

## Datenschutz

**Keine Schülernamen, keine Noten und keine Fotos von Klassenarbeiten**, weder im Gespräch noch in angehängten Dateien. Deine Fragen und angehängte Dateien gehen an deinen KI-Anbieter. Klassen, Material und Gespräche bleiben auf deinem Computer.

## So schickst du deine Rückmeldung

1. Fülle **`probelauf-rueckmeldebogen.docx`** aus (Word, am Bildschirm oder gedruckt). Einen Bogen pro Aufgabe.
2. Klicke im Gespräch oben auf **„Gespräch exportieren“**. Das speichert das Gespräch als Textdatei.
3. **Prüfe, dass kein Schülername und keine Note im Gespräch steht**, bevor du es schickst.
4. Schicke Bogen und Gespräch an Yannik.
