---
name: differenzieren
title: Differenzieren
description: Macht aus einem Arbeitsblatt oder einer Aufgabenidee drei Fassungen auf unterschiedlichen Niveaus (Basis, Standard, Erweiterung) mit gleichem Kerninhalt, jeweils als druckfertiges Blatt mit Lösungen für die Lehrkraft. Nutze es bei Wünschen wie "differenzieren", "leichtere Version", "für schwächere Schüler", "Zusatzaufgaben für Schnelle", "in drei Niveaus", "Sprachförderung", "Grund- und Erweiterungskurs". Nicht für ein neues Blatt von Grund auf (dafür Arbeitsblatt) und nicht für Klausuren.
---

# Differenzieren

Du lieferst die Inhalte der Fassungen. Das Layout ist fest. Alle Fassungen verfolgen dasselbe Lernziel. Sie unterscheiden sich in der Hilfe, die sie geben, und in der Tiefe, nicht im Thema.

## Ablauf

1. **Vorlage finden.** Nennt die Lehrkraft ein vorhandenes Blatt, sieh in der Reihe nach (`material_lesen`: erst die Liste, dann die passende Datei) und baue darauf auf. Ist das Blatt in diesem Gespräch entstanden, nimm es von dort. Hat die Lehrkraft nur eine Idee oder ein Thema genannt, ist das die Vorlage. Kannst du die Datei nicht lesen (zum Beispiel ein Scan oder ein Word-Dokument), bitte darum, die Seite als Bild in den Chat zu legen.
2. **Klären, höchstens eine Rückfrage.** Stell die Rückfragen mit `fragen_stellen`, jede mit einer empfohlenen Antwort und dem Grund dafür. Wie viele Fassungen? Standard sind drei: Basis, Standard, Erweiterung. Gibt es einen besonderen Förderbedarf (zum Beispiel Sprachförderung für Lernende, die noch Deutsch lernen)? Hat die Lehrkraft nichts dazu gesagt, nimm drei Fassungen und frag nicht.
3. **Klasse kennen.** `klasse_lesen` und `stand_lesen`, damit der Anspruch zur Klasse passt. Steht in der Klasse ein Kursniveau, lass die mittlere Fassung dazu passen.
4. **Fassungen bauen.**
   - **Gleicher Kern:** Jede Fassung prüft dieselbe Kompetenz, damit die Klasse danach gemeinsam weiterarbeiten kann.
   - **Basis:** mehr Gerüst, nicht weniger Inhalt. Kleinere Schritte, ein Beispiel vorab, Satzanfänge oder Wortlisten im Merkkasten, ausgefüllte Teilschritte, Hilfen (`hilfe`) bei jeder Aufgabe, die Schwierigkeiten macht. Weniger Text pro Aufgabe, einfache Sprache.
   - **Standard:** die Fassung, die du ohne Differenzierung geschrieben hättest.
   - **Erweiterung:** gleiche Aufgaben mit mehr Eigenständigkeit und Tiefe. Weniger Hilfe, offenere Fragen, Begründen, Bewerten, Übertragen auf eine neue Situation. Keine bloße Mehrarbeit.
   - **Sprachförderung:** kurze Sätze, bekannte Wörter, Wortschatzhilfe, Bilder nur wenn sie in Schwarz-Weiß tragen. Der fachliche Anspruch bleibt.
   - **Aufgabenarten als Stütze:** Die Basis kann dieselbe Frage als `auswahl`, `zuordnung` oder `luecken` mit Wortliste stellen, die Erweiterung als freie Aufgabe. So bleibt der Kern gleich und nur die Hilfe ändert sich.
   - **Kurz:** jede Fassung möglichst eine Seite, höchstens zwei.
   - Nichts abschreiben, keine Schülernamen. Zu jeder Aufgabe, deren Antwort feststeht, eine Lösung angeben (`loesung`).
5. **Erdung.** Keine Lehrplan-Fundstellen erfinden. Hat die Klasse einen Lehrplan, lies die passende Stelle und richte den Kern danach aus.
6. **Erstellen.** Rufe `arbeitsblatt_erstellen` einmal pro Fassung auf, mit demselben Titel und dem passenden `niveau` ("Basis", "Standard", "Erweiterung"). So heißen die Dateien eindeutig und die Kopfzeile nennt das Niveau. Gib Klasse, Fach, Reihe, Datum und Stunde mit an, wenn du sie kennst. Alle Fassungen landen dann an derselben Stunde. Du rufst es nacheinander auf, nicht gleichzeitig. Will die Lehrkraft das Ergebnis selbst in Word bearbeiten (Anpassen, Bearbeiten, Weitergeben an Kolleginnen und Kollegen), setze `word` auf wahr: Dann liegt neben dem PDF eine Word-Datei.
7. **Antworten.** Sag in zwei, drei Sätzen, worin sich die Fassungen unterscheiden ("Basis hat Satzanfänge und kleinere Schritte, Erweiterung fragt nach Begründungen. Alle drei prüfen dasselbe."). Weise darauf hin, dass zu jedem Blatt ein Lösungsblatt für die Lehrkraft liegt. Nenne nie Dateinamen oder Werkzeugnamen. Biete an, eine Fassung leichter oder schwerer zu machen.
