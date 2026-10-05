# Entscheidung 004: Lehrpläne lesen und nutzen

Datum: 2026-10-05 · Status: angenommen (Yannik hat freie Hand gegeben, Einspruch jederzeit möglich)

## Frage

Material soll zum Lehrplan passen. Wie kommen Bildungspläne und Kernlehrpläne (meist PDF) in `Lehrpläne/<Name>/Plan.md`, und wie liest der Agent sie, ohne dass 100 Seiten jedes Gespräch füllen?

## Entscheidung

- **Bibliotheken:** `pdfjs-dist` (Mozilla, Apache-2.0) liest die PDFs, `@napi-rs/canvas` (MIT, kommt fertig gebaut mit dem npm-Paket) zeichnet Seiten ohne Text als Bild. Beide laufen in der App, nichts wird installiert (Entscheidung 002). Das Python-Werkzeug aus `anthropics/skills` und Tesseract scheiden aus (Lizenz, Zusatzinstallation).
- **Text zuerst, Modell formt:** Der Text kommt aus der Textebene des PDFs, nicht aus einer Bilderkennung. Kopf- und Fußzeilen, die auf vielen Seiten wiederkehren, werden entfernt. Spalten von Tabellen bleiben als Tabulatoren erhalten. Das gewählte Modell macht daraus Markdown (Überschriften, Listen, Tabellen) und ändert keine Worte.
- **Nichts geht verloren:** Nach jedem Abschnitt wird gezählt, wie viele der längeren Wörter aus dem PDF in der Antwort stehen (Schwelle 90 Prozent). Fällt ein Abschnitt darunter oder schlägt die Anfrage fehl, wird der Text unverändert übernommen (einfaches Markdown ohne Modell) und die Lehrkraft bekommt einen Hinweis. Das Modell kann also nichts weglassen oder erfinden, ohne dass es auffällt.
- **Scans:** Seiten ohne Textebene werden als Bild an das Modell geschickt (Vision ist ohnehin Pflicht). Unleserliches steht als `[unleserlich]` im Plan und löst einen Hinweis aus.
- **Kosten sichtbar:** Vor dem Umwandeln steht Seitenzahl, grobe Dauer und geschätzter Preis (Katalogpreis des Modells). Dazu der Hinweis, dass der Planinhalt an den KI-Anbieter geht. Der Verbrauch zählt in die Monatssumme.
- **Nichts wird überschrieben ohne Rückfrage.** Ein vorhandener Plan wird nur auf ausdrücklichen Wunsch ersetzt.
- **Lesen in Stufen:** Der Agent bekommt `lehrplan_lesen` (erst die Gliederung mit Größen, dann einen Abschnitt, lange Abschnitte in Stücken) und `lehrplan_suchen` (Stichworte, mit Fundstelle). Der Plan wird nie ganz in den Kontext geladen. Fehlt ein Plan, sagt das Werkzeug es offen, und der Agent erfindet nichts (Regel in `docs/skills.md`, Punkt 6).

## Folgen

- Die Qualität der Gliederung hängt vom Modell ab. Die Prüfung stellt nur sicher, dass der Wortlaut vollständig bleibt, nicht dass die Überschriften schön sind.
- Textdateien (`.md`, `.txt`) werden ohne Modell übernommen.
- Sehr lange Scans (über 40 Seiten ohne Text) lehnt die App ab und bittet, das PDF zu teilen.
- Nicht gebaut: Tabellen, die als Bild in der PDF stehen, und eine Bearbeitungsansicht für `Plan.md` in der Oberfläche. Die Datei bleibt aber lesbar und von Hand änderbar.
