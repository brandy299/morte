# Recherche: Mathematik in Pult (Formeln und Rechenprüfung)

Stand: 2026-10-08 · Verfasser: Recherche-Agent · Auslöser: Eine Kollegin oder ein Kollege im Probelauf unterrichtet Mathematik (Antwort von Yannik vom 2026-10-08).

## Ausgangslage im Code

- Pult kennt keine Formelschreibweise. Im ganzen Quelltext gibt es keine Stelle, die LaTeX erkennt oder setzt (Suche nach `latex`, `katex`, `mathjax`, `formula`).
- Schreibt ein Modell `\frac{a}{b}` oder `x_1`, steht das **wörtlich** im PDF.
- Das druckbare Layout (`src/core/material/layout.ts`) setzt Text mit Fraunces und Source Sans 3. Brüche übereinander, Wurzelzeichen mit Dach, Summen mit Grenzen und tiefgestellte Buchstaben (`ₙ`, `ᵢ`) fehlen in diesen Schriften. Ein Probeblatt (`mathe.pdf`, nicht im Repo) zeigte Brüche nur als `a/b` und manche Tiefstellungen als `?`.
- Für Mathematik reicht das nicht. Eine Mathelehrkraft gibt kein Blatt aus, auf dem Brüche und Wurzeln nicht wie im Schulbuch aussehen.

## Teil 1: Formeln setzen

### Geprüfte Lizenzen (npm, 2026-10-08)

| Baustein | Lizenz | Urteil |
|---|---|---|
| `mathjax-full` 3.2.2 | Apache-2.0 | **Ja.** Läuft in Node, kein Browser, Ausgabe als SVG |
| `@mathjax/src` 4.1.3 | Apache-2.0 | möglich (neuere Linie), nicht getestet |
| `katex` 0.19.0 | MIT | möglich, aber nur HTML/MathML, kein SVG. Für PDF umständlich |
| `temml` 0.14.0 | MIT | MathML, wie KaTeX |
| `svg-to-pdfkit` 0.1.8 | MIT | **Ja.** Zeichnet SVG als Vektor in ein pdfkit-Dokument |
| `docx` 9.9.0 | MIT | **Ja.** Ist schon eingebunden. Hat eigene Formelklassen (siehe unten) |

### Probe: LaTeX → MathJax → SVG → PDF, ohne Browser

Wegwerf-Programm im Arbeitsordner (`formel.cjs`, nicht im Repo). Ablauf: MathJax mit Paketen `AllPackages` und SVG-Ausgabe (`fontCache: "none"`, jede Formel in sich geschlossen) erzeugt ein SVG, `currentColor` wird durch Schwarz ersetzt, Breite und Höhe kommen aus den `ex`-Angaben, `svg-to-pdfkit` zeichnet es ins PDF.

**Belegt:**
- Sieben Formeln (Bruch, Wurzel, Summe mit Grenzen, Integral, Matrix, Betragsstriche, Gleichungssystem) sehen im PDF aus wie im Schulbuch. Vektor, in Graustufen gut lesbar.
- Rechenzeit: **98 ms für alle sieben** zusammen, ohne Browser, ohne Zusatzprogramm. Das erfüllt "Alles in der App".
- Der MathJax-Code besteht aus rund 286 Dateien und 2,4 MB (unminimiert) im Paketordner. Gebündelt wäre es kleiner, **nicht gemessen**.

**Fehler in der Probe (müssen in der Umsetzung gelöst werden):**
1. **Eine breite Formel lief über den Rand.** Die Umsetzung muss die Breite messen und die Formel auf die Spaltenbreite verkleinern (mit Untergrenze), danach umbrechen oder melden.
2. **Umlaute in `\text{…}`** (z. B. `\text{für } x > 0`) wurden mit Lücken gesetzt. Vermutlich fehlen die Zeichen in der MathJax-Schrift. Nötig: Text in `\text{}` außerhalb der Formel setzen oder die Pult-Schrift verwenden.

**Nicht geprüft:**
- **Formeln mitten im Fließtext** (inline), also Grundlinie, Zeilenhöhe und Umbruch neben normalem Text im Layout von `layout.ts`. Das ist der schwierigste Teil, weil pdfkit Text und SVG getrennt zeichnet.
- Windows und macOS (nur Linux getestet).
- Größe der gebündelten App.
- Verhalten bei fehlerhaftem LaTeX eines schwachen Modells. MathJax meldet Fehler im Ergebnis, ob das reicht, ist offen. Erwartung: Pult muss die Formel erkennen, die Fehlermeldung abfangen und den Rohtext zeigen statt abzubrechen.

### Word

Die Bibliothek `docx` hat **echte Word-Formelklassen**: `Math`, `MathFraction`, `MathRadical`, `MathSum`, `MathIntegral`, `MathSubScript`, `MathSuperScript`, `MathSubSuperScript`, `MathRoundBrackets`, `MathSquareBrackets`, `MathCurlyBrackets`, `MathLimit` u. a.

