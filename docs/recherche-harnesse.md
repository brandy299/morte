# Recherche: andere Harnesse und Projekte

Stand: 2026-10-05 · Quelle: GitHub-Suche und README-Seiten. Lizenzen laut GitHub-Angabe, vor einer Übernahme jeweils in der `LICENSE`-Datei prüfen. Ideen dürfen übernommen werden, Code nur aus Apache-2.0, MIT und ähnlichen Lizenzen mit Namensnennung, nie aus AGPL (siehe `CLAUDE.md`).

Zweite Runde am 2026-10-05: skills.sh und opencode.ai waren jetzt erreichbar und sind unten ausgewertet. Nicht gelesen wurde der Quelltext von OpenCode (GitHub-Zugriff in dieser Sitzung nur für Pult). Was nur aus dem Quelltext hervorginge, ist als "nicht belegt" markiert.

## Harnesse und Agenten-Apps

| Projekt | Lizenz | Was es ist | Nutzen für Pult |
|---|---|---|---|
| anomalyco/opencode | MIT (LICENSE geprüft) | Quelloffener Coding-Agent (TypeScript), Oberfläche im Terminal, als Desktop-App und im Browser | Siehe Abschnitt "OpenCode, ausgewertet". Zwei Ideen sind brauchbar: automatisches Zusammenfassen bei vollem Kontext und der Skill-Aufbau |
| nexu-io/open-design | Apache-2.0 | Design-Arbeitsplatz für Agenten, Skills im `SKILL.md`-Format, Gestaltungsregeln als `DESIGN.md`, Export HTML, PDF, PPTX | Idee der portablen Designvorgaben als Markdown-Datei passt zu `Vorlagen/Designvorgaben.md`. Technik passt nicht: braucht installierte Agenten-Programme, Node 24, pnpm |
| wshobson/agents | MIT | Sammlung von Plugins und Skills für viele Agenten-Programme | Ideen für Skill-Zuschnitt, nicht verwendbar ohne Prüfung |
| shichenzhe/Tianshu | MIT | Lokaler Electron-Arbeitsplatz mit Chat, Skills, Gedächtnis, MCP | Sehr klein (0 Sterne), nur als Ideengeber für Electron-Aufbau |
| code-yeongyu/senpi | MIT | Abwandlung von pi mit Erweiterungen | Zeigt, wie pi erweitert wird. Nicht nötig |
| pi-desktop (vastsa) | LGPL-3.0 | Siehe Entscheidung 001 | Nur Ideen |

## Schulbezogen

| Projekt | Lizenz | Was es ist | Hinweis |
|---|---|---|---|
| FWU-DE/ais-chat | **AGPL-3.0** | KI-Chatbot für Schulen in Deutschland, selbst gehostet (Docker, Keycloak, PostgreSQL), Projekte nach Bundesland, Rollen für Lehrkräfte und Verwaltung | Nur Ideen, kein Code. Zeigt die Gegenrichtung (Server für die Schule). Pult bleibt lokal und für eine Person |
| Kleine Lehrer-Assistenten (Streamlit, K-12) | verschieden | Meist Prototypen mit wenigen Sternen | Kein Vorbild für Qualität erkennbar |

## Skills-Sammlungen

- **anthropics/skills:** Lizenz je Ordner verschieden. `frontend-design` und `canvas-design` stehen unter Apache-2.0 (Lizenzdatei geprüft). `pdf` steht unter einer geschlossenen Anthropic-Lizenz (kein Kopieren, keine abgeleiteten Werke) und braucht Python, Tesseract und poppler. Das passt weder zur Lizenzregel noch zu "Alles in der App".
- **awesome-claude-skills (ComposioHQ), awesome-opencode:** Verzeichnisse. Lizenzen der einzelnen Skills sind einzeln zu prüfen.

## OpenCode, ausgewertet

Quelle: opencode.ai/docs und opencode.ai/v2/docs, Stand 2026-10-05. Es ist ein Coding-Agent mit Terminal-Oberfläche, Befehlen wie `/undo` und `/export`, Git-Verwaltung und freier Shell. Für Lehrkräfte ist das die falsche Oberfläche. Die Technik dahinter liefert aber Ideen.

