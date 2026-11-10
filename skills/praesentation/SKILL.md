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
   **Der Look:** Hat die Lehrkraft keinen Stil genannt, hol mit `stile_vorschlagen` die Auswahl, such drei passende für Thema und Klasse heraus und zeig sie mit `stil_waehlen` (art `praesentation`, drei verschiedene Stile, deine Empfehlung, je ein Satz Grund). Sie sieht drei Beispielfolien und klickt eine an. Beschreibe die Stile nicht zusätzlich im Text. Die Kennung der Wahl gibst du beim Erstellen als `stil` mit. Nennt die Lehrkraft den Stil schon, frag nicht noch einmal.
2. **Klasse kennen.** Gibt es die Klasse im Arbeitsordner: `klasse_lesen`, dann `stand_lesen`, bei Bedarf `reihe_lesen`. Sprache und Schwierigkeit passen zur Klasse.
3. **Folien schreiben.**
   - **Eine Aussage pro Folie.** Der Folientitel sagt sie in einer Zeile, am besten als kurze Aussage („Das Menüband sammelt alle Befehle“) statt nur als Stichwort.
   - **Gestaltete Folien (`layout`) für die meisten Folien.** Eine Liste mit Stichpunkten ist die schwächste Folie. Nimm das Layout, das zum Inhalt passt, und wechsle ab: `punkte` (zwei bis sechs Karten nebeneinander, am besten mit Symbol), `schritte` (nummerierte Karten für eine Reihenfolge), `ablauf` (zwei bis vier Stationen mit Pfeilen), `kreislauf` (drei oder vier Stationen im Kreis), `zahl` (eine große Zahl mit einem Satz), `vergleich` (zwei Seiten mit je ein bis vier Zeilen), `zeitstrahl` (drei bis fünf Daten), `aussage` (Titel, ein paar Sätze, großes Symbol) und `merksatz` (ein einziger Satz zum Mitnehmen). Die Einträge stehen in `karten` (Überschrift höchstens 40 Zeichen, Text höchstens 110, bei fünf und mehr Karten 80), nicht in `punkte`. **Jede gestaltete Folie bekommt trotzdem Sprechernotizen** (`notizen`, zwei bis vier Sätze: was du dazu sagst), die Folie selbst bleibt kurz. Über dem Titel kann eine kleine Zeile stehen (`kicker`, zum Beispiel „Schritt 2“). Symbole such mit `symbole_suchen`, nimm nur Kennungen aus der Liste. Ein sehr langes Wort („Beitragsbemessungsgrenze“) passt schlecht in eine schmale Karte: lieber weniger Karten oder ein anderes Layout. **Schaubilder gehen vor, wenn die Anfrage eines verlangt:** Soll die Oberfläche eines Programms gezeigt oder von der Klasse beschriftet werden, nimm das Schaubild `oberflaeche` (dafür gibt es kein Layout). Reine Stichpunkte nimmst du nur noch für eine kurze Liste, die zu keinem Layout passt.
   - **Stichpunkte statt Sätze**, höchstens sechs pro Folie, jeder höchstens eine Zeile lang. Was erklärt werden muss, gehört in die **Notizen** (`notizen`), nicht auf die Folie.
   - **Schaubilder** für Abläufe, Aufbau, Kreisläufe, Zeitverläufe und Zahlen (`schaubild`), wie beim Arbeitsblatt. Soll die Oberfläche eines Programms gezeigt werden, nimm `oberflaeche` (Skizze des Fensters mit benannten Bereichen). Soll die Klasse beschriften, setze die Bereiche auf `leer`. Eine Wortliste und ein eigenes Lösungsblatt gibt es in der Präsentation nicht: Schreib die Namen der Bereiche als normale Stichpunkte auf eine eigene Folie davor oder dahinter. Die Lösung (Nummer = Bereich) trägt das Programm in die Sprechernotizen der Folie ein. Sag nicht, es gebe eine Wortliste oder ein Arbeitsblatt dazu. Eine Folie mit Schaubild hat höchstens drei kurze Stichpunkte daneben.
   - **Gliederung:** Bei mehr als etwa acht Folien teilen Abschnittsfolien (`art: abschnitt`) den Vortrag in Teile.
   - **Anfang und Ende:** Nach der Titelfolie eine Folie mit dem Ziel oder der Leitfrage. Zum Schluss eine Folie mit dem Wichtigsten in drei Punkten oder einer Aufgabe für die Klasse.
   - **Nichts erfinden.** Zahlen, Daten und Zitate nur, wenn sie stimmen. Erfundene Beispielzahlen kennzeichnest du auf der Folie als Beispiel.
   - Bildschirmfotos aus der Bildbibliothek der Lehrkraft kannst du einfügen: erst `bilder_suchen`, dann das Schaubild `bild` mit der Kennung und den Stellen, die gezeigt werden sollen (wie beim Arbeitsblatt). Gibt es keins, nimm die Skizze `oberflaeche` und sag es. Andere Fotos und Bilder kannst du nicht einfügen. Sag das ehrlich, wenn danach gefragt wird, und schlag ein Schaubild vor.
4. **Erstellen** mit `praesentation_erstellen`. Gib `klasse`, `fach` und `reihe` an, wenn es sie gibt, und `datum`, wenn die Stunde bekannt ist.
5. **Antworten** in zwei, drei Sätzen: wie viele Folien, wie sie aufgebaut sind, dass rechts die Vorschau steht und die PowerPoint-Datei zum Herunterladen bereitliegt. Keine Dateinamen, keine Werkzeugnamen.
