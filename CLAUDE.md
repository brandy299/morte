# CLAUDE.md: Regeln für die Arbeit an Pult

Pult ist ein schlanker KI-Arbeitsplatz für Lehrkräfte (Chat, geführte Materialerstellung, Klassenstruktur, Stundenplan-Dashboard). Der Fahrplan steht in `ROADMAP.md`, die Ordnerstruktur in `docs/ordnerstruktur.md`. Lies beides, bevor du etwas Größeres anfängst.

## Arbeitsweise

- Arbeite phasenweise nach `ROADMAP.md`. Kleine, überprüfbare Schritte, ein Thema pro Commit.
- Hake erledigte Punkte in `ROADMAP.md` ab und halte das Datum "Stand" aktuell.
- Bei einer Entscheidung, die aus den Dokumenten nicht hervorgeht (Tech-Stack, Bibliothek, Name), frag den Nutzer, statt zu raten.
- Bevor du etwas als fertig meldest, führe es aus und prüfe es: Tests laufen, die Oberfläche wurde angesehen, erzeugte Dateien wurden geöffnet.
- Nach einer Änderung an einer mitgelieferten Anleitung zuerst der schnelle Vortest mit Jev (`npm run eval -- … --pruefer jev`, rund ein Cent). Die Zahlen für `evals/BASELINE.md` und die Sperrliste misst ein Sprachmodell als Prüfer. Siehe `docs/entscheidungen/015-jev-vortest.md`.
- Nichts erfinden: Fehlt eine Angabe, bleibt das Feld leer oder du fragst nach.

## Sprache

- Texte in der Oberfläche, Meldungen und Doku: Deutsch, in einfacher Sprache ohne Fachbegriffe. Nutzer sind Lehrkräfte ohne technischen Hintergrund.
- Code, Bezeichner und Code-Kommentare: Englisch.

## Code schreiben

- **Erst prüfen, dann bauen.** Vor neuem Code fragen: Braucht es das wirklich? Gibt es das schon im Projekt (Hilfsfunktion, Baustein, Muster)? Kann es die Standardbibliothek von Node oder der Browser? Löst es eine Bibliothek, die schon eingebunden ist? Erst danach schreiben, und dann so wenig wie möglich.
- **Keine neue Abhängigkeit ohne Not.** Wird doch eine gebraucht, gelten die Regeln unten (Lizenz, nichts außerhalb der App) und die Frage an den Nutzer, wenn sie nicht in den Dokumenten steht.
- **Nichts auf Vorrat.** Keine Abstraktion, Einstellung oder Datei, die niemand gebraucht hat. Löschen ist besser als Hinzufügen.
- **Ursache statt Symptom.** Bei einem Fehler alle Stellen suchen, die dieselbe Funktion benutzen, und sie einmal an der gemeinsamen Stelle beheben. Erst verstehen, dann den kleinsten richtigen Eingriff machen. Der kleinste Eingriff an der falschen Stelle ist ein zweiter Fehler.
- **Nicht sparen bei:** Prüfung von Eingaben an den Grenzen (Dateien, Links, Modellantworten), Fehlern, die Daten kosten würden, Datenschutz, Sicherheit und Barrierefreiheit.
- **Jede nicht triviale Logik bekommt einen Test**, der fehlschlägt, wenn sie bricht. Gebaute Funktionen mit einem echten Lauf ansehen (Oberfläche, erzeugte Dateien), nicht nur mit Tests.

## Nicht verhandelbar

- **Datenschutz:** Keine Schülernamen, Noten oder Fotos von Klassenarbeiten in Prompts, Logs, Beispieldaten oder Commits. Es gibt nur Klassen und Kurse. Beispieldaten sind frei erfunden.
- **Secrets:** API-Keys und Zugangsdaten gehören in den Schlüsselbund oder in eine lokale Konfigurationsdatei außerhalb des Repos, nie in den Quelltext. `.env` und Ähnliches stehen in `.gitignore`.
- **Provider austauschbar:** Kein Code darf an einen einzelnen KI-Anbieter gebunden sein. Anbieter laufen über eine gemeinsame Schicht. Hauptmodelle brauchen Tool-Calling und Vision. Das wird nicht nur empfohlen, sondern erzwungen: Modelle ohne Bilder werden weder angezeigt noch gespeichert noch benutzt, und gespeichert wird nur, was den Verbindungstest besteht (auch bei direktem Aufruf der Schnittstelle).
- **Alles in der App:** Kolleginnen und Kollegen installieren nichts außer Pult. Keine Abhängigkeit darf ein Zusatzprogramm, einen Browser-Download oder eine Einrichtung außerhalb der App verlangen. Siehe `docs/entscheidungen/002-alles-in-der-app.md`.
- **Lizenz:** Das Repo steht unter Apache-2.0. Code aus Projekten mit anderer Lizenz, vor allem AGPL (z. B. Odysseus), wird nicht kopiert. Ideen und Vorgehen dürfen übernommen werden.

