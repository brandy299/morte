---
name: erklaerstueck
title: Erklärstück
description: Erstellt ein kurzes animiertes Erklärstück als einzelne Datei, die im Browser läuft (Beamer, Schul-PC, ohne Internet): gestaltete Folien, die sich Schritt für Schritt aufbauen, in wählbaren Stilen (zum Beispiel Editorial, Magazin, Neo-Brutalismus, Blaupause, Nacht), mit Karten, Abläufen mit Pfeilen, Kreisläufen, Zeitstrahl, Vergleich, großen Zahlen und Merksatz. Nutze es bei Wünschen wie "Erklärstück", "Animation", "animierte Erklärung", "Erklärvideo", "Motion Graphic", "etwas, das sich bewegt", "zeig mir den Ablauf animiert". Keine Videodatei, kein Ton. Nicht für Folien (dafür Präsentation) und nicht zum Ausdrucken (dafür Arbeitsblatt).
---

# Erklärstück

Du schreibst nur den Inhalt als Szenen und wählst für jede Szene ein Layout. Aussehen, Größen, Takt und Platz macht das Werkzeug `erklaerstueck_erstellen`. Es lehnt ab, was nicht passt (zu langer Text, zu viele Einträge, unbekanntes Symbol). Dann ändere die Szene, wie die Meldung es sagt.

## Ablauf

1. **Klären, was fehlt, höchstens zwei Rückfragen in einer Runde**, mit `fragen_stellen`, jede mit empfohlener Antwort und Grund. Nötig sind das Thema und für wen es ist (Klasse oder Kurs). **Den Stil wählt die Lehrkraft auf dem Bildschirm, wenn sie keinen genannt hat:** Hole mit `stile_vorschlagen` die Auswahl, such drei passende für Thema und Klasse heraus und zeig sie mit `stil_waehlen` (art `erklaerstueck`, drei verschiedene Stile, deine Empfehlung, je ein Satz Grund). Die Lehrkraft sieht dann drei Beispielbilder und klickt eins an. Beschreibe die Stile nicht zusätzlich im Text und frag nicht in `fragen_stellen` danach. Das ist unabhängig von den höchstens zwei Rückfragen; stell `stil_waehlen` zuerst, wenn der Rest klar ist, sonst nach den Rückfragen. Alles andere legst du selbst fest. Wünscht die Lehrkraft ein Video oder eine MP4-Datei, sag ehrlich, dass das noch nicht geht, und biete das Erklärstück an.
2. **Klasse kennen.** Gibt es die Klasse im Arbeitsordner: `stand_lesen`, bei Bedarf `reihe_lesen`. Sprache und Tiefe passen zur Klasse.
3. **Szenen schreiben.**
   - **Eine Idee pro Szene**, sechs bis acht Szenen für etwa eine Minute. Mehr als zehn gehen nicht.
   - **Aufbau:** Eine Szene, die zeigt, worum es geht. Dann Schritt für Schritt erklären. Zum Schluss das Wichtigste in einem Satz.
   - **Jede Szene hat ein Layout.** Nimm das, das zum Inhalt passt, und wechsle ab. Zwei gleiche Layouts hintereinander nur, wenn es sein muss.
     - `punkte`: zwei bis sechs Karten nebeneinander (Merkmale, Beispiele, Beteiligte), jede mit Überschrift, kurzem Text und am besten einem Symbol.
     - `schritte`: zwei bis fünf nummerierte Karten für eine Reihenfolge (Anleitung, Vorgehen).
     - `ablauf`: zwei bis vier Stationen mit Pfeilen dazwischen (Vorgang, Ursache und Wirkung). `pfeil` beschriftet den Pfeil zur nächsten Station kurz („verdunstet“).
     - `kreislauf`: drei oder vier Stationen, der letzte Pfeil führt zurück zur ersten.
     - `zahl`: eine große Zahl (`zahl`, zum Beispiel „71 %“) mit Titel und einem Satz. Nichts erfinden: Zahlen nur, wenn sie stimmen.
     - `vergleich`: genau zwei Seiten, jede mit Überschrift und ein bis vier kurzen Zeilen (`liste`).
     - `zeitstrahl`: drei bis fünf Ereignisse, jedes mit Jahr oder Datum (`zahl`), Überschrift und kurzem Text.
     - `aussage`: ein Titel und zwei, drei erklärende Sätze, dazu ein großes Symbol. Gut für den Einstieg und für Erklärungen ohne Aufzählung.
     - `merksatz`: ein einziger Satz zum Mitnehmen, gut als letzte Szene.
   - **Jede Szene bekommt einen Titel** (außer `merksatz`) und gern eine kleine Zeile darüber (`kicker`, zum Beispiel „Schritt 2“ oder „Beispiel“). Der Titel sagt die Aussage der Szene, nicht nur das Thema („Wasser verdunstet über dem Meer“ statt „Verdunstung“).
   - **Die Teile erscheinen nacheinander**, in der Reihenfolge, in der du die Einträge schreibst. Schreib sie also so, wie du erklären würdest.
   - **Texte kurz.** Überschrift einer Karte höchstens 40 Zeichen, ihr Text höchstens 110 (bei fünf und mehr Karten 80). Was länger ist, gehört in zwei Szenen.
   - **Symbole:** Einfache Bilder (Tropfen, Zahnrad, Buch, Waage, Fabrik, Euro, Mikroskop und gut 200 weitere) für Karten, Stationen und die `aussage`. Such sie mit `symbole_suchen` (ein oder zwei deutsche Wörter) und nimm nur Kennungen aus der Liste. Gibt es nichts Passendes, lass das Symbol weg. Fotos, Karten und freie Zeichnungen kannst du nicht erzeugen. Sag das ehrlich, wenn danach gefragt wird.
   - **Stil:** Die Kennung kommt aus `stile_vorschlagen`, erfinde keine. Nimm den Stil, den die Lehrkraft nennt. Nennt sie keinen, hast du sie in Schritt 1 wählen lassen; kommt keine Wahl, nimm deine Empfehlung. Wünscht sie einen Stil, den es nicht gibt, biete den nächstpassenden aus der Liste an. Jeder Stil bringt Farben und Schrift mit, mehr musst du nicht angeben.
   - **Tempo:** `ruhig` für Erklären, `zuegig` für einen Überblick, sonst `mittel`.
   - **Hintergrund:** Lass ihn weg, die Stile wirken ohne am besten. Nur wenn die Lehrkraft Bewegung im Hintergrund wünscht: `wellenlinien` oder `wellenringe` für Wasser und Natur, `formen` für jüngere Klassen, `flecken` für weiche Themen, `punktraster` für Naturwissenschaft und Technik, `flaechen` für Wirtschaft und Berufskunde.
4. **Erstellen** mit `erklaerstueck_erstellen`. Gib `klasse`, `fach` und `reihe` an, wenn es sie gibt, und `datum`, wenn die Stunde bekannt ist.
5. **Antworten** in zwei, drei Sätzen: wie viele Szenen, dass rechts die Vorschau läuft und die Datei im Browser ohne Internet funktioniert. Kein Ton, keine Videodatei, das erwähnst du nur, wenn danach gefragt wird. Keine Dateinamen, keine Werkzeugnamen.
