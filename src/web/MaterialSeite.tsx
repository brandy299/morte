import { type CSSProperties, useEffect, useMemo, useState } from "react";
import { getMaterialListe, materialUrl, zipUrl, type KlasseInfo, type Material } from "./api.ts";
import { classColors, classVar } from "./klassenfarbe.ts";
import { ARTEN, artLabel, filterFiles, formatSize, groupFiles, showName, showReihe, type Art, type MaterialDatei } from "./materialListe.ts";

/** Same limit as the server: more files cannot go into one zip. */
const ZIP_MAX = 60;
const date = new Intl.DateTimeFormat("de-DE", { day: "numeric", month: "short", year: "numeric" });
const PREVIEW = /\.(pdf|png|jpe?g|gif|webp)$/i;

const asMaterial = (f: MaterialDatei): Material => ({ title: showName(f.name), name: f.name, path: f.path });

interface Props {
  tree: KlasseInfo[];
  onPreview: (m: Material) => void;
  /** Opens the chat with a first message ready to send. */
  onAsk: (text: string) => void;
}

export function MaterialSeite({ tree, onPreview, onAsk }: Props) {
  const [files, setFiles] = useState<MaterialDatei[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [klasse, setKlasse] = useState("");
  const [art, setArt] = useState<Art>("alle");
  const [suche, setSuche] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());

  useEffect(() => {
    getMaterialListe().then(setFiles, () => setFailed(true));
  }, []);

  const colors = useMemo(() => classColors(tree.map((k) => k.name)), [tree]);
  const classes = useMemo(() => [...new Set((files ?? []).map((f) => f.klasse))].sort((a, b) => a.localeCompare(b, "de", { numeric: true })), [files]);
  const shown = useMemo(() => filterFiles(files ?? [], { klasse, art, suche }), [files, klasse, art, suche]);
  const groups = useMemo(() => groupFiles(shown), [shown]);
  // A file that is filtered out is no longer selected, so the zip holds exactly what is listed and ticked.
  const chosen = shown.filter((f) => picked.has(f.path));
  const toggle = (path: string) => setPicked((p) => (p.has(path) ? new Set([...p].filter((x) => x !== path)) : new Set(p).add(path)));
  const tooMany = chosen.length > ZIP_MAX;
  const zipTitle = klasse ? `Material ${klasse}` : "Material";
  const filtered = klasse !== "" || art !== "alle" || suche.trim() !== "";

  return (
    <div className="mat">
      <header className="mat-head">
        <h1>Material</h1>
        <p className="muted">Alles, was du mit Pult erstellt hast, an einem Ort.</p>
      </header>

      {failed && <p role="alert" className="mat-note">Die Liste konnte nicht geladen werden. Lade die Seite bitte neu.</p>}
      {!files && !failed && <p className="muted" role="status">Einen Moment, ich suche dein Material.</p>}

      {files && files.length === 0 && (
        <div className="mat-empty">
          <p>Hier ist noch nichts. Sobald du ein Arbeitsblatt, eine Klausur oder eine Stundenplanung erstellst, findest du es hier.</p>
          <button type="button" className="primary" onClick={() => onAsk("Erstelle ein Arbeitsblatt für meine Klasse.")}>Erstes Material erstellen</button>
        </div>
      )}

      {files && files.length > 0 && (
        <>
          <div className="mat-tools">
            <label className="mat-search">
              <span className="sr-only">Material durchsuchen</span>
              <input type="search" value={suche} onChange={(e) => setSuche(e.target.value)} placeholder="Suchen, zum Beispiel „Kreislauf“" />
            </label>
            <div className="mat-filters" role="group" aria-label="Nach Klasse filtern">
              <button type="button" className={klasse === "" ? "on" : ""} aria-pressed={klasse === ""} onClick={() => setKlasse("")}>Alle Klassen</button>
              {classes.map((k) => (
                <button key={k} type="button" className={klasse === k ? "on" : ""} aria-pressed={klasse === k} onClick={() => setKlasse(klasse === k ? "" : k)} style={{ "--k": classVar(colors, k) } as CSSProperties}>
                  <i className="dot" aria-hidden />
                  {k}
                </button>
              ))}
            </div>
            <div className="mat-filters" role="group" aria-label="Nach Art filtern">
              {ARTEN.map((a) => (
                <button key={a.id} type="button" className={art === a.id ? "on" : ""} aria-pressed={art === a.id} onClick={() => setArt(a.id)}>{a.label}</button>
              ))}
            </div>
          </div>

          <p className="muted mat-count" role="status">
            {shown.length === 0 ? "Dazu gibt es nichts." : `${shown.length} ${shown.length === 1 ? "Datei" : "Dateien"}${filtered ? " gefunden" : ""}`}
            {filtered && (
              <>
                {" · "}
                <button type="button" className="linklike" onClick={() => { setKlasse(""); setArt("alle"); setSuche(""); }}>Filter zurücksetzen</button>
              </>
            )}
          </p>

          {groups.map((g) => (
            <section key={`${g.klasse}/${g.fach}`} className="mat-group" style={{ "--k": classVar(colors, g.klasse) } as CSSProperties}>
              <h2><i className="dot" aria-hidden />{g.klasse} · {g.fach}</h2>
              {g.reihen.map((r) => (
                <div key={r.reihe} className="mat-reihe">
                  <h3>{showReihe(r.reihe)}</h3>
                  <ul>
                    {r.files.map((f) => (
                      <li key={f.path}>
                        <label className="mat-check">
                          <input type="checkbox" checked={picked.has(f.path)} onChange={() => toggle(f.path)} />
                          <span className="sr-only">{showName(f.name)} auswählen</span>
                        </label>
                        <span className="mat-badge">{artLabel(f.name)}</span>
                        <span className="mat-name">{showName(f.name)}</span>
                        <span className="mat-meta">{date.format(new Date(f.modified))} · {formatSize(f.size)}</span>
                        <span className="mat-actions">
                          {PREVIEW.test(f.name) && <button type="button" className="ghost" onClick={() => onPreview(asMaterial(f))}>Ansehen</button>}
                          <a className="ghost" href={materialUrl(asMaterial(f), true)} download={f.name}>Herunterladen</a>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          ))}

          {shown.length > 0 && (
            <div className="mat-bar" role="group" aria-label="Auswahl">
              <span>{chosen.length === 0 ? "Hake Dateien an, um sie als Paket zu laden." : `${chosen.length} ausgewählt`}</span>
              <button type="button" className="ghost" onClick={() => setPicked(new Set(shown.slice(0, ZIP_MAX).map((f) => f.path)))}>
                Alle {shown.length > ZIP_MAX ? `ersten ${ZIP_MAX} ` : ""}auswählen
              </button>
              {chosen.length > 0 && <button type="button" className="ghost" onClick={() => setPicked(new Set())}>Auswahl aufheben</button>}
              {chosen.length > 0 && !tooMany && (
                <a className="primary" href={zipUrl(chosen.map((f) => f.path), zipTitle)} download>Als ZIP herunterladen</a>
              )}
              {tooMany && <span className="mat-note">Mehr als {ZIP_MAX} Dateien gehen nicht in ein Paket.</span>}
            </div>
          )}
        </>
      )}
    </div>
  );
}
