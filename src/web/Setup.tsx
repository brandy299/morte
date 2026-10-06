import { useEffect, useState } from "react";
import {
  getOptions,
  saveSetup,
  testSetup,
  startDemo,
  type ConnectionResult,
  type ProviderOption,
  type SetupStatus,
} from "./api.ts";

/** Where to get a key, in plain words, per provider. */
const KEY_HELP: Record<string, { text: string; url?: string }> = {
  anthropic: { text: "Melde dich bei Anthropic an, lege ein Guthaben an (ein paar Euro reichen zum Start) und erstelle einen neuen Schlüssel. Kopiere ihn gleich, später wird er nicht mehr gezeigt.", url: "https://console.anthropic.com/settings/keys" },
  openai: { text: "Melde dich bei OpenAI an, lege ein Guthaben an und erstelle einen neuen Schlüssel. Kopiere ihn gleich, später wird er nicht mehr gezeigt.", url: "https://platform.openai.com/api-keys" },
  openrouter: { text: "OpenRouter ist ein Zugang zu vielen Modellen mit nur einem Schlüssel und einem Guthaben. Anmelden, Guthaben aufladen, Schlüssel erstellen. Du kannst dort eine Ausgabengrenze für den Schlüssel setzen.", url: "https://openrouter.ai/keys" },
  deepseek: { text: "Melde dich bei DeepSeek an, lade etwas Guthaben auf und erstelle einen Schlüssel. In manchen Schulnetzen ist DeepSeek gesperrt. Dann geht es über OpenRouter.", url: "https://platform.deepseek.com/api_keys" },
  "opencode-go": { text: "Den Schlüssel findest du in deinem Konto bei OpenCode, wenn du das Go-Abo hast." },
};

