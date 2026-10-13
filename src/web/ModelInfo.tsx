import { useEffect, useRef, useState } from "react";
import { getOptions, type ProviderOption, type SetupStatus } from "./api.ts";
import { modelInfo } from "./modelInfo.ts";

let cache: Promise<ProviderOption[]> | undefined;
/** The model list is read once; it only changes with an update of Pult. */
const options = () => (cache ??= getOptions().catch(() => { cache = undefined; return []; }));

/** The name of the model in use next to the input field. Click it for price, memory and a way to change it. */
export function ModelInfo({ status, onSettings }: { status: SetupStatus; onSettings: () => void }) {
  const [providers, setProviders] = useState<ProviderOption[]>([]);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    void options().then(setProviders);
  }, []);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const info = modelInfo(status, providers);
  if (!info) return null;
  return (
    <div className="meter" ref={box}>
      <button type="button" className="model-pill" onClick={() => setOpen((o) => !o)} aria-expanded={open} title="Welche KI arbeitet gerade?">
        {info.name}
      </button>
      {open && (
        <div className="pop" role="dialog" aria-label="Modell">
          <p className="pop-title">{info.name}</p>
          <dl>
            <dt>Anbieter</dt>
            <dd>{info.provider}</dd>
            {info.vision !== undefined && (
              <>
                <dt>Bilder lesen</dt>
                <dd>{info.vision ? "Ja" : "Nein"}</dd>
              </>
            )}
            {info.price && (
              <>
                <dt>Preis</dt>
                <dd>{info.price}</dd>
              </>
            )}
            {info.memory && (
              <>
                <dt>Gedächtnis</dt>
                <dd>{info.memory}</dd>
              </>
            )}
          </dl>
          <p className="pop-note">Preise laut Katalog des Anbieters, ohne Gewähr. Tokens sind Textstücke.</p>
          <p className="pop-note">
            <button type="button" className="link" onClick={() => { setOpen(false); onSettings(); }}>
              Anderes Modell wählen
            </button>
          </p>
        </div>
      )}
    </div>
  );
}