- **Verbrauch und Kontext-Anzeige:** In den Docs steht dazu nichts. Es gibt nur eine Tastenkombination, die eine Seitenleiste ein- und ausblendet, und eine Statusansicht. Was dort genau steht (Tokens, Kosten, Füllstand), ist nur aus dem Quelltext zu erfahren und hier **nicht belegt**. Pult hat die Anzeige ohnehin schon gebaut (Commit "Verbrauch, Kontext-Füllstand und Bildanhänge im Chat"), der Bedarf ist also gedeckt.
- **Automatisches Zusammenfassen ("Compaction"):** Nähert sich ein Gespräch dem Limit des Modells, ersetzt OpenCode den älteren Teil durch eine Zusammenfassung und behält die letzten rund 15.000 Tokens wörtlich. Spätere Zusammenfassungen aktualisieren dieselbe Zusammenfassung. Wenn der Anbieter eine Anfrage als zu lang ablehnt, versucht es OpenCode einmal erneut. Docs-Hinweis: das Zusammenfassen verliert Einzelheiten. **Für Pult nützlich**, denn lange Planungsgespräche füllen den Kontext, und die Lehrkraft soll nie eine Fehlermeldung zu "zu langer Eingabe" sehen. In Pult kommt noch dazu, dass wichtige Dinge ohnehin in `Stand.md` und `Reihe.md` stehen, die Zusammenfassung muss also wenig tragen.
- **Zwischenspeicher halten ("Warming"):** Optionale Keep-alive-Anfragen alle vier Minuten, damit der Zwischenspeicher des Anbieters nicht verfällt. Kostet selbst Tokens, standardmäßig aus. Für Pult nicht nötig.
- **Skills:** Gleiches Format wie bei uns (`SKILL.md` mit `name`, `description`, optional `license`, `compatibility`, `metadata`). Name nur Kleinbuchstaben, Ziffern und Bindestriche, höchstens 64 Zeichen, gleich dem Ordnernamen. Beschreibung höchstens 1024 Zeichen. Der Agent sieht nur Name und Beschreibung und lädt den Rest über ein Werkzeug `skill`. OpenCode liest auch `.claude/skills` und `.agents/skills`. Das bestätigt unser Vorgehen in `docs/skills.md`. **Übernehmen:** diese Längenregeln und die Namensprüfung in den Skill-Lader und in die Checkliste des Skill-Builders.
- **Rechte pro Skill:** `allow`, `deny` und `ask`, mit Platzhaltern (`internal-*`). Eine Idee für die spätere Schulebene (Phase 6), zum Beispiel um mitgelieferte Skills auszublenden. Vorher nicht nötig.
- **Eigene Befehle, Plugins, MCP:** Für Pult nicht vorgesehen. Der Agent bekommt feste Werkzeuge.

## goose, ausgewertet

Quelle: README, `CUSTOM_DISTROS.md` und goose-docs.ai, Stand 2026-10-07. Projekt `aaif-goose/goose` (früher Block), jetzt bei der Agentic AI Foundation der Linux Foundation. Lizenz Apache-2.0 (LICENSE geprüft). Allgemeiner KI-Agent als Desktop-App, Befehlszeile und Schnittstelle, in Rust gebaut. Code ist für uns nicht brauchbar (wir sind TypeScript), Ideen schon. Die Seite zu den Berechtigungen ließ sich nicht lesen, dazu ist nichts belegt.

- **Zusammenfassen bei vollem Kontext:** Auto-Compaction bei 80 Prozent des Limits, wie bei uns. Gut zu wissen, dass die Schwelle dort ebenfalls so gewählt ist. **Dazu:** ältere Werkzeug-Ergebnisse werden getrennt gekürzt, neuere bleiben vollständig. Bei uns wächst der Kontext durch gelesene Reihen und Klassen, das könnte sich lohnen. Nicht eilig.
- **Recipes (Rezepte):** Eine Datei beschreibt einen wiederholbaren Auftrag: Titel, Anleitung, Startnachricht, **Parameter mit Typ und Pflichtangabe** (`required`, `optional` mit Standardwert, `user_prompt` = nachfragen), **Aktivitäten als anklickbare Startvorschläge**, Modell, Unteraufträge. Rezepte lassen sich per Link teilen und liegen in einer Bibliothek. Das ist unser Skill plus Fragenkatalog in einem Format. **Für Pult nützlich:** die Parameter-Idee für den "Geführten Fragenkatalog" (Phase 3) und die Startvorschläge je Anleitung.
- **Eigene Verteilungen ("white labelling"):** Eine `init-config.yaml` setzt beim ersten Start Anbieter und Modell vor, Umgebungsvariablen haben Vorrang vor der Konfiguration, Telemetrie lässt sich abschalten. **Für Phase 6 nützlich:** eine Voreinstellungsdatei, mit der die Fachschaft oder Schule Anbieter, Modell und Bewertungsregeln vorgibt, damit Kolleginnen und Kollegen nur noch ihren Zugang eintragen.
- **ACP-Anbieter:** goose nutzt vorhandene Claude- oder ChatGPT-Abos über Zusatzprogramme (Node, Befehlszeilen-Anmeldung). Der Wunsch dahinter (kein Schlüssel nötig) ist richtig, der Weg widerspricht "Alles in der App". Nicht übernehmen.
- **Telemetrie:** goose sendet optional Nutzungsdaten (PostHog). Pult sendet nichts und soll das so lassen.

