import { useEffect, useState } from "react";
import { getInternet, setInternet, type InternetInfo } from "./api.ts";

/** Switch for web search and reading pages, with a line on which service searches. */
export function InternetSchalter() {
  const [info, setInfo] = useState<InternetInfo>();
  const [problem, setProblem] = useState<string>();
  useEffect(() => {
    getInternet().then(setInfo, (e: Error) => setProblem(e.message));
  }, []);
  if (!info) return problem ? <p className="error">{problem}</p> : null;
  const change = async (an: boolean) => {
    setProblem(undefined);
    try {
      setInfo(await setInternet(an));
    } catch (e) {
      setProblem((e as Error).message);
    }
  };
  const wie = info.dienst === "Exa"
    ? "Ich suche kostenlos über Exa, ohne Schlüssel. Bei sehr vielen Anfragen kann es kurz überlastet sein."
    : info.dienst
    ? `Ich suche über ${info.dienst}. Das kostet etwas Guthaben, meist unter einem Cent pro Suche.`
    : "Links, die du mir schickst, kann ich lesen.";
  return (
    <>
      <label className="check">
        <input type="checkbox" checked={info.an} onChange={(e) => void change(e.target.checked)} />
        <span>
          Im Internet suchen und Links lesen
          <small>
            {info.an ? `${wie} Was ich suche, geht an den Suchdienst, nie Namen von Schülerinnen und Schülern.` : "Aus: Ich arbeite nur mit dem, was auf diesem Computer liegt."}
          </small>
        </span>
      </label>
      {problem && (
        <p className="error" role="alert">
          {problem}
        </p>
      )}
    </>
  );
}
