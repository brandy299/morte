import { useState } from "react";
import { createClass } from "./api.ts";

const SCHULFORMEN = ["Berufskolleg", "Gymnasium", "Gesamtschule"];
const NIVEAUS: Record<string, { label: string; options: string[] } | undefined> = {
  Gymnasium: { label: "Grundkurs oder Leistungskurs?", options: ["", "GK", "LK"] },
  Gesamtschule: { label: "Welches Kursniveau?", options: ["", "E", "G"] },
};
const NIVEAU_NAMES: Record<string, string> = { "": "Keine Angabe", GK: "Grundkurs (GK)", LK: "Leistungskurs (LK)", E: "Erweitert (E)", G: "Grundlegend (G)" };

type Step = "name" | "schulform" | "stufe" | "niveau" | "faecher" | "besonderheiten" | "fertig";

/** One question per screen. The answers become Klasse.md and one folder per subject. */
export function NewClass({ onDone, onCancel }: { onDone: (name: string) => void; onCancel: () => void }) {
  const [step, setStep] = useState<Step>("name");
  const [name, setName] = useState("");
  const [schulform, setSchulform] = useState("");
  const [stufe, setStufe] = useState("");
  const [kursniveau, setKursniveau] = useState("");
  const [faecher, setFaecher] = useState<string[]>([]);
  const [fachInput, setFachInput] = useState("");
  const [besonderheiten, setBesonderheiten] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const niveau = NIVEAUS[schulform];
  const order: Step[] = ["name", "schulform", "stufe", ...(niveau ? ["niveau" as Step] : []), "faecher", "besonderheiten", "fertig"];
  const index = order.indexOf(step);
  const next = () => setStep(order[index + 1]!);
  const back = () => (index === 0 ? onCancel() : setStep(order[index - 1]!));

  const addFach = () => {
    const f = fachInput.trim();
    if (f && !faecher.includes(f)) setFaecher([...faecher, f]);
    setFachInput("");
  };

  const canNext =
    (step === "name" && name.trim()) ||
    (step === "schulform" && schulform) ||
    (step === "stufe" && stufe.trim()) ||
    step === "niveau" ||
    (step === "faecher" && (faecher.length > 0 || fachInput.trim())) ||
    step === "besonderheiten";

  const save = async () => {
    setSaving(true);
    const error = await createClass({ name, schulform, stufe, kursniveau, faecher, besonderheiten });
    setSaving(false);
    if (error) {
      setProblem(error);
      setStep("name");
    } else onDone(name.trim());
  };

  return (
    <div className="setup">
      <form
        className="setup-card"
        onSubmit={(e) => {
          e.preventDefault();
          if (step === "fertig") void save();
          else if (canNext) {
            if (step === "faecher") addFach();
            next();
          }
        }}
      >
        <p className="step-count">
          {step === "fertig" ? "Fast geschafft" : `Frage ${index + 1} von ${order.length - 1}`}
        </p>

        {step === "name" && (
          <>
            <h1>Wie heißt die Klasse oder der Kurs?</h1>
            <input autoFocus className="big" value={name} placeholder="zum Beispiel 11a" onChange={(e) => { setName(e.target.value); setProblem(null); }} />
          </>
        )}
        {step === "schulform" && (
          <>
            <h1>An welcher Schulform unterrichtest du sie?</h1>
            <div className="choices">
              {SCHULFORMEN.map((s) => (
                <button type="button" key={s} className={schulform === s ? "choice on" : "choice"} onClick={() => { setSchulform(s); setKursniveau(""); }}>
                  {s}
                </button>
              ))}
            </div>
          </>
        )}
        {step === "stufe" && (
          <>
            <h1>{schulform === "Berufskolleg" ? "Welches Jahr oder welcher Bildungsgang?" : "Welche Jahrgangsstufe?"}</h1>
            <input autoFocus className="big" value={stufe} placeholder={schulform === "Berufskolleg" ? "zum Beispiel Höhere Handelsschule, 1. Jahr" : "zum Beispiel 9"} onChange={(e) => setStufe(e.target.value)} />
          </>
        )}
        {step === "niveau" && niveau && (
          <>
            <h1>{niveau.label}</h1>
            <div className="choices">
              {niveau.options.map((o) => (
                <button type="button" key={o} className={kursniveau === o ? "choice on" : "choice"} onClick={() => setKursniveau(o)}>
                  {NIVEAU_NAMES[o]}
                </button>
              ))}
            </div>
          </>
        )}
        {step === "faecher" && (
          <>
            <h1>Welche Fächer unterrichtest du dort?</h1>
            <div className="row">
              <input autoFocus className="big" value={fachInput} placeholder="zum Beispiel Business English" onChange={(e) => setFachInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && fachInput.trim()) { e.preventDefault(); addFach(); } }} />
              <button type="button" className="ghost" onClick={addFach} disabled={!fachInput.trim()}>Hinzufügen</button>
            </div>
            <ul className="chips">
              {faecher.map((f) => (
                <li key={f}>
                  {f}
                  <button type="button" aria-label={`${f} entfernen`} onClick={() => setFaecher(faecher.filter((x) => x !== f))}>×</button>
                </li>
              ))}
            </ul>
          </>
        )}
        {step === "besonderheiten" && (
          <>
            <h1>Gibt es etwas, das ich über die Klasse wissen sollte?</h1>
            <p className="lead">Zum Beispiel: arbeitet gern in Partnerarbeit. Bitte schreib keine Namen von Schülerinnen und Schülern auf. Du kannst das auch leer lassen.</p>
            <textarea rows={3} value={besonderheiten} onChange={(e) => setBesonderheiten(e.target.value)} />
          </>
        )}
        {step === "fertig" && (
          <>
            <h1>Stimmt das so?</h1>
            <dl className="summary">
              <dt>Klasse</dt><dd>{name}</dd>
              <dt>Schulform</dt><dd>{schulform}</dd>
              <dt>Stufe</dt><dd>{stufe}</dd>
              {kursniveau && (<><dt>Kursniveau</dt><dd>{kursniveau}</dd></>)}
              <dt>Fächer</dt><dd>{faecher.join(", ")}</dd>
              {besonderheiten.trim() && (<><dt>Besonderheiten</dt><dd>{besonderheiten}</dd></>)}
            </dl>
          </>
        )}

        {problem && <p className="error">{problem}</p>}

        <div className="setup-actions">
          <button type="button" className="ghost" onClick={back}>{index === 0 ? "Abbrechen" : "Zurück"}</button>
          {step === "fertig" ? (
            <button className="primary" type="submit" disabled={saving}>{saving ? "Ich lege an …" : "Klasse anlegen"}</button>
          ) : (
            <button className="primary" type="submit" disabled={!canNext}>Weiter</button>
          )}
        </div>
      </form>
    </div>
  );
}
