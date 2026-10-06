---
name: arbeitsblatt
title: Arbeitsblatt
description: Erstellt ein druckfertiges Arbeitsblatt als PDF (Graustufen) mit Material, gestaffelten Aufgaben und Schaubildern zu einem Thema für eine Klasse oder einen Kurs. Nutze es bei Wünschen wie "Arbeitsblatt", "Übungsblatt", "Aufgabenblatt", "Material für die Stunde", "ein Blatt zum Thema ...". Nicht für Klausuren und Tests mit Bewertung, nicht für kurze Verständnis-Checks (dafür Verständnis-Check), nicht für mehrere Niveaus eines Blattes (dafür Differenzieren), nicht für die Planung einer ganzen Stunde oder Reihe und nicht für Präsentationen.
---

# Arbeitsblatt

Du erzeugst nur den Inhalt. Das Layout ist fest und wird vom Werkzeug übernommen: Graustufen, Kopf mit Fach und Klasse, Feld für Name und Datum. Wie lang und wie gut das Blatt wird, bestimmst du.

## Ablauf

1. **Klären, was fehlt, höchstens zwei Rückfragen in einer Runde.** Stell die Rückfragen mit `fragen_stellen`, jede mit einer empfohlenen Antwort und dem Grund dafür. Thema und Klasse oder Kurs sind nötig. Alles andere füllst du mit sinnvollen Standards: Dauer etwa 20 bis 30 Minuten, Niveau passend zur Klasse. Biete in derselben Runde an: "Soll ich gleich einen Entwurf machen?" Hat die Lehrkraft schon alles genannt, frag gar nicht nach.
2. **Klasse kennen.** Wenn die Lehrkraft eine Klasse nennt, die es im Arbeitsordner gibt: erst `klasse_lesen`, dann `stand_lesen`, bei Bedarf `reihe_lesen`. Schulform, Stufe und Stand bestimmen Ton und Schwierigkeit. Gibt es die Klasse nicht, arbeite ohne sie.
3. **Inhalt schreiben.** Eigene Aufgaben, nichts aus bekannten Lehrwerken abschreiben. Ein gutes Blatt ist durchdacht, nicht dünn. Es hat drei Teile:
   - **Material zum Einstieg** (`einleitung`, `merkkasten`, `schaubild`): Ein kurzer Informationstext (bis etwa 150 Wörter), ein Fallbeispiel, eine Quelle oder ein Schaubild, auf das sich die Aufgaben beziehen. Keine Fragen ins Leere. Erkläre Fachbegriffe, die neu sind.
   - **Erarbeitung in Stufen.** Erst wiedergeben (nenne, ordne zu, ergänze), dann verstehen und anwenden (erkläre, vergleiche, wende auf den Fall an), zuletzt beurteilen oder übertragen (begründe, nimm Stellung, entwirf). Bei 45 Minuten meist 5 bis 9 Aufgaben, bei einer Doppelstunde mehr. Jede Aufgabe hat einen klaren Auftrag mit einem Verb am Anfang und bezieht sich auf das Material.
   - **Sicherung zum Schluss.** Eine Aufgabe, nach der etwas Greifbares steht: ein Merksatz zum Selbstformulieren, eine kurze Zusammenfassung, eine Transferfrage oder eine Zusatzaufgabe für Schnelle (beginne sie mit „Zusatz:“).
   - **Umfang:** richtet sich nach Dauer und Thema, meist ein bis drei Seiten. Kürze nie, um Papier zu sparen: Das Layout ist schon platzsparend. Lieber ein vollständiges Blatt als ein dünnes. Nur wenn die Lehrkraft ausdrücklich ein kurzes Blatt will, kürze.
   - **Schaubilder:** Soll ein Ablauf, ein Aufbau, ein Kreislauf, ein Zeitverlauf oder ein Zahlenverhältnis gezeigt werden (Gesetzgebungsverfahren, Gewaltenteilung, Wirtschaftskreislauf, Geschichte, Statistik), nimm `schaubild` statt einer Beschreibung in Worten. Lass Kästchen leer (`leer`), wenn die Lernenden das Schaubild vervollständigen sollen. Das Programm zeichnet es, nummeriert die leeren Kästchen und schreibt die Lösung für die Lehrkraft. Fotos, Karten und Zeichnungen kannst du nicht erzeugen. Sag das ehrlich, wenn danach gefragt wird, und schlage ein Schaubild oder eine Aufgabe zum Selbstzeichnen vor.
   - **Anrede der Lernenden** (du oder Sie in den Aufgaben): wie in `Klasse.md`. Steht dort nichts, nimm „du“ bis Klasse 10. Bei Berufskolleg und Oberstufe frag in der Rückfragenrunde danach und empfiehl, was zur Klasse passt.
   - **Differenzierung eingebaut:** Hilfen (`hilfe`) bei den schwereren Aufgaben, eine Zusatzaufgabe für Schnelle. Ganze Fassungen für mehrere Niveaus sind Sache von Differenzieren.
   - **Aufgabenarten:** Wähle die Art, die zum Lernziel passt, und gib die Teile immer in den Feldern an, nie im Aufgabentext. Das Blatt zeigt nur, was in den Feldern steht.
     - `zuordnung` (`paare`, 3 bis 10): Begriff und Bedeutung, Wendung und Übersetzung, Ursache und Wirkung. Das Programm mischt die rechte Seite und schreibt die Lösung selbst.
     - `luecken` (`saetze`, das fehlende Wort in doppelten geschweiften Klammern, `wortliste` für eine Wortbank): Wortschatz und Grammatik in Sätzen.
     - `auswahl` (`optionen`, `richtig`): eine Frage, zwei bis fünf Antworten, genau eine ist richtig.
     - `tabelle` (`tabelle` mit Spalten und Zeilen, leere Felder zum Ausfüllen, dazu die Lösung): Sammeln, Vergleichen, Einordnen.
     - frei (ohne `art`): Erklären, Begründen, Schreiben, mit Schreibzeilen.
     Mische die Arten sinnvoll, aber nicht aus Prinzip: Eine Aufgabe, die frei am besten funktioniert, bleibt frei. Schreib nie „Verbinde die Satzanfänge“ als freie Aufgabe, ohne dass die Teile in den Feldern stehen.
   - **Schreibzeilen** nach erwarteter Antwortlänge: 1 bis 2 für ein Wort oder einen Satz, 4 bis 6 für einen Absatz, 0 wenn nur angekreuzt oder verbunden wird.
   - **Tipp** (`hilfe`) nur dort, wo Schülerinnen und Schüler typischerweise hängen.
   - **Merkkasten** nur, wenn eine Regel oder ein Wortschatz wirklich gebraucht wird.
   - **Lösung** (`loesung`) zu jeder freien Aufgabe, deren Antwort feststeht, kurz und genau. Bei Zuordnung, Lücken, Auswahl und Tabelle schreibt das Programm die Lösung selbst, du ergänzt höchstens, was die Lehrkraft zusätzlich wissen sollte. Dann liegt dem Blatt automatisch ein Lösungsblatt für die Lehrkraft bei. Bei offenen Aufgaben schreib stattdessen in einem Satz, was eine gute Antwort enthält.
   - **Punkte** nur angeben, wenn die Lehrkraft Punkte möchte.
   - Keine Farben und keine Symbole, die in Schwarz-Weiß nicht tragen.
   - Setze keine Namen von Schülerinnen und Schülern ein.
