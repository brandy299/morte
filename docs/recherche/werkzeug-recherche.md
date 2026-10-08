# Werkzeug-Recherche: „OpenCode für Lehrkräfte"

**Stand:** 5. Oktober 2026 · Abschnitt 11 (Mathematik) ergänzt am 7. Oktober 2026
**Zweck:** Baustein-Auswahl für ein agentenbasiertes Werkzeug für Lehrkräfte
(Auftragstypen: Dokumente erzeugen, Scans auslesen, Wissensbasis aufbauen,
animierte HTML-Materialien erstellen)

**Methode:** Alle Angaben direkt über die GitHub-API abgefragt (Sterne, letzter Push,
Lizenz, Sprache, Beschreibung) — keine Zahlen aus zweiter Hand. Rund 50 Suchabfragen
über Themen, Stichwörter und exakte Repository-Namen, zusammen etwa 700 Repositories,
danach Einzelprüfung der Kandidaten. Sterne und Push-Datum sind Momentaufnahmen
vom oben genannten Datum.

**Was der Markt nicht hergibt:** Der deutschsprachige Raum ist praktisch leer.
Unter „Klausur", „Lehrplan", „Unterrichtsmaterial", „Schule KI" liegen fast
ausschließlich Schüler- und Studierenden-Repositories. Unter „school-ai-assistant"
existieren Dutzende gleichnamige Portfolio-Projekte mit 0 bis 5 Sternen — Namens-Spam,
kein ernstzunehmender Code. Fachlich trägt der englischsprachige Agent-Skills-Bereich,
fachlich-inhaltlich muss die NRW-Spezifik ohnehin selbst gepflegt werden.

---

## 1. Agent-Harness und Skills für Lehrkräfte

### GarethManning/education-agent-skills
- **826★ · 119 Forks · CC BY-SA 4.0 · erstellt 2026-03-01 · Push 2026-08-28**
- https://github.com/GarethManning/education-agent-skills
- 165 evidenzbasierte Pädagogik-Skills in 20 Domänen. Nennt **Hermes Agent ausdrücklich
  als unterstütztes Ziel** neben Claude Code, Claude.ai und OpenAI Codex und liefert die
  passenden Befehle:
  ```
  hermes skills tap add GarethManning/education-agent-skills
  hermes skills install GarethManning/education-agent-skills/skills/... --category education --yes
  ```
  Geprüft: `hermes skills tap` existiert, `hermes skills inspect <pfad>` löst die Skills
  über die Registry skills.sh auf und zeigt die Vorschau.
- Für ein Lehrkraft-Werkzeug relevante Domänen: 7 (Curriculum & Assessment, 13 Skills),
  6 (EAL/D & Language Development), 5 (Literacy & Writing), 13 (AI Literacy),
  19 (Inclusive Design).
- Das Projekt rät selbst, nur einzelne Skills zu installieren statt aller 165.
- **Lizenzhinweis:** CC BY-SA 4.0 ist eine ShareAlike-Lizenz. Wer die Skill-Inhalte in ein
  eigenes Produkt einbettet und weitergibt, muss das abgeleitete Werk unter derselben
  Lizenz veröffentlichen. Für die lokale Nutzung unkritisch, für eine Auslieferung an
  Dritte relevant.

### anthropics/k12-teacher-skills
- **550★ · 95 Forks · Apache-2.0 · erstellt 2026-07-10 · Push 2026-09-01**
- https://github.com/anthropics/k12-teacher-skills
- Von Anthropic selbst, zusammen mit Stanfords Learning Commons entwickelt. Vier Skills
  plus ein Eval-Framework:
  - `k12-lesson-plan-creation`
  - `k12-lesson-differentiation` (drei Niveaustufen, Inhalte identisch)
  - `k12-lesson-prep`
  - `k12-check-for-understanding` (Distraktoren aus dokumentierten Fehlvorstellungen)
  - `evals/` — Bewertungsrahmen zum Anpassen
- **Einschränkung:** Standards-Ausrichtung ist US-amerikanisch (Common Core, 50 Staaten,
  über einen Learning-Commons-Connector). Die Skills sind fachlich übertragbar, die
  Standardabgleiche laufen im deutschen Kontext ins Leere. Apache-2.0 erlaubt Anpassung
  und Weitergabe.

### SirhanMacx/Claw-ED
- **60★ · 13 Forks · MIT · erstellt 2026-03-23 · Push 2026-09-19 · Python 3.11+**
- https://github.com/SirhanMacx/Claw-ED
- Local-first Lehrassistent: importiert PDF/DOCX/PPTX/TXT/Markdown, baut ein Stilprofil,
  entwirft daraus neue Stunden, Schülermaterialien und Präsentationen. Nutzer wählt das
  Modell, prüft das Ergebnis vor der Verwendung. Nächster Verwandter zum geplanten Werkzeug.

