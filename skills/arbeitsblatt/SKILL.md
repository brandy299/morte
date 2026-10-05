---
name: arbeitsblatt
title: Arbeitsblatt
description: Erstellt ein druckfertiges Arbeitsblatt als PDF (Graustufen, kurz) zu einem Thema für eine Klasse oder einen Kurs. Nutze es bei Wünschen wie "Arbeitsblatt", "Übungsblatt", "Aufgabenblatt", "Material für die Stunde", "ein Blatt zum Thema ...". Nicht für Klausuren und Tests mit Bewertung, nicht für kurze Verständnis-Checks (dafür Verständnis-Check), nicht für mehrere Niveaus eines Blattes (dafür Differenzieren), nicht für die Planung einer ganzen Stunde oder Reihe und nicht für Präsentationen.
---

# Arbeitsblatt

Du erzeugst nur den Inhalt. Das Layout ist fest und wird vom Werkzeug übernommen: Graustufen, wenige Seiten, Kopf mit Fach und Klasse, Feld für Name und Datum.

## Ablauf

1. **Klären, was fehlt, höchstens zwei Rückfragen in einer Runde.** Thema und Klasse oder Kurs sind nötig. Alles andere füllst du mit sinnvollen Standards: Dauer etwa 20 bis 30 Minuten, Niveau passend zur Klasse. Biete in derselben Runde an: "Soll ich gleich einen Entwurf machen?" Hat die Lehrkraft schon alles genannt, frag gar nicht nach.
2. **Klasse kennen.** Wenn die Lehrkraft eine Klasse nennt, die es im Arbeitsordner gibt: erst `klasse_lesen`, dann `stand_lesen`, bei Bedarf `reihe_lesen`. Schulform, Stufe und Stand bestimmen Ton und Schwierigkeit. Gibt es die Klasse nicht, arbeite ohne sie.
3. **Inhalt schreiben.** Eigene Aufgaben, nichts aus bekannten Lehrwerken abschreiben. Beachte:
   - **Kurz:** möglichst eine Seite, höchstens zwei. Lieber wenige gute Aufgaben (meist 3 bis 6).
   - **Von leicht nach schwer.** Eine Aufgabe, ein Arbeitsauftrag. Beginne jeden Auftrag mit einem klaren Verb (nenne, beschreibe, erkläre, vergleiche, begründe, entwirf).
   - **Schreibzeilen** nach erwarteter Antwortlänge: 1 bis 2 für ein Wort oder einen Satz, 4 bis 6 für einen Absatz, 0 wenn nur angekreuzt oder verbunden wird.
   - **Tipp** (`hilfe`) nur dort, wo Schülerinnen und Schüler typischerweise hängen.
   - **Merkkasten** nur, wenn eine Regel oder ein Wortschatz wirklich gebraucht wird.
   - **Lösung** (`loesung`) zu jeder Aufgabe, deren Antwort feststeht, kurz und genau. Dann liegt dem Blatt automatisch ein Lösungsblatt für die Lehrkraft bei. Bei offenen Aufgaben schreib stattdessen in einem Satz, was eine gute Antwort enthält.
   - **Punkte** nur angeben, wenn die Lehrkraft Punkte möchte.
   - Keine Farben, keine Bilder, keine Symbole, die in Schwarz-Weiß nicht tragen.
   - Setze keine Namen von Schülerinnen und Schülern ein.
4. **Erdung.** Nenne keine Lehrplan-Fundstellen, Kompetenzbezeichnungen oder Operatorenlisten, die dir nicht vorliegen. Das Werkzeug setzt selbst einen ehrlichen Hinweis ins Blatt, wenn für die Klasse kein Lehrplan hinterlegt ist. Hat die Klasse einen Lehrplan, lies zuerst die passende Stelle (Gliederung ansehen, dann nur den Abschnitt zum Thema) und richte die Aufgaben danach aus. Was dort nicht steht, nimmst du nicht an.
5. **Erstellen.** Rufe `arbeitsblatt_erstellen` auf. Nennt die Lehrkraft Klasse, Fach und Reihe, gib sie mit an, damit das Blatt im richtigen Ordner landet. Kennst du Datum und Stunde, gib auch sie an, dann wird es in der Stundentabelle eingetragen.
6. **Prüfen.** Meldet das Werkzeug mehr als zwei Seiten, kürze und erstelle neu. Wünscht die Lehrkraft das Blatt in mehreren Niveaus, ist das Aufgabe von Differenzieren.
7. **Antworten.** Sag in ein, zwei Sätzen, was die Lehrkraft bekommt ("Das Arbeitsblatt ist fertig, eine Seite, du siehst es rechts") und biete eine passende Anpassung an (zum Beispiel leichter, schwerer, kürzer). Nenne nie Dateinamen, Werkzeugnamen oder Fachwörter wie "PDF-Erzeugung".
