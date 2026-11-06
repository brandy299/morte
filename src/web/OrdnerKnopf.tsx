import { useEffect, useState } from "react";
import { chooseOrdner, clearGewaehlterOrdner, getGewaehlterOrdner, getOrdner, setGewaehlterOrdner } from "./api.ts";

/**
 * Button next to the message field: pick a folder on the computer the assistant may look into, read and add files to.
 * In the desktop app the system dialog comes from the app; in the browser only the Mac has one, elsewhere the path is typed.
 */
export function OrdnerKnopf({ onProblem }: { onProblem: (text: string | null) => void }) {
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    getGewaehlterOrdner().then((o) => setName(o.name), () => {});
  }, []);

  async function waehlen() {
    onProblem(null);
    try {
      let pfad: string | null;
      if (window.pultApp) pfad = await window.pultApp.ordnerWaehlen();
      else if ((await getOrdner()).waehlen) pfad = await chooseOrdner("arbeit");
      else pfad = window.prompt("Gib den ganzen Pfad des Ordners ein, in dem wir arbeiten sollen. Zum Beispiel C:\\Schule\\Klausuren");
      if (pfad?.trim()) setName((await setGewaehlterOrdner(pfad)).name);
    } catch (e) {
      onProblem(e instanceof Error ? e.message : "Das hat nicht geklappt.");
    }
  }

  if (name) {
    return (
      <span className="ordner-chip">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        </svg>
        <span title="Ich darf in diesem Ordner nachsehen, Dateien lesen und neue Textdateien anlegen. Ersetzen frage ich vorher.">{name}</span>
        <button type="button" aria-label={`Ordner „${name}“ nicht mehr verwenden`} onClick={() => clearGewaehlterOrdner().then(() => setName(null), () => {})}>
          ×
        </button>
      </span>
    );
  }
  return (
    <button type="button" className="icon-btn" title="Ordner auf deinem Computer wählen, in dem ich nachsehen und Dateien anlegen darf" aria-label="Ordner wählen" onClick={() => void waehlen()}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      </svg>
    </button>
  );
}
