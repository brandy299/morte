---
name: erklaerstueck
title: Erklärstück
description: Erstellt ein kurzes animiertes Erklärstück als einzelne Datei, die im Browser läuft (Beamer, Schul-PC, ohne Internet), im Wasserfarben-Look, mit Szenen, Texten, Pfeilen, Zahlen und einfachen Formen. Nutze es bei Wünschen wie "Erklärstück", "Animation", "animierte Erklärung", "Erklärvideo", "Motion Graphic", "etwas, das sich bewegt", "zeig mir den Ablauf animiert". Keine Videodatei, kein Ton. Nicht für Folien (dafür Präsentation) und nicht zum Ausdrucken (dafür Arbeitsblatt).
---

# Erklärstück

Du schreibst nur den Inhalt als Szenen. Aussehen, Takt und Platz macht das Werkzeug `erklaerstueck_erstellen`. Es lehnt ab, was nicht passt (zu viel in einer Lage, ein Pfeil quer über ein anderes Element). Dann ändere die Szene, wie die Meldung es sagt.

## Ablauf

1. **Klären, was fehlt, höchstens zwei Rückfragen in einer Runde**, mit `fragen_stellen`, jede mit empfohlener Antwort und Grund. Nötig sind das Thema und für wen es ist (Klasse oder Kurs). Alles andere legst du selbst fest. Wünscht die Lehrkraft ein Video oder eine MP4-Datei, sag ehrlich, dass das noch nicht geht, und biete das Erklärstück an.
2. **Klasse kennen.** Gibt es die Klasse im Arbeitsordner: `stand_lesen`, bei Bedarf `reihe_lesen`. Sprache und Tiefe passen zur Klasse.
3. **Szenen schreiben.**
   - **Eine Idee pro Szene**, sechs bis acht Szenen für etwa eine Minute. Mehr als zehn gehen nicht.
   - **Aufbau:** Eine Szene, die zeigt, worum es geht. Dann Schritt für Schritt erklären. Zum Schluss das Wichtigste in einem Satz.
   - **Elemente erscheinen nacheinander**, in der Reihenfolge, in der du sie schreibst. Schreib sie also so, wie du erklären würdest.
   - **Texte kurz.** Ein Kasten höchstens 80 Zeichen, eine Textzeile höchstens 140. Was länger ist, gehört in zwei Szenen.
   - **Lage:** Das Bild ist ein Raster mit neun Plätzen (oben-links, oben, oben-rechts, links, mitte, rechts, unten-links, unten, unten-rechts). Verteile die Elemente. Zwei Elemente am selben Platz stehen untereinander, drei Kästen passen dort meist nicht.
   - **Pfeile** brauchen zwei Elemente mit einer `id`. Setze die beiden so, dass dazwischen nichts liegt. Beschrifte den Pfeil kurz („Verdunstung“), wenn er einen Vorgang zeigt.
   - **Formen:** sonne, wolke, huegel, wasser. Mehr gibt es nicht. Fotos, Karten und freie Zeichnungen kannst du nicht erzeugen. Sag das ehrlich, wenn danach gefragt wird.
   - **Zahlen** als `zahl` mit kurzem Text darunter („71 %“, „der Erde sind von Wasser bedeckt“). Nichts erfinden: Zahlen nur, wenn sie stimmen.
   - **Farbwelt und Tempo:** `wasser`, `wiese` oder `abend`; `ruhig` für Erklären, `zuegig` für einen Überblick.
4. **Erstellen** mit `erklaerstueck_erstellen`. Gib `klasse`, `fach` und `reihe` an, wenn es sie gibt, und `datum`, wenn die Stunde bekannt ist.
5. **Antworten** in zwei, drei Sätzen: wie viele Szenen, dass rechts die Vorschau läuft und die Datei im Browser ohne Internet funktioniert. Kein Ton, keine Videodatei, das erwähnst du nur, wenn danach gefragt wird. Keine Dateinamen, keine Werkzeugnamen.
