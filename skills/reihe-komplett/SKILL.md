---
name: reihe-komplett
title: Ganze Reihe erstellen
description: Führt Schritt für Schritt durch eine ganze Unterrichtsreihe, vom Ablauf über die Anlage der Reihe bis zum Material für alle Stunden und einer Schlussprüfung. Nur nutzen, wenn der Reihen-Modus eingeschaltet ist oder die Lehrkraft ausdrücklich eine komplette Reihe mit Material für alle Stunden will. Nicht für eine einzelne Stunde, nicht für Material zu einer schon angelegten Stunde und nicht für eine Reihe, die nur geplant werden soll (dafür Lernsituation).
---

# Ganze Reihe erstellen

Im Reihen-Modus baust du eine Reihe von der Planung bis zum Material. Die Lehrkraft entscheidet an vier Stellen: bei den Rückfragen, beim Ablauf, vor dem Material und am Ende. Dazwischen arbeitest du durch.

## Ablauf

1. **Klären, höchstens zwei Rückfragen in einer Runde.** Mit `fragen_stellen`, jede mit empfohlener Antwort und Grund. Nötig: Klasse, Fach, Thema, Zahl der Stunden. Frag auch, ob nur die Planung oder die Planung mit Material gewünscht ist (empfohlen: mit Material). Was genannt wurde, fragst du nicht noch einmal. Frag nie nach Zielen, Handlungsprodukt oder Aufbau: Das planst du selbst.
2. **Klasse kennen.** `klasse_lesen`, `stand_lesen`, bei vorhandenem Lehrplan die passende Stelle. Die Reihe beginnt dort, wo die Klasse steht.
3. **Ablauf zeigen, noch nichts anlegen.** Handlungssituation oder Leitfrage in zwei, drei Sätzen, Handlungsprodukt, dann die Stunden nummeriert, je eine Zeile mit Thema und Ergebnis, dazu in Klammern das geplante Material ("Arbeitsblatt", "Verlauf", "Übung"). Wähle pro Stunde nur Material, das die Stunde braucht. Plane eine Stunde zum Überarbeiten und eine zum Rückblick ein. Frag: "Soll ich das so anlegen?" Änderungswünsche arbeitest du ein und zeigst die Liste neu.
4. **Reihe anlegen.** Nach Zustimmung `lernsituation_erstellen`, so wie die Anleitung "lernsituation" es beschreibt. Der Titel wird zum Ordnernamen: kurz, ohne Doppelpunkt.
5. **Material für alle Stunden.** Hat die Lehrkraft nur die Planung gewählt, hör hier auf und biete das Material an. Sonst sag in einem Satz, wie viel du jetzt erstellst ("Ich mache jetzt zu sieben Stunden das Material, das dauert ein paar Minuten"). Dann Stunde für Stunde, in der Reihenfolge der Tabelle:
   - Lies bei Stunde 2 und später kurz, was davor erstellt wurde (`reihe_lesen`, bei Bedarf `material_lesen`), damit Begriffe, Aufgaben und Schwierigkeit aufeinander aufbauen und nichts doppelt ist.
   - Erstelle das geplante Material mit dem passenden Werkzeug. Gib immer `klasse`, `fach`, `reihe` und die Nummer der Stunde als `nr` an, dann trägt das Werkzeug das Material in die Stundentabelle ein und setzt den Status auf "Material fertig". Zu jeder Stunde, die du planst, gehört ein Stundenverlauf (`stundenverlauf_erstellen`), sofern die Lehrkraft nichts anderes will.
   - Ein Material pro Aufruf, nie alles in einem. Gelingt eine Stunde nicht, mach mit der nächsten weiter und nenne die Stunde am Ende.
   - Eine Klausur oder ein Test am Ende nur, wenn die Lehrkraft einen Leistungsnachweis genannt hat (`klausur_erstellen`, dazu Anleitung "klausur").
6. **Schlussprüfung der Reihe.** Lies die Reihe noch einmal (`reihe_lesen`) und prüfe: Hat jede Stunde ihr Material? Baut jede Stunde auf der vorigen auf? Führen die Stunden zum Handlungsprodukt? Passt die Klausur zu dem, was geübt wurde? Behebe kleine Lücken sofort. Größere nennst du ehrlich.
7. **Antworten.** In drei, vier Sätzen: Was steht (Zahl der Stunden, Material), was ist offen oder nicht gelungen, und was die Lehrkraft jetzt tun kann (Termine eintragen, Material ansehen). Nenne nie Dateinamen oder Werkzeugnamen.

## Regeln

- Termine, Lernfeld und Leistungsnachweis nur, wenn die Lehrkraft sie genannt hat. Sonst bleiben sie leer.
- Keine Schülernamen, keine Noten. Behaupte nichts über einzelne Lernende der Klasse (zum Beispiel, wer zu Hause kein Deutsch spricht), das weißt du nicht.
- Nichts überschreiben: Gibt es die Reihe schon, frag nach einem anderen Namen.
