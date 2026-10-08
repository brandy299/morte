# 016: Präsentationen als PowerPoint-Datei

Stand: 2026-10-08

## Entscheidung

Pult erstellt Folien als `.pptx` (16:9) mit der Bibliothek **pptxgenjs 4.0.1** (MIT, exakt festgelegt). Werkzeug `praesentation_erstellen`, Anleitung `skills/praesentation`.

- Der Aufbau jeder Folie wird **einmal geplant** (`planen()` in `src/core/material/praesentation.ts`) und dann zweimal gezeichnet: als PowerPoint-Datei und als PDF für die Vorschau rechts. Die Vorschau im Browser kann keine `.pptx` anzeigen.
- Folienarten: Titelfolie (automatisch, mit Schulkopf), Inhaltsfolie (Titel, kurzer Text, bis zu sieben Stichpunkte, Schaubild), Abschnittsfolie. Sprechernotizen landen im Notizfeld von PowerPoint.
- Das Programm wählt die Schriftgröße selbst (Stichpunkte 26 bis 18 Punkt). Passt der Inhalt auch bei 18 Punkt nicht, lehnt das Werkzeug die Folie mit einer klaren Meldung ab, statt Text über den Rand laufen zu lassen.
- Schaubilder kommen als scharfes Bild (PNG, vierfache Auflösung) auf eine weiße Karte, groß genug für den Beamer. PowerPoint kann unsere Kästen und Pfeile nicht aus Daten zeichnen.
- Schriften in der `.pptx`: Georgia (Titel) und Calibri (Text), weil beide auf Windows und Mac mit Office vorhanden sind. Die Vorschau nutzt Pults eigene Schriften. Zeilenumbrüche können deshalb in PowerPoint leicht anders fallen. Gemessen wird mit der breiteren Pult-Schrift, so passt der Text in PowerPoint eher besser.

## Warum

- Rückmeldung von Yannik: Lehrkräfte wollen Übungen und Unterricht „in PowerPoint“, ein Arbeitsblatt über PowerPoint reicht nicht.
- pptxgenjs ist reines JavaScript, braucht kein Zusatzprogramm (Entscheidung 002) und schreibt Dateien, die PowerPoint, Keynote und LibreOffice öffnen. Abhängigkeiten: `jszip` (MIT oder GPL-3.0, wir nutzen MIT, schon über `docx` im Projekt), `image-size` (MIT), `https` (ISC, leeres Platzhalterpaket).

## Geprüft

- Datei mit einer zweiten, unabhängigen Bibliothek (python-pptx) wieder eingelesen: 16:9, alle Folien, Texte, Bilder und Notizen da.
- Echter Lauf mit DeepSeek V4.1 Flash über OpenCode Go: 9 Folien beim ersten Versuch, zwei mit Schaubild, Notizen zu jeder Inhaltsfolie, 72 Sekunden.

## Nicht geprüft

- Die Datei in PowerPoint selbst geöffnet (hier gibt es weder PowerPoint noch LibreOffice).
- Bilder und Fotos auf Folien, eigene Folienvorlagen der Schule, Folien als Word-Handout. Kommt nur, wenn es gebraucht wird.