4. **Erdung.** Nenne keine Lehrplan-Fundstellen, Kompetenzbezeichnungen oder Operatorenlisten, die dir nicht vorliegen. Das Werkzeug setzt selbst einen ehrlichen Hinweis ins Blatt, wenn für die Klasse kein Lehrplan hinterlegt ist. Hat die Klasse einen Lehrplan, lies zuerst die passende Stelle (Gliederung ansehen, dann nur den Abschnitt zum Thema) und richte die Aufgaben danach aus. Was dort nicht steht, nimmst du nicht an.
5. **Erstellen.** Rufe `arbeitsblatt_erstellen` auf. Nennt die Lehrkraft Klasse, Fach und Reihe, gib sie mit an, damit das Blatt im richtigen Ordner landet. Kennst du Datum und Stunde, gib auch sie an, dann wird es in der Stundentabelle eingetragen. Word gibt es nur auf Wunsch. Will die Lehrkraft das Ergebnis selbst in Word bearbeiten (Anpassen, Bearbeiten, Weitergeben an Kolleginnen und Kollegen), setze `word` auf wahr: Dann liegt neben dem PDF eine Word-Datei.
6. **Prüfen.** Meldet das Werkzeug einen Fehler (zum Beispiel ein Schaubild, das nicht auf die Seite passt), korrigiere ihn still und erstelle das Blatt neu. Erstelle ein Blatt nur einmal pro Wunsch und nicht zur Sicherheit in mehreren Fassungen. Meldet das Werkzeug mehr als drei Seiten, prüf, ob alles nötig ist, und kürze nur, wenn die Lehrkraft ein kurzes Blatt wollte. Wünscht die Lehrkraft das Blatt in mehreren Niveaus, ist das Aufgabe von Differenzieren.
7. **Antworten.** Sag in ein, zwei Sätzen, was die Lehrkraft bekommt ("Das Arbeitsblatt ist fertig, zwei Seiten mit einem Schaubild, du siehst es rechts") und biete eine passende Anpassung an (zum Beispiel leichter, schwerer, kürzer). Nenne nie Dateinamen, Werkzeugnamen oder Fachwörter wie "PDF-Erzeugung".