### learning-commons-org (Stanford)
- **evaluators** — 84★ · Push 2026-10-05 · https://github.com/learning-commons-org/evaluators
  Misst LLM-Ausgaben gegen pädagogische Rubriken. Brauchbar als Qualitätsschicht
  (entspricht dem AFB- und Erwartungshorizont-Anspruch).
- **knowledge-graph** — 157★ · Push 2026-09-22 · https://github.com/learning-commons-org/knowledge-graph
  Standards, Curricula und Lernforschung auf einem einheitlichen Schema. US-Standards;
  das Schema ist übertragbar, die Daten nicht.

### Weitere geprüfte Treffer
- **pamelafox/presentation-skills** — 125★ · MIT · Push 2026-09-02 ·
  https://github.com/pamelafox/presentation-skills — PDF/PPTX/DOCX nach Markdown
  (nutzt markitdown), RevealJS-Präsentationen bauen und prüfen.
- **oaknational/oak-open-curriculum-ecosystem** — 8★ · MIT · Push 2026-10-01 ·
  https://github.com/oaknational/oak-open-curriculum-ecosystem — Oak National Academy (UK),
  Curriculum-API/SDK/MCP. Institutionell getragen, aber britische Curricula.
- **FWU-DE/lehrplan-ontologie** — 10★ · https://github.com/FWU-DE/lehrplan-ontologie —
  Lehrplan-Ontologie des FWU. Der einzige ernsthafte deutsche Curriculum-Baustein, der
  sich finden ließ.
- **lehrer-tools/lehrer-agent** — 2★ · keine Lizenz · Push 2026-04-06 ·
  https://github.com/lehrer-tools/lehrer-agent — Unterrichtsvorbereitung, Testerstellung,
  Vorschriftenfragen; Claude-Plugin-Format mit eigener `skills/`-Struktur. Sehr klein,
  aber muttersprachlich.
- **ECNU-ICALK/EduChat** — 972★ · https://github.com/ECNU-ICALK/EduChat — offenes
  Bildungs-Chatmodell (chinesisch/englisch).
- **HKUDS/DeepTutor** — 40.820★ · https://github.com/HKUDS/DeepTutor — Tutoring-System
  der Universität Hongkong, schülerzentriert.

---

## 2. Dokumente auslesen (Grundlage jeder Wissensbasis)

| Werkzeug | Sterne | Lizenz | Sprache | Push | Anmerkung |
|---|---|---|---|---|---|
| docling-project/docling | 68.413 | MIT | Python | 2026-10-05 | Layout, Tabellen, Lesereihenfolge, LLM-fertige Ausgabe |
| microsoft/markitdown | 188.616 | MIT | Python | 2026-10-04 | Universalkonverter nach Markdown (docx, pptx, xlsx, pdf, html, Audio); bei PDF nur Textebene |
| xberg-io/xberg | 9.377 | MIT | Rust | 2026-10-05 | Polyglotte Extraktion, Rust-Kern mit Bindings; früher `Goldziher/kreuzberg` |
| opendatalab/MinerU | 81.123 | AGPL | Python | 2026-09-30 | Sehr stark bei Formeln und komplexen Layouts; schwer, AGPL |
| datalab-to/marker | 40.217 | Apache-2.0 | Python | 2026-10-02 | PDF zu Markdown/JSON, hohe Genauigkeit |
| Unstructured-IO/unstructured | 15.526 | — | Python | — | Breite Formaterkennung |
| opendataloader-project/opendataloader-pdf | 29.479 | — | — | — | PDF-Parser mit Blick auf Barrierefreiheit |
| jsvine/pdfplumber | 10.791 | MIT | Python | 2026-08-06 | Zeichengenaue Auswertung, Tabellen, Koordinaten |
| camelot-dev/camelot | 3.839 | MIT | Python | 2026-09-19 | Tabellenextraktion aus PDFs |
| pymupdf/PyMuPDF | 10.827 | **AGPL-3.0** | Python | 2026-10-05 | Schnell und mächtig, aber AGPL — siehe Lizenzabschnitt |
| py-pdf/pypdf | 10.242 | — | Python | 2026-10-05 | Freie Alternative ohne Layoutanalyse |
| docling-project/docling-mcp | 767 | — | — | 2026-10-01 | Docling als MCP-Werkzeuge |

---

## 3. OCR

