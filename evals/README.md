# Qualitätsprüfung der Anleitungen

Hier steht, woran wir erkennen, ob die mitgelieferten Anleitungen (Skills) gutes Material erzeugen. Die Prüfung läuft bei jeder Änderung an einer Anleitung und bei jedem Modellwechsel. So fällt auf, wenn etwas schlechter wird.

Die Form (eine Kriterienliste mit „bestanden oder nicht“ pro Kriterium, ein Modell als Prüfer) stammt aus den Prüfungen von [anthropics/k12-teacher-skills](https://github.com/anthropics/k12-teacher-skills) (Apache-2.0). Die Kriterien selbst sind für dieses Projekt neu geschrieben: auf Deutsch, für das Berufskolleg und mit unseren Regeln (kurzes Material, keine erfundenen Fundstellen, einfache Sprache).

## Aufbau

```
evals/
  gemeinsam.csv                 Kriterien für alle Anleitungen
  <anleitung>/kriterien.csv     Kriterien nur für diese Anleitung
  <anleitung>/testsaetze.json   Die Anfragen, mit denen geprüft wird
  ergebnisse/                   Ergebnisse jedes Laufs (nicht im Repo)
```

Eine Kriterienzeile hat: `ID`, `Gruppe`, `Kriterium`, `Bestanden wenn`, `Hinweis`, `Bedingung`, `Prüfart`.

- **Gruppen:** P Pädagogik, R Anspruch, O Form, M Gespräch.
- **Prüfart `Programm`:** Das Programm entscheidet, zum Beispiel Seitenzahl, Eintrag in der Stundentabelle, keine Technik in den Antworten. Das ist billig und immer gleich. Jede Programmprüfung hat ihre Kennung in `src/core/eval/checks.ts`.
- **Prüfart `Prüfer`:** Ein stärkeres Modell liest das Gespräch, das Material und die Stundentabelle und gibt pro Kriterium bestanden oder nicht bestanden mit einer Begründung in einem Satz. Gespräch-Kriterien (M) beurteilt es am Gespräch, alle anderen am Material.
- **Bedingung:** Gilt ein Kriterium für einen Fall nicht (zum Beispiel „es gibt Auswahlfragen“), zählt es nicht, es fällt nicht durch.

Ein Testsatz hat `id`, `nachrichten` (was die Lehrkraft nacheinander schreibt, spätere Nachrichten antworten auf Rückfragen) und `erwartet` (was das Programm erwarten darf: Material, Seitenzahl, Termin, nur lesen, Zahl der Fassungen, Vorschlag zuerst). Zu jeder Anleitung gehören mindestens zwei Testsätze: eine vollständige Anfrage und eine knappe, bei der der Assistent nachfragen muss.

## Wie ein Lauf abläuft

1. Für jeden Testsatz entsteht ein frischer, erfundener Arbeitsordner: eine Klasse „11a“ (Berufskolleg, Business English), eine Reihe „Bewerbung“ mit vier geplanten Stunden, ein Stand und Bewertungsregeln. Keine echten Personen, keine echte Schule.
2. Die Nachrichten gehen an den Assistenten, jede Rückfrage „Darf ich …?“ wird mit Ja beantwortet.
3. Gesammelt wird, was gesagt wurde, welche Schritte liefen, welche Dateien entstanden (als Text) und wie die Stundentabelle am Ende aussieht.
4. Das Programm prüft seine Kriterien, der Prüfer die übrigen.
5. Der Bericht zeigt pro Kriterium, wie oft es bestanden wurde, und nennt die Gründe der Fehlschläge.

## Aufrufen

```
MORTE_EVAL_API_KEY=… npm run eval -- \
  --modell openrouter/anthropic/claude-haiku-4.5 \
  --pruefer openrouter/anthropic/claude-sonnet-4.5
```

- `--skill arbeitsblatt,klausur` prüft nur diese Anleitungen.
- `--wdh 3` spielt jeden Testsatz dreimal, weil Modelle jedes Mal anders antworten.
- `--ohne-pruefer` lässt nur die Programmprüfungen laufen (wenige Cent).
- `--limit 3` bricht ab, wenn die Kosten drei US-Dollar überschreiten.
- Den Schlüssel immer als Umgebungsvariable setzen, nie in den Befehl oder in eine Datei im Repo schreiben. Anbieter und Modell sind frei wählbar, auch eine andere Firma für den Prüfer (`MORTE_EVAL_PRUEFER_KEY`).

## Grenzen

- Ein Modell als Prüfer irrt sich. Die Kriterien sind ein Messgerät, kein Urteil. Fachlich neu geschriebene Kriterien müssen mit echten Lehrkräften nachgeschärft werden.
- Der Prüfer sieht den Text der PDFs, nicht das Aussehen. Das Aussehen (Graustufen, Kopf, Schrift) ist fest im Programm und wird dort getestet.
- Wenige Testsätze zeigen Richtungen, keine Statistik. Für belastbare Zahlen mehrfach spielen (`--wdh`).
- Die Ergebnisse hängen am Modell. Nach einem Modellwechsel neu laufen lassen und die Bestehensquoten vergleichen.