## DeepSeek Harness, ausgewertet

Quelle: GitHub-Themenseite `deepseek-harness` (20 von 14.287 Einträgen gesehen, Liste über einen Zusammenfasser, nicht einzeln geprüft), dazu README, `SAFETY.md`, `docs/architecture.md` und `docs/subsystems/compaction.md` des Originals `deepseek-ai/deepseek-harness`, Stand 2026-10-08. Lizenz MIT (LICENSE geprüft), TypeScript, "developer preview", die README warnt vor Brüchen. Nicht gelesen: der Code selbst.

**Die Themenseite ist fast nur Lärm.** Die meisten Einträge sind Plugins, Oberflächen und Sammlungen rund um `dsh` (Seitenleisten, Marktplatz, Guthaben-Widget, Speicher-Schichten) oder haben mit dem Thema wenig zu tun. Schulbezug: keiner. Die Sternezahlen (teils 30.000 bis 100.000 bei Projekten mit wenigen Wochen) sind mit Vorsicht zu lesen, ich habe sie nicht geprüft.

**Der Kern von `dsh` ist das Gegenteil von Pult.**
- "Alles ist ein Plugin": Modell, Werkzeuge, Sitzungsprotokoll, sogar die Hauptschleife lassen sich austauschen (Rahmenwerk Cordis). Pult will das Gegenteil: wenige feste Werkzeuge, ein Agent.
- Es ist ein Programmier-Agent. Er führt vom Modell erzeugten Code und Befehle aus. Die eigene `SAFETY.md` sagt, dass Berechtigungsabfragen und Sandbox das nicht sicher machen. Pult schließt genau das aus (keine freie Shell).
- Plugins laufen mit den Rechten der Nutzerin oder des Nutzers. Nicht vereinbar mit "Kolleginnen und Kollegen ohne technischen Hintergrund".

**Was sich trotzdem lohnt (drei unabhängige Quellen sind sich einig):**
1. **Alte Werkzeug-Ergebnisse getrennt kürzen**, nicht nur das Gespräch zusammenfassen. goose kürzt ältere Werkzeug-Ausgaben im Hintergrund, OpenCode hat die Einstellung `prune`, dsh hat einen eigenen "Tool-Result-Pruner". Dazu kommt bei dsh **"Image Offload"**: alte Bilder verlassen das Gedächtnis, ein Platzhalter bleibt. Bei Pult ist das mehr als eine Spielerei: Anhänge können laut `src/core/anhang/extract.ts` bis zu 80.000 Zeichen Text je Nachricht haben (etwa 20.000 Tokens), dazu bis zu acht Bilder. Das bleibt wortwörtlich im Gespräch, bis die Zusammenfassung greift. Ein eigener Server hat standardmäßig nur 32.000 Tokens Gedächtnis. → Issue.
2. **Zusammenfassen mit Spur im Protokoll:** dsh schreibt Anfang, Ergebnis und Ende des Zusammenfassens ins Sitzungsprotokoll, mit einer Sperre, die einen Absturz mittendrin erkennbar macht. Bei Pult liegt das Gedächtnis im Arbeitsspeicher und wird mit dem Gespräch gespeichert. Ein Absturz mittendrin kostet höchstens eine Zusammenfassung. Kein Handlungsbedarf, aber gut zu wissen.
3. **Stabiler Anfang des Prompts:** dsh fügt veränderliche Angaben als eigene Nachricht an, statt den Systemtext zu ändern, damit der Anfang gleich bleibt und der Zwischenspeicher des Anbieters greift (bei DeepSeek bares Geld). Pult ändert den Systemtext im Gespräch nicht, die Voraussetzung ist also erfüllt. Beim Bauen neuer Funktionen beachten: nichts Veränderliches in `SYSTEM_PROMPT` schreiben.