| Werkzeug | Sterne | Lizenz | Push | Anmerkung |
|---|---|---|---|---|
| Apple Vision (macOS) | — | System | — | Auf macOS die erste Wahl: kein Download, Deutsch inklusive, ca. 4 s pro Seite auf M4 |
| datalab-to/surya | 21.451 | Apache-2.0 | 2026-09-11 | Layout, Lesereihenfolge, Tabellen, 90+ Sprachen; moderner Nachfolger von marker |
| PaddlePaddle/PaddleOCR | 90.638 | Apache-2.0 | 2026-09-16 | Robust bei schiefen Fotos und Handschrift |
| ocrmypdf/OCRmyPDF | 34.938 | — | — | Textlayer nachträglich in Scans schreiben |
| paperless-ngx/paperless-ngx | 46.298 | GPL-3.0 | 2026-10-05 | Komplettes Dokumentenarchiv mit OCR, Index und Volltextsuche |
| hiroi-sora/Umi-OCR | 47.601 | MIT | 2025-11-20 | Fertige Offline-Anwendung mit Oberfläche |
| allenai/olmocr | 19.696 | Apache-2.0 | 2026-03-25 | Toolkit zum Linearisieren von PDFs für LLM-Datensätze |
| tesseract-ocr/tesseract | 76.830 | — | — | Klassiker; deutsche Sprachdaten verfügbar |

**Reihenfolge für Scans auf macOS:** Vision-OCR → bei Layout-Problemen betroffene Seiten
als Bild gegenlesen → erst dann ein Modell wie Surya.

---

## 4. Dokumente erzeugen

### DOCX
| Werkzeug | Sterne | Lizenz | Push | Anmerkung |
|---|---|---|---|---|
| python-openxml/python-docx | 5.734 | MIT | 2026-08-01 | Standard für Word-Erzeugung aus Python |
| elapouya/python-docx-template | 2.716 | LGPL-2.1 | 2026-07-07 | DOCX als Jinja2-Vorlage — Layout pflegt die Lehrkraft in Word selbst |
| superdoc/docx-editor | 1.082 | **AGPL-3.0** | 2026-10-02 | DOCX-Editor plus Agent-SDK, ausdrücklich für KI-Agenten |
| dream-num/univer | 22.380 | Apache-2.0 | 2026-10-05 | „Office Harness for AI Agents": Tabellen, Docs, Slides, Canvas |
| iOfficeAI/OfficeCLI | 31.594 | Apache-2.0 | 2026-10-05 | Office-Suite für Agenten, C#/.NET |
| mwilliamson/mammoth.js | 6.316 | BSD-2 | 2026-09-26 | DOCX nach HTML |

### PDF
| Werkzeug | Sterne | Lizenz | Push | Anmerkung |
|---|---|---|---|---|
| Kozea/WeasyPrint | 9.659 | BSD-3 | 2026-10-04 | HTML+CSS zu PDF, Seitenumbrüche, Fußnoten |
| typst/typst | 56.418 | — | — | Satzsystem, sehr schnell, gut für parametrierte Vorlagen |
| gotenberg/gotenberg | 13.223 | MIT | 2026-10-05 | HTML zu PDF als HTTP-Dienst |
| jgm/pandoc | 46.580 | GPL-2.0 | 2026-10-05 | Markdown zu DOCX/PDF/PPTX; `--reference-doc` reicht eigenes Word-Design durch |
| Stirling-Tools/Stirling-PDF | 93.617 | — | 2026-10-05 | Selbstgehostete PDF-Werkbank |
| quarto-dev/quarto-cli | 6.057 | — | 2026-10-05 | Publikationssystem auf Pandoc-Basis |

---

## 5. Wissensbasis und Suche

