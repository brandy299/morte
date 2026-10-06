---
name: verstaendnis-check
title: Verständnis-Check
description: Erstellt einen kurzen Verständnis-Check (drei bis sechs Fragen, etwa fünf Minuten, zum Beispiel am Ende der Stunde) als druckfertiges Blatt mit Lösungen und typischen Fehlvorstellungen für die Lehrkraft. Nutze es bei Wünschen wie "Verständnis-Check", "Exit Ticket", "kurzer Test am Ende", "Blitzabfrage", "Lernstandskontrolle", "Quiz zum Thema", "Multiple Choice". Nicht für benotete Klausuren (dafür Klausur) und nicht für ein Übungsblatt mit vielen Aufgaben (dafür Arbeitsblatt).
---

# Verständnis-Check

Du schreibst wenige, gezielte Fragen. Das Werkzeug zeichnet das Blatt und ein Lösungsblatt für die Lehrkraft. Ziel: In fünf Minuten sehen, wer das Wichtigste verstanden hat und wo es hakt. Der Check wird nicht benotet.

## Ablauf

1. **Klären, höchstens eine Rückfrage.** Nötig sind Klasse (oder Kurs) und Thema. Hat die Lehrkraft eine Stunde genannt, nimm deren Thema aus der Reihe. Frag nur, was du nicht herausfinden kannst. Biete an: "Soll ich gleich einen Entwurf machen?"
2. **Klasse und Stunde kennen.** `klasse_lesen`, `stand_lesen`, bei Bedarf `reihe_lesen` und `material_lesen`. Der Check prüft, was in der Stunde wirklich dran war, nicht mehr.
3. **Fragen schreiben.**
   - **Drei bis sechs Fragen**, jede prüft einen Kernpunkt der Stunde. Weniger ist besser als mehr.
   - **Mischung:** meist Auswahlfragen (Multiple Choice mit drei bis vier Antworten, Buchstaben A bis D im Fragetext, `zeilen` auf 0), dazu eine kurze Frage mit eigener Antwort (ein bis zwei Zeilen) oder eine kleine Rechnung. Für Fächer ohne Auswahlfragen passt auch "Richtig oder falsch? Begründe in einem Satz."
   - **Falsche Antworten aus echten Fehlvorstellungen:** Jede falsche Antwort entspricht einem Fehler, den Lernende wirklich machen (verwechselter Begriff, falsche Reihenfolge, Rechenfehler an typischer Stelle). Keine albernen oder offensichtlich falschen Antworten. Die richtige Antwort steht nicht immer an derselben Stelle und ist nicht immer die längste.
   - **Eine Frage, ein Gedanke.** Klare Sprache, ein eindeutiger Auftrag, keine Verneinungen wie "Welche Aussage ist NICHT falsch?".
   - **Lösung** (`loesung`) bei jeder Frage: die richtige Antwort und in einem Satz, welchen Fehler jede falsche Antwort verrät ("B: verwechselt relativen und absoluten Bezug"). So weiß die Lehrkraft, wo sie nachsteuern muss.
   - **Kurz:** eine Seite, ohne Punkte. Titel wie "Kurz gecheckt: Zellbezüge".
   - Keine Schülernamen, keine Bilder, nichts aus Lehrwerken abschreiben.
4. **Erdung.** Keine Lehrplan-Fundstellen erfinden. Hat die Klasse einen Lehrplan, richte die Fragen an den Kompetenzen dort aus.
5. **Erstellen.** Rufe `arbeitsblatt_erstellen` auf, mit einer Einleitung wie "Fünf Minuten, du kannst nichts falsch machen. Es hilft uns, die nächste Stunde zu planen." Gib Klasse, Fach, Reihe, Datum und Stunde mit an, wenn du sie kennst. Die Lösungen setzt das Werkzeug auf ein eigenes Blatt für die Lehrkraft. Will die Lehrkraft das Ergebnis selbst in Word bearbeiten (Anpassen, Bearbeiten, Weitergeben an Kolleginnen und Kollegen), setze `word` auf wahr: Dann liegt neben dem PDF eine Word-Datei.
6. **Antworten.** Sag in ein, zwei Sätzen, was die Lehrkraft bekommt und wozu das Lösungsblatt gut ist ("Die Fehlvorstellungen stehen dort bei jeder Antwort, so siehst du gleich, was du morgen wiederholst"). Biete an, den Check zu kürzen oder auf andere Fragearten umzustellen. Nenne nie Dateinamen oder Werkzeugnamen.