**Was Pult schon hat und dsh auch:** Wieder öffnen eines Gesprächs mit dem Gedächtnis des Modells (`restore`), Zusammenfassen bei vollem Gedächtnis, Rückfragen vor Änderungen, Fortschrittsanzeige aus den Ereignissen, Wiederholung bei Netzfehlern.

**Nicht geprüft:** wie dsh den Nutzer bei langen Aufgaben unterbricht und umlenkt, wie die Plugin-Verwaltung für Nicht-Entwickler aussieht, und ob die Bedienoberfläche etwas Brauchbares kann. Das wäre erst relevant, wenn Pult einmal Erweiterungen von außen zulässt, was nicht geplant ist.

## skills.sh, ausgewertet

Quelle: skills.sh mit Suche (`/api/search`), Seiten zu Einzel-Skills, Sicherheitsprüfungen und Dokumentation. Betreiber ist Vercel. Die Rangliste beruht auf anonymen Installationszahlen der `skills`-Befehlszeile (`npx skills add owner/repo`). Es ist ein Verzeichnis, kein Prüfsiegel: Vercel schreibt selbst, dass es Qualität und Sicherheit der Skills nicht garantiert. Die Sicherheitsseite fasst Prüfungen von drei Diensten zusammen, bei etlichen Skills mit "Med Risk" oder "High Risk".

**Ergebnis der Suche nach Schul-Skills** (Begriffe: teacher, lesson, education, worksheet, quiz, k12, curriculum, unterricht, lehrer, klausur, arbeitsblatt, schule): Es gibt dort nichts, das wir für deutsche Schulen übernehmen könnten.

| Fund | Installationen | Bewertung |
|---|---|---|
| anthropics/k12-teacher-skills (vier Skills) und die Kopie learning-commons-org/agent-skills | 14 bis 135 | Schon ausgewertet in `docs/skills.md`. Die Kopie ist Apache-2.0 (LICENSE geprüft) |
| garethmanning/education-agent-skills | unter 200 | Lizenz **CC BY-SA 4.0** (LICENSE geprüft). Die Share-Alike-Bedingung verträgt sich nicht mit Apache-2.0 für abgeleitete Texte. Nur Ideen, kein Text. Inhalt auf Englisch, mit Verweisen auf Fachliteratur |
| jamesrochabrun/skills (math-teacher, reading-teacher) | 276 bis 854 | Lizenz und Inhalt nicht geprüft, nur die Namen und Zahlen aus der Suche |
| googleworkspace/cli (gws-classroom) | 28.526 | Anbindung an Google Classroom. Nicht nötig, Pult bindet keine Schülerplattform an |
| darius-theodor/klausur-lerncoach, klotzkette/arbeitsblatt-perspektiven-definieren | 1 bis 4 | Deutsche Namen, aber praktisch ungenutzt. Inhalt nicht gelesen. Der zweite gehört laut Ordnername zu einer Sammlung für deutsches Recht, also kein erkennbarer Schulbezug |

**Brauchbar als Vorbild für die Skill-Bauweise:**

- **mattpocock/skills** (MIT, LICENSE geprüft): `writing-great-skills`, `write-a-skill`, `writing-for-agents`. Kernaussage: Ein Skill soll den Ablauf vorhersehbar machen, nicht den Text gleich. Die Beschreibung steht in jedem Gespräch im Kontext und kostet daher Platz. Das deckt sich mit "feste Teile als Skript" und "klare Abgrenzung in der Beschreibung" in `docs/skills.md`. **Übernehmen als Idee** für die Checkliste im Skill-Builder, besonders: wann eine Vorlage nur von Hand gestartet wird und wann der Agent sie selbst wählt.
- **anthropics/skills:** Siehe oben (`frontend-design` und `canvas-design` Apache-2.0, `pdf` geschlossen). `skill-creator` und `pptx` wurden hier nicht auf ihre Lizenz geprüft.

**Für Phase 5 (Erklärvideos):**

