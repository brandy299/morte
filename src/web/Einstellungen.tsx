import { useEffect, useState } from "react";
import { chooseOrdner, getOrdner, moveOrdner, openOrdner, resetOrdner, type OrdnerInfo, type SetupStatus } from "./api.ts";
import { Setup } from "./Setup.tsx";
import { readLook, saveLook, type Accent, type Look, type Mode } from "./theme.ts";

type Tab = "aussehen" | "ordner" | "ki" | "datenschutz";
const TABS: { id: Tab; label: string }[] = [
  { id: "aussehen", label: "Aussehen" },
  { id: "ordner", label: "Ordner" },
  { id: "ki", label: "KI-Anbieter" },
  { id: "datenschutz", label: "Datenschutz" },
];

const MODES: { id: Mode; label: string }[] = [
  { id: "auto", label: "Wie mein Computer" },
  { id: "hell", label: "Hell" },
  { id: "dunkel", label: "Dunkel" },
];
const ACCENTS: { id: Accent; label: string; color: string }[] = [
  { id: "terrakotta", label: "Terrakotta", color: "#b4532a" },
  { id: "salbei", label: "Salbei", color: "#4f6f52" },
  { id: "blau", label: "Blau", color: "#3f6591" },
  { id: "pflaume", label: "Pflaume", color: "#85476b" },
];

