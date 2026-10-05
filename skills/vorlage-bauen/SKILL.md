---
name: vorlage-bauen
title: Eigene Vorlage bauen
description: Führt die Lehrkraft Schritt für Schritt dazu, eine eigene Vorlage zu bauen (zum Beispiel "Vokabeltests wie in unserer Fachschaft" oder "Arbeitsblätter mit meinem Aufbau"), probiert sie sofort aus und schärft sie nach. Nutze es bei Wünschen wie "eigene Vorlage", "neue Vorlage anlegen", "daraus eine Vorlage machen", "das soll künftig immer so aussehen", "merk dir, wie ich Klausuren haben will", "Vorlage ändern", "Vorlage verbessern". Nicht für das Erstellen eines einzelnen Materials (dafür die passende Anleitung wie Arbeitsblatt oder Klausur) und nicht für das Festhalten von Notenschlüsseln (dafür Bewertung).
---

# Eigene Vorlage bauen

Eine Vorlage ist eine Anleitung, nach der du künftig Material erstellst, so wie diese Lehrkraft es will. Die Lehrkraft muss davon nichts über Technik wissen. Sprich nie von "Skill", "Markdown" oder Dateien, sondern von "Vorlage", "Aufbau" und "Regeln".

Das Layout (Schrift, Graustufen, Kopfzeile) ist bei allem Material gleich und bleibt es. Eine Vorlage bestimmt Inhalt, Aufbau, Aufgabentypen, Umfang, Ton und Rückfragen. Wünscht die Lehrkraft ein anderes Layout, sag ehrlich, dass das Aussehen für alle Blätter gleich ist, und frag, ob sich der Wunsch über den Aufbau lösen lässt.

## Zwei Wege

- **Neu:** Die Lehrkraft will eine Vorlage von Grund auf. Beginne mit Schritt 1.
- **Daraus machen:** Im Gespräch ist gerade etwas Gutes entstanden (ein Blatt, eine Klausur, Regeln, die sie korrigiert hat). Übernimm, was dort festgelegt wurde: Aufbau, Aufgabenarten, Umfang, Korrekturen der Lehrkraft. Frag nur nach, was fehlt, und fang bei Schritt 3 an.

## Ablauf

1. **Was soll entstehen?** Frag in einer Runde, höchstens drei Dinge: Welche Art von Material (Blatt, Test, Stundenplanung, ...)? Für welches Fach und welche Zielgruppe? Was soll bei dieser Vorlage immer gleich sein? Hat die Lehrkraft das schon gesagt, frag nicht noch einmal.
2. **Beispiel ansehen (freiwillig).** Biete an: "Wenn du ein Beispiel hast, leg ein Foto davon in den Chat, dann übernehme ich den Aufbau." Bitte darum, dass keine Schülernamen und keine korrigierten Arbeiten darauf zu sehen sind. Liegt ein Beispiel vor, lies Aufbau, Aufgabenarten und Umfang heraus und frag, was davon Regel ist und was Zufall. Gibt es das Beispiel schon als Material in einer Reihe, kannst du es mit `material_lesen` lesen.
3. **Regeln klären.** Frag nach dem, was dir noch fehlt, höchstens drei Fragen auf einmal. Typische Punkte: Aufbau und Reihenfolge, Zahl und Art der Aufgaben, Umfang (Seiten, Minuten), Ton und Sprachniveau, ob es Lösungen oder einen Erwartungshorizont geben soll, was nie vorkommen darf, welche Rückfragen vor dem Erstellen nötig sind.
4. **Zusammenfassung zeigen und bestätigen lassen.** Schreib in der Sprache der Lehrkraft auf, wie die Vorlage arbeiten wird, zum Beispiel: "So wird dein Vokabeltest aufgebaut: ...". Höchstens zehn Zeilen. Frag: "Soll ich das so als Vorlage speichern?" Änderungen arbeitest du ein und zeigst die Zusammenfassung neu.
5. **Vorlage schreiben und speichern.** Rufe `vorlage_speichern` auf. Die Teile:
   - **titel:** kurz und in der Sprache der Lehrkraft ("Vokabeltest 11a").
   - **beschreibung:** eine Zeile. Was sie macht, bei welchen Wünschen sie greift (benutze die Wörter, die die Lehrkraft selbst benutzt hat), und am Ende "Nicht für ...": wofür sie nicht gedacht ist. Ohne diesen Teil lehnt das Programm die Vorlage ab.
   - **anleitung:** in Schritten, kurz und konkret, aufgebaut wie die mitgelieferten Anleitungen: 1. Klären (höchstens zwei Rückfragen, Standardwerte nennen), 2. Klasse kennen (`klasse_lesen`, `stand_lesen`), 3. Inhalt schreiben mit den Regeln der Lehrkraft, 4. Erdung (keine erfundenen Lehrplan-Fundstellen), 5. Erstellen mit dem passenden Werkzeug, 6. Antworten in ein, zwei Sätzen ohne Datei- und Werkzeugnamen. Nenne nur Werkzeuge, die es gibt: `arbeitsblatt_erstellen` (Blätter, Tests, Checks), `klausur_erstellen`, `stundenverlauf_erstellen`, `lernsituation_erstellen`, `material_lesen`. Schreib die Regeln der Lehrkraft als Regeln, nicht als Beispiel zum Abschreiben. Schreib keine feste Klasse, kein festes Fach und keine feste Reihe hinein, die sich nur aus dem Probelauf ergeben haben: Die Vorlage nimmt sie jedes Mal aus der Anfrage oder fragt nach. Keine Namen von Schülerinnen und Schülern.
   Meldet das Programm Probleme, behebe sie still und speichere noch einmal.
6. **Probelauf.** Sag: "Die Vorlage ist gespeichert. Probieren wir sie gleich aus." Frag nach einem Thema und einer Klasse (oder schlage eines vor), lade die Vorlage mit `skill_laden` unter dem Namen, den das Speichern zurückgegeben hat, und folge ihr genau, als hätte die Lehrkraft sie angefordert. Das Ergebnis erscheint in der Vorschau.
7. **Nachschärfen.** Frag: "Passt das so, oder soll etwas anders sein?" Aus jeder Rückmeldung ("Aufgabe 3 immer mit Material", "kürzer") machst du eine feste Regel: Lies die Vorlage mit `vorlage_lesen`, ergänze oder ändere die Regel an der passenden Stelle und speichere sie mit `vorlage_speichern` unter demselben Titel. Danach ein neuer Probelauf. Wiederhole, bis die Lehrkraft zufrieden ist.
8. **Abschluss.** Sag in ein, zwei Sätzen, wie die Vorlage künftig greift ("Ab dem nächsten neuen Gespräch nehme ich diese Vorlage von selbst, wenn du einen Vokabeltest wünschst") und dass sie unter "Vorlagen" in der Seitenleiste zu finden ist und dort gelöscht werden kann.

## Gute Vorlagen

- Eine Vorlage macht eine Sache. Sind es zwei, baue zwei Vorlagen.
- Die Beschreibung entscheidet, wann die Vorlage greift. Sie nennt die Wörter der Lehrkraft und grenzt ab.
- Heißt eine Vorlage so wie eine mitgelieferte (zum Beispiel "Arbeitsblatt"), ersetzt sie diese. Das ist erlaubt, wenn die Lehrkraft es so will. Sag es dann dazu.
- Nichts erfinden: Was die Lehrkraft nicht gesagt hat, wird als Rückfrage in die Vorlage geschrieben, nicht als Annahme.
