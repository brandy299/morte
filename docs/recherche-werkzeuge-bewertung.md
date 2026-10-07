# Bewertung der Werkzeug-Recherche für Pult

Stand: 2026-10-07 · Bewertet wird `WERKZEUG-RECHERCHE_3.md` (Stand 5. und 7. Oktober 2026, 11 Abschnitte, von Yannik eingebracht). Die Datei liegt nicht im Repo, weil sie für einen anderen Aufbau geschrieben ist (siehe unten). Hier steht, was davon für Pult taugt.

## Urteil in drei Sätzen

Die Recherche ist ordentlich gemacht: Zahlen und Lizenzen stimmen, wo ich sie nachgeprüft habe, und sie sagt ehrlich, wo es keine Lösung gibt (Handschrift, deutsche Lehrpläne). **Als Baustein-Liste für Pult ist sie aber zu großen Teilen nicht brauchbar**, denn sie geht von Python, einem Mac mini und der bestehenden Video-Pipeline aus. Pult ist Node, läuft auch unter Windows und darf nichts nachinstallieren lassen (Entscheidung 002). Wirklich neu und nützlich sind zwei Dinge: der Gedanke "prüfen statt behaupten" für Rechenaufgaben und die IQB-Vokabulare, beides mit Einschränkungen.

## Was ich nachgeprüft habe (2026-10-07)

| Aussage | Ergebnis |
|---|---|
| IQB-Vokabulare Mathe Sek I (v51), Sek II (v55), Primar (v10) antworten mit 200 | **Stimmt.** Lizenz CC0, je drei Konzepte: Anforderungsbereich I, II, III |
| Gleiche Bauart für Deutsch (v12, v34, v36), Chemie (v41), Biologie (v44), Physik (v47) | **Stimmt**, die Endpunkte `a1/index.json` antworten mit 200 |
| Gleiche Bauart für Fremdsprachen (v56 Sek I, v59 Sek II) | **Stimmt nicht**: beide antworten mit 404 (`a1` und Wurzel). Die Recherche hatte diese Zeilen als "nicht einzeln geprüft" markiert, das war berechtigt. Für Englisch und damit für Business English gibt es hier keine Anforderungsbereiche |
| Lizenzen der JavaScript-Gegenstücke | mathjs Apache-2.0, nerdamer Apache-2.0, algebrite MIT, docx MIT, mammoth BSD-2-Clause, pdfjs-dist Apache-2.0, tesseract.js Apache-2.0, `@motion-canvas/core` MIT, animejs MIT. Alle passen zu Apache-2.0 |
| Motion Canvas MIT | Stimmt |
| Lizenz von `learning-commons-org/evaluators` und `FWU-DE/lehrplan-ontologie` | **Nicht gefunden**: unter `main` oder `master` liegt keine `LICENSE`. Solange das offen ist, nur Ideen, kein Material übernehmen |

Nicht nachgeprüft: Sternezahlen, Push-Daten, Geschwindigkeitsmessungen auf dem Mac mini, die Lage bei Skillsquare und Formative.

## Was nicht zu Pult passt

| Baustein | Grund |
|---|---|
| docling, markitdown, marker, surya, SymPy, WeasyPrint, python-docx, Manim | Alles Python. Pult dürfte dafür nichts installieren lassen ("Alles in der App") |
| Manim | braucht zusätzlich LaTeX (100 MB bis 5,7 GB) |
| Apple Vision für OCR | nur macOS. Pult soll auch unter Windows laufen. Höchstens als schnellerer Weg dort, wo es ihn gibt |
| Pandoc (GPL), PyMuPDF, MinerU, khoj (AGPL), paperless-ngx | Lizenz. GPL und AGPL scheiden aus (Lizenzregel in `CLAUDE.md`) |
| Remotion, GSAP | keine freien Lizenzen (Remotion kostenpflichtig ab drei Mitarbeitern, GSAP mit Wettbewerbsklausel) |
| sqlite-vec, LanceDB, LightRAG, GraphRAG | Pult setzt auf "ein Agent, viele Ordner" (Lesereihenfolge `Klasse.md`, `Stand.md`, `Reihe.md`). Eine Vektorsuche ist erst nötig, wenn Lehrkräfte große Dokumentenmengen hinterlegen. Das steht nicht in der Roadmap |
| MCP-Server (Anki, Moodle, Google, Docling) | Pult gibt dem Agenten nur feste Werkzeuge, keine freien Erweiterungen |
| education-agent-skills | CC BY-SA 4.0 (schon in der ersten Recherche so festgehalten) |

## Was passt, wenn man es in Node umsetzt

### 1. Aufgaben nachrechnen (stärkster Gedanke)

Kein Sprachmodell rechnet zuverlässig. Pult macht das für Punktsummen und Notengrenzen schon selbst (Entscheidung 003). Für Mathematik wäre der nächste Schritt, Lösungen in Erwartungshorizonten maschinell zu prüfen, bevor sie ausgeliefert werden.