function Aussehen() {
  const [look, setLook] = useState<Look>(readLook);
  const change = (patch: Partial<Look>) => {
    const next = { ...look, ...patch };
    setLook(next);
    saveLook(next);
  };
  return (
    <div className="settings-panel">
      <fieldset className="choice-group">
        <legend>Farbmodus</legend>
        <div className="segmented" role="radiogroup" aria-label="Farbmodus">
          {MODES.map((m) => (
            <button key={m.id} type="button" role="radio" aria-checked={look.mode === m.id} className={look.mode === m.id ? "on" : ""} onClick={() => change({ mode: m.id })}>
              {m.label}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset className="choice-group">
        <legend>Akzentfarbe</legend>
        <div className="swatches" role="radiogroup" aria-label="Akzentfarbe">
          {ACCENTS.map((a) => (
            <button key={a.id} type="button" role="radio" aria-checked={look.accent === a.id} className={look.accent === a.id ? "swatch on" : "swatch"} onClick={() => change({ accent: a.id })}>
              <span className="swatch-dot" style={{ background: a.color }} aria-hidden />
              {a.label}
            </button>
          ))}
        </div>
      </fieldset>
      <label className="check">
        <input type="checkbox" checked={look.calm} onChange={(e) => change({ calm: e.target.checked })} />
        <span>
          Ruhige Oberfläche
          <small>Schaltet Bewegungen und Übergänge ab.</small>
        </span>
      </label>
      <p className="lead">Texte größer oder kleiner machst du mit dem Browser: <kbd>Strg</kbd> oder <kbd>⌘</kbd> und <kbd>+</kbd> / <kbd>−</kbd>.</p>
    </div>
  );
}

function Ordner() {
  const [info, setInfo] = useState<OrdnerInfo | null>(null);
  const [path, setPath] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    getOrdner().then(setInfo).catch(() => setProblem("Der Ordner konnte nicht geladen werden."));
  }, []);

  const run = async (action: () => Promise<OrdnerInfo>, ok?: string) => {
    setBusy(true);
    setProblem(null);
    setDone(null);
    try {
      setInfo(await action());
      if (ok) setDone(ok);
    } catch (e) {
      setProblem(e instanceof Error ? e.message : "Das hat nicht geklappt.");
    } finally {
      setBusy(false);
    }
  };

  if (!info) return <div className="settings-panel">{problem ? <p className="error">{problem}</p> : <p className="lead">Einen Moment …</p>}</div>;
  const finder = info.plattform === "darwin" ? "Im Finder öffnen" : info.plattform === "win32" ? "Im Explorer öffnen" : "Ordner öffnen";
  return (
    <div className="settings-panel">
      {problem && <p className="error" role="alert">{problem}</p>}
      {done && <p className="notice" role="status">{done}</p>}
      <div className="folder-card">
        <span className="folder-label">Hier liegen deine Daten</span>
        <code className="folder-path">{info.pfad}</code>
        <p className="lead">Klassen, Reihen, Material, Lehrpläne, Stundenplan, eigene Vorlagen und Gespräche. Alles bleibt auf diesem Computer.</p>
        <div className="setup-actions">
          <button type="button" className="ghost" disabled={busy} onClick={() => run(openOrdner)}>
            {finder}
          </button>
          {!info.fest && info.pfad !== info.standard && (
            <button type="button" className="ghost" disabled={busy} onClick={() => run(resetOrdner, "Ab jetzt nutze ich wieder den Standardordner. Deine Daten im anderen Ordner bleiben dort liegen.")}>
              Zurück zum Standardordner
            </button>
          )}
        </div>
      </div>

      {info.fest ? (
        <p className="lead">Dieser Ordner ist beim Start von außen festgelegt. Hier lässt er sich nicht ändern.</p>
      ) : (
        <>
          <h2>Daten an einen anderen Ort legen</h2>
          <p className="lead">Zum Beispiel in einen Cloud-Ordner, auf einen USB-Stick oder in „Dokumente“. Ich kopiere alles dorthin. Der alte Ordner bleibt unverändert, es geht nichts verloren. Der neue Ordner muss leer sein.</p>
          <label className="field">
            <span>Neuer Ordner</span>
            <input value={path} placeholder={info.plattform === "win32" ? "zum Beispiel D:\\Schule\\morte-daten" : "zum Beispiel /Users/name/Dokumente/morte-daten"} onChange={(e) => setPath(e.target.value)} />
          </label>
          <div className="setup-actions">
            {info.waehlen && (
              <button
                type="button"
                className="ghost"
                disabled={busy}
                onClick={async () => {
                  const chosen = await chooseOrdner();
                  // The system dialog picks an existing folder; the data goes into a new folder inside it.
                  if (chosen) setPath(`${chosen}/morte-daten`);
                }}
              >
                Ordner auswählen …
              </button>
            )}
            <button type="button" className="primary" disabled={busy || !path.trim()} onClick={() => run(() => moveOrdner(path), "Fertig, die Daten sind kopiert und ab jetzt liegen sie dort. Bitte beende morte einmal und starte es neu.")}>
              {busy ? "Ich kopiere …" : "Dorthin umziehen"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function Datenschutz() {
  return (
    <div className="settings-panel prose">
      <h2>Was auf diesem Computer bleibt</h2>
      <p className="lead">Klassen, Material, Lehrpläne, Stundenplan, Vorlagen und alle Gespräche. Der Zugangsschlüssel liegt im Schlüsselbund deines Computers oder in einer Datei nur für dich.</p>
      <h2>Was zu deinem KI-Anbieter geht</h2>
      <p className="lead">Deine Fragen, der Text aus angehängten Dateien und Bildern und die Teile deines Arbeitsordners, die ich für eine Aufgabe lese.</p>
      <h2>Was nie dabei sein soll</h2>
      <p className="lead">Namen von Schülerinnen und Schülern, Noten und Klassenarbeiten mit Namen. Morte fragt nicht danach. Bitte hänge auch nichts dergleichen an.</p>
    </div>
  );
}

export function Einstellungen({ status, onClose, onDone }: { status: SetupStatus; onClose: () => void; onDone: () => void }) {
  const [tab, setTab] = useState<Tab>("aussehen");
  return (
    <main className="setup">
      <div className="setup-card wide settings">
        <button type="button" className="link back" onClick={onClose}>
          ← Zurück zum Gespräch
        </button>
        <h1>Einstellungen</h1>
        <div className="tabs" role="tablist" aria-label="Einstellungen">
          {TABS.map((t) => (
            <button key={t.id} type="button" role="tab" id={`tab-${t.id}`} aria-selected={tab === t.id} aria-controls="settings-panel" className={tab === t.id ? "on" : ""} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
        <div id="settings-panel" role="tabpanel" aria-labelledby={`tab-${tab}`}>
          {tab === "aussehen" && <Aussehen />}
          {tab === "ordner" && <Ordner />}
          {tab === "ki" && <Setup status={status} embedded onDone={onDone} />}
          {tab === "datenschutz" && <Datenschutz />}
        </div>
      </div>
    </main>
  );
}
