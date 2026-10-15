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
- `npm audit` meldet für `mammoth` eine Warnung der Stufe "mittel" in einer Unterbibliothek (`sprintf-js` über `argparse`, Überlastung durch eine extrem lange Formatangabe). Betroffen ist die Kommandozeile von `argparse`, die Pult nicht benutzt. Die vorgeschlagene Behebung würde `mammoth` auf eine alte Version zurücksetzen und wird nicht übernommen. Bei einem Update von `mammoth` neu prüfen.
- Pro Reihe liegen Word- und PDF-Fassung nebeneinander. Wird eine Word-Datei geändert, ändert sich das PDF nicht mit.

## Formeln in Word (Issue #21, 2026-10-15)

- **Bild statt bearbeitbarer Word-Formel.** Jede Formel steht als PNG im Text. Sie sieht in jedem Word gleich aus. Nachteil: Die Lehrkraft kann sie in Word nicht anklicken und ändern. Die Bibliothek `docx` kennt zwar Formelklassen (`MathFraction` …), aber es gibt keinen Weg von LaTeX dorthin. Der zweite Weg (bearbeitbar) bleibt ein eigenes Issue und ist ohne Datenverlust nachrüstbar, weil nur die Ausgabe betroffen ist.
- **Dieselbe Setzung wie im PDF** (`011`): `setzeFormel` liefert das SVG, `formelAlsPng` in `schaubild-zeichnen.ts` zeichnet es mit `@napi-rs/canvas` (schon eingebunden, es zeichnet auch die Schaubilder). **Keine neue Abhängigkeit**, also keine neue Lizenz und kein neues Gewicht. Klein bis mittel statt neues Paket: SVG direkt in Word ist nicht nötig, ältere Fassungen zeigen es nicht.
- **Schärfe:** 600 dpi (Faktor 600/72 pro Punkt), Hintergrund durchsichtig, damit die Formel auch auf grauen Kästen sitzt. Ein Test prüft mindestens 300 dpi.
- **Im Satz** sitzt das Bild auf der Textlinie: um die Tiefe der Formel nach unten versetzt (`w:position`, halbe Punkte). **Abgesetzt** (`\[ \]`, `$$ $$`, oder zu breit für die Zeile) steht es in einem eigenen, zentrierten Absatz. Zu breite Formeln werden wie im PDF verkleinert (bis 70 %) und an Operatoren umbrochen.
- **Alternativtext:** der LaTeX-Text der Formel (Barrierefreiheit, und die Lehrkraft sieht, was dort stehen sollte).
- **Fehler:** Kaputtes LaTeX bricht nichts ab, der Rohtext bleibt stehen, im Protokoll steht eine kurze Warnung ohne die Formel.
- **Überall, wo Text steht:** Absatz, Kasten, Aufgabe, Tipp, Lösung, Tabellenzelle. Das gilt damit für Arbeitsblatt samt Lösung, Klausur, Erwartungshorizont, Lernsituation und Stundenverlauf (`word.ts`, `absaetze`).
- **Ohne Formel unverändert:** Die sechs Word-Dateien (Arbeitsblatt, Lösung, Klausur, Erwartungshorizont, Lernsituation, Verlauf) mit `$` als Währung und Excel-Bezug sind Byte für Byte gleich zu vorher (im `document.xml` verglichen).
- **Geprüft** mit LibreOffice (in PDF und Bild gewandelt, angesehen). **Nicht geprüft:** Microsoft Word selbst, Windows und macOS (die Bibliothek `@napi-rs/canvas` liefert fertige Dateien für beides, aber hier lief nur Linux).