- **heygen-com/hyperframes** (Apache-2.0, LICENSE geprüft): Eine Sammlung von Skills, die aus Text ein Erklärvideo bauen, Bild für Bild als HTML, mit eigenem Skill `faceless-explainer` ("faceless" heißt: nur Grafik, kein Sprecher). Das passt zu unserem Standard "Erklärvideo ohne Stimme". Vorgehen dort: Gestaltungssystem wählen, Lerngeschichte planen, Szenen bauen, jeden Schritt vor dem nächsten prüfen. **Bewertung:** Als Vorbild für den Ablauf gut. Als Baustein vorerst ungeeignet, denn die Skills rufen eigene Befehle (`npx hyperframes ...`) auf, ziehen Musik und Bilder aus dem HeyGen-Katalog und fragen vor dem Aktualisieren nach. Das widerspricht "Alles in der App" (Entscheidung 002) und dem Verzicht auf eine freie Shell. Vor einer Übernahme müsste geklärt werden, was davon ohne HeyGen-Konto und ohne Netz läuft und welche Lizenz der Musik- und Bildkatalog hat.
- Außerdem aufgefallen: `remotion-dev/skills`, `remotion-best-practices` (575.000 Installationen). Remotion ist ein Video-Baukasten mit React. Lizenz und Kosten wurden hier **nicht geprüft**.

## Was schon dazu in Pult steht

- Verbrauch, Kontext-Füllstand: gebaut (`src/core/usage`, `src/web/UsageMeter.tsx`).
- Skill-Lader mit stufenweisem Laden: gebaut (`src/core/skills`).
- Zusammenfassen bei vollem Kontext: gebaut (`src/core/agent/compaction.ts`).
- Prüfung von Skill-Namen und Beschreibungslänge: war im Lader schon vorhanden (`src/core/skills`), Vorschlag 2 unten ist damit erledigt.

## Folgerungen

1. Kein Projekt liefert fertigen Code, den wir direkt brauchen. Der Agentenkern (pi) und die eigene Schicht bleiben.
2. Übernehmbar als Idee: Designvorgaben als Markdown-Datei, Skill-Aufbau nach `SKILL.md`.
3. skills.sh bietet nichts für deutsche Schulen. Die Skills für Arbeitsblatt, Klausur mit Erwartungshorizont, Lernsituation und Differenzieren schreiben wir selbst, wie in `docs/skills.md` geplant. Eine Suche dort ersetzt das nicht.
4. Von OpenCode übernehmen wir als Idee das automatische Zusammenfassen bei vollem Kontext und die Regeln für Skill-Namen und Beschreibungslänge. Beides ist ein eigener, kleiner Schritt (siehe Vorschlag unten).
5. Für Erklärvideos (Phase 5) ist `heygen-com/hyperframes` die beste Vorlage für den Ablauf. Ein Baustein wird es erst, wenn die offenen Punkte zu Netz, Konto und Lizenzen des Medienkatalogs geklärt sind.

## Vorschläge zur Entscheidung

1. **Zusammenfassen bei vollem Kontext** als Aufgabe in Phase 1 aufnehmen: Ab etwa 80 Prozent Füllstand den älteren Teil des Gesprächs zusammenfassen, die letzten Beiträge behalten, der Lehrkraft nur "Ich fasse das bisherige Gespräch kurz zusammen, damit wir weiterarbeiten können" zeigen. Sie wird nicht um eine Entscheidung gebeten.
2. **Skill-Prüfung** im Lader: Name nach Muster `^[a-z0-9]+(-[a-z0-9]+)*$`, höchstens 64 Zeichen, gleich dem Ordnernamen, Beschreibung höchstens 1024 Zeichen. Gleiche Regeln wie OpenCode und die Claude-App, damit Skills austauschbar bleiben.
3. **Nichts von skills.sh installieren.** Die Installation läuft über eine Befehlszeile mit Telemetrie und lädt Fremdtexte ohne Prüfung. Falls ein Skill von dort gewünscht wird, lesen wir ihn vorher vollständig und schreiben ihn neu.

## Noch offen

- Wie die Seitenleiste von OpenCode Verbrauch und Kontext genau zeigt (nur aus dem Quelltext zu erfahren, nicht belegt).
- Lizenz und Kosten von Remotion, Lizenz des Medienkatalogs von HyperFrames.
- Lizenz von `skill-creator` und `pptx` aus anthropics/skills.
