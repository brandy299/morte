---
name: praesentation
title: Präsentation
description: Erstellt Folien als PowerPoint-Datei (16:9, in PowerPoint bearbeitbar) mit Titelfolie, Stichpunkten, Schaubildern und Sprechernotizen. Nutze es bei Wünschen wie "Präsentation", "Folien", "PowerPoint", "Foliensatz", "Präsentation für den Unterricht", "Vortrag mit Folien", "Beispielpräsentation für die Klasse". Nicht für Arbeitsblätter zum Ausdrucken (dafür Arbeitsblatt) und nicht für Klausuren.
---

# Präsentation

Du schreibst nur den Inhalt der Folien. Aufbau, Schrift und Farben macht das Werkzeug `praesentation_erstellen`. Es lehnt eine Folie ab, auf der zu viel steht. Dann verteile den Inhalt auf mehr Folien.

## Ablauf

1. **Klären, was fehlt, höchstens zwei Rückfragen in einer Runde**, mit `fragen_stellen`, jede mit empfohlener Antwort und Grund. Nötig sind Thema und Klasse oder Kurs. Wichtig ist außerdem, **wer die Folien zeigt**:
   - die Lehrkraft im Unterricht (Einstieg, Erklärung, Zusammenfassung),
   - oder die Lernenden als Beispiel oder Vorlage (zum Beispiel eine Musterpräsentation, an der sie sehen, wie gute Folien aussehen).
   Ist das klar oder lässt es sich aus der Anfrage ablesen, frag nicht danach. Den Rest legst du selbst fest: etwa eine Folie pro zwei bis drei Minuten Vortrag.
2. **Klasse kennen.** Gibt es die Klasse im Arbeitsordner: `klasse_lesen`, dann `stand_lesen`, bei Bedarf `reihe_lesen`. Sprache und Schwierigkeit passen zur Klasse.
3. **Folien schreiben.**
   - **Eine Aussage pro Folie.** Der Folientitel sagt sie in einer Zeile, am besten als kurze Aussage („Das Menüband sammelt alle Befehle“) statt nur als Stichwort.
   - **Stichpunkte statt Sätze**, höchstens sechs pro Folie, jeder höchstens eine Zeile lang. Was erklärt werden muss, gehört in die **Notizen** (`notizen`), nicht auf die Folie.
   - **Schaubilder** für Abläufe, Aufbau, Kreisläufe, Zeitverläufe und Zahlen (`schaubild`), wie beim Arbeitsblatt. Soll die Oberfläche eines Programms gezeigt werden, nimm `oberflaeche` (Skizze des Fensters mit benannten Bereichen). Eine Folie mit Schaubild hat höchstens drei kurze Stichpunkte daneben.
   - **Gliederung:** Bei mehr als etwa acht Folien teilen Abschnittsfolien (`art: abschnitt`) den Vortrag in Teile.
   - **Anfang und Ende:** Nach der Titelfolie eine Folie mit dem Ziel oder der Leitfrage. Zum Schluss eine Folie mit dem Wichtigsten in drei Punkten oder einer Aufgabe für die Klasse.
   - **Nichts erfinden.** Zahlen, Daten und Zitate nur, wenn sie stimmen. Erfundene Beispielzahlen kennzeichnest du auf der Folie als Beispiel.
   - Fotos und Bilder kannst du nicht einfügen. Sag das ehrlich, wenn danach gefragt wird, und schlag ein Schaubild vor.
4. **Erstellen** mit `praesentation_erstellen`. Gib `klasse`, `fach` und `reihe` an, wenn es sie gibt, und `datum`, wenn die Stunde bekannt ist.
5. **Antworten** in zwei, drei Sätzen: wie viele Folien, wie sie aufgebaut sind, dass rechts die Vorschau steht und die PowerPoint-Datei zum Herunterladen bereitliegt. Keine Dateinamen, keine Werkzeugnamen.
