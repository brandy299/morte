import { useEffect, useRef, useState } from "react";
import { setProjekt, type ConversationInfo } from "./api.ts";
import { gruppiere } from "./projekte.ts";

const PROJEKT_MAX = 40;

interface Props {
  history: ConversationInfo[];
  currentId?: string;
  onOpen: (id: string) => void;
  onDelete: (c: ConversationInfo) => void;
  /** Called after a conversation moved into or out of a folder, so the list reloads. */
  onChanged: () => void;
}

/** The earlier conversations in the sidebar: project folders first, loose conversations below. */
export function Gespraechsliste({ history, currentId, onOpen, onDelete, onChanged }: Props) {
  const { projekte, ohne } = gruppiere(history);
  const [menu, setMenu] = useState<string | null>(null);
  const [neu, setNeu] = useState("");
  const [problem, setProblem] = useState<string>();
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setMenu(null);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setMenu(null);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [menu]);

  const move = async (c: ConversationInfo, projekt: string | null) => {
    setProblem(undefined);
    try {
      await setProjekt(c.id, projekt);
      setMenu(null);
      setNeu("");
      onChanged();
    } catch (err) {
      setProblem(err instanceof Error ? err.message : "Das hat nicht geklappt.");
    }
  };

  const row = (c: ConversationInfo) => (
    <div key={c.id} className={c.id === currentId ? "hist on" : "hist"}>
      <button type="button" className="tree-node" title={c.titel} onClick={() => onOpen(c.id)}>
        {c.titel}
      </button>
      <div className="hist-actions" ref={menu === c.id ? box : undefined}>
        <button type="button" className="hist-del" aria-label={`Gespräch „${c.titel}“ in ein Projekt legen`} aria-expanded={menu === c.id} onClick={() => { setProblem(undefined); setMenu(menu === c.id ? null : c.id); }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          </svg>
        </button>
        {menu === c.id && (
          <div className="projekt-menu" role="group" aria-label="Projekt wählen">
            {projekte.filter((p) => p.name !== c.projekt).map((p) => (
              <button key={p.name} type="button" onClick={() => void move(c, p.name)}>
                {p.name}
              </button>
            ))}
            {c.projekt && (
              <button type="button" onClick={() => void move(c, null)}>
                Aus „{c.projekt}“ herausnehmen
              </button>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (neu.trim()) void move(c, neu);
              }}
            >
              <input value={neu} maxLength={PROJEKT_MAX} placeholder="Neues Projekt …" aria-label="Name des neuen Projekts" onChange={(e) => setNeu(e.target.value)} />
            </form>
            {problem && <p className="error" role="alert">{problem}</p>}
          </div>
        )}
        <button type="button" className="hist-del" aria-label={`Gespräch „${c.titel}“ löschen`} onClick={() => onDelete(c)}>
          ×
        </button>
      </div>
    </div>
  );

  return (
    <nav className="tree history" aria-label="Frühere Gespräche">
      {projekte.map((p) => (
        <details key={p.name} className="projekt" open>
          <summary>
            <span>{p.name}</span>
            <span className="projekt-n">{p.gespraeche.length}</span>
          </summary>
          {p.gespraeche.map(row)}
        </details>
      ))}
      <div className="tree-head">
        <span>Gespräche</span>
      </div>
      {ohne.slice(0, 12).map(row)}
      <p className="side-note">Gespräche bleiben auf diesem Computer.</p>
    </nav>
  );
}
