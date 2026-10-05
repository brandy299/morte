import { useEffect, useRef, useState } from "react";
import {
  entferneLehrplan,
  getLehrplaene,
  ordneLehrplanZu,
  pruefeLehrplan,
  wandleLehrplanUm,
  type LehrplaeneData,
  type LehrplanInfo,
  type PruefErgebnis,
  type UmwandelEvent,
} from "./api.ts";

type View =
  | { name: "liste" }
  | { name: "klassen"; plan: LehrplanInfo }
  | { name: "neu" };

const money = (usd: number) => (usd < 0.01 ? "weniger als 1 Cent" : `etwa ${usd.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} US-$`);

/** Name proposal from a file name: "lp_englisch_wuv.pdf" becomes "lp englisch wuv". */
const nameFrom = (file: string) => file.replace(/\.[^.]+$/, "").replace(/[_]+/g, " ").replace(/\s+/g, " ").trim();

export function Lehrplan({ onClose }: { onClose: () => void }) {
  const [view, setView] = useState<View>({ name: "liste" });
  const [data, setData] = useState<LehrplaeneData | null>(null);
  const [busy, setBusy] = useState(false);
  const reload = () => getLehrplaene().then(setData).catch(() => {});
  useEffect(() => {
    void reload();
  }, []);

  const back = () => {
    void reload();
    setView({ name: "liste" });
  };

  return (
    <div className="setup lehrplan">
      <div className="setup-card wide">
        {!busy && (
          <button type="button" className="link back" onClick={view.name === "liste" ? onClose : back}>
            ← {view.name === "liste" ? "Zurück zum Gespräch" : "Zurück zu den Lehrplänen"}
          </button>
        )}
        {view.name === "liste" && <Liste data={data} onNew={() => setView({ name: "neu" })} onClasses={(plan) => setView({ name: "klassen", plan })} onChanged={reload} />}
        {view.name === "klassen" && data && <KlassenWahl plan={view.plan} klassen={data.klassen} onDone={back} />}
        {view.name === "neu" && data && <Neu klassen={data.klassen} onDone={back} onBusy={setBusy} />}
      </div>
    </div>
  );
}

// ---------- List ----------

