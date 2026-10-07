import { useEffect, useRef, useState } from "react";
import {
  aktualisierePlan,
  entfernePlan,
  getPlanStatus,
  getTitel,
  ladePlanHoch,
  ladePlanVonLink,
  speichereZuordnung,
  type PlanStatus,
  type TitelInfo,
  type Zuordnung,
} from "./api.ts";

const dateText = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" });
const stamp = (iso: string) => new Date(iso).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" });

const IGNORE = "ignorieren";
const encode = (z: Zuordnung | undefined) => (z === null ? IGNORE : z ? `${z.klasse}|${z.fach}` : "");
const decode = (v: string): Zuordnung | undefined => (v === IGNORE ? null : v ? { klasse: v.split("|")[0]!, fach: v.split("|").slice(1).join("|") } : undefined);

export function Stundenplan({ onClose }: { onClose: () => void }) {
  const [status, setStatus] = useState<PlanStatus | null>(null);
  const reload = () => getPlanStatus().then(setStatus).catch(() => {});
  useEffect(() => {
    void reload();
  }, []);

  return (
    <main className="setup lehrplan">
      <div className="setup-card wide">
        <button type="button" className="link back" onClick={onClose}>
          ← Zurück
        </button>
        <h1>Stundenplan</h1>
        {status && (status.vorhanden ? <Zuordnen status={status} onChanged={reload} onClose={onClose} /> : <Laden onDone={reload} />)}
      </div>
    </main>
  );
}

// ---------- Get the timetable in ----------

function Laden({ onDone }: { onDone: () => void }) {
  const [mode, setMode] = useState<"datei" | "link">("datei");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const run = async (job: () => Promise<string | null>) => {
    setBusy(true);
    setProblem(null);
    const error = await job().catch(() => "Keine Verbindung zu Pult.");
    setBusy(false);
    if (error) setProblem(error);
    else onDone();
  };

  return (
    <>
      <p className="lead">
        Ich brauche deinen Stundenplan als Kalender (iCal). Die meisten Stundenplan-Programme, zum Beispiel WebUntis, bieten dafür einen Link zum Abonnieren oder eine Datei zum Herunterladen mit der Endung „.ics“.
      </p>
      <div className="segmented" role="tablist" aria-label="Wie kommt der Stundenplan zu mir?">
        <button type="button" role="tab" aria-selected={mode === "datei"} className={mode === "datei" ? "on" : ""} onClick={() => setMode("datei")}>
          Datei
        </button>
        <button type="button" role="tab" aria-selected={mode === "link"} className={mode === "link" ? "on" : ""} onClick={() => setMode("link")}>
          Link
        </button>
      </div>
      {mode === "datei" ? (
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
            const f = e.dataTransfer.files[0];
            if (f) void run(() => ladePlanHoch(f));
          }}
        >
          <input ref={fileRef} type="file" accept=".ics,text/calendar" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void run(() => ladePlanHoch(f)); }} />
          <p>Kalenderdatei hierher ziehen</p>
          <button type="button" className="ghost" disabled={busy} onClick={() => fileRef.current?.click()}>
            oder Datei auswählen
          </button>
        </div>
      ) : (
        <>
          <label className="field">
            <span>Link zum Stundenplan</span>
            <input value={url} placeholder="https://… oder webcal://…" autoComplete="off" onChange={(e) => setUrl(e.target.value)} />
          </label>
          <p className="privacy">Der Link enthält einen persönlichen Schlüssel. Ich speichere ihn sicher auf diesem Computer, damit du den Stundenplan später mit einem Klick aktualisieren kannst.</p>
          <div className="setup-actions">
            <button type="button" className="primary" disabled={busy || !url.trim()} onClick={() => void run(() => ladePlanVonLink(url))}>
              {busy ? "Ich hole den Stundenplan …" : "Stundenplan holen"}
            </button>
          </div>
        </>
      )}
      {busy && mode === "datei" && <p className="working"><span className="pulse" aria-hidden /> Ich lese den Stundenplan …</p>}
      {problem && <p className="error">{problem}</p>}
    </>
  );
}

// ---------- Which lesson belongs to which class ----------