| Werkzeug | Sterne | Lizenz | Push | Anmerkung |
|---|---|---|---|---|
| asg017/sqlite-vec | 8.161 | Apache-2.0 | 2026-05-18 | Vektorsuche als SQLite-Erweiterung; eine Datei, kein Dienst. Mit FTS5 hybride Suche ohne Infrastruktur |
| lancedb/lancedb | 11.602 | Apache-2.0 | 2026-10-05 | Eingebettete multimodale Suche, Rust |
| HKUDS/LightRAG | 39.986 | — | — | Graph plus Vektor, für Zusammenhänge zwischen Inhalten |
| VectifyAI/PageIndex | 38.686 | — | — | Vektorlos, Reasoning über die Dokumentstruktur |
| microsoft/graphrag | 36.231 | MIT | 2026-10-05 | Graphbasiertes RAG von Microsoft |
| docling-project/docling-graph | 913 | — | — | Docling plus Graph — Wissensgraph direkt aus Dokumenten |
| neuml/txtai | 12.990 | Apache-2.0 | 2026-10-05 | Semantische Suche und LLM-Orchestrierung in einem |
| ggozad/haiku.rag | 621 | — | — | Agentisches RAG für lokale Dokumentensuche |
| topoteretes/cognee | 31.397 | — | — | Gedächtnisplattform für Agenten |
| meilisearch/meilisearch | 59.491 | — | — | Hybride Suchmaschine, sehr schnell |
| infiniflow/ragflow | 91.699 | — | — | Komplettes RAG-System mit Oberfläche, schwer |
| khoj-ai/khoj | 37.561 | **AGPL-3.0** | 2026-08-02 | Selbstgehostetes „zweites Gehirn" mit Dokumentenindex |
| onyx-dot-app/onyx | 32.328 | — | 2026-10-05 | KI-Plattform mit Dokumentensuche |
| run-llama/llama_index | 52.411 | — | — | Dokumentenverarbeitung und Indexierung |
| deepset-ai/haystack | 26.670 | — | — | Orchestrierungsrahmen für RAG |

---

## 6. MCP-Anbindung

- **modelcontextprotocol/servers** — 91.017★ · Push 2026-10-05 ·
  https://github.com/modelcontextprotocol/servers — Referenzserver (filesystem, fetch, git …)
- **ankimcp/anki-mcp-server** — 506★ · MIT · Push 2026-10-04 ·
  https://github.com/ankimcp/anki-mcp-server — Anki über MCP; für Vokabeltraining
  (Business English) direkt brauchbar. Ebenfalls vorhanden: `anki-mcp-server-addon`.
- **peancor/moodle-mcp-server** — 43★ · MIT · Push 2026-02-22 ·
  https://github.com/peancor/moodle-mcp-server — bester von rund zwanzig geprüften
  Moodle-Servern. Relevant, falls ein Moodle-basiertes LMS im Einsatz ist.
- **Kimmahone/edu-workspace-mcp** — 1★ · Push 2026-09 ·
  https://github.com/Kimmahone/edu-workspace-mcp — Google Workspace for Education
  (Docs, Sheets, Slides, Forms, Drive, Classroom). Neu und klein, aber thematisch passend.
- **docling-mcp** — 767★ · https://github.com/docling-project/docling-mcp
- **KorigamiK/markitdown_mcp_server** — 88★ — markitdown als MCP-Server
- **I-CAN-hack/pdf-mcp** — 79★ — PDF-Bearbeitung mit Bildrendering
- **UseJunior/safe-docx** — 45★ — DOCX-Werkzeuge inklusive Vergleich zweier Versionen
- **WaterPistolAI/libreoffice-mcp** — 27★ — LibreOffice (Writer, Calc, Impress, Draw)
- **ArnaudGuiovanna/tutor-mcp** — 43★ — verwandelt ein LLM in ein Tutoring-System
- **shemhamforash23/lightrag-mcp** — 123★ — LightRAG als MCP-Server

---

## 7. Motion Graphics in HTML

Ausgangslage: Vorhanden ist eine eigene Pipeline, die HTML als reine Funktion der Zeit
rendert (jedes Element hängt an `t`), über Playwright Bild für Bild aufnimmt und mit
ffmpeg kodiert. Gemessen auf M4: 7,5 Bilder/s bei 1920×1080 für Szenen aus Formen,
rund 2,4 Bilder/s bei Vollbildfotos mit Korn und Weichzeichner.

### Timeline-Bibliotheken — Ersatz für handgeschriebene Hüllkurven
| Werkzeug | Sterne | Lizenz | Push | Anmerkung |
|---|---|---|---|---|
| juliangarnier/anime | 73.367 | MIT | 2026-08-21 | `createTimeline()` mit `seek(t)`, passt direkt in eine Frame-Schleife; MIT |
| greensock/GSAP | 28.825 | eigene Lizenz | 2026-04-13 | Industriestandard, `timeline.seek(t)`. Seit April 2025 kostenlos, auch kommerziell, inklusive der früher bezahlten Plugins SplitText, MorphSVG, DrawSVG, ScrollTrigger. Keine OSI-Lizenz; die Standard-Lizenz verbietet, damit ein konkurrierendes Animationsprodukt zu bauen |
| motiondivision/motion | 33.841 | MIT | 2026-10-05 | Moderne Bibliothek auf Basis der Web Animations API |
| theatre-js/theatre | 12.725 | Apache-2.0 | 2024-08-14 | Visueller Sequencer; Entwicklung ruht seit August 2024 |