function Liste({ data, onNew, onClasses, onChanged }: { data: LehrplaeneData | null; onNew: () => void; onClasses: (p: LehrplanInfo) => void; onChanged: () => void }) {
  const [problem, setProblem] = useState<string | null>(null);
  const remove = async (p: LehrplanInfo) => {
    if (!window.confirm(`Soll der Lehrplan „${p.name}“ entfernt werden? Deine Bewertungsregeln dazu bleiben erhalten.`)) return;
    const res = await entferneLehrplan(p.name);
    if (!res.ok) setProblem("Das Entfernen hat nicht geklappt.");
    onChanged();
  };
  const plans = data?.lehrplaene ?? [];
  return (
    <>
      <h1>Lehrpläne</h1>
      <p className="lead">
        Mit einem Lehrplan richte ich Material nach deinen Vorgaben aus und nenne die Stelle, auf die es sich stützt. Du kannst einen Bildungsplan, Kernlehrplan oder deinen schulinternen Lehrplan als PDF hinzufügen.
      </p>
      {problem && <p className="error">{problem}</p>}
      {data && plans.length === 0 && <p className="empty">Noch kein Lehrplan hinterlegt. Ohne Lehrplan steht auf dem Material der Hinweis „Ohne hinterlegten Lehrplan erstellt“.</p>}
      <ul className="plans">
        {plans.map((p) => (
          <li key={p.name}>
            <div className="plan-main">
              <strong>{p.name}</strong>
              <span className="muted">
                {p.hasPlan ? `${p.abschnitte} Abschnitte` : "Nur Bewertungsregeln, noch kein Plan"}
                {" · "}
                {p.klassen.length > 0 ? `gilt für ${p.klassen.join(", ")}` : "gilt noch für keine Klasse"}
              </span>
            </div>
            <div className="plan-actions">
              <button type="button" className="ghost small" onClick={() => onClasses(p)}>
                Klassen wählen
              </button>
              {p.hasPlan && (
                <button type="button" className="ghost small" onClick={() => void remove(p)}>
                  Entfernen
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
      <div className="setup-actions">
        <button type="button" className="primary" onClick={onNew}>
          Lehrplan hinzufügen
        </button>
      </div>
    </>
  );
}

// ---------- Choose classes ----------

function KlassenWahl({ plan, klassen, onDone }: { plan: LehrplanInfo; klassen: string[]; onDone: () => void }) {
  const [chosen, setChosen] = useState<string[]>(plan.klassen);
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const save = async () => {
    setSaving(true);
    setProblem(null);
    try {
      await ordneLehrplanZu(plan.name, chosen);
      onDone();
    } catch {
      setProblem("Das Speichern hat nicht geklappt. Bitte versuche es noch einmal.");
      setSaving(false);
    }
  };
  return (
    <>
      <h1>Für welche Klassen gilt „{plan.name}“?</h1>
      <KlassenListe klassen={klassen} chosen={chosen} onChange={setChosen} />
      {problem && <p className="error">{problem}</p>}
      <div className="setup-actions">
        <button type="button" className="primary" onClick={save} disabled={saving}>
          Speichern
        </button>
      </div>
    </>
  );
}

function KlassenListe({ klassen, chosen, onChange }: { klassen: string[]; chosen: string[]; onChange: (k: string[]) => void }) {
  if (klassen.length === 0) return <p className="empty">Es gibt noch keine Klasse. Lege zuerst links eine Klasse an, dann kannst du ihr den Lehrplan zuordnen.</p>;
  return (
    <ul className="checks">
      {klassen.map((k) => (
        <li key={k}>
          <label>
            <input type="checkbox" checked={chosen.includes(k)} onChange={(e) => onChange(e.target.checked ? [...chosen, k] : chosen.filter((x) => x !== k))} />
            <span>{k}</span>
          </label>
        </li>
      ))}
    </ul>
  );
}

// ---------- Add a plan ----------

type Phase =
  | { name: "datei" }
  | { name: "pruefe"; file: string }
  | { name: "frage"; check: PruefErgebnis }
  | { name: "laeuft"; label: string; done: number; total: number }
  | { name: "fertig"; ergebnis: Extract<UmwandelEvent, { type: "fertig" }> };

function Neu({ klassen, onDone, onBusy }: { klassen: string[]; onDone: () => void; onBusy: (busy: boolean) => void }) {
  const [phase, setPhase] = useState<Phase>({ name: "datei" });
  useEffect(() => {
    onBusy(phase.name === "laeuft" || phase.name === "pruefe");
    return () => onBusy(false);
  }, [phase.name]);
  const [name, setName] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const [exists, setExists] = useState(false);
  const [chosen, setChosen] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setProblem(null);
    setExists(false);
    if (!name.trim()) setName(nameFrom(file.name));
    setPhase({ name: "pruefe", file: file.name });
    const result = await pruefeLehrplan(file);
    if ("error" in result) {
      setProblem(result.error);
      setPhase({ name: "datei" });
    } else setPhase({ name: "frage", check: result });
  };

  const run = async (check: PruefErgebnis, ersetzen = false) => {
    setProblem(null);
    setExists(false);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setPhase({ name: "laeuft", label: "Ich fange an …", done: 0, total: 1 });
    let finished = false;
    try {
      const early = await wandleLehrplanUm(
        { token: check.token, name, ersetzen },
        (e) => {
          if (e.type === "fortschritt") setPhase({ name: "laeuft", label: e.label, done: e.done, total: e.total });
          else if (e.type === "fertig") {
            finished = true;
            setPhase({ name: "fertig", ergebnis: e });
          } else {
            finished = true;
            setProblem(e.message);
            setPhase({ name: "frage", check });
          }
        },
        ctrl.signal,
      );
      if (early) {
        setProblem(early.error);
        setExists(Boolean(early.existiert));
        setPhase({ name: "frage", check });
      } else if (!finished) setPhase({ name: "frage", check });
    } catch {
      if (!ctrl.signal.aborted) setProblem("Die Verbindung ist abgebrochen. Bitte versuche es noch einmal.");
      setPhase({ name: "frage", check });
    }
  };

  const finish = async (planName: string) => {
    setProblem(null);
    try {
      if (chosen.length > 0) await ordneLehrplanZu(planName, chosen);
      onDone();
    } catch {
      setProblem("Der Lehrplan ist gespeichert, aber die Zuordnung zu den Klassen hat nicht geklappt. Du kannst sie unter „Klassen wählen“ noch einmal versuchen.");
    }
  };

  if (phase.name === "fertig") {
    const r = phase.ergebnis;
    return (
      <>
        <p className="step-count">Fertig</p>
        <h1>„{r.name}“ ist hinterlegt</h1>
        <p className="lead">
          Ich habe {r.abschnitte} Abschnitte gefunden. Schau kurz, ob die Gliederung stimmt. Wenn du Material baust, lese ich daraus nur die Stelle, die ich brauche.
        </p>
        {r.warnungen.length > 0 && (
          <div className="result fail" role="status">
            <strong>Das solltest du wissen</strong>
            <ul className="plain">
              {r.warnungen.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </div>
        )}
        <div className="outline" aria-label="Gliederung">
          {r.gliederung.map((h, i) => (
            <div key={i} style={{ paddingLeft: `${(h.ebene - 1) * 16}px` }} className={h.ebene === 1 ? "h1" : ""}>
              {h.titel}
            </div>
          ))}
        </div>
        <h2>Für welche Klassen gilt er?</h2>
        <KlassenListe klassen={klassen} chosen={chosen} onChange={setChosen} />
        {problem && <p className="error">{problem}</p>}
        <div className="setup-actions">
          <button type="button" className="primary" onClick={() => void finish(r.name)}>
            Fertig
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <h1>Lehrplan hinzufügen</h1>
      {phase.name === "datei" && (
        <>
          <p className="lead">Wähle die Datei mit dem Lehrplan aus. Am besten ein PDF, es gehen auch Textdateien.</p>
          <label className="field">
            <span>Wie soll der Lehrplan heißen?</span>
            <input value={name} placeholder="zum Beispiel Höhere Handelsschule oder Englisch Sek I" onChange={(e) => setName(e.target.value)} />
          </label>
          <div
            className={dragging ? "drop on" : "drop"}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              void pick(e.dataTransfer.files[0]);
            }}
          >
            <input ref={fileRef} type="file" accept=".pdf,.md,.markdown,.txt,application/pdf,text/plain" hidden onChange={(e) => void pick(e.target.files?.[0])} />
            <p>Datei hierher ziehen</p>
            <button type="button" className="ghost" onClick={() => fileRef.current?.click()}>
              oder Datei auswählen
            </button>
          </div>
        </>
      )}

      {phase.name === "pruefe" && (
        <p className="working">
          <span className="pulse" aria-hidden /> Ich sehe mir „{phase.file}“ an …
        </p>
      )}

      {phase.name === "frage" && <Frage check={phase.check} name={name} onName={setName} exists={exists} onRun={(replace) => void run(phase.check, replace)} onOther={() => setPhase({ name: "datei" })} />}

      {phase.name === "laeuft" && (
        <div role="status" aria-live="polite">
          <p className="working">
            <span className="pulse" aria-hidden /> {phase.label}
          </p>
          <div className="bar big" aria-hidden>
            <span style={{ width: `${Math.max(4, Math.round((phase.done / Math.max(1, phase.total)) * 100))}%` }} />
          </div>
          <p className="muted small-note">Bitte lass dieses Fenster offen. Das Lesen dauert einen Moment.</p>
          <div className="setup-actions">
            <button type="button" className="ghost" onClick={() => abortRef.current?.abort()}>
              Abbrechen
            </button>
          </div>
        </div>
      )}
      {problem && <p className="error">{problem}</p>}
    </>
  );
}

function Frage({ check, name, onName, exists, onRun, onOther }: { check: PruefErgebnis; name: string; onName: (n: string) => void; exists: boolean; onRun: (replace: boolean) => void; onOther: () => void }) {
  const isPdf = check.art === "pdf";
  return (
    <>
      <div className="facts">
        <strong>{check.dateiname}</strong>
        {isPdf ? (
          <span className="muted">
            {check.seiten} Seiten
            {check.bilder ? `, davon ${check.bilder} nur als Bild` : ""}
          </span>
        ) : (
          <span className="muted">Textdatei</span>
        )}
      </div>
      {isPdf ? (
        <p className="lead">
          Ich lese das PDF, bringe es in eine saubere Gliederung und speichere es als Lehrplan. Dabei ändere ich keine Worte.
          {check.minuten ? ` Das dauert etwa ${check.minuten} ${check.minuten === 1 ? "Minute" : "Minuten"}` : ""}
          {check.kostenUsd !== undefined ? ` und kostet ${money(check.kostenUsd)}.` : check.minuten ? "." : ""}
        </p>
      ) : (
        <p className="lead">Ich übernehme den Text so, wie er ist.</p>
      )}
      {isPdf && <p className="privacy">Der Text des Plans geht dafür an deinen KI-Anbieter. Er enthält keine Daten von Schülerinnen und Schülern.</p>}
      <label className="field">
        <span>Name des Lehrplans</span>
        <input value={name} onChange={(e) => onName(e.target.value)} />
      </label>
      <div className="setup-actions">
        <button type="button" className="primary" disabled={!name.trim()} onClick={() => onRun(false)}>
          {isPdf ? "Lehrplan umwandeln" : "Lehrplan speichern"}
        </button>
        {exists && (
          <button type="button" className="ghost" onClick={() => onRun(true)}>
            Vorhandenen Lehrplan ersetzen
          </button>
        )}
        <button type="button" className="ghost" onClick={onOther}>
          Andere Datei
        </button>
      </div>
    </>
  );
}
