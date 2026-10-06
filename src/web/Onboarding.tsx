import { useState } from "react";
import { startDemo, type SetupStatus } from "./api.ts";
import { Logo } from "./Logo.tsx";
import { LookPicker } from "./LookPicker.tsx";
import { Setup } from "./Setup.tsx";

export type NextStep = "stundenplan" | "klasse" | "chat";
type Step = "willkommen" | "ki" | "aussehen" | "start";
const ORDER: Step[] = ["willkommen", "ki", "aussehen", "start"];
const TITLES: Record<Step, string> = { willkommen: "Willkommen", ki: "KI einrichten", aussehen: "Aussehen", start: "Fertig" };

const POINTS = [
  { title: "Du sagst, was du brauchst", text: "Ein Arbeitsblatt, eine Stunde, eine Klausur oder ein Foto als Vorlage. Ich frage nach, wenn etwas fehlt." },
  { title: "Druckfertig und bearbeitbar", text: "Material kommt als PDF, in Graustufen gut lesbar, und auf Wunsch als Word-Datei." },
  { title: "Deine Daten bleiben bei dir", text: "Klassen, Material und Gespräche liegen auf diesem Computer. Schülernamen gehören nirgends hinein." },
];

/** First start: a few calm steps, one question each. Ends with a choice of what to set up first. */
export function Onboarding({ status, onConfigured, onFinish }: { status: SetupStatus; onConfigured: () => void; onFinish: (next: NextStep) => void }) {
  const [step, setStep] = useState<Step>("willkommen");
  const index = ORDER.indexOf(step);
  const go = (s: Step) => setStep(s);
  const back = index > 0 && step !== "start" ? ORDER[index - 1]! : undefined;

  return (
    <main className="setup onboarding">
      <div className="setup-card wide" key={step}>
        <Logo />
        <ol className="onb-steps" aria-label={`Schritt ${index + 1} von ${ORDER.length}: ${TITLES[step]}`}>
          {ORDER.map((s, i) => (
            <li key={s} className={i === index ? "now" : i < index ? "past" : ""} aria-current={i === index ? "step" : undefined}>
              <span className="sr-only">{TITLES[s]}</span>
            </li>
          ))}
        </ol>

        {step === "willkommen" && (
          <>
            <h1>Willkommen bei Pult</h1>
            <p className="lead">Dein ruhiger Arbeitsplatz für den Unterricht. In ein paar Minuten ist alles eingerichtet.</p>
            <ul className="welcome-points">
              {POINTS.map((p) => (
                <li key={p.title}>
                  <strong>{p.title}</strong>
                  <span>{p.text}</span>
                </li>
              ))}
            </ul>
            <div className="setup-actions">
              <button type="button" className="primary" onClick={() => go("ki")}>
                Los geht’s
              </button>
            </div>
            <button
              type="button"
              className="link"
              onClick={async () => {
                await startDemo();
                onConfigured();
                go("aussehen");
              }}
            >
              Erst einmal ohne KI ansehen
            </button>
          </>
        )}

        {step === "ki" && (
          <>
            <button type="button" className="link back" onClick={() => go("willkommen")}>
              ← Zurück
            </button>
            <Setup
              status={status}
              embedded
              onDone={() => {
                onConfigured();
                go("aussehen");
              }}
            />
          </>
        )}

        {step === "aussehen" && (
          <>
            <button type="button" className="link back" onClick={() => go("ki")}>
              ← Zurück
            </button>
            <h1>Wie soll es aussehen?</h1>
            <p className="lead">Du siehst die Änderung sofort. Später kannst du alles in den Einstellungen ändern.</p>
            <LookPicker />
            <div className="setup-actions">
              <button type="button" className="primary" onClick={() => go("start")}>
                Weiter
              </button>
            </div>
          </>
        )}

        {step === "start" && (
          <>
            <h1>Alles bereit</h1>
            <p className="lead">Womit möchtest du anfangen? Alles davon geht auch später über die Seitenleiste.</p>
            <div className="next-cards">
              <button type="button" onClick={() => onFinish("stundenplan")}>
                <strong>Stundenplan laden</strong>
                <span>Aus WebUntis oder Untis. Dann sehe ich, welche Stunden anstehen.</span>
              </button>
              <button type="button" onClick={() => onFinish("klasse")}>
                <strong>Eine Klasse anlegen</strong>
                <span>Name, Fächer und Besonderheiten. So kann ich passender helfen.</span>
              </button>
              <button type="button" onClick={() => onFinish("chat")}>
                <strong>Einfach loslegen</strong>
                <span>Schreib mir, was du brauchst.</span>
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