- Die Recherche nennt SymPy. In Pult wäre das ein JavaScript-Rechensystem. **Lizenzen sind geprüft** (mathjs, nerdamer Apache-2.0, algebrite MIT). **Offen und ungetestet:** ob sie Gleichungen lösen und ableiten können, und ob sich Zwischenschritte gewinnen lassen. Das müsste ein kleiner Versuch klären, bevor es in die Roadmap kommt.
- **Wer profitiert:** Mathematik und Naturwissenschaften. Die ersten Nutzerinnen und Nutzer von Pult unterrichten Business English am Berufskolleg. Deshalb **kein Vorrang**, aber ein Werkzeug `aufgabe_pruefen` passt sauber in die vorhandene Architektur.

### 2. IQB-Vokabulare als Vorschläge für Bereiche

Die Anforderungsbereiche sind maschinenlesbar und CC0. Das passt zu Entscheidung 003 ("Vorschläge zum Auswählen, nie als Standard"): Beim Anlegen der Bewertungsregeln könnte Pult anbieten, die Bereiche I bis III für Mathe, Deutsch oder die Naturwissenschaften zu übernehmen.

- **Einschränkung 1:** Für Fremdsprachen gibt es die Vokabulare nicht (404). Für Business English am Berufskolleg ebenso wenig.
- **Einschränkung 2:** Es sind die bundesweiten Standards. Welche Bereiche eine Schule in NRW wirklich nutzt, steht in ihren Vorgaben. Darum bleibt die Eingabe durch die Lehrkraft der Normalfall.
- **Einschränkung 3:** Ein Abruf zur Laufzeit würde Pult ans Netz binden. Besser wären die paar Konzepte als kleine Datei in der App.
- **Nutzen:** gering bis mittel. Spart den Lehrkräften das Eintippen von drei Zeilen. Kein Vorrang.

### 3. Dateien einlesen (Phase 3: "Bildungsplan-Import", "Foto oder Screenshot")

Die Python-Werkzeuge der Recherche fallen weg. In Node kommen in Frage: `pdfjs-dist` für PDFs mit Textebene, `mammoth` für Word, `tesseract.js` für Scans. Alle Lizenzen passen. **Ungeprüft:** wie gut sie deutsche Lehrplan-PDFs mit Tabellen lesen, und ob `tesseract.js` die Sprachdaten ohne Download mitbringen kann. Das ist ein Versuch wert, wenn der Bildungsplan-Import drankommt.

### 4. Erklärvideos (Phase 5)

`@motion-canvas/core` (MIT, TypeScript) und animejs (MIT) sind die Gegenstücke, die zum Stapel passen. Die Entscheidung bleibt offen, bis die Videofrage geklärt ist (Browser nötig, siehe Entscheidung 002).

### 5. Qualitätsprüfung (Phase 3)

`learning-commons-org/evaluators` misst Ausgaben gegen Kriterienlisten. Das ist dieselbe Idee wie unsere geplanten Kriterien pro Skill, Lizenz ungeklärt (siehe oben). Nur als Vorbild lesen.

## Was die Recherche nicht liefert (und was bleibt)

- **Deutsche Lehrpläne als Daten:** gibt es nicht. Die Kernlehrpläne und Bildungspläne bleiben PDFs. Pult löst das über `Plan.md` und die Bewertungsregeln der Lehrkraft. Die FWU-Lehrplan-Ontologie ist ein Schema-Vorbild, aber ohne erkennbare Lizenz.
- **Handschrift korrigieren:** offen für alle. Auch die Roadmap hat das nicht vor, "Fotos von Klassenarbeiten" sind ohnehin ausgeschlossen (Datenschutz).
- **Operatorenlisten und Erwartungshorizonte für NRW:** müssen Lehrkräfte oder wir selbst pflegen.

## Kleinigkeiten in der Recherche

- Abschnitt 8 führt "p5.js" als unbelastet, es kommt sonst nirgends vor.
- Abschnitt 9 ("Empfohlener Stapel") vermischt zwei Aufträge: das bestehende Mac-Werkzeug und Pult. Für Pult gilt davon nur der Teil, der in Node und ohne Zusatzprogramm läuft.

## Vorschlag zum Vorgehen

1. **Nichts davon jetzt bauen.** Die Roadmap hat näher liegende Punkte (Stunde planen, Differenzieren, Verständnis-Check).
2. **Ein kleiner Versuch, wenn Mathe ins Spiel kommt:** mathjs oder nerdamer gegen zehn typische Schulaufgaben (Gleichung, Ableitung, Bruch). Ergebnis: ja oder nein, bevor `aufgabe_pruefen` in die Roadmap kommt.
3. **Beim Bildungsplan-Import:** pdfjs-dist und tesseract.js an einem echten Lehrplan-PDF ausprobieren (ohne Schülerdaten).
4. **Bewertungsregeln:** IQB-Vorschläge frühestens mit der Eingabemaske in der Oberfläche.
