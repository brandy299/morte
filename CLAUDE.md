# CLAUDE.md: Regeln für die Arbeit an morte

morte ist ein schlanker KI-Arbeitsplatz für Lehrkräfte (Chat, geführte Materialerstellung, Klassenstruktur, Stundenplan-Dashboard). Der Fahrplan steht in `ROADMAP.md`, die Ordnerstruktur in `docs/ordnerstruktur.md`. Lies beides, bevor du etwas Größeres anfängst.

## Arbeitsweise

- Arbeite phasenweise nach `ROADMAP.md`. Kleine, überprüfbare Schritte, ein Thema pro Commit.
- Hake erledigte Punkte in `ROADMAP.md` ab und halte das Datum "Stand" aktuell.
- Bei einer Entscheidung, die aus den Dokumenten nicht hervorgeht (Tech-Stack, Bibliothek, Name), frag den Nutzer, statt zu raten.
- Bevor du etwas als fertig meldest, führe es aus und prüfe es: Tests laufen, die Oberfläche wurde angesehen, erzeugte Dateien wurden geöffnet.
- Nichts erfinden: Fehlt eine Angabe, bleibt das Feld leer oder du fragst nach.

## Sprache

- Texte in der Oberfläche, Meldungen und Doku: Deutsch, in einfacher Sprache ohne Fachbegriffe. Nutzer sind Lehrkräfte ohne technischen Hintergrund.
- Code, Bezeichner und Code-Kommentare: Englisch.

## Nicht verhandelbar

- **Datenschutz:** Keine Schülernamen, Noten oder Fotos von Klassenarbeiten in Prompts, Logs, Beispieldaten oder Commits. Es gibt nur Klassen und Kurse. Beispieldaten sind frei erfunden.
- **Secrets:** API-Keys und Zugangsdaten gehören in den Schlüsselbund oder in eine lokale Konfigurationsdatei außerhalb des Repos, nie in den Quelltext. `.env` und Ähnliches stehen in `.gitignore`.
- **Provider austauschbar:** Kein Code darf an einen einzelnen KI-Anbieter gebunden sein. Anbieter laufen über eine gemeinsame Schicht. Hauptmodelle brauchen Tool-Calling und Vision (wird beim Einrichten getestet).
- **Lizenz:** Das Repo steht unter Apache-2.0. Code aus Projekten mit anderer Lizenz, vor allem AGPL (z. B. Odysseus), wird nicht kopiert. Ideen und Vorgehen dürfen übernommen werden.

## Architektur-Grundsätze

- Ein zentraler Agent liest zur richtigen Zeit die richtigen Dateien aus der Ordnerstruktur. Keine Multi-Agent-Orchestrierung.
- Lesereihenfolge pro Klasse und Fach: `Klasse.md`, dann `Stand.md`, dann nur bei Bedarf die passende `Reihe.md`. Das hält den Kontext klein.
- `Stand.md` wird nach jeder Arbeitssitzung kurz überschrieben, nicht verlängert. Details stehen in `Reihe.md`.
- Status-Wörter in `Reihe.md` sind fest: `geplant`, `Material fertig`, `gehalten`.
- Sparsam mit Ordnern: eine Reihe ist ein Ordner mit `Reihe.md` und `Material/`. Stunden sind Zeilen in der Tabelle, keine eigenen Ordner.
- Version 1 läuft lokal und für eine Person, ohne Login. Daten liegen pro Nutzer in einem eigenen Ordner, damit Mehrbenutzerbetrieb später nachrüstbar ist.
- Fortschritt bei der Arbeit sichtbar machen (aktueller Schritt, Schrittliste, Live-Vorschau), in einfacher Sprache.

## Materialien (Standard für alle mitgelieferten Skills)

- Ausgabe als druckfertiges PDF, in Graustufen gut lesbar (viele Schulen drucken nicht in Farbe), möglichst wenige Seiten, Querformat ist erlaubt.
- Eine eigene, besondere Optik, die nicht sofort nach Standard-KI aussieht.
- Erklärvideos haben standardmäßig keine Stimme (nur Musik). Sprache nur auf ausdrücklichen Wunsch.

## Design

- Aufbau und Bedienlogik an die Claude-App angelehnt: Seitenleiste links, Chat in der Mitte, Vorschau rechts. Name, Logo, Farben und Icons sind eigenständig, nichts wird 1:1 kopiert.
- Qualitätsmaßstab: nicht billig, nicht nach "AI-Slop". Vor dem Bauen von Oberflächen die Design-Skills nutzen.

## Commits

- Kurze, sachliche Commit-Nachrichten, ein Thema pro Commit.
- Co-Authored-By-Zeile am Ende, wie von Claude Code vorgegeben.