export function Setup({ status, onDone, onCancel, embedded }: { status: SetupStatus; onDone: () => void; onCancel?: () => void; embedded?: boolean }) {
  const [providers, setProviders] = useState<ProviderOption[]>([]);
  const [providerId, setProviderId] = useState(status.provider ?? "anthropic");
  const [modelId, setModelId] = useState(status.model ?? "");
  const [apiKey, setApiKey] = useState("");
  const [advanced, setAdvanced] = useState(false);
  const [filter, setFilter] = useState("");
  const [baseUrl, setBaseUrl] = useState(status.baseUrl ?? "");
  const [contextWindow, setContextWindow] = useState(status.contextWindow ? String(status.contextWindow) : "");
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<ConnectionResult | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    getOptions().then(setProviders).catch(() => setProblem("Die Auswahl konnte nicht geladen werden."));
  }, []);

  const provider = providers.find((p) => p.id === providerId);
  const models = provider?.models ?? [];
  const needle = filter.trim().toLowerCase();
  // A model chosen earlier stays in the list, also when it is not recommended or the search does not match it.
  const shown = models.filter((m) => m.id === modelId || (advanced ? !needle || `${m.name} ${m.id}`.toLowerCase().includes(needle) : m.recommended));
  const custom = Boolean(provider?.custom);
  // For an own server the teacher types the model name; otherwise it comes from the list.
  const chosen = custom ? modelId.trim() : modelId && shown.some((m) => m.id === modelId) ? modelId : (shown[0]?.id ?? "");
  const alreadyStored = status.configured && status.provider === providerId;
  const body = () => ({
    provider: providerId,
    model: chosen,
    apiKey,
    ...(custom ? { baseUrl: baseUrl.trim(), contextWindow: Number(contextWindow) || undefined } : {}),
  });
  // A server without key is fine, so the key is only needed for the others.
  const ready = Boolean(chosen) && (custom ? Boolean(baseUrl.trim()) : Boolean(apiKey) || Boolean(alreadyStored));

  const changed = () => setResult(null);

  const test = async () => {
    setTesting(true);
    setResult(null);
    setProblem(null);
    try {
      setResult(await testSetup(body()));
    } catch {
      setProblem("Der Test konnte nicht gestartet werden.");
    } finally {
      setTesting(false);
    }
  };

  const save = async () => {
    setProblem(null);
    try {
      await saveSetup(body());
      onDone();
    } catch (err) {
      setProblem(err instanceof Error ? err.message : "Das Speichern hat nicht geklappt.");
    }
  };

  const inner = (
    <>
        {embedded ? <h2>Welche KI soll dir helfen?</h2> : <h1>Welche KI soll dir helfen?</h1>}
        <p className="lead">
          Dafür brauche ich einen Zugangsschlüssel von deinem KI-Anbieter. Er bleibt auf diesem Computer
          {status.storage === "file" ? " (in einer Datei nur für dich)" : " (im Schlüsselbund)"} und kommt nie in
          den Programmcode.
        </p>

        <label className="field">
          <span>Anbieter</span>
          <select
            value={providerId}
            onChange={(e) => {
              setProviderId(e.target.value);
              setModelId("");
              changed();
            }}
          >
            {providers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>

        {custom && (
          <>
            <p className="lead">Für Server, die wie OpenAI antworten: ein Schulserver, LM Studio, Ollama oder ein anderer Dienst. Frag die Person, die ihn betreibt, nach Adresse und Modellname.</p>
            <label className="field">
              <span>Adresse des Servers</span>
              <input value={baseUrl} placeholder="zum Beispiel https://ki.meineschule.de/v1" onChange={(e) => { setBaseUrl(e.target.value); changed(); }} />
            </label>
          </>
        )}

        <label className="field">
          <span>{custom ? "Zugangsschlüssel (falls der Server einen braucht)" : "Zugangsschlüssel"}</span>
          <input
            type="password"
            autoComplete="off"
            value={apiKey}
            placeholder={alreadyStored ? "Gespeichert, leer lassen zum Beibehalten" : custom ? "Leer lassen, wenn keiner nötig ist" : "Hier einfügen"}
            onChange={(e) => {
              setApiKey(e.target.value);
              changed();
            }}
          />
        </label>
        {KEY_HELP[providerId] && (
          <details className="key-help">
            <summary>Wo bekomme ich einen Schlüssel?</summary>
            <p>{KEY_HELP[providerId]!.text}</p>
            {KEY_HELP[providerId]!.url && (
              <p>
                <a href={KEY_HELP[providerId]!.url} target="_blank" rel="noopener noreferrer">
                  {KEY_HELP[providerId]!.url!.replace("https://", "")}
                </a>
              </p>
            )}
          </details>
        )}

        {custom ? (
          <>
            <label className="field">
              <span>Name des Modells</span>
              <input value={modelId} placeholder="zum Beispiel llama-3.1-70b" onChange={(e) => { setModelId(e.target.value); changed(); }} />
            </label>
            <button className="link" type="button" onClick={() => setAdvanced((a) => !a)}>
              {advanced ? "Weniger Einstellungen" : "Erweitert: Größe des Gedächtnisses"}
            </button>
            {advanced && (
              <label className="field">
                <span>Gedächtnis des Modells (in Tokens, leer = 32.000)</span>
                <input inputMode="numeric" value={contextWindow} placeholder="32000" onChange={(e) => { setContextWindow(e.target.value.replace(/\D/g, "")); changed(); }} />
              </label>
            )}
          </>
        ) : (
          <>
        {advanced && (
          <label className="field">
            <span>Modell suchen</span>
            <input value={filter} placeholder="zum Beispiel deepseek, glm, qwen" onChange={(e) => setFilter(e.target.value)} />
          </label>
        )}
        <label className="field">
          <span>Modell</span>
          <select
            value={chosen}
            onChange={(e) => {
              setModelId(e.target.value);
              changed();
            }}
          >
            {shown.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
                {m.recommended ? " (empfohlen)" : ""}
                {advanced && !m.vision ? " – ohne Bilder" : ""}
              </option>
            ))}
          </select>
        </label>
        <button className="link" type="button" onClick={() => setAdvanced((a) => !a)}>
          {advanced ? "Nur empfohlene Modelle zeigen" : "Alle Modelle zeigen und suchen"}
        </button>
          </>
        )}

        <div className="setup-actions">
          <button className="primary" onClick={test} disabled={testing || !ready}>
            {testing ? "Ich prüfe …" : "Verbindung testen"}
          </button>
          {result?.passed && (
            <button className="primary" onClick={save}>
              {embedded ? "Speichern und weiter" : "Speichern und loslegen"}
            </button>
          )}
        </div>

        {problem && <p className="error">{problem}</p>}
        {result && (
          <div className={`result ${result.passed ? "pass" : "fail"}`} role="status">
            <strong>{result.passed ? "Passt." : "Das passt noch nicht."}</strong>
            <ul>
              {result.checks.map((c) => (
                <li key={c.id} className={c.state}>
                  <span className="tick" aria-hidden>
                    {c.state === "ok" ? "✓" : c.state === "failed" ? "!" : ""}
                  </span>
                  {c.label}
                </li>
              ))}
            </ul>
            {result.hint && <p>{result.hint}</p>}
            {result.detail && (
              <details className="tech-detail">
                <summary>Technische Angaben (für die IT oder für Hilfe)</summary>
                <pre>{result.detail}</pre>
              </details>
            )}
          </div>
        )}

        <button
          className="link"
          type="button"
          onClick={async () => {
            await startDemo();
            onDone();
          }}
        >
          Erst einmal ohne KI ansehen
        </button>
    </>
  );

  if (embedded) return <div className="embedded">{inner}</div>;
  return (
    <main className="setup">
      <div className="setup-card">
        {onCancel && (
          <button type="button" className="link back" onClick={onCancel}>
            ← Zurück zum Gespräch
          </button>
        )}
        <div className="brand">
          <span className="brand-mark" aria-hidden />
          morte
        </div>
        {inner}
      </div>
    </main>
  );
}
