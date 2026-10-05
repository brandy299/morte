# morte

Ein schlanker KI-Arbeitsplatz für Lehrkräfte. Fahrplan: `ROADMAP.md`, Regeln: `CLAUDE.md`.

## Starten (Entwicklung)

```
npm install
npm run dev
```

Dann im Browser `http://localhost:5173` öffnen. Ohne Einstellungen läuft der Demo-Modus (keine echte KI).

Mit echter KI, zum Beispiel Claude (der Schlüssel kommt aus der Umgebung, nie in den Quelltext):

```
MORTE_PROVIDER=anthropic ANTHROPIC_API_KEY=... npm run dev
```

Weitere Anbieter: `openai` (`OPENAI_API_KEY`), `deepseek` (`DEEPSEEK_API_KEY`). Mit `MORTE_MODEL` lässt sich das Modell wählen. Das ist nur eine Übergangslösung bis zur Einrichtung mit Schlüsselbund.

## Prüfen

```
npm test
npm run typecheck
npm run build
```
