---
name: stunde-planen
description: Plant eine einzelne Unterrichtsstunde mit Lernzielen, Phasen mit Minuten, Sozialformen und Material und erzeugt daraus eine druckfertige Seite für die Lehrkraft (Stundenverlauf). Nutze es bei Wünschen wie "Stunde planen", "Verlaufsplan", "Stundenentwurf", "wie baue ich die Stunde am Mittwoch auf", "Stundenablauf", "Doppelstunde planen". Nicht für mehrere Stunden oder eine ganze Reihe (dafür Lernsituation), nicht für Schülermaterial wie Arbeitsblätter und nicht für das Durchsehen einer schon geplanten Stunde (dafür Stunde vorbereiten).
---

# Eine Stunde planen

Du schreibst den Inhalt. Das Werkzeug zeichnet die Seite und prüft, ob die Minuten zur Dauer der Stunde passen. Das Ergebnis ist für die Lehrkraft, nicht für die Klasse.

## Ablauf

1. **Klären, höchstens zwei Rückfragen in einer Runde.** Nötig sind Klasse (oder Kurs), Thema und die Dauer (45 oder 90 Minuten, sonst frag). Hilfreich: Datum, was davor behandelt wurde, welches Material schon da ist. Biete in derselben Runde an: "Soll ich gleich einen Entwurf machen?" Hat die Lehrkraft alles genannt, frag nicht nach.
2. **Klasse und Reihe kennen.** `klasse_lesen`, `stand_lesen`. Gehört die Stunde zu einer Reihe, lies `reihe_lesen`: Wo steht die Stunde in der Tabelle, was kam davor, was kommt danach? Gibt es dort Material, sieh mit `material_lesen` nach und baue darauf auf, statt es neu zu erfinden.
3. **Aufbau überlegen.**
   - **Ein Lernziel pro Kernaussage**, ein bis drei Stück, aus Sicht der Lernenden ("können ... erklären", "können ... anwenden"). Es muss in der Stunde erreichbar und überprüfbar sein.
   - **Phasen:** Einstieg (Aktivierung, Vorwissen, Problem), Erarbeitung (die Lernenden arbeiten selbst), Sicherung (Ergebnisse zusammentragen, Merksatz), je nach Dauer Anwendung oder Ausblick. Mehr als fünf bis sechs Phasen sind in 45 Minuten zu viel.
   - **Zeiten ehrlich schätzen:** Der Einstieg dauert selten länger als ein Fünftel. Plane die Sicherung nicht weg: Sie bekommt mindestens fünf Minuten. Lass etwas Luft für Organisation und Verzögerungen.
   - **Sozialform wechseln**, wenn es dem Lernen dient (Einzelarbeit, Partnerarbeit, Gruppenarbeit, Plenum). Wechsel kosten Zeit.
   - **Eine Phase, eine Handlung.** "Was passiert" beschreibt, was die Lehrkraft tut und was die Lernenden tun, in ein bis drei Sätzen.
   - **Material** nur nennen, was es gibt oder was du in dieser Sitzung erstellst. Erfinde keine Folien, Videos oder Links.
   - **Differenzierung** kurz: Wer schneller fertig ist, wer Hilfe braucht. Nur wenn es zur Stunde passt.
   - **Darauf achten:** typische Stolpersteine. Nur das, was du für dieses Thema wirklich erwartest.
4. **Erdung.** Nenne keine Lehrplan-Fundstellen oder Kompetenzbezeichnungen, die dir nicht vorliegen. Hat die Klasse einen Lehrplan, lies zuerst die passende Stelle (Gliederung, dann nur den Abschnitt) und richte die Lernziele danach aus. Das Werkzeug setzt selbst einen ehrlichen Hinweis auf die Seite, wenn kein Lehrplan hinterlegt ist.
5. **Erstellen.** Rufe `stundenverlauf_erstellen` auf. Gib `dauer` an, dann prüft das Werkzeug die Minuten. Nennt die Lehrkraft Klasse, Fach und Reihe, gib sie mit an, damit die Seite im richtigen Ordner landet. Kennst du Datum und Stunde, gib auch sie an, dann wird das Thema in der Stundentabelle notiert. Meldet das Werkzeug, dass die Minuten nicht passen, korrigiere still und ruf es noch einmal auf.
6. **Antworten.** Sag in zwei, drei Sätzen, wie die Stunde aufgebaut ist ("Einstieg mit einem Fehlerbeispiel, dann 25 Minuten Partnerarbeit, am Ende eine gemeinsame Regel. Die Seite siehst du rechts."). Biete den nächsten Schritt an: das passende Arbeitsblatt oder einen kurzen Verständnis-Check. Nenne nie Dateinamen oder Werkzeugnamen.

## Schulformen

Anhaltspunkte. Was die Lehrkraft, die Klasse oder der hinterlegte Lehrplan sagt, geht immer vor.

- **Berufskolleg:** Die Stunde dient meist einer beruflichen Handlung. Der Einstieg kann eine Situation aus dem Betrieb sein. Das Ergebnis der Stunde ist etwas, das man im Beruf braucht.
- **Gymnasium:** In der Oberstufe zählen Fachsprache, Begründen und Transfer. Die Sicherung nennt den Fachbegriff.
- **Gesamtschule:** Differenzierung ist der Normalfall. Plane Aufgaben auf zwei Niveaus mit gleichem Kerninhalt.
