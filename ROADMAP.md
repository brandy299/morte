# Roadmap: morte

Ein schlanker KI-Arbeitsplatz für Lehrkräfte. Aufbau und Ruhe wie die Claude-App, aber mit geführter Materialerstellung, Klassenstruktur und Stundenplan-Dashboard. Gedacht für Kolleginnen und Kollegen, die mit freiem Prompting wenig anfangen können.

Stand: 2026-10-05 · Status der Phasen: `[ ]` offen, `[~]` in Arbeit, `[x]` fertig

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
- [ ] Projektname, Logo und Designrichtung festlegen
- [ ] `CLAUDE.md` und `docs/ordnerstruktur.md` im Repo (angelegt)

## Phase 1: Chat-Kern

- [x] Oberfläche mit Chat, großem Eingabefeld und Streaming
- [x] Fortschrittsanzeige bei der Arbeit (Statuspunkt, aktuelle Zeile, Schrittliste und ein Platzhalter-Blatt in der Vorschau, bis das Material fertig ist; kein echter Live-Aufbau): pulsierender Statuspunkt, Zeile mit dem aktuellen Schritt, abhakende Schrittliste, Vorschau, die sich live aufbaut
- [x] Verbrauch (Tokens, geschätzte Kosten, Monatssumme), Kontext-Füllstand und Guthaben (nur wo der Anbieter es hergibt: DeepSeek, OpenRouter) versteckt hinter einem kleinen Ring am Eingabefeld
- [x] Bilder anhängen (Büroklammer, Ziehen, Einfügen) mit Datenschutz-Hinweis. PDF und Word folgen in Phase 3
- [x] Gesprächsverlauf: frühere Gespräche in der Seitenleiste, wieder öffnen (mit Schritten, Dateien und Verbrauch) und löschen. Gespeichert unter `Gespräche/` im Datenordner, nur auf diesem Computer
- [x] Lange Gespräche: Ab etwa 80 Prozent Kontext-Füllstand den älteren Teil automatisch zusammenfassen, die letzten Beiträge bleiben wörtlich. Hinweis in einfacher Sprache, keine Rückfrage. Bei "Eingabe zu lang" vom Anbieter einmal erneut versuchen (Ideen aus `docs/recherche-harnesse.md`). Der Hinweis erscheint als Schritt in der Schrittliste; scheitert die Zusammenfassung, läuft das Gespräch unverändert weiter
- [x] Provider-Schicht über `pi-ai`, gekapselt in `src/core/agent`: Claude, OpenAI, OpenRouter, DeepSeek und jeder OpenAI-kompatible Server (Schulserver, LM Studio, Ollama), geprüft gegen einen echten HTTP-Mock mit Streaming und Werkzeugaufruf. http:// nur für den eigenen Computer und private Adressen Mit einem echten Modell (OpenRouter, Claude Haiku 4.5) geprüft: Verbindungstest, Reihe planen, Arbeitsblatt erstellen und in die Stundentabelle eintragen, Lehrplan umwandeln.
- [x] API-Keys im Schlüsselbund, nie im Code oder im Repo
- [x] Einrichtung mit "Verbindung testen": prüft Bilder (Vision) und Dateiaufgabe (Tool-Calling), Ergebnis "Passt" oder verständlicher Hinweis
- [x] Kurze Liste empfohlener Modelle, Rest unter "Erweitert"

## Phase 2: Ordnerstruktur und Klassen

