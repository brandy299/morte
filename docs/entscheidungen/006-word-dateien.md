# 006: Word-Dateien lesen und schreiben

Stand: 2026-10-06

## Entscheidung

- Material gibt es auf Wunsch zusätzlich als Word-Datei (.docx) zum Bearbeiten. Das PDF bleibt der Standard und die Vorschau. Die Werkzeuge `arbeitsblatt_erstellen`, `klausur_erstellen`, `stundenverlauf_erstellen` und `lernsituation_erstellen` haben dafür den Schalter `word`. Das Lösungsblatt und der Erwartungshorizont kommen ebenfalls als Word-Datei.
- Word-Dateien in einer Reihe kann der Assistent lesen (`material_lesen`), damit er darauf aufbauen kann, zum Beispiel beim Differenzieren oder Vorbereiten.
- Bibliotheken, beide reines JavaScript, ohne Zusatzprogramm (Entscheidung 002):
  - `docx` (MIT) zum Schreiben.
  - `mammoth` (BSD-2-Clause) zum Lesen.
- Inhalt und Prüfungen stammen aus derselben Stelle wie bei den PDFs (Punkte, Notengrenzen und Verteilung rechnet das Programm, nicht das Modell). Nur das Aussehen ist getrennt: `src/core/material/word.ts` (Bausteine) und `word-render.ts` (die fünf Dokumente).
- Das Aussehen: nur Grau, Schriften, die jedes Word hat (Georgia für Überschriften, Calibri für Text), nichts wird eingebettet. Es ist nicht pixelgleich mit dem PDF, dafür in Word bearbeitbar: Tabellen, Schreibzeilen und Kästen sind echte Word-Elemente.

## Gründe

- Lehrkräfte wollen Material anpassen und weitergeben. Ein PDF lässt sich dafür nicht gut bearbeiten.
- Die in der Recherche genannten Python-Werkzeuge (python-docx, docling, markitdown) hätten eine Python-Installation verlangt.
- Pandoc (GPL) und PyMuPDF (AGPL) scheiden wegen der Lizenz aus.

## Grenzen und Hinweise

- Gelesen wird nur Text. Bilder, Formatierung und Kommentare einer Word-Datei kennt der Assistent nicht.
- Geprüft wurde das Aussehen mit LibreOffice. In Microsoft Word selbst wurde es nicht geöffnet.
- `npm audit` meldet für `mammoth` eine Warnung der Stufe "mittel" in einer Unterbibliothek (`sprintf-js` über `argparse`, Überlastung durch eine extrem lange Formatangabe). Betroffen ist die Kommandozeile von `argparse`, die morte nicht benutzt. Die vorgeschlagene Behebung würde `mammoth` auf eine alte Version zurücksetzen und wird nicht übernommen. Bei einem Update von `mammoth` neu prüfen.
- Pro Reihe liegen Word- und PDF-Fassung nebeneinander. Wird eine Word-Datei geändert, ändert sich das PDF nicht mit.
