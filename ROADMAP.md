# Roadmap: Pult

Ein schlanker KI-Arbeitsplatz für Lehrkräfte. Aufbau und Ruhe wie die Claude-App, aber mit geführter Materialerstellung, Klassenstruktur und Stundenplan-Dashboard. Gedacht für Kolleginnen und Kollegen, die mit freiem Prompting wenig anfangen können.

Stand: 2026-10-14 · Status der Phasen: `[ ]` offen, `[~]` in Arbeit, `[x]` fertig

## Leitplanken

- **Einfach vor mächtig.** Jede Funktion muss ohne Fachvokabular bedienbar sein. Technik wie Terminal, Diffs oder Berechtigungsdialoge in Entwicklersprache sieht man nirgends.
- **Geführt statt frei.** Material entsteht über Fragen, Vorlagen und Skills, nicht über leere Eingabefelder.
- **Zielgruppe: Lehrkräfte in NRW** an Berufskollegs, Gymnasien und Gesamtschulen.
- **Skills sind das Herzstück.** Qualität wie in der Claude-App, gleiches Skill-Format, und Lehrkräfte bauen eigene Skills mit dem Skill-Builder.
- **Ein Agent, viele Ordner.** Ein zentraler Agent liest zur richtigen Zeit die richtigen Dateien aus einer klaren Ordnerstruktur (Ansatz: Interpretable Context Methodology, ICM). Keine Multi-Agent-Orchestrierung. Siehe `docs/ordnerstruktur.md`.
- **Provider austauschbar.** Claude, OpenAI und OpenAI-kompatible Anbieter (z. B. DeepSeek). Mindestanforderung für das Hauptmodell: Tool-Calling und Vision. Das wird beim Einrichten per Test geprüft, nicht abgefragt.
- **Version 1 nur für eine Person.** Lokal, kein Login-Backend, keine Schülerdaten. Mehrbenutzerbetrieb und DSGVO-Backend sind eine spätere Phase.
- **Eigene Optik.** Aufbau und Bedienlogik an die Claude-App angelehnt, Name, Logo, Farben und Icons eigenständig. Darf nicht nach Standard-KI aussehen.

## Nicht-Ziele für Version 1

- Keine Schülerdatenbank, kein Abruf von Schülerdaten aus WebUntis. Es gibt nur Klassen und Kurse.
- Kein Login, keine Nutzerverwaltung.
- Keine Sprachausgabe im Standard. Stimme ist ein optionales Modul, nur auf ausdrücklichen Wunsch.
- Keine Modellprofile für Endnutzer. Es gibt wenige empfohlene Modelle, den Rest unter "Erweitert".

## Phase 0: Entscheidungen und Fundament

- [x] Agentenkern gewählt: `pi-ai` + `pi-agent-core` (MIT) als Bibliothek, eigene Oberfläche und eigene feste Werkzeuge. Siehe `docs/entscheidungen/001-agentenkern.md`
- [x] Tech-Stack bestätigt: TypeScript, lokale Web-App mit Node-Server und React-Oberfläche, Start im Browser auf localhost; Electron-Verpackung in Phase 6. Kein Rust: pi und die Video-Pipeline sind Node, eine Sprache für alles hält das Projekt für eine Person pflegbar
- [x] Lizenzfrage geklärt: Repo bleibt Apache-2.0. pi ist MIT und passt. Kein Code aus AGPL- oder LGPL-Projekten (Odysseus, pi-desktop), nur Ideen.
- [ ] Plattform: Mac zuerst, Windows von Anfang an mitdenken (viele Schulen nutzen Windows)
- [x] Projektname und Logo: **Pult**, Logo nach `docs/marke.md` (das p als Pult von der Seite, Rostrot auf Papier), eingebaut in App, Favicon, App-Icon und PDF-Fuß. Früher "morte", siehe Entscheidung 010
- [ ] `CLAUDE.md` und `docs/ordnerstruktur.md` im Repo (angelegt)

## Phase 1: Chat-Kern

