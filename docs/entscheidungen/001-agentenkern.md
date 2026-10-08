# Entscheidung 001: Agentenkern und Provider-Anbindung

Datum: 2026-10-05 · Status: angenommen (Empfehlung nach Prüfung, Einspruch jederzeit möglich)

## Frage

Bauen wir die Agenten-Schleife selbst, setzen wir auf eine fertige Agenten-App auf, oder nehmen wir eine Bibliothek als Kern?

## Geprüfte Optionen

### A) pi-desktop forken oder als Plugin-Plattform nutzen
github.com/vastsa/pi-desktop, Stand 0.16.x "Early Preview"

- Electron-App mit React-Oberfläche, Rust-Hostkern und Node-Sidecar für den Agenten. Agentenkern ist pi (`pi-ai`, `pi-agent-core`).
- Viele Funktionen: Projekte, Review-Panel für Diffs, Subagents, Worker-Sessions, Plugins, MCP, Sprache, geplante Aufgaben. Mac, Windows, Linux.
- Rund 377.000 Zeilen TypeScript und Rust, Lizenz LGPL-3.0.
- **Dagegen:** Die Oberfläche ist ein Entwickler-Arbeitsplatz (Diffs, Terminal-Ausgaben, Agent-Orchestrierung). Genau das sollen Kolleginnen und Kollegen nicht sehen. Ein Fork dieser Größe ist für eine Person kaum zu pflegen, und ein Plugin würde die Entwickler-Oberfläche nicht verstecken. Bei einem Fork würde der Code unter LGPL stehen.
- **Nutzen:** Sehr gute Referenz. Es zeigt, dass pi als Kern einer Desktop-App trägt, und wie Electron, Sidecar, Provider-Einstellungen und Sprachfunktionen zusammenspielen. Ideen übernehmen ja, Code nicht kopieren.

### B) pi als Bibliothek: `@earendil-works/pi-ai` + `@earendil-works/pi-agent-core`
github.com/badlogic/pi-mono, bei der Entscheidung Version 1.0.3 (seit 2026-10-08: 1.1.0, wegen neuer Modelle im Katalog, z. B. Claude Haiku 5.5 über OpenCode Go), Lizenz MIT, TypeScript, sehr aktiv

- **pi-ai:** einheitliche API für viele Anbieter, darunter Anthropic, OpenAI, DeepSeek, Google, Mistral, OpenRouter und jede OpenAI-kompatible Schnittstelle (auch lokale wie Ollama). Streaming, Tool-Calling, Bilder, Abbruch, Token- und Kostenzählung, Wechsel des Modells mitten im Gespräch.
- **Eingebauter Modellkatalog:** Der Chat-Katalog enthält nur Modelle mit Tool-Calling, und jedes Modell sagt, ob es Bilder versteht (`model.input.includes('image')`). Damit lässt sich unsere Mindestanforderung (Tool-Calling und Vision) direkt prüfen, ohne eigene Modellprofile zu pflegen.
- **pi-agent-core:** fertige Agenten-Schleife mit Werkzeugen, Zustand und Ereignissen (`agent_start`, `message_update`, `tool_execution_start/end`, ...). Diese Ereignisse speisen direkt unsere Fortschrittsanzeige. Werkzeuge haben ein `label` für die Anzeige.
- **`beforeToolCall`-Hook:** Hier hängen wir die Rückfragen in einfacher Sprache ein ("Darf ich das Arbeitsblatt in 11a speichern?").
- **Steering:** Man kann den Agenten während der Arbeit unterbrechen oder umlenken, wie in der Claude-App.
- **Dagegen:** Das Projekt bewegt sich schnell (die Pakete wurden schon einmal umbenannt, von `@mariozechner/*` zu `@earendil-works/*`). Gegenmaßnahme: Versionen fest pinnen und pi hinter einer eigenen dünnen Schicht kapseln.

### C) Vercel AI SDK (`ai`) mit eigener Schleife oder `ToolLoopAgent`
Version 7.x, Lizenz Apache-2.0

- Sehr verbreitet und ausgereift, viele Provider-Pakete (auch DeepSeek und OpenAI-kompatibel), Tool-Freigabe per `needsApproval`, Agenten-Abstraktion.
- **Dagegen:** Kein eingebauter Katalog mit Fähigkeiten pro Modell, den müssten wir selbst pflegen. Stärker auf Web-Apps mit Next.js ausgerichtet.
- Gute Rückfalloption, falls pi sich nicht bewährt.

### D) Alles selbst schreiben
- Die Schleife wäre machbar, aber die Adapter für jeden Anbieter (Streaming-Formate, Tool-Calling-Eigenheiten, Bilder) sind viel Kleinarbeit, die B oder C schon erledigen.

## Entscheidung

**Option B: `pi-ai` und `pi-agent-core` als Kern, eigene Oberfläche und eigene, feste Werkzeuge.**

- Der Agent bekommt nur lehrerspezifische Werkzeuge (Ordner lesen, Material speichern, PDF erzeugen, Stundenplan abfragen, Video rendern). Es gibt keine freie Shell. Das ist einfacher, sicherer und datenschutzfreundlicher.
- pi wird in `src/core/agent` gekapselt. Der Rest der App spricht nur mit dieser Schicht, damit ein Wechsel zu Option C möglich bleibt.
- Versionen werden exakt gepinnt, Updates bewusst eingespielt.
- pi-desktop dient als Referenz für Aufbau und Muster, ohne Code zu übernehmen.

## Folgen für den Tech-Stack (Vorschlag)

- **Sprache:** TypeScript durchgehend, Node ab Version 22.
- **Phase 1–5:** lokale Web-App (Node-Server mit pi plus React-Oberfläche), Start im Browser auf `localhost`. Lässt sich in der Cloud entwickeln und testen.
- **Phase 6:** Verpackung als Desktop-Programm mit Electron, weil pi und die Video-Pipeline (Playwright, ffmpeg) ohnehin Node brauchen. pi-desktop zeigt, dass dieser Weg funktioniert.
- **Lizenz:** pi ist MIT und passt zu Apache-2.0.

## Quellen

- pi-mono: https://github.com/badlogic/pi-mono (READMEs von `packages/ai` und `packages/agent`, Stand 2026-10-05)
- pi-desktop: https://github.com/vastsa/pi-desktop (README und Code-Struktur, Stand 2026-10-05)
- AI SDK 6: https://vercel.com/blog/ai-sdk-6, aktuelle Version laut npm: 7.0.x
