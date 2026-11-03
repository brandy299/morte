# Entscheidung 025: Rückmeldung zu Schülertexten

Datum: 2026-11-03 · Status: angenommen (Vorgabe von yb: Fotos von Handschrift nur ohne Schülernamen, die Note bleibt immer bei der Lehrkraft)

## Anlass

Texte korrigieren ist der größte Zeitfresser im Alltag, und fast alle Lehrer-KI-Tools werben damit. Pult hatte dafür nichts.

## Entscheidung

- Anleitung `korrektur` und Werkzeug `rueckmeldung_erstellen`. Das Modell liefert **Befunde als Daten** (Stärken, Kriterien mit Punkten, Befunde mit Stelle, Zitat, Art, Erklärung, Vorschlag, nächste Schritte). Punktsumme, Prozent und Seitenumbruch rechnet und zeichnet das Programm (`src/core/material/rueckmeldung.ts`, gemeinsame Zeichenschicht `layout.ts`). Ausgabe: druckfertiges PDF in Graustufen.
- **Die Note bleibt bei der Lehrkraft.** Es gibt nie eine automatische Note. Hat die Klasse einen Notenschlüssel, nennt das Blatt nur einen Hinweis („nach dem Notenschlüssel Note X, die Lehrkraft legt die Note fest“) und lässt eine Zeile für die Note frei. Ohne Schlüssel steht keine Note da. Das folgt Entscheidung 003.
- Kriterien kommen aus den Bewertungsregeln oder von der Lehrkraft. Gibt es keine, vergibt das Blatt keine Punkte.
- **Datenschutz:** Keine Namensfelder im Blatt. Die Anleitung bittet, Namen vor dem Einfügen zu entfernen, und fragt nie nach Namen oder Klassennamen. Der Schülertext wird nicht gespeichert, nur das fertige Blatt (mit kurzen Zitaten) im lokalen Ordner.
- **Handschrift per Foto** nur auf ausdrücklichen Wunsch der Lehrkraft und nur ohne Schülernamen auf dem Bild. Die Anleitung sagt dabei klar, dass das Bild an den gewählten KI-Anbieter geht.

## Nicht jetzt

- Word-Ausgabe (kommt, wenn Lehrkräfte sie wollen).
- Eigene Prüfkriterien und Messung in `evals/`: Ein echter Durchlauf mit einem Modell steht noch aus.
