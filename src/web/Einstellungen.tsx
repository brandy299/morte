import { UpdateLauf } from "./UpdateLauf.tsx";
import { useEffect, useState } from "react";
import { chooseOrdner, getOrdner, moveOrdner, openOrdner, resetOrdner, type OrdnerInfo, type SetupStatus } from "./api.ts";
import { Schule } from "./Schule.tsx";
import { Setup } from "./Setup.tsx";
import { LookPicker } from "./LookPicker.tsx";
import { MitteilungenSchalter } from "./MitteilungenSchalter.tsx";
import { InternetSchalter } from "./InternetSchalter.tsx";

type Tab = "aussehen" | "ordner" | "schule" | "ki" | "update" | "datenschutz";
const TABS: { id: Tab; label: string }[] = [
  { id: "aussehen", label: "Aussehen" },
  { id: "ordner", label: "Ordner" },
  { id: "schule", label: "Schule" },
  { id: "ki", label: "KI-Anbieter" },
  { id: "update", label: "Update" },
  { id: "datenschutz", label: "Datenschutz" },
];

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
            <input value={path} placeholder={info.plattform === "win32" ? "zum Beispiel D:\\Schule\\pult-daten" : "zum Beispiel /Users/name/Dokumente/pult-daten"} onChange={(e) => setPath(e.target.value)} />
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
                  if (chosen) setPath(`${chosen}/pult-daten`);
                }}
              >
                Ordner auswählen …
              </button>
            )}
            <button type="button" className="primary" disabled={busy || !path.trim()} onClick={() => run(() => moveOrdner(path), "Fertig, die Daten sind kopiert und ab jetzt liegen sie dort. Bitte beende Pult einmal und starte es neu.")}>
              {busy ? "Ich kopiere …" : "Dorthin umziehen"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

interface UpdateInfo {
  verfuegbar: boolean;
  /** The whole program is replaced: Pult closes, installs and opens again. */
  neuInstallieren?: boolean;
  aktuell: string;
  neu: string;
  hinweis?: string;
}

function Update() {
  const [info, setInfo] = useState<UpdateInfo | null>(null);
  const [laeuft, setLaeuft] = useState(false);
  const [problem, setProblem] = useState("");
  useEffect(() => {
    fetch("/api/update")
      .then((r) => r.json())
      .then(setInfo)
      .catch(() => setInfo({ verfuegbar: false, aktuell: "", neu: "", hinweis: "Ich konnte nicht nachsehen." }));
  }, []);

  if (laeuft) return <UpdateLauf neuInstallieren={info?.neuInstallieren} onFehler={(text) => (setLaeuft(false), setProblem(text))} />;
  return (
    <div className="settings-panel prose">
      <h2>Neue Version holen</h2>
      {!info && <p className="lead">Ich sehe nach …</p>}
      {info?.hinweis && <p className="lead">{info.hinweis}</p>}
      {info && !info.hinweis && (
        <p className="lead">{info.verfuegbar ? "Es gibt eine neuere Version von Pult." : "Du hast die neueste Version."}</p>
      )}
      {problem && <p role="alert">{problem}</p>}
      {info?.verfuegbar && (
        <>
          <p className="muted">Alles, was du in Pult gemacht hast, bleibt erhalten. {info.neuInstallieren ? "Pult schließt sich kurz und öffnet sich von allein wieder." : "Pult startet kurz neu und geht dann von selbst weiter."}</p>
          <div className="setup-actions">
            <button type="button" className="primary" onClick={() => (setProblem(""), setLaeuft(true))}>
              Jetzt aktualisieren
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
      <h2>Was ins Internet geht</h2>
      <p className="lead">Wenn die Suche eingeschaltet ist: die Suchwörter an den Suchdienst (ohne eigenen Schlüssel das kostenlose Exa, sonst DeepSeek oder OpenRouter) und die Adresse einer Seite, die ich lese, an diese Seite. Namen von Schülerinnen und Schülern oder Noten kommen in keine Suche. Du kannst das unter „KI-Anbieter“ ausschalten.</p>
      <h2>Rückmeldungen zum Material</h2>
      <p className="lead">Unter jedem fertigen Material kannst du „Passt“ oder „Passt nicht“ wählen. Das bleibt auf diesem Computer. Du kannst alle Rückmeldungen als Datei speichern und weitergeben, damit Pult besser wird. Ohne deine Sätze sind darin nur Art des Materials, Anleitung, Modell und Zahlen. Gespräche und Inhalte sind nie dabei.</p>
      <p>
        <a className="ghost" href="/api/rueckmeldungen/export" download>
          Rückmeldungen speichern (ohne meine Sätze)
        </a>{" "}
        <a className="ghost" href="/api/rueckmeldungen/export?mitSatz=1" download>
          Mit meinen Sätzen speichern
        </a>
      </p>
      <h2>Was nie dabei sein soll</h2>
      <p className="lead">Namen von Schülerinnen und Schülern, Noten und Klassenarbeiten mit Namen. Pult fragt nicht danach. Bitte hänge auch nichts dergleichen an.</p>
    </div>
  );
}

export function Einstellungen({ status, onClose, onDone, startTab = "aussehen" }: { status: SetupStatus; onClose: () => void; onDone: () => void; startTab?: Tab }) {
  const [tab, setTab] = useState<Tab>(startTab);
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
          {tab === "aussehen" && (
            <div className="settings-panel">
              <LookPicker />
              <MitteilungenSchalter />
            </div>
          )}
          {tab === "ordner" && <Ordner />}
          {tab === "schule" && <Schule />}
          {tab === "ki" && (
            <>
              <Setup status={status} embedded onDone={onDone} />
              <div className="settings-panel">
                <InternetSchalter />
              </div>
            </>
          )}
          {tab === "update" && <Update />}
          {tab === "datenschutz" && <Datenschutz />}
        </div>
        <p className="muted version">
          Pult {__PULT_VERSION__} (Probelauf){__PULT_COMMIT__ ? `, Stand ${__PULT_COMMIT__}` : ""}. Nenne das bei einer Fehlermeldung.
        </p>
      </div>
    </main>
  );
}
