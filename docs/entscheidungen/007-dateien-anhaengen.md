# 007: Dateien im Chat anhängen

Stand: 2026-10-06

## Entscheidung

Lehrkräfte können Dateien wie in der Claude-App anhängen: mehrere auf einmal, per Ziehen ins Fenster, Einfügen oder Knopf. Pult liest den Text selbst aus der Datei (`src/core/anhang/extract.ts`) und schickt ihn in einem markierten Block `<datei name="…">` zur Frage. Das Modell braucht dafür keine Datei-Funktion des Anbieters, es bleibt austauschbar.

Das gleiche Lesen nutzt auch das Werkzeug, das Material aus einer Reihe liest.

## Formate

PDF, Word (docx), OpenOffice (odt, ods, odp), Excel (xlsx, xlsm, xlsb, xls), PowerPoint (pptx), csv, tsv, Text, Markdown, HTML, RTF. Die alten Formate `.doc` und `.ppt` lesen wir nicht. Die App sagt in einfacher Sprache, dass die Datei als `.docx`, `.pptx` oder PDF gespeichert werden soll.

PDFs ohne Textschicht (Scans) werden als Bilder der ersten vier Seiten an das Modell gegeben, wenn es Bilder versteht.

## Grenzen

- 25 MB je Datei, höchstens fünf Dateien je Nachricht, je Datei etwa 15 000 Zeichen, zusammen 80 000. Gekürzt wird sichtbar ("gekürzt" am Anhang, Hinweis im Text).
- Tabellen: die ersten drei Blätter, 200 Zeilen, 30 Spalten.
- Gepackte Dateien (docx, odt, pptx) werden mit Größenwächter entpackt, damit eine präparierte Datei den Speicher nicht füllt.
- Der Inhalt einer Datei ist Material, keine Anweisung: Der Systemtext sagt dem Modell das, Namen werden vor dem Einbau bereinigt.
- Nur der Dateiname bleibt im gespeicherten Gespräch, nicht der Inhalt.
- Hinweis an der Eingabe: keine Schülernamen, keine Klassenarbeiten mit Namen. Bilder und Dateien gehen an den KI-Anbieter.

## Neue Bausteine

- `fflate` (MIT): entpackt odt, odp, pptx. Klein, ohne eigene Abhängigkeiten, reines JavaScript.
- `xlsx` / SheetJS 0.20.3 (Apache-2.0): liest xlsx, xls, xlsb, ods. Der Anbieter veröffentlicht neue Versionen nicht mehr auf npm, deshalb steht in `package.json` die Adresse des Pakets bei `cdn.sheetjs.com`. Die Version ist fest. `npm ci` muss diese Adresse erreichen (auch in der CI). Falls das einmal nicht mehr geht, kann das Paket in den Projektordner gelegt werden.

Beides läuft in der App, niemand muss etwas dazu installieren.

## Nicht getestet

- Passwortgeschützte Dateien: die App meldet nur, dass sie sich nicht öffnen lassen.
- Echte, große Dateien aus dem Schulalltag (zum Beispiel Notenlisten mit Formeln und mehreren Blättern).