**Kerngewinn:** `seek(t)` liefert Staffelung, Federn und Verschachtelung, ohne die
Determinismus-Eigenschaft zu verlieren — jedes Bild bleibt reproduzierbar.

### Fertige Code-zu-Video-Frameworks
| Werkzeug | Sterne | Lizenz | Push | Anmerkung |
|---|---|---|---|---|
| motion-canvas/motion-canvas | 19.235 | MIT | 2026-07-02 | TypeScript, Generator-Modell, Live-Editor; ausdrücklich für erklärende Animationen. Nächstliegender nächster Schritt |
| midrender/revideo | 4.083 | MIT | 2026-07-15 | Abspaltung von Motion Canvas für Video-Produktion: serverseitiges Rendern, Variablen, Audio |
| remotion-dev/remotion | 62.011 | eigene Lizenz | 2026-10-05 | React zu MP4. **Nicht Open Source:** kostenlos für Einzelpersonen, Firmen bis drei Mitarbeiter und Non-Profits, darüber Firmenlizenz |
| mifi/editly | 5.516 | MIT | 2025-05-12 | Deklaratives Videoschneiden per CLI: Schnitte, Übergänge, Text |

### Frame-Aufnahme
Kein Austausch empfohlen. **tungs/timecut** (654★, BSD-3) setzt exakt dieselbe Idee um
(patcht `requestAnimationFrame` und `Date.now`), letzter Push 2023 — tot.
**spite/ccapture.js** (3.769★, MIT) hat bekannte Probleme mit WebGL.
Die eigene Lösung — eine Seitenladung, danach `evaluate` plus Screenshot pro Bild — ist
deterministisch und in besserer Qualität.

### 2D, Canvas, SVG
| Werkzeug | Sterne | Lizenz | Push |
|---|---|---|---|
| pixijs/pixijs | 48.291 | MIT | 2026-10-05 |
| konvajs/konva | 14.851 | MIT | 2026-10-05 |
| svgdotjs/svg.js | 11.825 | — | 2026-08-04 |
| maxwellito/vivus | 15.483 | MIT | 2022-07-06 (ruht) |
| d3/d3 | 113.806 | ISC | 2026-05-28 |
| mermaid-js/mermaid | 90.552 | MIT | 2026-10-05 |
| excalidraw/excalidraw | 133.557 | MIT | 2026-10-01 |
| airbnb/lottie-web | 32.145 | MIT | 2025-09-01 |
| rive-app/rive-wasm | 971 | MIT | 2026-10-05 |

### 3D
| Werkzeug | Sterne | Lizenz | Push |
|---|---|---|---|
| mrdoob/three.js | 116.253 | MIT | 2026-10-05 |
| BabylonJS/Babylon.js | 26.127 | Apache-2.0 | 2026-10-05 |
| pmndrs/react-three-fiber | 32.736 | MIT | 2026-10-05 |
| pmndrs/drei | 9.915 | MIT | 2026-10-05 |

### Folien mit Animation
| Werkzeug | Sterne | Lizenz | Push | Anmerkung |
|---|---|---|---|---|
| hakimel/reveal.js | 72.377 | MIT | 2026-09-30 | Klassiker, Auto-Animate |
| slidevjs/slidev | 48.926 | MIT | 2026-10-02 | Markdown zu animierten Folien, PDF/PPTX-Export |
| marp-team/marp-cli | 3.850 | MIT | 2026-09-08 | Sehr schlank, Markdown zu Folien |

### Erkläranimationen mit Mathematik
- **3b1b/manim** — 94.627★ · MIT · Push 2026-09-09 · https://github.com/3b1b/manim
- **ManimCommunity/manim** — 41.279★ · MIT · Push 2026-10-05 ·
  https://github.com/ManimCommunity/manim
  Python statt HTML, aber die Referenz für erklärende Mathematik-Videos. Als vorgerenderte
  Bausteine in die HTML-Pipeline einspeisbar.

---

## 8. Lizenz-Matrix (entscheidend für Weitergabe)

**Unbelastet — MIT, BSD oder Apache:**
docling, docling-mcp, markitdown, xberg, pdfplumber, camelot, surya, pypdf, marker,
python-docx, mammoth, Univer, OfficeCLI, WeasyPrint, Gotenberg, sqlite-vec, LanceDB,
txtai, graphrag, anime.js, Motion, Konva, PixiJS, three.js, Babylon.js, react-three-fiber,
drei, Motion Canvas, Revideo, editly, Slidev, reveal.js, Marp, Mermaid, Excalidraw,
Manim, p5.js, anki-mcp-server, Claw-ED, k12-teacher-skills (Apache-2.0),
SymPy, latex2sympy

