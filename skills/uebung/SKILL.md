---
name: uebung
title: Interaktive Übung
description: Erstellt eine interaktive Übung als einzelne Datei, die im Browser läuft (Schul-PC, Beamer, auch am Handy, ohne Internet), mit Sofort-Rückmeldung, Erklärungen und Punktestand am Ende. Aufgabenarten sind Auswahlfragen, Lückentext, Zuordnen, freie Antwort, Checkliste und „Wo klickst du?“ (Klick auf die richtige Stelle in einem Bildschirmfoto aus der Bildbibliothek). Nutze es bei Wünschen wie "interaktive Übung", "digitale Übung", "Quiz", "Lernpfad", "Online-Aufgaben", "etwas zum Anklicken", "Selbstlernaufgabe am Rechner", "Übung für die Lernenden am Handy". Nicht zum Ausdrucken (dafür Arbeitsblatt), nicht für Klausuren und nicht für Folien (dafür Präsentation). Es speichert keine Ergebnisse und fragt keine Namen ab.
---

# Interaktive Übung

Du schreibst nur den Inhalt als Schritte. Aussehen, Rückmeldung und Ablauf macht das Werkzeug `uebung_erstellen`. Es lehnt ab, was nicht stimmt (zum Beispiel eine Auswahlfrage ohne richtige Antwort). Dann ändere den Schritt, wie die Meldung es sagt.

## Ablauf

1. **Klären, was fehlt, höchstens zwei Rückfragen in einer Runde**, mit `fragen_stellen`, jede mit empfohlener Antwort und Grund. Nötig sind Thema und Klasse oder Kurs. Wichtig ist außerdem, **wozu** die Übung dient: Einstieg ins Thema, Sicherung nach der Stunde oder Wiederholung vor der Klassenarbeit. Das ist oft aus der Anfrage klar, dann frag nicht. Den Rest legst du selbst fest. Frag nie nach der Sprache (Deutsch, außer das Fach ist eine Fremdsprache), nie danach, wie die Übung abläuft, und nie nach der Länge: Das legst du selbst fest. Frag Klasse und Zweck in einer einzigen Frage, wenn beides fehlt.
2. **Klasse kennen.** Gibt es die Klasse im Arbeitsordner: `stand_lesen`, bei Bedarf `reihe_lesen`. Sprache und Schwierigkeit passen zur Klasse.
3. **Schritte schreiben.** Eine gute Übung hat vier Teile, auch wenn sie kurz ist:
   - **Einstieg:** ein Schritt `info` mit einem kurzen Fall, einer Frage oder einer Situation, in der das Thema vorkommt.
   - **Erarbeitung:** ein bis drei Schritte `info` mit kurzen Häppchen (höchstens 700 Zeichen), Fachbegriffe erklärt.
   - **Prüfen:** vier bis acht Schritte mit Sofort-Rückmeldung. Wechsle die Arten ab: `auswahl`, `lueckentext`, `zuordnung`.
   - **Anwenden:** zum Schluss eine `offen`-Aufgabe, bei der die Lernenden mit eigenen Worten schreiben, und eine `checkliste` zur Selbsteinschätzung („Das kann ich jetzt“).
4. **Gute Fragen schreiben.**
   - **Auswahl:** zwei bis fünf Antworten, mindestens eine richtig und eine falsch. Die richtige steht nicht immer oben. Falsche Antworten sind plausible Irrtümer, keine Scherze. Gib bei den wichtigen Antworten eine kurze Erklärung (`erklaerung`), warum sie stimmt oder warum nicht. Sind mehrere richtig, sag das in der Frage.
   - **Lückentext:** Das gesuchte Wort steht in geschweiften Klammern: `Die {Sonne} scheint.` Gleichwertige Antworten trennst du mit einem senkrechten Strich: `{Bruttoinlandsprodukt|BIP}`. Schreib die Lücken so, dass genau ein Wort oder ein fester Begriff passt. Höchstens sechs Lücken in einem Schritt. Mit `hilfe` zeigt die Übung die gesuchten Wörter in einer Liste, nimm das bei Fachbegriffen.
   - **Zuordnen:** zwei bis sechs Paare, jede Seite nur einmal. Die rechte Seite mischt das Programm.
   - **Wo klickst du?** (`klick`): Die Lernenden klicken im Bildschirmfoto auf die gesuchte Stelle. Das geht nur mit einem Bild aus der Bibliothek der Lehrkraft: Such mit `bilder_suchen` ein passendes Bild (Programm, Version und Sprache stimmen) und gib `bild` (die Kennung) und `ziel` (die Kennung der Stelle) an. `aufgabe` sagt, was gefunden werden soll („Wo schaltest du den Text fett?“). Das Programm zeigt nach dem Klick den Namen der Stelle und den Ort aus der Beschreibung des Bildes („Start › Schriftart › Fett“), du schreibst keinen Klickpfad selbst. Nimm zwei bis fünf solcher Schritte pro Bild, jeden mit einer anderen Stelle. Gibt es kein passendes Bild, lass diese Aufgabenart weg und sag es der Lehrkraft einmal ehrlich. Erfinde nie eine Bildkennung.
   - **Offen:** Die Aufgabe ist eine konkrete Anwendung, kein Wissen zum Abfragen. Setz eine Wortzahl (`woerter`) als Ziel und schreib eine kurze `musterloesung`.
   - Nichts erfinden: Zahlen, Daten und Zitate nur, wenn sie stimmen.
5. **Umfang:** etwa zehn bis fünfzehn Schritte für 15 bis 25 Minuten. Mehr als zwanzig gehen nicht.
6. **Erstellen** mit `uebung_erstellen`. Gib `klasse`, `fach` und `reihe` an, wenn es sie gibt, und `datum`, wenn die Stunde bekannt ist.
7. **Antworten** in zwei, drei Sätzen: wie viele Schritte, was die Lernenden tun, dass rechts die Vorschau läuft und die Datei im Browser ohne Internet funktioniert, auch am Handy. Sag einmal ehrlich, dass die Ergebnisse nicht gespeichert werden und die Lehrkraft sie nicht sieht. Keine Dateinamen, keine Werkzeugnamen.

## Grenzen

- Die Antworten stecken in der Datei: Wer den Quelltext liest, findet die Lösungen. Für eine Klassenarbeit taugt die Übung deshalb nicht.
- Eigene Bilder, Videos, Ton und Ziehen mit der Maus gibt es nicht. Bildschirmfotos gibt es nur als „Wo klickst du?“ aus der Bildbibliothek der Lehrkraft. Sag das ehrlich, wenn danach gefragt wird.
