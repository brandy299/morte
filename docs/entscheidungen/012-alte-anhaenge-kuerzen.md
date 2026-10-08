# 012: Alte Anhänge verlassen das Gedächtnis des Modells

Stand: 2026-10-08 · Issue #13 · Recherche: `docs/recherche-harnesse.md` (goose, OpenCode, DeepSeek Harness)

## Entscheidung

Was eine Lehrkraft anhängt, bleibt nicht für immer im Gedächtnis des Modells. Bilder und der Text von Dateien aus älteren Runden werden durch einen kurzen Hinweis ersetzt, zum Beispiel `[Anhang: arbeitsblatt.docx, nicht mehr im Gedächtnis]` oder `[3 Bilder, nicht mehr im Gedächtnis]`. Die Frage der Lehrkraft und die Antworten des Assistenten bleiben wörtlich.

- **Nur das Gedächtnis des Modells ändert sich.** Was die Lehrkraft im Gespräch sieht (Text, Dateinamen, Bildanzahl, Schritte, Material), bleibt unverändert, weil es in der Anzeige des Servers liegt und nicht im Gedächtnis des Modells.
- **Wann:** Sobald das Gedächtnis zu mehr als der Hälfte voll ist (`PRUNE_AT = 0.5` in `src/core/agent/prune.ts`), und nur beim Absenden einer Nachricht. Das kommt vor dem Zusammenfassen (ab 80 Prozent, `COMPACT_AT`), weil es nichts kostet und nichts erfindet.
- **Was bleibt wörtlich:** die Nachricht, die gerade gesendet wird, und die **letzte abgeschlossene Runde**. Wer eine Datei anhängt, fragt oft in der nächsten Nachricht noch etwas dazu. Erst eine Runde später (Runde n+2) ist der Anhang aus Runde n weg.
- **Wiederöffnen:** Das Gedächtnis wird mit den Hinweisen gespeichert (`history()`), `restore()` liest sie zurück. Die Anzeige bleibt vollständig.
- **Der Assistent weiß, was ein Hinweis bedeutet.** Die Anweisungen sagen: Steht statt des Inhalts ein Hinweis, nicht raten, sondern die Lehrkraft in einem Satz bitten, die Datei oder das Bild noch einmal anzuhängen. Mit einem echten Modell geprüft (siehe unten).
- **Zu große Nachricht:** Passt eine Nachricht allein nicht in das Gedächtnis des Modells (Anweisungen und Werkzeugbeschreibungen, Platz für die Antwort und die Nachricht selbst), wird sie mit einer deutschen Meldung abgelehnt, bevor der Anbieter einen Fehler schickt. Passt sie nur nicht zu den alten Runden, wird vorher zusammengefasst, auch unterhalb von 80 Prozent.

## Messung (DeepSeek V4.1 Flash über OpenRouter, Gedächtnis auf 32.000 Tokens gestellt)

Beispielunterhaltung in vier Runden: zwei erfundene Dateien (zusammen etwa 35.000 Zeichen) in Runde 1, dann drei Folgefragen. Gesendete Eingabe-Tokens, über alle Runden zusammen: **vorher 76.289, nachher 55.639** (minus 27 Prozent). Gedächtnis vor der dritten Frage: **19.278 statt 8.872 Tokens**. In Runde 4 fragt die Lehrkraft nach einer Stelle aus der Datei: Vorher antwortet das Modell aus dem alten Text, nachher sagt es, dass die Datei nicht mehr im Gedächtnis ist, und bittet darum, sie noch einmal anzuhängen.

**Die Kosten sinken nur wenig** (0,0068 statt 0,0065 US-Dollar für vier Runden), weil der Zwischenspeicher des Anbieters den alten Text schon billig machte und das Kürzen den Zwischenspeicher einmal ungültig macht. Der Gewinn liegt im Platz: Mehr Runden passen in das Gedächtnis, ohne dass zusammengefasst werden muss, und bei kleinen Gedächtnissen (eigener Server mit 32.000 Tokens) kommt weniger oft der Fehler "zu lang".

## Alternativen und Grenzen

- **Datei vorher in zwei, drei Sätzen festhalten:** mehr Aufwand, mehr Verlust bei Fehlern. Erst Hinweis, dann messen (so auch im Issue empfohlen).
- **Wie viele Runden bleiben wörtlich:** Eine, plus die neue Nachricht. Der Wert stammt aus der Annahme, dass Rückfragen zu einer Datei in der nächsten Nachricht kommen. Er ist nicht an einem Probelauf mit Lehrkräften gemessen.
- **Werkzeug-Ergebnisse kürzen:** nicht gebaut (Nicht-Ziel im Issue).
- **Schätzung:** Die Größe wird mit vier Zeichen je Token geschätzt (wie bisher bei der Zusammenfassung). Deutscher Text braucht eher etwas mehr Tokens. Eine Nachricht knapp unter der Grenze kann den Anbieter trotzdem erreichen. Dann greift wie bisher das einmalige Kürzen und Wiederholen.
- **Die Anweisungen und Werkzeugbeschreibungen allein sind gemessen etwa 8.400 Tokens groß** (bei jeder Anfrage). Auf einem Server mit 32.000 Tokens bleiben also rund 20.000 für Gespräch, Antwort und Anhänge. Das ist der Grund, warum große Anhänge dort abgelehnt werden.
- Ist das Gedächtnis kleiner als die Anweisungen allein, kann die Prüfung nichts sagen und lässt die Anfrage durch. Eine solche Einstellung ist ohnehin unbrauchbar (heute zulässig ab 2.000 Tokens, siehe `src/core/agent/custom.ts`).
