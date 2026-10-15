# 011: Formeln im PDF mit MathJax

Stand: 2026-10-08 · Issue #20 · Recherche: `docs/recherche/mathe-formeln.md`

## Entscheidung

Schreibt das Modell eine Formel in LaTeX-Schreibweise, setzt Pult sie im PDF als Vektorzeichnung: Bruchstrich, Wurzel mit Dach, hoch und tief gestellt. Das gilt für alles, was durch die gemeinsame Zeichenschicht `src/core/material/layout.ts` läuft (Arbeitsblatt, Klausur, Erwartungshorizont, Lernsituation, Stundenverlauf).

- **Setzen:** `mathjax-full` 3.2.2 (Apache-2.0) wandelt LaTeX in SVG, `svg-to-pdfkit` 0.1.8 (MIT) zeichnet das SVG in das pdfkit-Dokument. Beide laufen in Node, ohne Browser, ohne Zusatzprogramm, ohne native Module. Das erfüllt "Alles in der App" (`002`) und läuft auf Windows und macOS genauso wie auf Linux.
- **Erkennung im Text:** `\( … \)` und `$ … $` im Satz, `\[ … \]` und `$$ … $$` abgesetzt. Für `$` gilt die Regel von Pandoc (nach dem öffnenden kein Leerzeichen, vor dem schließenden kein Leerzeichen, nach dem schließenden keine Ziffer), dazu: nicht direkt hinter einem Buchstaben oder einer Ziffer, nicht über einen Zeilenumbruch, und ein `$` in der Mitte, das nicht schließen kann, hebt die Formel auf. So bleiben Geldbeträge und Excel-Bezüge (`=SUMME($A$1:$A$5)`, wichtig für Informationswirtschaft) Text. Die Anleitungen sagen dem Modell trotzdem, dass es `\( \)` benutzen soll.
- **Das Programm setzt, nicht das Modell.** Die Anleitungen nennen nur die Schreibweise.
- **Texte ohne Formel bleiben Bit für Bit gleich.** Geprüft mit sechs Dokumenten (Arbeitsblatt mit allen Aufgabenarten, Lehrerexemplar, Klausur, Erwartungshorizont, Lernsituation, Stundenverlauf), die `$` als Währung und als Excel-Bezug enthalten: Vorher und nachher stimmen die PDF-Dateien überein (bis auf Erstellzeit und Kennung).

## Wie gesetzt wird

- **Im Satz:** Die Formel sitzt auf der Grundlinie des Textes. Die Zeile wird höher, wenn die Formel höher ist (`src/core/material/formel-satz.ts`, eigener Zeilenumbruch, weil pdfkit Text und SVG getrennt zeichnet). Ein Satzzeichen direkt hinter der Formel bleibt an ihr.
- **Formelgröße:** 106 % der Schriftgröße, weil die Mathe-Schrift eine kleinere x-Höhe hat als Source Sans. Brüche im Satz sind wie im Schulbuch klein (Textstil).
- **Zu breit:** erst verkleinern bis 70 % (darunter ist es schlecht lesbar), dann an Operatoren außerhalb von Klammern umbrechen (`=`, `+`, `−`, `\pm`, `\cdot` …), und nur wenn auch das nicht reicht, den Rohtext zeigen. Eine zu breite Formel im Satz wird abgesetzt.
- **Text in Formeln** (`\text{für } x > 0`): wird in der Textschrift des Blattes gesetzt, nicht in der Mathe-Schrift. So haben Umlaute, ß und € keine Lücken. MathJax misst diesen Text mit der echten Schrift (Eingriff am Adapter von MathJax).
- **Erlaubte Pakete:** `base`, `ams`, `boldsymbol`, `cancel`, `mathtools`, `upgreek`, `textmacros`. Bewusst nicht dabei: `color` (die Blätter sind grau), `html` (Verweise), `require`/`autoload` (lädt weitere Pakete nach), `newcommand`, `mhchem` (Nicht-Ziel), `noundefined` (ein unbekannter Befehl soll ein Fehler sein, nicht roter Text).
- **Fehlerfall:** Kaputtes LaTeX oder ein unbekannter Befehl bricht nichts ab. Im PDF steht der Rohtext, im Protokoll eine kurze Warnung ohne die Formel (Datenschutz).
- **Einzelner Rückwärtsschrägstrich in JSON:** `\frac` wird dort zu Seitenvorschub plus `rac`, `\times` zu Tabulator plus `imes`. Steht so ein Steuerzeichen vor einem Buchstaben in einer Formel, wird der Befehl wiederhergestellt. Nicht wiederherstellbar ist, was mit `\u` beginnt (`\underline`), weil es kein gültiger JSON-Text ist.

## Alternativen

- **KaTeX / Temml:** MIT, aber nur HTML und MathML, kein SVG. Für ein PDF ohne Browser umständlich.
- **LaTeX installieren:** Verstößt gegen "Alles in der App".
- **Browser im Hintergrund:** Verstößt gegen `002`, solange es keinen mitgelieferten gibt.
- **`@mathjax/src` 4.x:** neuere Linie, in der Probe nicht getestet. Wechsel später möglich, die Schnittstelle (`setzeFormel`) ist klein.

## Lizenzen (npm, 2026-10-08)

`mathjax-full` 3.2.2 Apache-2.0, `svg-to-pdfkit` 0.1.8 MIT. Neu im Produktivbaum außerdem: `speech-rule-engine` 4.1.4 (Apache-2.0), `mj-context-menu` 0.6.1 (Apache-2.0), `mhchemparser` 4.2.1 (Apache-2.0), `esm` 3.2.25 (MIT), `commander` 13.1.0 (MIT), `wicked-good-xpath` 1.3.0 (MIT), `@xmldom/xmldom` 0.9.10 (MIT). Kein AGPL, kein LGPL. Versionen exakt gepinnt.

## Größe

Im Ordner `node_modules` kommen rund **57 MB** dazu (davon `mathjax-full` 42 MB mit Bündeln für Browser und Quelltexten, die wir nicht laden). Zur Laufzeit werden **240 Dateien mit 2,3 MB** geladen (gemessen mit den Modulen, die Pult tatsächlich benutzt). Beim Verpacken der App (Phase 6) genügt dieser Teil. Zeit (gemessen auf Linux): Das Laden der Bibliotheken beim Start des Servers dauert rund 0,3 Sekunden, zehn Formeln werden in rund 70 Millisekunden gesetzt. Jede Formel wird nur einmal gesetzt und zwischengespeichert.

## Grenzen

- **Word:** als Bild, siehe `006-word-dateien.md` (Abschnitt Formeln).
- **Nicht geprüft:** Windows und macOS (nur Linux). Der Code benutzt nichts, was dort anders wäre.
- **Mathe-Schrift:** MathJax-TeX (Computer Modern ähnlich), nicht Source Sans. Das ist bei Formeln üblich und im Schulbuch so.
- **Nicht gebaut:** Funktionsgraphen, Rechnen und Prüfen, chemische Formeln.
