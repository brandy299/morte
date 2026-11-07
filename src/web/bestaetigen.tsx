import { useEffect, useRef, useState } from "react";

interface Frage { text: string; ja: string; resolve: (ok: boolean) => void }
let show: ((f: Frage) => void) | undefined;

/** Asks in Pult's own look instead of the browser box. Resolves true when the teacher confirms. */
export function bestaetigen(text: string, ja = "Ja, löschen"): Promise<boolean> {
  // Without the dialog host (should not happen) nothing is deleted.
  return new Promise((resolve) => (show ? show({ text, ja, resolve }) : resolve(false)));
}

/** Mounted once. A native dialog keeps focus inside and closes with Escape. */
export function BestaetigenHost() {
  const [frage, setFrage] = useState<Frage | null>(null);
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    show = setFrage;
    return () => { show = undefined; };
  }, []);
  useEffect(() => {
    if (frage && !ref.current?.open) {
      ref.current?.showModal();
      // The safe answer has focus, so Enter never deletes by accident.
      ref.current?.querySelector<HTMLElement>(".ghost")?.focus();
    }
  }, [frage]);
  const close = (ok: boolean) => {
    frage?.resolve(ok);
    ref.current?.close();
    setFrage(null);
  };
  if (!frage) return null;
  return (
    <dialog ref={ref} className="rueckfrage" aria-label="Rückfrage" onCancel={(e) => { e.preventDefault(); close(false); }} onClick={(e) => e.target === ref.current && close(false)}>
      <p>{frage.text}</p>
      <div className="modal-actions">
        <button type="button" className="danger" onClick={() => close(true)}>{frage.ja}</button>
        <button type="button" className="ghost" onClick={() => close(false)}>Abbrechen</button>
      </div>
    </dialog>
  );
}
