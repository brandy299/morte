# Entscheidung 003: Bewertungsregeln sind Sache der Lehrkraft

Datum: 2026-10-05 · Status: angenommen (Vorgabe von Yannik)

## Anlass

Die Skills für Klausuren brauchen Anforderungsbereiche und einen Notenschlüssel. Beides unterscheidet sich je nach Bundesland, Schulform, Bildungsgang, Fach und Schule. Wer sie im Programm fest einbaut, baut für einen Teil der Kolleginnen und Kollegen etwas Falsches.

## Entscheidung

- **Nichts davon ist im Programm oder in einem Skill festgelegt.** Anzahl, Namen und Anteile der Bereiche und der gesamte Notenschlüssel stammen aus `Lehrpläne/<Ordner>/Bewertung.md` oder aus dem, was die Lehrkraft im Gespräch sagt.
- Die Lehrkraft trägt sie im Gespräch ein (Skill `bewertung`, Werkzeug `bewertung_speichern`). Die Datei bleibt lesbar und von Hand bearbeitbar.
- **Fehlt etwas, wird gefragt, nie ergänzt.** Ohne Notenschlüssel erzeugt `klausur_erstellen` eine Klausur ohne Schlüssel, und der Erwartungshorizont sagt das offen.
- **Rechnen macht das Programm, nicht das Modell:** Punktsummen, Anteile je Bereich und Punktgrenzen (aufgerundet auf halbe Punkte) stehen in `src/core/workspace/bewertung.ts` und `src/core/material/klausur.ts`. So stimmen sie auch mit schwächeren Modellen.
- Ein hinterlegter Notenschlüssel zählt nicht als Lehrplan. Der Hinweis "Ohne hinterlegten Lehrplan erstellt" verschwindet erst, wenn im Lehrplan-Ordner eine `Plan.md` mit Inhalt liegt.

## Folgen

- Ein später eingebauter Importeur oder eine Eingabemaske in der Oberfläche schreibt dieselbe Datei. Der Skill ist nur der erste Weg hinein.
- Vorgaben, die wir selbst gern hätten (zum Beispiel Beispielschlüssel zum Auswählen), kommen höchstens als abwählbare Vorschläge, nie als Standard.