**AGPL — Vorsicht bei Auslieferung oder Betrieb als Dienst:**
PyMuPDF, MinerU, SuperDoc, khoj, paperless-ngx

**GPL:** Pandoc (GPL-2.0), paperless-ngx (GPL-3.0), math-worksheet-generator (GPL-2.0),
moodle-mod_geogebra (GPL-3.0)

**LGPL:** python-docx-template (LGPL-2.1)

**Eigene Lizenzen, nicht OSI:**
- GSAP — frei nutzbar, aber mit Wettbewerbsklausel
- Remotion — frei für Einzelpersonen, ≤3 Mitarbeiter, Non-Profit

**EUPL (Copyleft):** GeoGebra-Quellcode (EUPL v1.2; Installer und Web-Dienste zusätzlich
kommerziell beschränkt) — siehe 11.3

**ShareAlike:** education-agent-skills (CC BY-SA 4.0) — abgeleitete Werke müssen unter
derselben Lizenz stehen.

---

## 9. Empfohlener Stapel

| Aufgabe | Erste Wahl | Begründung |
|---|---|---|
| Dokumente auslesen | docling (MIT) | Layout, Tabellen, Lesereihenfolge; aktiv, MIT |
| Universalkonvertierung | markitdown (MIT) | Deckt docx, pptx, xlsx, html, Audio ab |
| OCR auf macOS | Apple Vision | Kein Download, Deutsch, ca. 4 s pro Seite |
| DOCX erzeugen | python-docx + docx-template | Struktur aus Python, Layout aus der Word-Vorlage |
| PDF erzeugen | WeasyPrint (BSD) | HTML+CSS, passt zur bestehenden HTML-Kompetenz |
| Wissensbasis | sqlite-vec + FTS5 | Eine Datei, kein Dienst, kein Docker |
| Wissensgraph (später) | docling-graph | Direkt aus den extrahierten Dokumenten |
| Aufgaben nachrechnen | SymPy (BSD) | Rechnet generierte Aufgaben gegen; keine falschen Lösungsblätter |
| Standards-Tagging | IQB-Vokabulare (CC0) | AFB I–III maschinenlesbar, Sek I `v51`, Sek II `v55` |
| Animation | anime.js (MIT) | `seek(t)` ersetzt handgeschriebene Hüllkurven |
| 3D | three.js (MIT) | Deterministisch, sofern aus `t` gesteuert |
| Folien | Slidev (MIT) | Markdown rein, animierte Folien raus |
| Aufnahme | bestehendes Playwright-Skript | Bereits bewährt und gemessen |

**Bewusst nicht gewählt:** Remotion (Lizenz, React-Bindung), RAGFlow (zu schwer),
PyMuPDF (AGPL), timecut und CCapture (veraltet beziehungsweise WebGL-Probleme).

---

## 10. Anmerkungen zur deutschen Spezifik

GitHub liefert für den deutschen Raum praktisch nichts Verwertbares. Die fachlichen
Vorgaben — Kompetenzbereiche des Bildungsplans, AFB-Verteilung, Operatorenlisten,
Erwartungshorizonte, Modellunternehmen — müssen im Werkzeug selbst gepflegt werden.
Eine Ausnahme: die **Bildungsstandards des IQB** liegen als kontrollierte Vokabulare
unter CC0 maschinenlesbar vor, einschließlich der Anforderungsbereiche. Sie decken die
bundesweiten Standards ab, nicht die Kernlehrpläne der Länder — siehe Abschnitt 11.2.
Vorhandene Ansatzpunkte:

- **FWU-DE/lehrplan-ontologie** als Schema-Vorbild für Lehrplandaten
- **christophschuhmann/HH-Bildungsplan-Suche-BM25** — digitalisierte Hamburger
  Bildungspläne mit BM25-Suche (0★, aber als Verfahrensbeispiel brauchbar)
- **sroertgen/mem-lehrplan** — Agent-Skill zum Schreiben von Lehrplandaten nach der
  FWU-Ontologie (1★)

---

## 11. Mathematik

Ergänzt am 7. Oktober 2026. Die Abschnitte 1–10 liefen auf die Werkzeugschicht — Dokumente,
OCR, Wissensbasis, Animation — und ließen das Fachliche aus. Dieser Abschnitt schließt die
Lücke für Mathematik. Das Fach ist in einem Punkt strukturell anders als alle anderen:
**seine Ergebnisse lassen sich nachrechnen.** Damit ist es der einzige Bereich, in dem ein
Werkzeug Qualität belegen kann, statt sie zu behaupten.

