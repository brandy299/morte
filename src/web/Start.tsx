import { type CSSProperties, useCallback, useEffect, useRef, useState } from "react";
import { getWoche, legeAb, type KlasseInfo, type WocheAntwort, type WochenStunde } from "./api.ts";

const long = new Intl.DateTimeFormat("de-DE", { day: "numeric", month: "long" });
const withYear = new Intl.DateTimeFormat("de-DE", { day: "numeric", month: "long", year: "numeric" });
const dm = (iso: string) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}.`;
const at = (iso: string) => new Date(`${iso}T12:00:00`);

const LABEL: Record<WochenStunde["zustand"], string> = {
  "material-fertig": "Material fertig",
  geplant: "Material fehlt",
  gehalten: "gehalten",
  "nicht-geplant": "noch nicht geplant",
  "nicht-zugeordnet": "Klasse zuordnen",
};

function weekTitle(montag: string, days: number) {
  const from = at(montag);
  const to = at(montag);
  to.setDate(to.getDate() + Math.max(0, days - 1));
  return from.getMonth() === to.getMonth() ? `${from.getDate()}. bis ${withYear.format(to)}` : `${long.format(from)} bis ${withYear.format(to)}`;
}

export interface StartProps {
  tree: KlasseInfo[];
  onSetup: () => void;
  /** Opens the chat with a first message ready to send. */
  onAsk: (text: string) => void;
  onChanged: () => void;
}

export function Start({ tree, onSetup, onAsk, onChanged }: StartProps) {
  const [day, setDay] = useState<string | undefined>();
  const [data, setData] = useState<WocheAntwort | null>(null);
  const [open, setOpen] = useState<WochenStunde | null>(null);
  const [note, setNote] = useState<{ text: string; error?: boolean } | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const load = useCallback((d?: string) => getWoche(d).then((r) => (setData(r), r)).catch(() => undefined), []);
  useEffect(() => {
    void load(day);
  }, [day, load]);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const tell = (text: string, error = false) => {
    setNote({ text, error });
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setNote(null), error ? 7000 : 4500);
  };

  const drop = async (s: WochenStunde, files: FileList | File[]) => {
    if (!s.klasse || !s.fach) return tell("Ordne diese Stunde zuerst einer Klasse zu.", true);
    for (const file of [...files]) {
      const r = await legeAb({ klasse: s.klasse, fach: s.fach, datum: s.datum, von: s.von }, file);
      if ("error" in r) return tell(r.error, true);
      tell(`„${file.name}“ liegt jetzt bei ${s.klasse} ${s.fach}, ${dm(s.datum)}`);
    }
    await load(day).then((r) => setOpen((o) => (o && r?.woche ? (r.woche.tage.flatMap((t) => t.stunden).find((x) => x.uid === o.uid && x.datum === o.datum) ?? o) : o)));
    onChanged();
  };

  const w = data?.woche;
  const isToday = (d: string) => d === data?.heute;
  const todays = w?.tage.find((t) => isToday(t.datum))?.stunden.length ?? 0;

  return (
    <div className="start">
      <header className="start-head">
        <div>
          <h1>{w && w.tage.some((t) => isToday(t.datum)) ? "Diese Woche" : "Woche"}</h1>
          {w && <p className="muted">{weekTitle(w.montag, w.tage.length)}</p>}
        </div>
        <div className="start-nav">
          <button type="button" className="icon-btn" aria-label="Eine Woche zurück" onClick={() => data && setDay(data.zurueck)}>
            ‹
          </button>
          <button type="button" className="ghost small" onClick={() => setDay(undefined)}>
            Heute
          </button>
          <button type="button" className="icon-btn" aria-label="Eine Woche weiter" onClick={() => data && setDay(data.weiter)}>
            ›
          </button>
          <button type="button" className="ghost small" onClick={onSetup}>
            Stundenplan
          </button>
        </div>
      </header>

      {note && (
        <p className={note.error ? "error toast" : "toast ok"} role="status">
          {note.text}
        </p>
      )}

      {data && !w && (
        <section className="start-empty">
          <h2>Dein Stundenplan fehlt noch</h2>
          <p>
            Mit deinem Stundenplan zeige ich dir, welche Stunden anstehen und wo noch Material fehlt. Du kannst Dateien direkt auf eine Stunde ziehen, dann landen sie am richtigen Platz. Dafür brauche ich den Stundenplan als Kalender (iCal).
          </p>
          <button type="button" className="primary" onClick={onSetup}>
            Stundenplan hinzufügen
          </button>
        </section>
      )}

      {w && (
        <>
          <ul className="chips-row" aria-label="Überblick">
            {isTodayInWeek(w, data!.heute) && <li>Heute: {todays} {todays === 1 ? "Stunde" : "Stunden"}</li>}
            <li className={w.fehlt > 0 ? "warn" : ""}>Material fehlt: {w.fehlt}</li>
            {w.nichtGeplant > 0 && <li>Noch nicht geplant: {w.nichtGeplant}</li>}
            {w.nichtZugeordnet > 0 && (
              <li className="warn">
                <button type="button" className="link" onClick={onSetup}>
                  {w.nichtZugeordnet === 1 ? "1 Stunde braucht eine Klasse" : `${w.nichtZugeordnet} Stunden brauchen eine Klasse`}
                </button>
              </li>
            )}
          </ul>

          <div className="week" key={w.montag} style={{ gridTemplateColumns: `repeat(${w.tage.length}, minmax(176px, 1fr))` }}>
            {w.tage.map((t, di) => (
              <section key={t.datum} style={{ "--i": di } as CSSProperties} className={isToday(t.datum) ? "day today" : "day"} aria-label={`${t.tag} ${dm(t.datum)}`}>
                <h3>
                  <span>{t.tag}</span> {dm(t.datum)}
                </h3>
                {t.stunden.length === 0 && <p className="free">frei</p>}
                {t.stunden.map((s) => (
                  <LessonCard key={`${s.uid}`} s={s} past={t.datum < data!.heute} onOpen={() => setOpen(s)} onDrop={(files) => void drop(s, files)} />
                ))}
              </section>
            ))}
          </div>
        </>
      )}

      <Overview tree={tree} onAsk={onAsk} />

      {open && <Details s={open} onClose={() => setOpen(null)} onAsk={(t) => { setOpen(null); onAsk(t); }} onFiles={(f) => void drop(open, f)} />}
    </div>
  );
}

const isTodayInWeek = (w: NonNullable<WocheAntwort["woche"]>, heute: string) => w.tage.some((t) => t.datum === heute);

function LessonCard({ s, past, onOpen, onDrop }: { s: WochenStunde; past: boolean; onOpen: () => void; onDrop: (files: FileList) => void }) {
  const [over, setOver] = useState(false);
  const title = s.klasse ?? ([s.titel, s.gruppe].filter(Boolean).join(" · ") || "Ohne Titel");
  return (
    <button
      type="button"
      className={`lesson ${s.zustand}${over ? " over" : ""}${past ? " past" : ""}`}
      onClick={onOpen}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        if (e.dataTransfer.files.length) onDrop(e.dataTransfer.files);
      }}
    >
      <span className="lesson-time">
        {s.von}–{s.bis}
        {s.ort && <span className="room">{s.ort}</span>}
      </span>
      <strong className="lesson-title">{title}</strong>
      {s.klasse && <span className="lesson-fach">{s.fach}</span>}
      {s.klasse && <span className={s.thema ? "lesson-topic" : "lesson-topic none"}>{s.thema ?? "Noch nichts geplant"}</span>}
      <span className="lesson-foot">
        <span className={`pill ${s.zustand}`}>{LABEL[s.zustand]}</span>
        {s.material && <span className="files">{s.material.split(", ").length} {s.material.split(", ").length === 1 ? "Datei" : "Dateien"}</span>}
      </span>
      {over && <span className="drop-hint">Hier ablegen</span>}
    </button>
  );
}

function Details({ s, onClose, onAsk, onFiles }: { s: WochenStunde; onClose: () => void; onAsk: (t: string) => void; onFiles: (f: FileList) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const files = s.material ? s.material.split(", ").filter(Boolean) : [];
  const base = s.klasse && s.fach && s.reihe ? `Klassen/${s.klasse}/${s.fach}/${s.reihe}/Material/` : undefined;
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [onClose]);
  const when = `${new Intl.DateTimeFormat("de-DE", { weekday: "long", day: "numeric", month: "long" }).format(at(s.datum))}, ${s.von} bis ${s.bis} Uhr`;
  return (
    <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="Stunde">
        <button type="button" className="modal-x" aria-label="Schließen" onClick={onClose}>
          ×
        </button>
        <p className="muted">{when}{s.ort ? ` · Raum ${s.ort}` : ""}</p>
        <h2>{s.klasse ? `${s.klasse} · ${s.fach}` : [s.titel, s.gruppe].filter(Boolean).join(" · ") || "Ohne Titel"}</h2>
        {s.klasse ? (
          <dl className="facts-list">
            <dt>Thema</dt>
            <dd>{s.thema ?? <span className="muted">noch nichts geplant</span>}</dd>
            <dt>Reihe</dt>
            <dd>{s.reihe ? s.reihe.replace(/^\d+\s+/, "") : <span className="muted">noch keiner Reihe zugeordnet</span>}</dd>
            <dt>Material</dt>
            <dd>
              {files.length === 0 ? (
                <span className="muted">noch keins</span>
              ) : (
                <ul className="file-list">
                  {files.map((f) => (
                    <li key={f}>{base ? <a href={`/api/material?path=${encodeURIComponent(base + f)}`} target="_blank" rel="noreferrer">{f.replace(/^\d{4}-\d\d-\d\d_[A-Za-z]{2}\d{0,4}_/, "")}</a> : f}</li>
                  ))}
                </ul>
              )}
            </dd>
          </dl>
        ) : (
          <p>Zu dieser Stunde habe ich noch keine Klasse. Ordne sie im Stundenplan zu, dann zeige ich dir hier Thema und Material.</p>
        )}
        {s.klasse && (
          <div className="modal-actions">
            <input ref={fileRef} type="file" multiple hidden onChange={(e) => e.target.files && onFiles(e.target.files)} />
            <button type="button" className="primary" onClick={() => onAsk(`Plane die Stunde ${s.klasse}, ${s.fach} am ${dm(s.datum)} (${s.von} Uhr).`)}>
              Im Gespräch planen
            </button>
            <button type="button" className="ghost" onClick={() => fileRef.current?.click()}>
              Datei hinzufügen
            </button>
          </div>
        )}
        {s.klasse && <p className="muted small-note">Du kannst Dateien auch einfach auf die Stunde ziehen.</p>}
      </div>
    </div>
  );
}

function Overview({ tree, onAsk }: { tree: KlasseInfo[]; onAsk: (t: string) => void }) {
  if (tree.length === 0) return null;
  return (
    <section className="overview" aria-label="Deine Klassen">
      <h2>Deine Klassen</h2>
      <div className="class-grid">
        {tree.map((k) =>
          k.faecher.map((f) => (
            <button type="button" key={`${k.name}|${f.name}`} className="class-card" onClick={() => onAsk(`Wo stehen wir in ${k.name}, ${f.name}?`)}>
              <strong>{k.name}</strong>
              <span className="muted">{f.name}</span>
              {f.reihen.length === 0 ? (
                <span className="muted small-note">Noch keine Reihe</span>
              ) : (
                f.reihen.map((r) => (
                  <span key={r.name} className="series">
                    <span className="series-name">{r.name.replace(/^\d+\s+/, "")}</span>
                    <span className="progress" aria-hidden>
                      <span style={{ width: `${r.stunden ? (r.gehalten / r.stunden) * 100 : 0}%` }} />
                    </span>
                    <span className="series-note">
                      {r.gehalten} von {r.stunden} gehalten{r.ohneMaterial > 0 ? ` · ${r.ohneMaterial} ohne Material` : ""}
                    </span>
                  </span>
                ))
              )}
            </button>
          )),
        )}
      </div>
    </section>
  );
}
