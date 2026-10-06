import { useState } from "react";
import { readLook, saveLook, type Accent, type Look, type Mode } from "./theme.ts";

const MODES: { id: Mode; label: string }[] = [
  { id: "auto", label: "Wie mein Computer" },
  { id: "hell", label: "Hell" },
  { id: "dunkel", label: "Dunkel" },
];
const ACCENTS: { id: Accent; label: string; color: string }[] = [
  { id: "terrakotta", label: "Terrakotta", color: "#b4532a" },
  { id: "salbei", label: "Salbei", color: "#4f6f52" },
  { id: "blau", label: "Blau", color: "#3f6591" },
  { id: "pflaume", label: "Pflaume", color: "#85476b" },
];

export function LookPicker() {
  const [look, setLook] = useState<Look>(readLook);
  const change = (patch: Partial<Look>) => {
    const next = { ...look, ...patch };
    setLook(next);
    saveLook(next);
  };
  return (
    <div className="look-picker">
      <fieldset className="choice-group">
        <legend>Farbmodus</legend>
        <div className="segmented" role="radiogroup" aria-label="Farbmodus">
          {MODES.map((m) => (
            <button key={m.id} type="button" role="radio" aria-checked={look.mode === m.id} className={look.mode === m.id ? "on" : ""} onClick={() => change({ mode: m.id })}>
              {m.label}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset className="choice-group">
        <legend>Akzentfarbe</legend>
        <div className="swatches" role="radiogroup" aria-label="Akzentfarbe">
          {ACCENTS.map((a) => (
            <button key={a.id} type="button" role="radio" aria-checked={look.accent === a.id} className={look.accent === a.id ? "swatch on" : "swatch"} onClick={() => change({ accent: a.id })}>
              <span className="swatch-dot" style={{ background: a.color }} aria-hidden />
              {a.label}
            </button>
          ))}
        </div>
      </fieldset>
      <label className="check">
        <input type="checkbox" checked={look.calm} onChange={(e) => change({ calm: e.target.checked })} />
        <span>
          Ruhige Oberfläche
          <small>Schaltet Bewegungen und Übergänge ab.</small>
        </span>
      </label>
      <p className="lead">Texte größer oder kleiner machst du mit dem Browser: <kbd>Strg</kbd> oder <kbd>⌘</kbd> und <kbd>+</kbd> / <kbd>−</kbd>.</p>
    </div>
  );
}
