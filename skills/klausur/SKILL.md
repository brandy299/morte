---
name: klausur
description: Erstellt eine Klausur oder einen schriftlichen Test zusammen mit dem Erwartungshorizont (Lösungen mit Punkten) als zwei druckfertige PDFs in Graustufen. Nutzt die Bewertungsregeln der Lehrkraft (Anforderungsbereiche, Notenschlüssel), falls hinterlegt. Nutze es bei Wünschen wie "Klausur", "Klassenarbeit", "Test", "Leistungsüberprüfung", "Erwartungshorizont", "EHZ", "schriftliche Arbeit". Nicht für Übungsblätter ohne Bewertung (dafür Arbeitsblatt), nicht für die Planung von Stunden oder Reihen und nicht für das Eintragen von Notenschlüsseln (dafür Bewertung).
---

# Klausur mit Erwartungshorizont

Du lieferst nur den Inhalt. Layout, Punktesummen, Anteile je Bereich und Punktgrenzen der Noten rechnet das Werkzeug. Rechne sie nie selbst und schreib sie nicht in Aufgabentexte.

Es gibt keine festen Bereiche und keinen festen Notenschlüssel. Jede Schule und jede Lehrkraft hat eigene. Verwende nur, was in den Bewertungsregeln steht oder was die Lehrkraft dir sagt.

## Ablauf

1. **Klären, höchstens zwei Rückfragen in einer Runde.** Nötig sind: Klasse oder Kurs, Thema (oder Reihe) und Dauer. Hat die Lehrkraft alles genannt, frag nicht nach. Biete in derselben Runde an: "Soll ich gleich einen Entwurf machen?" Erfinde keine Dauer.
2. **Klasse und Stoff kennen.** Gibt es die Klasse im Arbeitsordner: erst `klasse_lesen`, dann `stand_lesen`, dann `reihe_lesen` für die passende Reihe. Die Klausur prüft, was wirklich behandelt wurde, nicht mehr. Schulform, Stufe und Kursniveau bestimmen Anspruch und Aufgabenform (siehe unten).
3. **Bewertungsregeln holen.** Rufe `bewertung_lesen` für die Klasse auf.
   - Es gibt Regeln: Nutze genau diese Bereiche und diesen Notenschlüssel. Jede Teilaufgabe nennt dann einen der Bereiche mit der Kurzbezeichnung aus den Regeln.
   - Es gibt keine: Frag in einer Runde, ob es feste Anforderungsbereiche gibt und wie der Notenschlüssel aussieht. Antwortet die Lehrkraft, übernimm es für diese Klausur und biete an, die Regeln zu speichern (dafür gibt es die Anleitung "bewertung"). Hat sie keine, erstelle die Klausur ohne Bereiche und ohne Notenschlüssel. Der Erwartungshorizont sagt das ehrlich. Denk dir nichts aus.
   - Gibt es Vorgaben zur Verteilung auf die Bereiche, plane die Punkte entsprechend. Weicht die Verteilung ab, sagst du das am Ende in einem Satz.
4. **Aufgaben schreiben.** Eigene Aufgaben, nichts aus bekannten Lehrwerken oder früheren Klausuren abschreiben.
   - Von leicht nach schwer, eine Aufgabe, ein Arbeitsauftrag. Jeder Auftrag beginnt mit einem klaren Verb. Die Verben kommen aus den Operatoren, die die Lehrkraft oder die Schule nutzt. Liegt dir keine Liste vor, nimm einfache, eindeutige Verben (nenne, beschreibe, erkläre, vergleiche, begründe, beurteile) und behaupte nicht, sie stammten aus einer amtlichen Liste.
   - Punkte passend zum Aufwand und zur Dauer. Halbe Punkte sind erlaubt. Die Summe ergibt sich aus den Teilaufgaben.
   - Schreibzeilen nach erwarteter Länge: 2 bis 3 für einen Satz, 6 bis 12 für einen Absatz, mehr nur für einen längeren Text.
   - Ein Einstieg (Situation, Text, Daten) nur, wenn mehrere Teilaufgaben darauf aufbauen.
   - Keine Farben, keine Bilder, nichts, das in Schwarz-Weiß nicht trägt. Keine Namen von Schülerinnen und Schülern.
5. **Erwartungshorizont schreiben.** Zu jeder Teilaufgabe steht, was eine gute Antwort enthält und wofür es wie viele Punkte gibt ("2 P. für ..., 1 P. für ..."). Die Punkte der Vergabe ergeben die Punkte der Teilaufgabe. Bei offenen Aufgaben nenne Kriterien und Beispiele für gute Lösungen, aber lass andere gute Lösungen ausdrücklich zu ("auch andere begründete Lösungen").
6. **Erdung.** Nenne keine Lehrplan-Fundstellen, Kompetenzbezeichnungen oder Operatorenlisten, die dir nicht vorliegen. Das Werkzeug setzt selbst einen ehrlichen Hinweis auf die Klausur, wenn kein Lehrplan hinterlegt ist. Hat die Klasse einen Lehrplan, lies zuerst die passende Stelle (Gliederung ansehen, dann nur den Abschnitt zum Thema) und richte die Aufgaben und ihre Anforderungen danach aus. Was dort nicht steht, nimmst du nicht an.
7. **Erstellen.** Rufe `klausur_erstellen` auf. Nennt die Lehrkraft Klasse, Fach und Reihe, gib sie mit an, damit beides im richtigen Ordner landet. Kennst du Datum und Stunde, gib auch sie an, dann wird der Termin in der Stundentabelle eingetragen.
8. **Prüfen.** Meldet das Werkzeug einen Fehler (zum Beispiel einen unbekannten Bereich), behebe ihn und erstelle neu. Passt die Länge nicht zur Dauer, kürze oder ergänze.
9. **Antworten.** Sag in zwei, drei Sätzen, was die Lehrkraft bekommt ("Die Klausur und der Erwartungshorizont sind fertig, du siehst sie rechts"), wie viele Punkte sie hat und welcher Notenschlüssel gilt oder dass noch keiner hinterlegt ist. Biete eine passende Anpassung an (zum Beispiel leichter, kürzer, mehr Aufgaben im Bereich II). Nenne nie Dateinamen, Werkzeugnamen oder Fachwörter wie "PDF-Erzeugung".

## Schulformen

Das sind Anhaltspunkte. Was die Lehrkraft, die Klasse oder die Bewertungsregeln sagen, geht immer vor.

- **Berufskolleg:** Die Aufgaben hängen an einer beruflichen Handlungssituation (Einstieg mit Firma, Auftrag, Rolle) und prüfen, ob die Schülerinnen und Schüler im Beruf handeln können, nicht nur Wissen wiedergeben.
- **Gymnasium:** Besonders in der Oberstufe sollen Aufgabenform und Anspruch auf die Abschlussprüfung hinführen. Frag nach dem Format, wenn es nicht aus der Reihe hervorgeht.
- **Gesamtschule:** Steht ein Kursniveau in der Klasse (zum Beispiel Grund- und Erweiterungskurs), richte Anspruch und Hilfen danach. Biete an, eine zweite Fassung für das andere Niveau zu machen.
