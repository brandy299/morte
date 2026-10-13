import { useState } from "react";
import { anGeschaltet, anschalten, ausschalten, unterstuetzt } from "./mitteilung.ts";

/** Switch for the desktop notice when Pult is done, has a question or got stuck while she is in another window. */
export function MitteilungenSchalter() {
  const [on, setOn] = useState(anGeschaltet);
  const [problem, setProblem] = useState<string>();
  if (!unterstuetzt()) return null;
  const change = async (checked: boolean) => {
    setProblem(undefined);
    if (!checked) {
      ausschalten();
      return setOn(false);
    }
    const p = await anschalten();
    setProblem(p);
    setOn(!p);
  };
  return (
    <>
      <label className="check">
        <input type="checkbox" checked={on} onChange={(e) => void change(e.target.checked)} />
        <span>
          Mitteilung, wenn ich fertig bin
          <small>Wenn du in einem anderen Fenster arbeitest, melde ich mich bei fertigem Material, bei einer Rückfrage und bei Problemen.</small>
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
