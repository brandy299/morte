# Roadmap: morte

Ein schlanker KI-Arbeitsplatz für Lehrkräfte. Aufbau und Ruhe wie die Claude-App, aber mit geführter Materialerstellung, Klassenstruktur und Stundenplan-Dashboard. Gedacht für Kolleginnen und Kollegen, die mit freiem Prompting wenig anfangen können.

Stand: 2026-10-05 · Status der Phasen: `[ ]` offen, `[~]` in Arbeit, `[x]` fertig

## Leitplanken

- **Einfach vor mächtig.** Jede Funktion muss ohne Fachvokabular bedienbar sein. Technik wie Terminal, Diffs oder Berechtigungsdialoge in Entwicklersprache sieht man nirgends.
- **Geführt statt frei.** Material entsteht über Fragen, Vorlagen und Skills, nicht über leere Eingabefelder.
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

- [ ] Tech-Stack festlegen (Vorschlag: lokale Web-App mit Node/TypeScript, Start im Browser auf localhost, Verpackung als Desktop-Programm erst in Phase 6)
- [ ] Agentenkern wählen: eigene schlanke Schleife oder offener Kern als Basis (Optionen vorher prüfen, inkl. Multi-Provider-Fähigkeit)
- [ ] Lizenzfrage klären: Dieses Repo steht unter Apache-2.0. Code aus AGPL-Projekten (z. B. Odysseus) wird nicht übernommen, nur Ideen und Vorgehen.
- [ ] Plattform: Mac zuerst, Windows von Anfang an mitdenken (viele Schulen nutzen Windows)
- [ ] Projektname, Logo und Designrichtung festlegen
- [ ] `CLAUDE.md` und `docs/ordnerstruktur.md` im Repo (angelegt)

## Phase 1: Chat-Kern

- [ ] Oberfläche mit Chat, großem Eingabefeld und Streaming
- [ ] Fortschrittsanzeige bei der Arbeit: pulsierender Statuspunkt, Zeile mit dem aktuellen Schritt, abhakende Schrittliste, Vorschau, die sich live aufbaut
- [ ] Provider-Schicht: Adapter für Claude und für das OpenAI-Format
- [ ] API-Keys im Schlüsselbund, nie im Code oder im Repo
- [ ] Einrichtung mit "Verbindung testen": prüft Bilder (Vision) und Dateiaufgabe (Tool-Calling), Ergebnis "Passt" oder verständlicher Hinweis
- [ ] Kurze Liste empfohlener Modelle, Rest unter "Erweitert"

## Phase 2: Ordnerstruktur und Klassen

- [ ] Arbeitsordner nach `docs/ordnerstruktur.md` anlegen
- [ ] Seitenleiste als Baum: Klasse, Fach, Reihe (ohne Dateipfade)
- [ ] Assistent "Neue Klasse anlegen" (Fragenkatalog)
- [ ] `Stand.md` pro Klasse und Fach, wird nach jeder Sitzung kurz überschrieben
- [ ] `Reihe.md` mit Stundentabelle und festen Status-Wörtern (`geplant`, `Material fertig`, `gehalten`)
- [ ] Abfragen wie "Wo stehen wir in 11a?" und "Wo fehlt noch Material?"

## Phase 3: Materialerstellung

- [ ] Vorschau rechts, Download als PDF, Graustufen-tauglich, wenige Seiten
- [ ] Mitgelieferte Skills und Vorlagen: Arbeitsblatt, Klausur mit Erwartungshorizont, Merkblatt, Lernsituation
- [ ] Geführter Fragenkatalog für Material (Bildungsgang, Lernfeld, Bewertung, Anzahl Klausuren)
- [ ] Bildungsgang hinterlegen: Bewertung, schulinterne Hinweise
- [ ] Bildungsplan-Import: PDF per OCR in Markdown umwandeln, Material passt zum Plan
- [ ] Foto oder Screenshot hochladen mit "Bau mir so etwas" (Vision), mit Hinweis zu Namen und Klassenarbeiten
- [ ] Gesamtes Material einheitlich in eigener, besonderer Optik

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

- Welcher Agentenkern passt (eigene Schleife oder bestehendes Projekt)?
- Wie wird das Fähigkeits-Testbild beim Provider-Test gestaltet?
- Welche Lizenz soll der Harness langfristig haben, falls Teile aus anderen Projekten dazukommen?
- Wie viel vom Video-Baukasten der Lernapp lässt sich als Skill übernehmen?
