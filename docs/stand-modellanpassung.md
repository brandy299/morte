# Stand: Pult an die Modelle anpassen

Stand: 2026-10-11. Diese Datei hält fest, wo wir bei der Anpassung von Pult an günstige Modelle stehen, damit der Überblick auch in einer neuen Sitzung da ist. Der Fahrplan für das ganze Projekt steht in `ROADMAP.md`.

## Ziel

Pult soll mit **DeepSeek V4.1 flash** und **Claude Haiku 5.5** (beide über OpenCode Go) verlässlich gutes Material erstellen, vor allem für den Unterricht mit PowerPoint. Dazu passen wir Systemtext und Anleitungen so an, dass sie für jedes Modell gelten (keine modellspezifischen Zweige, siehe `CLAUDE.md`, "Provider austauschbar").

## Messungen (2026-10-11, Jev-Vortest, zwei Wiederholungen)

Jev ist nur ein grober Vortest (82 % gleiche Urteile wie Sonnet, viele Urteile "unsicher"). Die Zahlen zeigen eine Richtung, keine Baseline. Sie stehen in `evals/ergebnisse/`.

| Anleitung | DeepSeek V4.1 flash | Haiku 5.5 |
|---|---|---|
| arbeitsblatt | 93 % | 92 % |
| bewertung | 81 % | 85 % |
| differenzieren | 83 % | 86 % |
| foto-nachbauen | 87 % | 80 % |
| klausur | 83 % | 89 % |
| lernsituation | 95 % | 86 % |
| stunde-planen | 89 % | 87 % |
| stunde-vorbereiten | 90 % | 94 % |
| verstaendnis-check | 100 % | 95 % |
| vorlage-bauen | 85 % | 85 % |

Nicht gemessen: `praesentation` und `oberflaeche` (kein Testsatz in `evals/`).

## Was die Analyse der Gespräche ergab

- Viele Fehlschläge sind Fehlurteile des Prüfers. Beispiel: "Keine Namen und Noten" schlug bei erfundenen Beispielfiguren an, echte Namen von Lernenden kamen nie vor.
- Echte Schwächen: unnötig viele oder widersprüchliche Rückfragen, zu lange Schlussantworten, Umfang und Aufgabenarten einer Vorlage werden nicht übernommen, Hilfen im Basisblatt verraten die Lösung.
- Systemtext, Anleitungen und Kriterien widersprachen sich bei den Rückfragen (1 bis 4 Fragen, höchstens zwei, Angebot eines Entwurfs).

## Offene PRs (Stand 2026-10-11)

| PR | Inhalt |
|---|---|
| #39 | Haiku-Helfer als Unteragent (`.claude/agents/haiku-helfer.md`) |
| #40 | Weniger Rückfragen, kurze Schlussantwort, `foto-nachbauen` übernimmt den Umfang |
| #41 | Testsätze und Programmprüfungen für `Stand.md` (`evals/stand/`) |
| #42 | Reparaturen an `Stand.md` (keine Noten, Werkzeug-Reste abweisen, nur die genannte Stunde auf "gehalten"). Baut auf #41 auf, zuerst #41 mergen |

Zurückgestellt: die Änderung an `skills/differenzieren/SKILL.md` (Commit a219abd auf `claude/modell-anpassung-verhalten`). Das Kriterium D-P4 wurde bei beiden Modellen schlechter, sie braucht eine Nachmessung mit `--wdh 4`.

## Ergebnis der Stand.md-Erprobung

- Das Überschreiben funktioniert bei beiden Modellen (S-UEBERSCHRIEBEN 6/6).
- Echte Lücken, in #42 behoben: Noten im Stand (Haiku), Werkzeug-Reste im Stand (Haiku), falscher Status (beide).
- **Noch offen:** Haiku liest `Klasse.md` oft nicht, bevor es `Stand.md` liest (S-ORDNUNG 4/8). Der Systemtext reicht nicht. Und beim Überschreiben gehen Offen-Punkte still verloren, weil das Werkzeug nichts zusammenführt.

## Plan

1. **Verhalten verbessern:** Rückfragen vereinheitlichen, kurze Schlussantwort, `foto-nachbauen` übernimmt den Umfang (PR #40). `differenzieren` nach Nachmessung.
2. **Prüfkriterien korrigieren** (eigener PR): erfundene Beispielfiguren, Termine aus der Stundentabelle und "noch zu erstellen" im Kriterientext zulassen. Das ändert nur das Messgerät, nicht Pult. Die Kriterien hat noch keine Lehrkraft gegengelesen.
3. **Messung mit einem Sprachmodell als Prüfer** für belastbare Zahlen in `evals/BASELINE.md` (kostet geschätzt unter 5 US-$, nur nach Freigabe).
4. **Testsatz für `praesentation` anlegen**, `.pptx` in PowerPoint ansehen (nur die Lehrkraft kann das).
5. Danach die Reihenfolge aus der Übergabe (Issue #38): Erklärstück (#14), interaktive Übung, Bilder im Material (#22), Formeln in Word (#21), volle Messtabelle und Sperrliste (#16).

## So arbeiten wir

- Messen kostet Geld: Jev etwa einen Cent je Lauf, ein Sprachmodell als Prüfer deutlich mehr. Immer mit `--limit`.
- Schlüssel (`PULT_EVAL_API_KEY`, `TYPESAFE_API_KEY`) liegen als Umgebungsvariablen des Benutzers, nie im Repo oder im Chat.
- Ein Thema pro Commit, ein Branch und PR je Thema. Gemergt wird nur nach Prüfung durch die Lehrkraft.
