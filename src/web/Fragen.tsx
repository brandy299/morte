import { useEffect, useRef, useState } from "react";
import { answerFragen, type Frage, type Gegeben } from "./api.ts";

/** The assistant's questions, one after another. The recommended answer is marked, explained and already selected. */
export function Fragen({ id, fragen }: { id: string; fragen: Frage[] }) {
  const [step, setStep] = useState(0);
  // Index of the chosen answer per question, or -1 for the teacher's own words.
  const [picked, setPicked] = useState<number[]>(() => fragen.map((f) => f.empfohlen - 1));
  const [own, setOwn] = useState<string[]>(() => fragen.map(() => ""));
  const [sending, setSending] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const first = useRef(true);

  useEffect(() => {
    // Moving on puts the reading position on the new question; the first one is left alone so the page does not jump.
    if (first.current) first.current = false;
    else heading.current?.focus();
  }, [step]);

  const f = fragen[step]!;
  const last = step === fragen.length - 1;
  const ownChosen = picked[step] === -1;
  const ready = (i: number) => picked[i] !== -1 || own[i]!.trim().length > 0;

  const send = async (choices: { antwort: string; eigene?: boolean }[] | null) => {
    setSending(true);
    setProblem(null);
    const error = await answerFragen(id, choices);
    if (error) {
      setProblem(error);
      setSending(false);
    }
  };
  const choices = (usePick: number[]) =>
    fragen.map((q, i) => (usePick[i] === -1 ? { antwort: own[i]!.trim(), eigene: true } : { antwort: q.antworten[usePick[i]!]!.text }));

  return (
    <section className="ask-card" aria-label="Fragen an dich">
      <div className="ask-head">
        <span>Ein paar Fragen, damit es passt</span>
        <span aria-live="polite">
          Frage {step + 1} von {fragen.length}
        </span>
      </div>
      <h2 ref={heading} tabIndex={-1}>
        {f.frage}
      </h2>
      <div role="radiogroup" aria-label={f.frage} className="ask-options">
        {f.antworten.map((a, i) => (
          <label key={a.text} className={picked[step] === i ? "ask-option on" : "ask-option"}>
            <input type="radio" name={`${id}-${step}`} checked={picked[step] === i} onChange={() => setPicked(picked.map((p, k) => (k === step ? i : p)))} />
            <span className="ask-text">
              <strong>
                {a.text}
                {i === f.empfohlen - 1 && <em className="ask-badge">Empfohlen</em>}
              </strong>
              <small>{a.erklaerung}</small>
            </span>
          </label>
        ))}
        <label className={ownChosen ? "ask-option on" : "ask-option"}>
          <input type="radio" name={`${id}-${step}`} checked={ownChosen} onChange={() => setPicked(picked.map((p, k) => (k === step ? -1 : p)))} />
          <span className="ask-text">
            <strong>Etwas anderes</strong>
            {ownChosen ? (
              <input
                className="ask-own"
                autoFocus
                maxLength={300}
                value={own[step]}
                placeholder="Schreib hier, was du dir vorstellst"
                aria-label="Deine eigene Antwort"
                onChange={(e) => setOwn(own.map((o, k) => (k === step ? e.target.value : o)))}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && ready(step)) last ? void send(choices(picked)) : setStep(step + 1);
                }}
              />
            ) : (
              <small>Du beschreibst es selbst.</small>
            )}
          </span>
        </label>
      </div>
      <p className="ask-why">
        <strong>Warum ich „{f.antworten[f.empfohlen - 1]!.text}“ empfehle:</strong> {f.grund}
      </p>
      {problem && <p className="error">{problem}</p>}
      <div className="ask-actions">
        {step > 0 && (
          <button type="button" className="ghost small" disabled={sending} onClick={() => setStep(step - 1)}>
            Zurück
          </button>
        )}
        {last ? (
          <button type="button" className="primary" disabled={sending || !fragen.every((_, i) => ready(i))} onClick={() => void send(choices(picked))}>
            {sending ? "Ich lege los …" : "Antworten senden"}
          </button>
        ) : (
          <button type="button" className="primary" disabled={!ready(step)} onClick={() => setStep(step + 1)}>
            Weiter
          </button>
        )}
        <span className="grow" />
        <button type="button" className="link" disabled={sending} onClick={() => void send(choices(fragen.map((q) => q.empfohlen - 1)))}>
          Alle Empfehlungen übernehmen
        </button>
        <button type="button" className="link" disabled={sending} onClick={() => void send(null)}>
          Überspringen
        </button>
      </div>
    </section>
  );
}

/** What was asked and answered, kept in the conversation. */
export function FragenRueckblick({ fragen }: { fragen: Gegeben[] }) {
  return (
    <ul className="ask-summary" aria-label="Deine Antworten">
      {fragen.map((g, i) => (
        <li key={i}>
          <span>{g.frage}</span>
          <strong>
            {g.antwort}
            {g.empfohlen && <em className="ask-badge">empfohlen</em>}
          </strong>
        </li>
      ))}
    </ul>
  );
}
