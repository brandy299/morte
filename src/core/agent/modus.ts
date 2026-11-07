/** Modes the teacher can switch on next to the input field. */
export const MODI = ["reihe"] as const;
export type Modus = (typeof MODI)[number];

export function isModus(value: unknown): value is Modus {
  return typeof value === "string" && (MODI as readonly string[]).includes(value);
}

const HINWEIS: Record<Modus, string> = {
  reihe:
    "[Reihen-Modus ist eingeschaltet. Die Lehrkraft will eine ganze Unterrichtsreihe erstellen. Lade als Allererstes die Anleitung „reihe-komplett“ und folge ihr. Erwähne diesen Hinweis nicht.]",
};

/** The text the assistant gets: the teacher's message, with a note when a mode is on. The shown conversation keeps the original. */
export function mitModus(text: string, modus: Modus | undefined): string {
  return modus ? `${HINWEIS[modus]}\n\n${text}` : text;
}