**Belegt:** Eine Probe-Datei mit Bruch, Wurzel und Hochzahlen enthält im XML `m:oMath`, `m:f` (Bruch), `m:rad` (Wurzel), `m:sSup`-artige Strukturen. Das ist das Format, das Word als bearbeitbare Formel anzeigt.

**Nicht belegt:** Wie die Formeln in Word aussehen. In dieser Umgebung fehlt LibreOffice Writer (`soffice` lädt nicht einmal eine leere Datei), und Word steht nicht zur Verfügung. Das muss die Lehrkraft oder Yannik öffnen.

**Offen für die Umsetzung:** Es gibt keinen Weg von LaTeX zu diesen Klassen. `mathml-to-omml` steht nicht auf npm. Zwei Wege:
- (A) kleiner eigener Umsetzer von LaTeX auf die `docx`-Klassen, nur für die Schulmathematik (Brüche, Potenzen, Indizes, Wurzeln, Summen, Integrale, Klammern, griechische Buchstaben). Bearbeitbar in Word, aber Aufwand und Lücken.
- (B) die Formel als Bild (PNG aus dem SVG) in die Word-Datei setzen. Sieht richtig aus, ist in Word aber nicht bearbeitbar.
Empfehlung für die erste Fassung: **B**, weil Aufwand und Risiko gering sind. A erst, wenn Lehrkräfte Formeln in Word nachbearbeiten wollen. Das ist eine Entscheidung für Yannik (siehe Issue).

## Teil 2: Richtig rechnen (Rechenprüfung)

Das Modell rechnet unzuverlässig, besonders günstige Modelle. In Pult rechnet das Modell schon heute nie die Punkte und Notengrenzen (`src/core/workspace/bewertung.ts`, "the model never calculates"). Für Mathematik ist das Problem größer: Lösungen und Musterlösungen müssen stimmen.

**Idee:** Das Modell schreibt Aufgabe und Lösungsweg. Pult prüft das Ergebnis mit einem Rechenprogramm (SymPy) und markiert Abweichungen, bevor das Blatt fertig ist.

**Belegt** (`docs/recherche-werkzeuge-bewertung.md`): Pyodide (MPL-2.0, npm `pyodide`) läuft in Node **ohne installiertes Python**, SymPy ist darin enthalten. Rund 19 MB, etwa 2 Sekunden Start.

**Nicht geprüft:**
- Pyodide **ohne Internet** (alle Pakete mitliefern statt beim ersten Start zu laden).
- Windows und macOS, Electron (Phase 6).
- MPL-2.0 ist mit Apache-2.0 vereinbar, solange Pyodide als Paket mitgeliefert und nicht verändert wird. Das gehört in die Entscheidungsdatei, wenn es gebaut wird.
- Wie ein **eigenes Werkzeug** für den Agenten aussehen soll: Eingabe wäre ein Ausdruck und eine Behauptung (z. B. "ist `x^2-1 = (x-1)(x+1)`?"), nicht freier Python-Code. Passt zu "feste, lehrerspezifische Werkzeuge, keine freie Shell".

**Was ohne Pyodide schon geht:** Die Lösung zweimal vom Modell rechnen lassen und vergleichen ist teurer und nicht verlässlicher. Eine Prüfung nur auf Zahlenwerte (Auswertung in JavaScript) deckt viele Schulaufgaben ab (Gleichung einsetzen, Term vergleichen), ist aber kein Ersatz für Umformungen. Das wäre ein kleinerer erster Schritt ohne 19 MB. **Ungeprüft, ob das reicht.**

## Teil 3: Anleitungen und Prüfläufe für Mathematik

- Es gibt keine mitgelieferte Anleitung (`skills/`) mit Mathe-Besonderheiten: Lösung mit Rechenweg, Erwartungshorizont mit Teilpunkten, Anforderungsbereiche, Schaubilder (Funktionsgraphen, Wertetabellen, Koordinatensystem).
- Funktionsgraphen sind Schaubilder: Pult hat einen Schaubild-Baustein, ob er Achsen, Gitter und Funktionskurven kann, ist **nicht geprüft**.
- Prüfläufe (`evals/`) für Mathe gibt es nicht. Maßstab dafür muss eine Mathelehrkraft liefern (Yannik oder die Kollegin).

## Reihenfolge, die ich empfehle

1. **Formeln setzen im PDF** (Teil 1, Umsetzung mit den zwei bekannten Fehlern). Ohne das ist Mathe nicht nutzbar.
2. **Formeln im Word** als Bild (B).
3. **Mathe-Anleitung und Prüfläufe**, mit Kriterien, die die Kollegin oder Yannik festlegt.
4. **Rechenprüfung**, erst nach einem Test mit echten Mathe-Aufgaben, ob eine Auswertung ohne Pyodide reicht.

## Offen

1. Wie die Formeln in Word wirklich aussehen (muss geöffnet werden).
2. Inline-Formeln im Fließtext des PDFs.
3. Welche Mathe-Themen die Kollegin unterrichtet (Schulform, Jahrgang). Das bestimmt, ob Funktionsgraphen, Geometrie oder Stochastik zuerst gebraucht werden.
4. Ob die Rechenprüfung ohne Pyodide auskommt.
