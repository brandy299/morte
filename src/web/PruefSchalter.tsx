import { useState } from "react";

const KEY = "pult-pruefen";

/** Whether new material gets a second look before it is shown. On unless the teacher switched it off. */
export function pruefenAn(): boolean {
  try {
    return localStorage.getItem(KEY) !== "aus";
  } catch {
    return true;
  }
}

/** Switch next to the message field: "Prüfen". */
export function PruefSchalter({ on, onChange }: { on: boolean; onChange: (on: boolean) => void }) {
  const [, setTick] = useState(0);
  const toggle = () => {
    try {
      localStorage.setItem(KEY, on ? "aus" : "an");
    } catch {
      // Without storage the choice lasts until reload.
    }
    onChange(!on);
    setTick((n) => n + 1);
  };
  return (
    <button
      type="button"
      className={`pruef-schalter${on ? " an" : ""}`}
      role="switch"
      aria-checked={on}
      title="Wenn das an ist, lese ich neues Material noch einmal durch und bessere Fehler aus, bevor du es siehst. Das dauert etwas länger und kostet etwas mehr."
      onClick={toggle}
    >
      Material prüfen: {on ? "an" : "aus"}
    </button>
  );
}