- [x] Arbeitsordner nach `docs/ordnerstruktur.md` anlegen (`~/morte-daten`, beim Start)
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
- [~] Qualitätsprüfung: Kriterienlisten (P/R/O/M) und Testsätze pro Skill, Auswertung durch ein KI-Modell als Prüfer, bei jeder Skill-Änderung und jedem Modellwechsel. Gerüst fertig (`npm run eval`, `evals/`), erste Messung mit Haiku 4.5 und Sonnet 4.5 in `evals/BASELINE.md`. Offen: Kriterien mit Lehrkräften gegenlesen, mehrfache Läufe (`--wdh`), stärkeres Modell für das Material messen, Anleitungen Bewertung und Vorlage-bauen prüfen
- [x] Skill-Builder (in der Oberfläche "Vorlagen"): geführt per Fragen, Beispiel als Foto, Prüfliste beim Speichern, Probelauf, Nachschärfen; dazu "Daraus eine Vorlage machen" nach einem Ergebnis im Chat. Seite "Vorlagen" in der Seitenleiste (ansehen, eigene löschen). Mit einem echten Modell durchgespielt (Anlegen, Ausprobieren, Ändern); noch von keiner Lehrkraft erprobt
- [ ] Geführter Fragenkatalog für Material (Schulform, Bildungsgang oder Fach und Stufe, Lernfeld, Kursniveau, Bewertung, Anzahl Klausuren)
- [~] Lehrplan hinterlegen (Bildungsgang am BK, Fach und Stufe an Gymnasium und Gesamtschule): Bewertung, schulinterne Hinweise. Bewertung steht: Anforderungsbereiche und Notenschlüssel trägt jede Lehrkraft selbst ein, nichts ist fest (Entscheidung 003). Plan.md steht über den Import (Bildschirm "Lehrpläne", Entscheidung 004). Offen: Hinweise.md (schulinterne Vorgaben) und eine Eingabemaske für die Bewertungsregeln in der Oberfläche
- [~] Bildungsplan-Import: PDF in saubere Markdown-Gliederung umwandeln (Text aus der PDF, Modell formt, Wortlaut wird geprüft, Scans per Bild, Kosten vorab sichtbar), pro Klasse zuordnen, vom Agenten stufenweise lesbar (`lehrplan_lesen`, `lehrplan_suchen`). Siehe `docs/entscheidungen/004-lehrplaene-lesen.md`. Mit einem echten Modell noch nicht erprobt
- [~] Foto oder Screenshot hochladen mit "Bau mir so etwas" (Vision), mit Hinweis zu Namen und Klassenarbeiten. Fertig: Anleitung `foto-nachbauen` (eigene Inhalte statt Abschreiben, Machart und Aufgabenarten der Vorlage), Knopf auf der Startseite des Gesprächs, große Handyfotos werden vor dem Senden verkleinert, Hinweis zu Namen am Bild. Mit DeepSeek v4.1 flash an gezeichneten Beispielblättern gemessen (94 %). Nicht getestet: echte, schiefe oder handschriftliche Fotos
- [~] Gesamtes Material einheitlich in eigener, besonderer Optik (gemeinsame Zeichenschicht `src/core/material/layout.ts`, Arbeitsblatt, Klausur, Erwartungshorizont und Lernsituation stehen, weitere Materialarten folgen)
- [x] Eigene Schriften für Oberfläche und PDF (Fraunces und Source Sans 3, mitgeliefert, mit Griechisch, Kyrillisch und Sonderbuchstaben), Oberfläche überarbeitet: Eingabefeld als eine Karte, ruhige Seitenleiste, Menü auf schmalen Fenstern

## Phase 4: Dashboard

- [x] Stundenplan per iCal (Datei oder Link), grafisch aufbereitet (mit eigener Beispieldatei getestet, noch nicht mit einem echten UNTIS-Export)
- [x] Wochenübersicht: Was steht an, wo fehlt Material
- [x] Drag-and-Drop: Material auf eine Stunde ziehen, Datei landet im Reihen-Ordner und in der Stundentabelle
- [x] Startseite "Start" mit Überblick über alle Klassen

## Querschnitt: Barrierefreiheit

- [x] Oberfläche mit axe-core auf WCAG 2.2 AA geprüft (Start, Gespräch, Vorlagen, Lehrpläne, Einstellungen, Neue Klasse, Stundendetails, Handy-Breite): keine Verstöße. Kontrastprüfung der Farben als Test (`src/web/contrast.test.ts`), Dialog mit Tastaturführung, Menü auf dem Handy per Tastatur bedienbar, keine seitliche Rollleiste bei 320 px
- [ ] Prüfung mit einem echten Screenreader und mit Schriftvergrößerung des Systems (noch nicht gemacht, axe findet nur einen Teil der Probleme)

## Phase 5: Erweiterungen

- [ ] E-Mail und iServ im Dashboard
- [ ] Erklärvideos über die bestehende Render-Pipeline (Szenendatei, Vorschaubogen, MP4), Standard ohne Stimme
- [ ] Sitzplan pro Klasse: Foto vom aufgemalten Plan, die App erkennt die Tische, die Lehrkraft korrigiert in einem kleinen Editor. Erst nur das Raumlayout mit Platznummern, ohne Namen (Datenschutz, siehe Offene Fragen)
- [ ] Voice-Eingabe, um mit dem Assistenten zu sprechen
- [ ] Optional: Sprachausgabe (z. B. Voice Studio), nur auf ausdrücklichen Wunsch

## Phase 6: Ausrollen für Kollegen

- [ ] Installer als normales Programm, Mac und Windows
- [ ] Login und DSGVO-konformes Backend (EU-Hosting, Auftragsverarbeitung, Auswahl nach Datenschutz kennzeichnen)
- [ ] Abstimmung mit Schulleitung und Datenschutzbeauftragten
- [ ] Optional: Schülerebene, lokal und pseudonymisiert, nur nach Rücksprache mit der Schule

## Offene Fragen

- Sitzplan: Ein echter Sitzplan enthält Namen. Das verträgt sich nicht mit der Regel "keine Schülernamen in Prompts". Vorschlag: Das Modell sieht nur das Layout (Foto mit abgedeckten Namen), Namen trägt die Lehrkraft lokal ein und sie verlassen den Rechner nie. Braucht eine Entscheidung und eine Entscheidungsdatei, bevor es gebaut wird.

- Wie wird das Fähigkeits-Testbild beim Provider-Test gestaltet?
- Welche Lizenz soll der Harness langfristig haben, falls Teile aus anderen Projekten dazukommen?
- Wie viel vom Video-Baukasten der Lernapp lässt sich als Skill übernehmen?
