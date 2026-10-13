# 023: Kosten sparen: kein Claude-Abo in Pult, dafür Flat-Tarife und günstige Modelle

Stand: 2026-10-14 · Frage von Yannik nach dem Harness-Vortrag: „Kann Pult das Abo des Anbieters nutzen und API-Kosten sparen?“

## Befund

- **Technisch geht es:** Die Bibliothek unter Pult (pi-ai) kann sich mit einem Claude-Pro- oder Max-Konto und mit einem ChatGPT-Konto anmelden (`oauth`-Anbieter im Paket).
- **Erlaubt ist es bei Claude nicht.** Die Rechtsseite von Claude Code (code.claude.com, „Legal and compliance“, am 2026-10-14 gelesen) sagt: Anthropic erlaubt Dritten nicht, die Anmeldung mit dem Claude-Konto in eigene Anwendungen einzubauen oder Anfragen über die Zugangsdaten von Free-, Pro- oder Max-Plänen für Nutzer zu leiten. Entwickler von Produkten sollen Schlüssel der Claude Console oder eines Cloud-Anbieters nehmen. Anthropic behält sich Maßnahmen ohne Vorwarnung vor. Erlaubt ist, dass sich eine Person im **unveränderten Claude Code** mit ihrem eigenen Abo anmeldet.
- Der Vortrag, den wir ausgewertet haben, arbeitet deshalb mit Claude Code als Unterbau. Das ist bei Pult nicht möglich (Entscheidung 021): Lehrkräfte installieren nichts außer Pult.

## Entscheidung

1. **Pult baut keine Anmeldung mit einem Claude-Abo ein**, auch nicht „nur für mich“. Es riskiert das Konto, es widerspricht den Bedingungen, und die Lehrkraft müsste Dinge einrichten, die „Alles in der App“ ausschließen.
2. **Kosten senken wir innerhalb der Regeln:**
   - **Flat-Tarife von Anbietern, die das für Dritte vorsehen** (zum Beispiel OpenCode Go, das schon unterstützt wird). Das ist heute der Weg, bei dem Material für Cent-Beträge entsteht.
   - **Günstige Modelle**, deren Qualität wir messen (`npm run eval`): DeepSeek V4.1 Flash liegt in den Messungen auf Augenhöhe mit teureren Modellen. Die Sperrliste (014) hält Modelle fern, die nicht verlässlich genug arbeiten.
   - **Verbrauch sichtbar machen und klein halten:** Der Verbrauchsring und das Ablaufprotokoll zeigen Tokens und Zeiten. Kürzen alter Anhänge (012), Wissen nur auf Anfrage lesen (#56) und kurze Schlussantworten sparen Tokens, ohne dass etwas verloren geht.
3. **Beim Bauen von Pult** nutzt Yannik sein Claude-Abo mit dem unveränderten Claude Code in einer lokalen Sitzung. Das ist erlaubt und spart die API-Kosten der Entwicklung, nicht die des Betriebs.
4. **ChatGPT-Konto (Codex-Anmeldung):** Die Bedingungen von OpenAI dazu sind **nicht geprüft**. Bis das geschehen ist, bauen wir es nicht ein.

## Offen

- Prüfen, ob OpenAI die Anmeldung mit einem ChatGPT-Konto in Drittprogrammen ausdrücklich erlaubt. Wenn ja, wäre es ein zusätzlicher Anbieter für Lehrkräfte, die das Abo schon haben.
- Prompt-Zwischenspeicher (Caching) der Anbieter ausnutzen, wo das Modell ihn bietet: Messen, was es bei langen Anleitungen spart.
