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
- [~] Fortschrittsanzeige bei der Arbeit (Statuspunkt, aktuelle Zeile und Schrittliste stehen, Live-Vorschau folgt in Phase 3): pulsierender Statuspunkt, Zeile mit dem aktuellen Schritt, abhakende Schrittliste, Vorschau, die sich live aufbaut
- [x] Verbrauch (Tokens, geschätzte Kosten, Monatssumme), Kontext-Füllstand und Guthaben (nur wo der Anbieter es hergibt: DeepSeek) versteckt hinter einem kleinen Ring am Eingabefeld
- [x] Bilder anhängen (Büroklammer, Ziehen, Einfügen) mit Datenschutz-Hinweis. PDF und Word folgen in Phase 3
- [~] Provider-Schicht über `pi-ai`, gekapselt in `src/core/agent` (Claude, OpenAI, DeepSeek stehen, OpenAI-kompatibel fehlt noch)
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
- [~] Mitgelieferte Skills neu schreiben, Bauweise nach `anthropics/k12-teacher-skills`, Inhalt für deutsche Schulen und Berufskollegs. Fertig: Arbeitsblatt. Offen: Stunde planen, Lernsituation, Klausur mit EHZ, Differenzieren, Stunde vorbereiten, Verständnis-Check
- [ ] Qualitätsprüfung: Kriterienlisten (P/R/O/M) und Testsätze pro Skill, Auswertung durch ein KI-Modell als Prüfer, bei jeder Skill-Änderung und jedem Modellwechsel
- [ ] Skill-Builder: geführt per Fragen, Beispiel hochladen, Probelauf, Nachschärfen; dazu "Daraus eine Vorlage machen" nach einem guten Chat-Ergebnis
- [ ] Geführter Fragenkatalog für Material (Schulform, Bildungsgang oder Fach und Stufe, Lernfeld, Kursniveau, Bewertung, Anzahl Klausuren)
- [ ] Lehrplan hinterlegen (Bildungsgang am BK, Fach und Stufe an Gymnasium und Gesamtschule): Bewertung, schulinterne Hinweise
- [ ] Bildungsplan-Import: PDF per OCR in Markdown umwandeln, Material passt zum Plan
- [ ] Foto oder Screenshot hochladen mit "Bau mir so etwas" (Vision), mit Hinweis zu Namen und Klassenarbeiten
- [~] Gesamtes Material einheitlich in eigener, besonderer Optik (Arbeitsblatt steht, Klausur und weitere Materialarten folgen)

## Phase 4: Dashboard

- [ ] Stundenplan per iCal-Synchronisierung (UNTIS), grafisch aufbereitet
- [ ] Wochenübersicht: Was steht an, wo fehlt Material
- [ ] Drag-and-Drop: Material auf eine Stunde ziehen, Datei landet im Reihen-Ordner und in der Stundentabelle
- [ ] Startseite "Start" mit Überblick über alle Klassen

## Phase 5: Erweiterungen

- [ ] E-Mail und iServ im Dashboard
- [ ] Erklärvideos über die bestehende Render-Pipeline (Szenendatei, Vorschaubogen, MP4), Standard ohne Stimme
- [ ] Voice-Eingabe, um mit dem Assistenten zu sprechen
- [ ] Optional: Sprachausgabe (z. B. Voice Studio), nur auf ausdrücklichen Wunsch

## Phase 6: Ausrollen für Kollegen

- [ ] Installer als normales Programm, Mac und Windows
- [ ] Login und DSGVO-konformes Backend (EU-Hosting, Auftragsverarbeitung, Auswahl nach Datenschutz kennzeichnen)
- [ ] Abstimmung mit Schulleitung und Datenschutzbeauftragten
- [ ] Optional: Schülerebene, lokal und pseudonymisiert, nur nach Rücksprache mit der Schule

## Offene Fragen

- Wie wird das Fähigkeits-Testbild beim Provider-Test gestaltet?
- Welche Lizenz soll der Harness langfristig haben, falls Teile aus anderen Projekten dazukommen?
- Wie viel vom Video-Baukasten der Lernapp lässt sich als Skill übernehmen?
