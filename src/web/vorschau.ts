/** Material that is only for the teacher: a solution sheet or a marking guide. It must not take the preview from the sheet the pupils get. */
export const nurFuerLehrkraft = (title: string) => /\(Lösung\)\s*$/i.test(title) || /^Erwartungshorizont\b/i.test(title);

/** What a teacher's note on one scene of an explainer starts with in the chat. Scene 0 is the title picture. */
export const szenenNotiz = (n: number, titel: string) => {
  const name = n === 0 ? "dem Titelbild" : `Szene ${n}${titel ? ` („${titel}“)` : ""}`;
  return `Im Erklärstück, bei ${name}: `;
};

/** The answer an explainer file gives when the preview asks which scene is showing. Anything else is ignored. */
export const szenenAntwort = (d: unknown): { n: number; titel: string } | null => {
  if (!d || typeof d !== "object") return null;
  const { pult, n, titel } = d as { pult?: unknown; n?: unknown; titel?: unknown };
  if (pult !== "szene" || typeof n !== "number" || !Number.isInteger(n) || n < 0 || n > 99) return null;
  return { n, titel: typeof titel === "string" ? titel.slice(0, 80) : "" };
};