### 11.1 Der Hebel: prüfen statt behaupten (SymPy)

- **sympy/sympy** — 14.993★ · Python · Push 2026-10-05 ·
  https://github.com/sympy/sympy
  Computeralgebrasystem in reinem Python. Läuft lokal, braucht kein Netz, kostet nichts.
  GitHub weist die Lizenz als „NOASSERTION" aus; die `LICENSE`-Datei enthält aber
  BSD-3-Klausel-Text hinter einem Copyright-Absatz, was die automatische Zuordnung
  verhindert. Frei verwendbar.
- **sympy/sympy_gamma** — 716★ · Push 2024-04-20 · https://github.com/sympy/sympy_gamma
  SymPy als Wolfram-Alpha-Oberfläche. Zur Anschauung brauchbar, Entwicklung ruht seit 2024.
- **augustt198/latex2sympy** — 407★ · MIT · Push 2019-07-11 ·
  https://github.com/augustt198/latex2sympy — LaTeX-Formeln nach SymPy-Objekte. Nützlich,
  um aus OCR gelesene Formeln prüfbar zu machen, aber seit 2019 ohne Update.

**Die Prüfkette, die daraus folgt:**

1. Aufgabe wird aus einem Parameterraum erzeugt, nicht als Freitext — sonst ist die Lösung
   nicht eindeutig
2. SymPy rechnet sie durch und liefert das Ergebnis
3. Der Lösungsweg wird zusätzlich maschinell in Schritte zerlegt (`solve`, `simplify`,
   `diff`, `integrate` mit Zwischenschritten)
4. Nur was SymPy bestätigt, wird ausgeliefert
5. Bei Textaufgaben prüft SymPy die aufgestellte Gleichung gegen die Fragestellung

Damit entfällt die häufigste Schwäche KI-erzeugter Aufgaben: falsche oder unvollständige
Lösungsblätter. Kein Sprachmodell kann das allein leisten — das Modell formuliert, SymPy
entscheidet.

### 11.2 Deutsche Bildungsstandards als Datensatz (IQB, CC0)

Der einzige fachliche Datensatz für Deutschland, der maschinenlesbar und frei ist. Er liegt
nicht auf GitHub und wurde deshalb in der ersten Recherche übersehen: das IQB
veröffentlicht die Bildungsstandards als kontrollierte Vokabulare (SKOS), **CC0**, mit
stabilen Perma-IDs.

Alle Endpunkte am 7. Oktober 2026 geprüft, alle antworten mit **200**:

| Stufe | Vokabular | URL |
|---|---|---|
| Mathematik Primar 2022 | v10 | https://w3id.org/iqb/v10/a1/index.json |
| Mathematik Sek I 2022 | v51 | https://w3id.org/iqb/v51/a1/index.json |
| Mathematik Sek II 2012 | v55 | https://w3id.org/iqb/v55/a1/index.json |
| Mathematik Sek I — HSA 2004 | v52 | https://w3id.org/iqb/v52/a1/index.json |
| Mathematik Sek I — MSA 2003 | v53 | https://w3id.org/iqb/v53/a1/index.json |

Der Teil `a1` enthält die **Anforderungsbereiche** — für Sek I und Sek II: I Reproduzieren,
II Zusammenhänge herstellen, III Verallgemeinern und Reflektieren. Eine feinere
Untergliederung gibt es nicht: `a2`, `a3`, `a4`, `b1` und `index` wurden geprüft, alle 404.

**Weitere Fächer, gleiche Bauart** (IDs aus der IQB-Übersicht, nicht einzeln geprüft):

| Fach | Primar | Sek I | Sek II |
|---|---|---|---|
| Deutsch | v12 (2022) | v34 (2022) | v36 (2012) |
| Mathematik | v10 (2022) | v51 (2022) | v55 (2012) |
| Fremdsprachen | — | v56 (2023) | v59 (2012) |
| Chemie | — | v41 (MSA 2024) | v42 (2020) |
| Physik | — | v47 (MSA 2024) | v48 (2020) |
| Biologie | — | v44 (MSA 2024) | v45 (2020) |

Übersicht: https://iqb-vocabs.github.io/vokabulare/bildungsstandards.html

**Nutzen:** Jede erzeugte Aufgabe bekommt ihr AFB-Tag aus dem Vokabular statt aus einer
Prompt-Formulierung. Differenzierung nach Anforderungsbereich wird damit reproduzierbar
und standardkonform.

**Grenze:** Das sind die bundesweiten Bildungsstandards. Die **Kernlehrpläne der Länder** —
für NRW das, was im Unterricht tatsächlich gilt — liegen weiterhin nur als PDF bei QUA-LiS
und existieren nicht als Datensatz.