- [x] Oberfläche mit Chat, großem Eingabefeld und Streaming
- [x] Fortschrittsanzeige bei der Arbeit (Statuspunkt, aktuelle Zeile, Schrittliste und ein Platzhalter-Blatt in der Vorschau, bis das Material fertig ist; kein echter Live-Aufbau): pulsierender Statuspunkt, Zeile mit dem aktuellen Schritt, abhakende Schrittliste, Vorschau, die sich live aufbaut
- [x] Verbrauch (Tokens, geschätzte Kosten, Monatssumme), Kontext-Füllstand und Guthaben (nur wo der Anbieter es hergibt: DeepSeek, OpenRouter) versteckt hinter einem kleinen Ring am Eingabefeld
- [x] Bilder anhängen (Büroklammer, Ziehen, Einfügen) mit Datenschutz-Hinweis. PDF und Word folgen in Phase 3
- [x] Gesprächsverlauf: frühere Gespräche in der Seitenleiste, wieder öffnen (mit Schritten, Dateien und Verbrauch) und löschen. Gespeichert unter `Gespräche/` im Datenordner, nur auf diesem Computer
- [x] Ablaufprotokoll pro Gespräch: Dauer, Zeit bis zur ersten Ausgabe, Mengen und Ende jeder Modellanfrage, Dauer und Fehlerfelder jedes Werkzeugs, Warten auf die Lehrkraft, Wiederholungen. Nur Zeiten und Mengen, keine Inhalte. Steht im Gesprächsexport unter "Ablauf"
- [x] Lange Gespräche: Ab etwa 80 Prozent Kontext-Füllstand den älteren Teil automatisch zusammenfassen, die letzten Beiträge bleiben wörtlich. Hinweis in einfacher Sprache, keine Rückfrage. Bei "Eingabe zu lang" vom Anbieter einmal erneut versuchen (Ideen aus `docs/recherche-harnesse.md`). Der Hinweis erscheint als Schritt in der Schrittliste; scheitert die Zusammenfassung, läuft das Gespräch unverändert weiter
- [x] Provider-Schicht über `pi-ai`, gekapselt in `src/core/agent`: Claude, OpenAI, OpenRouter, DeepSeek und jeder OpenAI-kompatible Server (Schulserver, LM Studio, Ollama), geprüft gegen einen echten HTTP-Mock mit Streaming und Werkzeugaufruf. http:// nur für den eigenen Computer und private Adressen Mit einem echten Modell (OpenRouter, Claude Haiku 4.5) geprüft: Verbindungstest, Reihe planen, Arbeitsblatt erstellen und in die Stundentabelle eintragen, Lehrplan umwandeln.
- [x] API-Keys im Schlüsselbund, nie im Code oder im Repo
- [x] Einrichtung mit "Verbindung testen": prüft Bilder (Vision) und Dateiaufgabe (Tool-Calling), Ergebnis "Passt" oder verständlicher Hinweis
- [x] Kurze Liste empfohlener Modelle, Rest unter "Erweitert". Modelle ohne Bilder erscheinen nicht, Speichern verlangt den bestandenen Test (auch bei direktem Aufruf), ein früher gespeichertes unzulässiges Modell wird beim Start nicht benutzt und der Grund steht auf der Einrichtungsseite

## Phase 2: Ordnerstruktur und Klassen

- [x] Arbeitsordner nach `docs/ordnerstruktur.md` anlegen (`~/pult-daten`, beim Start)
- [x] Seitenleiste als Baum: Klasse, Fach, Reihe (ohne Dateipfade)
- [x] Assistent "Neue Klasse anlegen" (Fragenkatalog)
- [~] `Stand.md` pro Klasse und Fach, wird nach jeder Sitzung kurz überschrieben (Werkzeug und Anweisung stehen, mit echtem Modell noch nicht erprobt)
- [x] `Reihe.md` mit Stundentabelle und festen Status-Wörtern (`geplant`, `Material fertig`, `gehalten`)
- [~] Abfragen wie "Wo stehen wir in 11a?" und "Wo fehlt noch Material?"

