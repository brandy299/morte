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

export function Setup({ status, onDone }: { status: SetupStatus; onDone: () => void }) {
  const [providers, setProviders] = useState<ProviderOption[]>([]);
  const [providerId, setProviderId] = useState(status.provider ?? "anthropic");
  const [modelId, setModelId] = useState(status.model ?? "");
  const [apiKey, setApiKey] = useState("");
  const [advanced, setAdvanced] = useState(false);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<ConnectionResult | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    getOptions().then(setProviders).catch(() => setProblem("Die Auswahl konnte nicht geladen werden."));
  }, []);

  const provider = providers.find((p) => p.id === providerId);
  const models = provider?.models ?? [];
  const shown = advanced ? models : models.filter((m) => m.recommended);
  const chosen = modelId && models.some((m) => m.id === modelId) ? modelId : (models[0]?.id ?? "");
  const alreadyStored = status.configured && status.provider === providerId;

  const changed = () => setResult(null);

  const test = async () => {
    setTesting(true);
    setResult(null);
    setProblem(null);
    try {
      setResult(await testSetup({ provider: providerId, model: chosen, apiKey }));
    } catch {
      setProblem("Der Test konnte nicht gestartet werden.");
    } finally {
      setTesting(false);
    }
  };

  const save = async () => {
    await saveSetup({ provider: providerId, model: chosen, apiKey });
    onDone();
  };

  return (
    <div className="setup">
      <div className="setup-card">
        <div className="brand">
          <span className="brand-mark" aria-hidden />
          Pult
        </div>
        <h1>Welche KI soll dir helfen?</h1>
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

        <label className="field">
          <span>Zugangsschlüssel</span>
          <input
            type="password"
            autoComplete="off"
            value={apiKey}
            placeholder={alreadyStored ? "Gespeichert, leer lassen zum Beibehalten" : "Hier einfügen"}
            onChange={(e) => {
              setApiKey(e.target.value);
              changed();
            }}
          />
        </label>

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
          {advanced ? "Nur empfohlene Modelle zeigen" : "Erweitert: alle Modelle zeigen"}
        </button>

        <div className="setup-actions">
          <button className="primary" onClick={test} disabled={testing || !chosen || (!apiKey && !alreadyStored)}>
            {testing ? "Ich prüfe …" : "Verbindung testen"}
          </button>
          {result?.passed && (
            <button className="primary" onClick={save}>
              Speichern und loslegen
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
      </div>
    </div>
  );
}