## Architektur-Grundsätze

- Agentenkern: `@earendil-works/pi-ai` und `@earendil-works/pi-agent-core`, Versionen exakt gepinnt. Nur `src/core/agent` importiert pi direkt, der Rest der App spricht mit dieser Schicht. Begründung in `docs/entscheidungen/001-agentenkern.md`.
- Der Agent bekommt nur feste, lehrerspezifische Werkzeuge, keine freie Shell. Rückfragen vor Aktionen laufen über `beforeToolCall`, in einfacher Sprache. Gefragt wird nur, wenn ein Werkzeug Vorhandenes ersetzt, löscht oder ändert (Stand, Stundentabelle, Bewertungsregeln, Vorlagen) oder gleich mehrere Dinge anlegt (eine Lernsituation). Neues Material und eine neue Reihe (Arbeitsblatt, Klausur, Stundenplanung) wird ohne Rückfrage erstellt, es überschreibt nie etwas. Fehlen Angaben, fragt der Assistent mit `fragen_stellen`, jede Frage mit empfohlener Antwort und Begründung.
- Die Fortschrittsanzeige wird aus den Agenten-Ereignissen gespeist (`tool_execution_start/end`, `message_update`). Jedes Werkzeug hat ein deutsches `label` für die Anzeige.
- Vision und Tool-Calling eines Modells werden über den pi-Modellkatalog geprüft (`model.input`) und beim Einrichten zusätzlich getestet.
- Neue Grundsatzentscheidungen kommen als nummerierte Datei nach `docs/entscheidungen/`.
- Ein zentraler Agent liest zur richtigen Zeit die richtigen Dateien aus der Ordnerstruktur. Keine Multi-Agent-Orchestrierung.
- Lesereihenfolge pro Klasse und Fach: `Klasse.md`, dann `Stand.md`, dann nur bei Bedarf die passende `Reihe.md`. Das hält den Kontext klein.
- `Stand.md` wird nach jeder Arbeitssitzung kurz überschrieben, nicht verlängert. Details stehen in `Reihe.md`.
- Status-Wörter in `Reihe.md` sind fest: `geplant`, `Material fertig`, `gehalten`.
- Sparsam mit Ordnern: eine Reihe ist ein Ordner mit `Reihe.md` und `Material/`. Stunden sind Zeilen in der Tabelle, keine eigenen Ordner.
- Version 1 läuft lokal und für eine Person, ohne Login. Daten liegen pro Nutzer in einem eigenen Ordner, damit Mehrbenutzerbetrieb später nachrüstbar ist.
- Fortschritt bei der Arbeit sichtbar machen (aktueller Schritt, Schrittliste, Live-Vorschau), in einfacher Sprache.

## Materialien (Standard für alle mitgelieferten Skills)

- Ausgabe als druckfertiges PDF, in Graustufen gut lesbar (viele Schulen drucken nicht in Farbe), Seitenzahl nach Inhalt, nicht künstlich gekürzt (Platz spart das Layout, nicht das Weglassen); Querformat ist erlaubt. Abläufe, Aufbau, Kreisläufe, Zeitverläufe und Zahlen werden als Schaubild gezeichnet.
- Eine eigene, besondere Optik, die nicht sofort nach Standard-KI aussieht.
- Erklärvideos haben standardmäßig keine Stimme (nur Musik). Sprache nur auf ausdrücklichen Wunsch.

## Design

- Aufbau und Bedienlogik an die Claude-App angelehnt: Seitenleiste links, Chat in der Mitte, Vorschau rechts. Name, Logo, Farben und Icons sind eigenständig, nichts wird 1:1 kopiert.
- Qualitätsmaßstab: nicht billig, nicht nach "AI-Slop". Vor dem Bauen von Oberflächen die Design-Skills nutzen.

## Commits

- Kurze, sachliche Commit-Nachrichten, ein Thema pro Commit.
- Co-Authored-By-Zeile am Ende, wie von Claude Code vorgegeben.