## Phase 3: Materialerstellung

- [x] Vorschau rechts, Download als PDF, Graustufen-tauglich, wenige Seiten (feste Vorlage, PDF direkt in der App gezeichnet mit pdfkit, ohne Zusatzprogramm; geprüft: Seitenumbruch, nur Grauwerte)
- [~] Skill-Lader nach Agent-Skills-Spezifikation (wie Claude-App und Pi), drei Ebenen: mitgeliefert, Schule, persönlich. Siehe `docs/skills.md` (Lader, `skill_laden` und stufenweises Laden stehen, getestet mit Beispiel-Skills; Ebene Schule folgt in Phase 6, mitgelieferte Skills fehlen noch)
- [~] Mitgelieferte Skills neu schreiben, Bauweise nach `anthropics/k12-teacher-skills`, Inhalt für deutsche Schulen und Berufskollegs. Fertig: Arbeitsblatt, Klausur mit Erwartungshorizont (`klausur`), Bewertungsregeln festhalten (`bewertung`), Lernsituation oder Reihe planen (`lernsituation`). Außerdem fertig: Stunde planen, Differenzieren, Stunde vorbereiten, Verständnis-Check. Alle vier einmal mit einem echten Modell durchgespielt (Claude Haiku 4.5 über OpenRouter); Rückfragen und Planung sind dabei vernünftig, der fachliche Inhalt wurde nicht von einer Lehrkraft geprüft. Fehlt noch: Referenzdateien pro Schulform und Fachgruppe
- [x] Material auf Wunsch auch als Word-Datei (Arbeitsblatt, Klausur mit Erwartungshorizont, Stundenverlauf, Lernsituation) und Word-Dateien aus Reihen lesen. Siehe `docs/entscheidungen/006-word-dateien.md`. Mit LibreOffice angesehen und mit einem echten Modell durchgespielt, nicht in Microsoft Word geöffnet
- [x] Präsentationen als PowerPoint-Datei (16:9, Titelfolie mit Schulkopf, Stichpunkte, Schaubilder, Sprechernotizen, Abschnittsfolien), Vorschau als PDF, Anleitung `praesentation`. Überfüllte Folien lehnt das Werkzeug ab. Siehe `docs/entscheidungen/016-praesentationen.md`. Schaubilder auf den Folien sind echte, bearbeitbare PowerPoint-Objekte (#47). Offen: in PowerPoint selbst angesehen, Säulen als echtes Diagramm, Folienmaster
- [~] Qualitätsprüfung: Kriterienlisten (P/R/O/M) und Testsätze pro Skill, Auswertung durch ein KI-Modell als Prüfer, bei jeder Skill-Änderung und jedem Modellwechsel. Gerüst fertig (`npm run eval`, `evals/`), erste Messung mit Haiku 4.5 und Sonnet 4.5 in `evals/BASELINE.md`. Dritte Messung (2026-10-08): Testsätze und Kriterien für `bewertung` und `vorlage-bauen` stehen, beide mit sieben empfohlenen Modellen zweifach gemessen (Tabelle in `evals/BASELINE.md`). Offen: die übrigen Anleitungen für die empfohlenen Modelle (geschätzt 30 bis 50 US-$ mit diesem Prüfer), MiMo × Vorlage bauen, Kriterien mit Lehrkräften gegenlesen
- [x] Skill-Builder (in der Oberfläche "Vorlagen"): geführt per Fragen, Beispiel als Foto, Prüfliste beim Speichern, Probelauf, Nachschärfen; dazu "Daraus eine Vorlage machen" nach einem Ergebnis im Chat. Seite "Vorlagen" in der Seitenleiste (ansehen, eigene löschen). Mit einem echten Modell durchgespielt (Anlegen, Ausprobieren, Ändern); noch von keiner Lehrkraft erprobt
- [x] Seite "Material": alle erstellten Dateien nach Klasse, Fach und Reihe, mit Suche, Filter nach Klasse und Art, Ansehen, Herunterladen und Auswahl als ZIP
- [ ] Ordner `Wissen/` pro Klasse (eigene Texte und Unterlagen), von der KI per Stichwortsuche lesbar (zuerst ohne Embeddings, an einem echten Beispiel besprechen), siehe #56
- [~] Interaktive Übung (Quiz, Lernpfad) als einzelne Datei, die ohne Internet im Browser läuft, auch am Handy: Werkzeug `uebung_erstellen` und Anleitung `uebung`, Schritte Info, Auswahl, Lückentext, Zuordnen, freie Antwort, Checkliste, Sofort-Rückmeldung mit Erklärung, Punktestand am Ende, nichts wird gespeichert oder gesendet, Vorschau im Schutzraum. Siehe `docs/entscheidungen/018-interaktive-uebung.md`. Mit DeepSeek v4.1 flash durchgespielt. Offen: Ergebnisse an einer Stelle sammeln und Moodle (später, Schule testet noch), Safari, Firefox, Edge, mit echten Lernenden am Handy, Messung mit mehreren Modellen. GSAP und Three.js sind nicht vorgesehen
- [x] Dev-Stift für die Testphase: Stelle auf der Oberfläche markieren, Hinweis schreiben, mit Ort im Code und optional Bildschirmfoto in `Dev-Hinweise/` speichern, als ZIP oder Text exportieren. Nur mit `npm start -- --stift`. Siehe `docs/entscheidungen/022-dev-stift.md`. Bildschirmfoto im echten Browser noch nicht getestet. Die Fassung für Lehrkräfte ist #60
- [x] `/`-Menü im Eingabefeld: Tippt die Lehrkraft `/`, erscheinen alle Anleitungen (mitgelieferte und eigene) mit je einer Zeile, filterbar, mit Pfeiltasten, Enter, Esc und Maus bedienbar, vorgelesen. Auswahl setzt „Nutze die Anleitung „…“: “ ein. Nicht mit einer Lehrkraft erprobt
- [x] Rückkanal: „Passt“ und „Passt nicht“ unter jedem Material, mit einem Satz bei „Passt nicht“, gespeichert beim Gespräch und nur auf diesem Computer, Export als Datei ohne Gesprächstext (Einstellungen, Datenschutz). Siehe `docs/entscheidungen/020-rueckkanal.md`. Nicht von einer Lehrkraft in der Praxis erprobt
- [ ] Wissensordner pro Klasse mit Knopf „Wissen auffrischen“ (#56)
- [~] Sperrliste für Modelle, die nicht verlässlich genug arbeiten (Mechanismus fertig und an allen Stellen erzwungen, die Liste ist leer). Offen: Modelle eintragen, sobald alle Anleitungen gemessen sind und eine Schwelle festliegt (#16). Siehe `docs/entscheidungen/014-sperrliste.md`
- [x] Schulkopf auf allem Material: Name der Schule und Logo (in Grau) im Kopf von Arbeitsblatt, Klausur, Erwartungshorizont, Lernsituation und Stundenverlauf, als PDF und Word. Einstellungen, Reiter "Schule". Siehe `docs/entscheidungen/013-schulkopf.md`
- [x] Alte Anhänge und Bilder verlassen das Gedächtnis des Modells (Hinweis statt Inhalt ab halbvollem Gedächtnis, letzte Runde bleibt, zu große Nachricht wird mit klarer Meldung abgelehnt, Anzeige unverändert). Siehe `docs/entscheidungen/012-alte-anhaenge-kuerzen.md`
- [x] Formeln im PDF (LaTeX im Text, gesetzt mit MathJax und svg-to-pdfkit, im Satz und abgesetzt, mit Umbruch und Rohtext bei Fehlern; Word folgt in #21). Siehe `docs/entscheidungen/011-formeln-im-pdf.md`
- [ ] Geführter Fragenkatalog für Material (Schulform, Bildungsgang oder Fach und Stufe, Lernfeld, Kursniveau, Bewertung, Anzahl Klausuren)
- [~] Lehrplan hinterlegen (Bildungsgang am BK, Fach und Stufe an Gymnasium und Gesamtschule): Bewertung, schulinterne Hinweise. Bewertung steht: Anforderungsbereiche und Notenschlüssel trägt jede Lehrkraft selbst ein, nichts ist fest (Entscheidung 003). Plan.md steht über den Import (Bildschirm "Lehrpläne", Entscheidung 004). Offen: Hinweise.md (schulinterne Vorgaben) und eine Eingabemaske für die Bewertungsregeln in der Oberfläche
- [~] Bildungsplan-Import: PDF in saubere Markdown-Gliederung umwandeln (Text aus der PDF, Modell formt, Wortlaut wird geprüft, Scans per Bild, Kosten vorab sichtbar), pro Klasse zuordnen, vom Agenten stufenweise lesbar (`lehrplan_lesen`, `lehrplan_suchen`). Siehe `docs/entscheidungen/004-lehrplaene-lesen.md`. Mit einem echten Modell noch nicht erprobt
- [~] Foto oder Screenshot hochladen mit "Bau mir so etwas" (Vision), mit Hinweis zu Namen und Klassenarbeiten. Fertig: Anleitung `foto-nachbauen` (eigene Inhalte statt Abschreiben, Machart und Aufgabenarten der Vorlage), Knopf auf der Startseite des Gesprächs, große Handyfotos werden vor dem Senden verkleinert, Hinweis zu Namen am Bild. Mit DeepSeek v4.1 flash an gezeichneten Beispielblättern gemessen (94 %). Dateien anhängen wie in der Claude-App: mehrere auf einmal, per Ziehen ins Fenster, Einfügen oder Knopf; PDF (Scans werden als Bild gelesen), Word, OpenOffice, Excel (xlsx, xls), ods, csv, PowerPoint, Folien, Text, RTF, HTML (siehe `docs/entscheidungen/007-dateien-anhaengen.md`). Nicht getestet: echte, schiefe oder handschriftliche Fotos
- [~] Gesamtes Material einheitlich in eigener, besonderer Optik (gemeinsame Zeichenschicht `src/core/material/layout.ts`, Arbeitsblatt, Klausur, Erwartungshorizont und Lernsituation stehen, weitere Materialarten folgen)
- [~] Bildbibliothek für Bildschirmfotos (INWI: Word, PowerPoint, Excel, Access, #52): Ordner `Bilder/` mit PNG und Beschreibung der Stellen, Werkzeug `bilder_suchen`, Schaubild `bild` mit nummerierten Rahmen, Liste und Lösung in Arbeitsblatt (PDF, Word) und Präsentation. Siehe `docs/entscheidungen/019-bildbibliothek.md`. Mit einem erfundenen Beispielbild geprüft, mit echten Bildschirmfotos noch nicht. Offen: echte Bilder samt Stellen (lokale Sitzung mit Office), Übung „Wo klickst du?“, Klickpfade im Text, Hinweis bei veralteter Version
- [x] Eigene Schriften für Oberfläche und PDF (Fraunces und Source Sans 3, mitgeliefert, mit Griechisch, Kyrillisch und Sonderbuchstaben), Oberfläche überarbeitet: Eingabefeld als eine Karte, ruhige Seitenleiste, Menü auf schmalen Fenstern

## Phase 4: Dashboard

- [x] Stundenplan per iCal (Datei oder Link), grafisch aufbereitet (mit eigener Beispieldatei getestet, noch nicht mit einem echten UNTIS-Export)
- [x] Wochenübersicht: Was steht an, wo fehlt Material
- [x] Drag-and-Drop: Material auf eine Stunde ziehen, Datei landet im Reihen-Ordner und in der Stundentabelle
- [x] Startseite "Start" mit Überblick über alle Klassen

## Querschnitt: Barrierefreiheit

- [x] Oberfläche mit axe-core auf WCAG 2.2 AA geprüft (Start, Gespräch, Vorlagen, Lehrpläne, Einstellungen, Neue Klasse, Stundendetails, Handy-Breite): keine Verstöße. Kontrastprüfung der Farben als Test (`src/web/contrast.test.ts`), Dialog mit Tastaturführung, Menü auf dem Handy per Tastatur bedienbar, keine seitliche Rollleiste bei 320 px
- [x] Einstellungen wie in der Claude-App mit vier Reitern: Aussehen (hell, dunkel oder wie der Computer, vier Akzentfarben, ruhige Oberfläche ohne Bewegung), Ordner (Datenordner anzeigen, im Finder/Explorer öffnen, an einen anderen Ort kopieren, zurück zum Standard; unter macOS mit Auswahlfenster), KI-Anbieter, Datenschutz. Kontrast aller Farbkombinationen als Test, axe ohne Befund in hell und dunkel. Nicht getestet: das Auswahlfenster unter macOS und das Öffnen im Finder (hier nur Linux)
- [x] Einführung beim ersten Start in vier Schritten: Willkommen (was Pult kann, was auf dem Computer bleibt), KI einrichten (mit Hilfe "Wo bekomme ich einen Schlüssel?" je Anbieter), Aussehen, "Womit anfangen?" (Stundenplan laden, Klasse anlegen oder loslegen). Auch ohne KI durchspielbar. Mit echtem Schlüssel und im Demo-Modus durchgespielt, axe ohne Befund. Noch von keiner Lehrkraft erprobt; die Links zu den Schlüsselseiten der Anbieter sind aus dem Gedächtnis eingetragen und nicht geprüft
- [x] Verbindungsprobleme (`docs/entscheidungen/008-verbindungsprobleme.md`): Fehler werden nach Ursache erkannt (Zugang, Guthaben, Bremse, Überlastung, kein Netz, Abbruch mitten in der Antwort, stumme Leitung, Sperre), kurze Störungen wiederholt Pult bis zu dreimal selbst und sagt es im Chat, der halbe Text wird zurückgenommen, "Nochmal versuchen" macht ohne zweite Frage weiter, Hinweisleiste bei fehlendem Internet. Mit einem absichtlich fehlerhaften Testserver geprüft (Tests und Browser); mit echten Anbietern nur die Fehlertexte, die uns bekannt sind
- [x] Fragensystem: Der Assistent sammelt fehlende Angaben und stellt sie einzeln nacheinander (1 bis 4 Fragen, je mit Antwortknöpfen, "Etwas anderes", **immer mit empfohlener Antwort und Grund**, "Alle Empfehlungen übernehmen", "Überspringen"). Siehe `docs/entscheidungen/009-fragen-an-die-lehrkraft.md`. Mit DeepSeek V4.1 flash und im Browser geprüft, andere Modelle nicht
- [x] Rückmeldungen aus dem ersten Test (2026-10-06): Chatfenster und Seitenleiste scrollen jetzt im Fenster, Stundenplan als Zeitraster (gleiche Anfangszeiten stehen auf einer Höhe, Aufsichten vor 8 Uhr bekommen eine eigene frühe Zeile), Klasse direkt an der Stunde zuordnen (mit "Gehört nicht zu mir" und "Neue Klasse anlegen"), Verbindungstest zeigt die Ursache (Zertifikat, Sperre, Name) und technische Angaben, OpenCode-Kennung wird mitgeschickt, `npm start` nutzt die Zertifikate und den Proxy des Computers. Ob OpenCode Go und OpenRouter im Schulnetz damit laufen, ist nicht bestätigt
- [x] Schaubilder im Arbeitsblatt: Ablauf, Aufbau (Hierarchie), Kreislauf, Zeitstrahl, Säulendiagramm. Die KI liefert Kästchen und Pfeile, das Programm ordnet und zeichnet sie (Vektor, Graustufen, auch als Bild in Word). Kästchen lassen sich leer lassen (zum Ausfüllen, mit Nummer, Wortbank und Lösung für die Lehrkraft), Säulen lassen sich von den Schülern zeichnen. Echte Bilder und Fotos gehören noch nicht dazu
- [x] Fenster-Skizze (`oberflaeche`, Schaubild für Arbeitsblatt, Folien und Word): Skizze eines Programmfensters mit bis zu sieben benannten Bereichen (Titelleiste, Menüband, Seitenleisten, Arbeitsfläche, Bereich darunter, Statusleiste), beschriftet oder zum Beschriften (nummeriert, Wortbank, Lösung). Zeigt, wo etwas liegt, kein echtes Bild des Programms. Echte Bildschirmfotos (eigene oder eine Sammlung der Schule) sind offen, zusammen mit Bildern im Material (#22)
- [x] Rückmeldungen zu Arbeitsblättern (2026-10-06): Anleitung neu geschrieben (Material zum Einstieg, Aufgaben in Stufen, Sicherung, Schaubilder, Differenzierung; Umfang nach Inhalt statt "höchstens zwei Seiten"), eine Karte je Material mit Knöpfen für Blatt, Lösung und Word statt vier einzelner Karten, "Gespräch exportieren" (Textdatei mit Werkzeugaufrufen, zum Weitergeben von Rückmeldung), lange Abläufe in Reihen. Mit DeepSeek V4.1 flash geprüft: vier Seiten mit Material, Merkkasten, Schaubild zum Ausfüllen, acht Aufgaben. Ob das Blatt fachlich und didaktisch gut ist, kann nur eine Lehrkraft sagen
- [x] Mehrere Blätter als ZIP: "Alles als ZIP herunterladen" unter jeder Antwort mit mehreren Dateien und im Fenster einer Stunde. Kreisläufe mit eigenen, beschrifteten Pfeilen in beide Richtungen (Güter und Geld zwischen Haushalten und Unternehmen), Pfeilbeschriftungen lassen sich leer lassen. Aus dem ersten echten Blatt der Lehrkraft gelernt (Aufgabe "Beschrifte die Pfeile" ohne Platz für die Beschriftung)
- [x] Stundenplan nach Klassen eingefärbt: eine Farbe pro Klasse (acht Farben, hell und dunkel, Kontrast als Test), mit Farbleiste über dem Plan, Punkt in der Seitenleiste und Farbstreifen an den Klassenkarten. Die Farbe folgt der Reihenfolge der Klassennamen; kommt eine Klasse hinzu, können sich Farben verschieben
- [x] Seiten, die höher sind als das Fenster (Einstellungen, Vorlagen, Lehrpläne), lassen sich scrollen
- [x] Anbieter OpenCode Go, bei OpenRouter DeepSeek, GLM, Qwen, MiMo und Kimi als empfohlene Modelle (Verbindungstest bestanden), Suche in der Liste aller Modelle. OpenCode Go ist ohne Schlüssel nicht getestet
- [ ] Prüfung mit einem echten Screenreader und mit Schriftvergrößerung des Systems (noch nicht gemacht, axe findet nur einen Teil der Probleme)

## Phase 5: Erweiterungen

- [ ] E-Mail und iServ im Dashboard
- [~] Erklärstücke und Motion Graphics: erst als eigenständige HTML-Datei (Szenenbeschreibung vom Modell, Look und Takt vom Programm, #14), danach MP4 aus derselben Animation (Bild für Bild mit `seek(t)`, Kodierer des Browsers, keine Zusatzinstallation). Standard ohne Stimme. Siehe `docs/entscheidungen/017-erklaerstuecke-html-dann-mp4.md`. Fertig (HTML, #14): Werkzeug `erklaerstueck_erstellen` und Anleitung `erklaerstueck`, Katalog v0 (Text, Kasten, Zahl, Pfeil, Sonne, Wolke, Hügel, Wasser) auf einem Raster aus neun Plätzen, Wasserfarben-Look, Steuerung per Knopf und Tastatur, ohne Bewegung bei „weniger Bewegung“, Vorschau im Schutzraum, Datei läuft ohne Internet. Mit DeepSeek v4.1 flash durchgespielt, in Chromium angesehen. Offen: Safari, Firefox und Edge, flüssiges Abspielen am Beamer, Kreislauf und Zeitstrahl aus den Schaubildern, Messung mit mehreren Modellen (Vortest mit Jev gelaufen, Zahlen nicht belastbar), MP4
  - Offen vorab für MP4: H.264 im Kodierer von Electron auf Mac und Windows (sonst WebM), Rechenzeit der Wasserfarben-Filter
- [ ] Sitzplan pro Klasse: Foto vom aufgemalten Plan, die App erkennt die Tische, die Lehrkraft korrigiert in einem kleinen Editor. Erst nur das Raumlayout mit Platznummern, ohne Namen (Datenschutz, siehe Offene Fragen)
- [ ] Voice-Eingabe, um mit dem Assistenten zu sprechen
- [ ] Optional: Sprachausgabe (z. B. Voice Studio), nur auf ausdrücklichen Wunsch

## Phase 6: Ausrollen für Kollegen

- [~] Probelauf mit zwei bis drei Kolleginnen und Kollegen: Anleitung `docs/probelauf.md` und Rückmeldebogen `docs/probelauf-rueckmeldebogen.docx` (`npm run bogen`) stehen. Offen: Test mit einer Person, die Pult nicht kennt (beobachtet, nicht erklärt), `npm start` auf Windows, Test des Bogens in Word
- [x] Einrichtung für Tester: OpenRouter vorausgewählt, Erklärung in einfachen Worten offen, Hinweis bei falsch eingefügtem Schlüssel, Version und Stand unten in den Einstellungen
- [~] Paket für Tester: `npm run zip` baut eine ZIP mit „Pult starten“ (Doppelklick für Windows und Mac, richtet sich beim ersten Start selbst ein, öffnet den Browser). Siehe `docs/weitergeben.md`. Auf Linux durchgespielt (auspacken, einrichten, starten, Seite wird ausgeliefert); Doppelklick auf echtem Windows und Mac, SmartScreen und Gatekeeper noch nicht getestet
- [~] Schritt-für-Schritt-Anleitung mit FAQ für Tester: `docs/anleitung-tester.md` (nie auf echtem Windows/Mac von einer fremden Person durchgespielt). OpenRouter-Anleitung `docs/openrouter-anleitung.md` (mit sechs Bildschirmfotos der echten Oberfläche, persönliche Angaben geschwärzt). Schlüssel-Empfehlung für Tester: `docs/schluessel-empfehlung.md` (OpenRouter + DeepSeek V4.1 flash, gemessen). Arbeitsweise für Yannik mit Stift und Claude Code: `docs/entwicklung-lokal.md`
- [ ] Installer als normales Programm, Mac und Windows
- [ ] Login und DSGVO-konformes Backend (EU-Hosting, Auftragsverarbeitung, Auswahl nach Datenschutz kennzeichnen)
- [ ] Abstimmung mit Schulleitung und Datenschutzbeauftragten
- [ ] Optional: Schülerebene, lokal und pseudonymisiert, nur nach Rücksprache mit der Schule

## Offene Fragen

- Sitzplan: Ein echter Sitzplan enthält Namen. Das verträgt sich nicht mit der Regel "keine Schülernamen in Prompts". Vorschlag: Das Modell sieht nur das Layout (Foto mit abgedeckten Namen), Namen trägt die Lehrkraft lokal ein und sie verlassen den Rechner nie. Braucht eine Entscheidung und eine Entscheidungsdatei, bevor es gebaut wird.

- Wie wird das Fähigkeits-Testbild beim Provider-Test gestaltet?
- Welche Lizenz soll der Harness langfristig haben, falls Teile aus anderen Projekten dazukommen?
- Wie viel vom Video-Baukasten der Lernapp lässt sich als Skill übernehmen?