### 11.3 Dynamische Geometrie (GeoGebra)

- **geogebra/geogebra** — 2.348★ · Java · Push 2026-10-06 ·
  https://github.com/geogebra/geogebra
  Spiegel eines privaten GitLab, deshalb **keine Lizenzdatei im Repository**. Die
  Lizenzseite klärt es: Der Quellcode steht unter **EUPL v1.2 ohne Einschränkung**, aber
  Installer, Web-Dienste und Sprachdatei-Erweiterungen haben
  **Beschränkungen für kommerzielle Nutzung**. GeoGebra bezeichnet das Programm deshalb
  selbst als nicht „frei" im Sinne der Open-Source-Definition, obwohl der Quellcode offen
  ist. Für Schüler und Lehrkräfte bleibt es kostenlos.
  https://www.geogebra.org/license
  **Konsequenz:** Für Unterricht und eigene Materialien unbedenklich. Für ein Produkt, das
  GeoGebra mitliefert oder als Dienst betreibt, sind Name, Installer und Web-Dienste der
  Engpass. EUPL ist zudem Copyleft — Code, der aus dem GeoGebra-Quellcode abgeleitet ist,
  muss unter EUPL bleiben.
- **projectestac/moodle-mod_geogebra** — 22★ · **GPL-3.0** · PHP · Push 2026-09-22 ·
  https://github.com/projectestac/moodle-mod_geogebra — offizielles GeoGebra-Modul für
  Moodle. Interessant, falls an der Schule Moodle läuft; GPL-3.0 ist bei Weitergabe
  ansteckend.
- **kovzol/geogebra-discovery** — 33★ · **keine Lizenz** · Push 2026-07-10 ·
  https://github.com/kovzol/geogebra-discovery — automatisches Entdecken geometrischer
  Sätze. Fachlich bemerkenswert, ohne Lizenz aber nicht verwendbar.

### 11.4 Arbeitsblätter

- **januschung/math-worksheet-generator** — 542★ · **GPL-2.0** · Python · Push 2025-11-03 ·
  https://github.com/januschung/math-worksheet-generator
  Grundrechenarten mit Lösungsblatt, sauber umgesetzt. Für den Eigengebrauch gut.
  GPL-2.0 ist bei Weitergabe ansteckend — für ein Werkzeug, das an andere Lehrkräfte geht,
  nur verwendbar, wenn das Ganze unter GPL steht.

### 11.5 Erklärvideos

Manim (siehe Abschnitt 7) ist der Standard für mathematische Erkläranimationen und passt
zur bestehenden HTML-zu-Video-Pipeline. **Voraussetzung ist LaTeX**, das auf dem Mac mini
nicht installiert ist: BasicTeX ≈ 100 MB, MacTeX ≈ 5,7 GB. Bei derzeit 61 GB freiem
Plattenplatz ist beides möglich. Manim rendert nach MP4 und lässt sich als vorgerenderter
Baustein in die HTML-Pipeline einspeisen.

### 11.6 Die Lücke: handgeschriebene Rechenwege

Der Suchlauf zu „handwriting math ocr" lieferte **keinen einzigen Treffer**. Das Erkennen
handschriftlicher Lösungswege — und mehr noch das Erkennen des Fehlermusters darin — ist im
offenen Bereich nicht gelöst. Genau das ist das Kernstück der kommerziellen Angebote:
**Skillsquare** (deutsch) liest handschriftliche Lösungswege, analysiert Fehlermuster und
gibt Rückmeldung, ohne die Lösung zu verraten; **Formative** wandelt Papierarbeitsblätter in
automatisch korrigierbare Aufgaben. Das bleibt Forschungsgebiet, kein Baustein.

### 11.7 Was daraus für den Stapel folgt

| Aufgabe | Erste Wahl | Begründung |
|---|---|---|
| Aufgaben nachrechnen | SymPy | Lokal, kostenlos, liefert den Beleg statt einer Behauptung |
| Lösungswege schrittweise | SymPy (`solve`, `diff`, `integrate`) | Zwischenschritte maschinell, nicht vom Modell erzählt |
| Standards-Tagging | IQB-Vokabulare, CC0 | AFB I–III maschinenlesbar, bundesweit verbindlich |
| Geometrie zum Anfassen | GeoGebra | Kostenlos für Schule; Lizenzgrenze erst bei Weitergabe |
| Erklärvideos | Manim | Braucht LaTeX als Extra-Installation |
| Handschrift korrigieren | **nichts** | Offen nicht gelöst — nur kommerziell |
