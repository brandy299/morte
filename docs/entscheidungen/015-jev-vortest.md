# 015: Jev als schneller Vortest in den Prüfläufen

Stand: 2026-10-08 · Gilt nur für die Prüfläufe (`npm run eval`), nicht für Pult selbst.

## Entscheidung

`npm run eval -- … --pruefer jev` lässt die Prüfer-Kriterien statt von einem Sprachmodell von Jev (TypeSafe AI, Modell `jev-1.13.0`, fest eingestellt) beurteilen. Jev beantwortet jedes Kriterium als Ja/Nein-Wahrscheinlichkeit, bei Kriterien mit Bedingung zusätzlich, ob es überhaupt gilt. Urteile unter 80 % Sicherheit (in beide Richtungen) sind im Bericht als „unsicher" markiert.

Der Vortest ist für schnelle Rückmeldung nach einer Änderung an einer Anleitung gedacht. Die Zahlen in `evals/BASELINE.md` und für die Sperrliste (014) misst weiter ein Sprachmodell als Prüfer.

## Warum

Abgleich mit dem Sonnet-Prüfer der dritten Messung (70 Fälle, 972 Urteile, 2026-10-08):

- Gleiches Urteil in 82 % der Fälle. Wo Jev sich sicher ist (ab 80 %, das sind 58 % der Urteile), in 93,5 %.
- Ob ein Kriterium gilt, erkennt Jev in 92 bis 98 % gleich.
- Dauer 3,7 Sekunden, Kosten rund 1 Cent für alle Fälle. Der Sonnet-Prüfer kostet dafür mehrere Dollar.
- Schwach bei Kriterien, für die Wissen fehlt, das nicht im Fall steht (V-R3: Liste der erlaubten Werkzeuge), und bei Ermessensfragen (P2, V-M2).

Eine Kaskade (Jev zuerst, Sonnet nur bei unsicheren Kriterien) spart kaum: Sonnet beurteilt alle Kriterien eines Falls in einem Aufruf, bezahlt wird das Lesen des Falls. Sonnet entfällt nur, wenn Jev alle Kriterien sicher entscheidet, und das war bei 0 von 66 Fällen so. Deshalb kein Mischbetrieb, sondern zwei getrennte Prüfer.

## Datenschutz und Abhängigkeiten

- An TypeSafe gehen nur die Testfälle der Prüfläufe. Sie sind frei erfunden (siehe `evals/README.md`). Yannik hat dem am 2026-10-08 zugestimmt.
- Keine neue Abhängigkeit: ein einzelner HTTP-Aufruf mit `fetch`. Das SDK `@typesafe-ai/sdk` (MIT) wäre möglich, wird aber nicht gebraucht.
- Der Schlüssel kommt aus `TYPESAFE_API_KEY`, nie aus dem Code.

## Offen

- Fragen für die schwachen Kriterien nachschärfen und den Abgleich wiederholen.
- Mit einer neuen Jev-Version den Abgleich wiederholen, bevor `JEV_MODEL` umgestellt wird.
