import { useEffect, useRef, useState } from "react";
import { getSchule, removeSchullogo, saveSchullogo, saveSchulname, schullogoUrl, type SchuleInfo } from "./api.ts";

/** Settings page "Schule": name and logo for the head of all material. */
export function Schule() {
  const [info, setInfo] = useState<SchuleInfo | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  // A new number after every change, so the browser shows the new logo and not the old one.
  const [version, setVersion] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getSchule().then((s) => (setInfo(s), setName(s.name)), () => setProblem("Die Angaben konnten nicht geladen werden."));
  }, []);

  const run = async (action: () => Promise<SchuleInfo>, ok: string) => {
    setBusy(true);
    setProblem(null);
    setDone(null);
    try {
      const next = await action();
      setInfo(next);
      setName(next.name);
      setVersion((v) => v + 1);
      setDone(ok);
    } catch (e) {
      setProblem(e instanceof Error ? e.message : "Das hat nicht geklappt.");
    } finally {
      setBusy(false);
    }
  };

  if (!info) return <div className="settings-panel">{problem ? <p className="error" role="alert">{problem}</p> : <p className="lead">Einen Moment …</p>}</div>;
  const changed = name.trim() !== info.name;

  return (
    <div className="settings-panel">
      <p className="lead">Name und Logo deiner Schule stehen oben auf allen Arbeitsblättern, Klausuren und Plänen, die ich für dich erstelle, als PDF und als Word-Datei. Ohne Eintrag bleibt der Kopf wie bisher.</p>

      <h2>Name der Schule</h2>
      <form
        className="school-row"
        onSubmit={(e) => {
          e.preventDefault();
          void run(() => saveSchulname(name), name.trim() ? "Der Name ist gespeichert." : "Der Name ist entfernt.");
        }}
      >
        <label className="field">
          <span>Name, wie er oben stehen soll</span>
          <input value={name} maxLength={120} placeholder="zum Beispiel Berufskolleg Musterstadt" onChange={(e) => setName(e.target.value)} />
        </label>
        <button type="submit" className="primary" disabled={busy || !changed}>
          Speichern
        </button>
      </form>

      <h2>Logo</h2>
      <p className="lead">Am besten ein PNG oder eine SVG-Datei. Auf dem Blatt erscheint das Logo in Grau, weil viele Schulen nicht in Farbe drucken.</p>
      <div className="school-logo">
        {info.hasLogo ? <img src={schullogoUrl(version)} alt="Dein Schullogo, so wie es auf dem Blatt steht" /> : <span className="muted">Noch kein Logo.</span>}
      </div>
      <input
        ref={fileRef}
        type="file"
        hidden
        accept=".png,.jpg,.jpeg,.svg,image/png,image/jpeg,image/svg+xml"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void run(() => saveSchullogo(file), "Das Logo ist gespeichert.");
        }}
      />
      <div className="setup-actions">
        <button type="button" className="ghost" disabled={busy} onClick={() => fileRef.current?.click()}>
          {info.hasLogo ? "Logo austauschen …" : "Logo auswählen …"}
        </button>
        {info.hasLogo && (
          <button type="button" className="ghost" disabled={busy} onClick={() => void run(removeSchullogo, "Das Logo ist entfernt.")}>
            Logo entfernen
          </button>
        )}
      </div>

      <ul className="school-notes">
        <li>Nimm nur ein Logo, das deine Schule verwenden darf.</li>
        <li>Keine Fotos von Schülerinnen und Schülern.</li>
      </ul>

      {problem && <p className="error" role="alert">{problem}</p>}
      {done && <p className="notice" role="status">{done}</p>}
    </div>
  );
}
