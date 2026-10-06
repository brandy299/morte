/** Look of the app: light or dark (or follow the computer), accent color, calm mode. Kept in this browser only. */
export type Mode = "auto" | "hell" | "dunkel";
export type Accent = "terrakotta" | "salbei" | "blau" | "pflaume";
export interface Look {
  mode: Mode;
  accent: Accent;
  calm: boolean;
}

export const DEFAULT_LOOK: Look = { mode: "auto", accent: "terrakotta", calm: false };
const KEY = "morte-aussehen";

export function readLook(): Look {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Partial<Look>;
    return {
      mode: raw.mode === "hell" || raw.mode === "dunkel" ? raw.mode : "auto",
      accent: raw.accent === "salbei" || raw.accent === "blau" || raw.accent === "pflaume" ? raw.accent : "terrakotta",
      calm: raw.calm === true,
    };
  } catch {
    return DEFAULT_LOOK;
  }
}

/** Puts the look on the page. Safe to call again and again. */
export function applyLook(look: Look): void {
  const root = document.documentElement;
  const dark = look.mode === "dunkel" || (look.mode === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  root.dataset.theme = dark ? "dark" : "light";
  if (look.accent === "terrakotta") delete root.dataset.accent;
  else root.dataset.accent = look.accent;
  if (look.calm) root.dataset.calm = "";
  else delete root.dataset.calm;
}

export function saveLook(look: Look): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(look));
  } catch {
    // Without storage the look only lasts until the page is closed.
  }
  applyLook(look);
}

/** Applies the saved look now and follows the computer's light/dark switch while mode is "auto". */
export function startTheme(): void {
  applyLook(readLook());
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => applyLook(readLook()));
}