function Zuordnen({ status, onChanged, onClose }: { status: PlanStatus; onChanged: () => void; onClose: () => void }) {
  const [titel, setTitel] = useState<TitelInfo[] | null>(null);
  const [klassen, setKlassen] = useState<{ name: string; faecher: string[] }[]>([]);
  const [choice, setChoice] = useState<Record<string, string>>({});
  const [guessed, setGuessed] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    getTitel().then((r) => {
      setTitel(r.titel);
      setKlassen(r.klassen);
      const c: Record<string, string> = {};
      const g = new Set<string>();
      for (const t of r.titel) {
        c[t.schluessel] = encode(t.zuordnung !== undefined ? t.zuordnung : t.vorschlag);
        if (t.zuordnung === undefined && t.vorschlag) g.add(t.schluessel);
      }
      setChoice(c);
      setGuessed(g);
    });
  }, [status.meta?.aktualisiert]);

  const meta = status.meta!;
  const open = titel?.filter((t) => !choice[t.schluessel]).length ?? 0;
  const options = klassen.flatMap((k) => k.faecher.map((f) => ({ value: `${k.name}|${f}`, label: `${k.name} · ${f}` })));

  const act = async (job: () => Promise<string | null | void>, done?: string) => {
    setBusy(true);
    setProblem(null);
    setInfo(null);
    const error = await job().catch(() => "Keine Verbindung zu Pult.");
    setBusy(false);
    if (error) setProblem(error);
    else if (done) setInfo(done);
  };

  const save = async (andClose: boolean) => {
    const zuordnung: Record<string, Zuordnung> = {};
    for (const t of titel ?? []) {
      const z = decode(choice[t.schluessel] ?? "");
      if (z !== undefined) zuordnung[t.schluessel] = z;
    }
    await act(async () => {
      const error = await speichereZuordnung(zuordnung);
      if (!error && andClose) onClose();
      return error;
    }, "Gespeichert.");
  };

  return (
    <>
      <div className="facts">
        <strong>
          {meta.anzahl} Stunden, {dateText(meta.von)} bis {dateText(meta.bis)}
        </strong>
        <span className="muted">
          {meta.quelle === "link" ? `Link ${meta.name ?? ""}` : meta.name ?? "Datei"} · geladen {stamp(meta.aktualisiert)}
        </span>
      </div>
      <div className="setup-actions tight">
        {status.hatLink && (
          <button type="button" className="ghost small" disabled={busy} onClick={() => void act(async () => { const e = await aktualisierePlan(); if (!e) onChanged(); return e; }, "Der Stundenplan ist aktualisiert.")}>
            Jetzt aktualisieren
          </button>
        )}
        <button type="button" className="ghost small" disabled={busy} onClick={() => { if (window.confirm("Soll der Stundenplan entfernt werden? Dein Material und deine Reihen bleiben erhalten.")) void entfernePlan().then(onChanged); }}>
          Anderen Stundenplan laden
        </button>
      </div>
      {problem && <p className="error">{problem}</p>}
      {info && <p className="toast ok">{info}</p>}

      <h2>Zu welcher Klasse gehört welche Stunde?</h2>
      <p className="lead">
        {open > 0 ? `${open} von ${titel?.length ?? 0} Einträgen sind noch offen.` : "Alle Einträge sind zugeordnet."} Einträge wie Pausenaufsicht kannst du ausblenden.
      </p>
      {klassen.length === 0 && <p className="empty">Es gibt noch keine Klasse. Lege zuerst links eine Klasse an, dann kannst du ihr Stunden zuordnen.</p>}
      <ul className="assign">
        {titel?.map((t) => (
          <li key={t.schluessel}>
            <div className="assign-what">
              <strong>{t.titel || "Ohne Titel"}{t.gruppe ? ` · ${t.gruppe}` : ""}</strong>
              <span className="muted">
                {t.anzahl}× im Plan{t.beispiel ? ` · ${t.beispiel}` : ""}
              </span>
            </div>
            <div className="assign-pick">
              <select
                aria-label={`Zuordnung für ${t.titel || "Eintrag ohne Titel"} ${t.gruppe ?? ""}`}
                value={choice[t.schluessel] ?? ""}
                onChange={(e) => {
                  setChoice((c) => ({ ...c, [t.schluessel]: e.target.value }));
                  setGuessed((g) => {
                    const n = new Set(g);
                    n.delete(t.schluessel);
                    return n;
                  });
                }}
              >
                <option value="">noch offen</option>
                {options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
                <option value={IGNORE}>Gehört nicht zu mir (ausblenden)</option>
              </select>
              {guessed.has(t.schluessel) && <span className="guess">Vorschlag</span>}
            </div>
          </li>
        ))}
      </ul>
      <div className="setup-actions">
        <button type="button" className="primary" disabled={busy} onClick={() => void save(true)}>
          Speichern und fertig
        </button>
        <button type="button" className="ghost" disabled={busy} onClick={() => void save(false)}>
          Speichern
        </button>
      </div>
    </>
  );
}
