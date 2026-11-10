import { Type } from "typebox";
import type { AgentTool } from "@earendil-works/pi-agent-core";
import { vorschauSvg } from "../animation/html.ts";
import { stilName } from "../animation/stile.ts";
import { type AskTeacher, type Frage } from "./fragen.ts";

export const STILWAHL_TOOL = "stil_waehlen";

const parameters = Type.Object({
  art: Type.Union([Type.Literal("erklaerstueck"), Type.Literal("praesentation")], { description: "What the look is for" }),
  stile: Type.Array(Type.Object({ id: Type.String({ description: "The id of the look, from stile_vorschlagen" }), grund: Type.String({ description: "One short sentence in plain German: why this look fits the topic and class" }) }), { description: "Exactly three different looks" }),
  empfohlen: Type.Number({ description: "Number (starting at 1) of the look you recommend most" }),
});

/** Shows three looks as pictures on screen and returns the one the teacher picks. Needs the session to show them. */
export const stilWahlTool = (askTeacher: AskTeacher, gueltig: (id: string) => boolean, gewaehlt: (id: string, art: string) => void = () => undefined): AgentTool<typeof parameters> => ({
  name: STILWAHL_TOOL,
  label: "Stile zeigen",
  description:
    "Shows the teacher three looks (stil) as sample pictures on screen, to click one. Use it for every new explainer piece and every new presentation when the teacher has not named a look: pick three that fit the topic and class (ids from stile_vorschlagen, three different ones, one of them your recommendation) and give each a one-sentence reason. Do not describe the looks in the chat text, the pictures show them. Returns the id of the look the teacher picked (or their own wish in words). Then continue with erklaerstueck_erstellen or praesentation_erstellen and pass the id as stil.",
  parameters,
  async execute(_id, { art, stile, empfohlen }, signal) {
    if (!Array.isArray(stile) || stile.length !== 3) throw new Error("Give exactly three looks.");
    const namen = stile.map((s) => stilName(s.id));
    stile.forEach((s, i) => {
      if (!gueltig(s.id) || !namen[i]) throw new Error(`Look ${i + 1}: "${s.id}" does not exist. Use ids from stile_vorschlagen.`);
      if (!s.grund || s.grund.trim().length < 8) throw new Error(`Look ${i + 1}: give a short reason.`);
    });
    if (new Set(stile.map((s) => s.id)).size !== 3 || new Set(namen).size !== 3) throw new Error("The three looks must be different.");
    if (!Number.isInteger(empfohlen) || empfohlen < 1 || empfohlen > 3) throw new Error('"empfohlen" must be 1, 2 or 3.');
    const frage: Frage = {
      frage: art === "praesentation" ? "Wie soll deine Präsentation aussehen?" : "Wie soll dein Erklärstück aussehen?",
      antworten: stile.map((s, i) => ({ text: namen[i]!, erklaerung: s.grund.trim(), bild: vorschauSvg(s.id) })),
      empfohlen,
      grund: stile[empfohlen - 1]!.grund.trim(),
    };
    const gegeben = await askTeacher([frage], signal);
    const antwort = gegeben?.[0];
    const id = antwort && !antwort.eigene ? (stile[namen.indexOf(antwort.antwort)]?.id ?? stile[empfohlen - 1]!.id) : undefined;
    if (id) gewaehlt(id, art);
    const text = !antwort
      ? "Die Lehrkraft hat keinen Stil gewählt. Frag nicht noch einmal, sondern warte auf ihre nächste Nachricht."
      : antwort.eigene
        ? `Die Lehrkraft wünscht einen anderen Stil: „${antwort.antwort}“. Such mit stile_vorschlagen den nächstpassenden und nimm ihn, ohne noch einmal zu fragen.`
        : `Gewählter Stil: ${stile[namen.indexOf(antwort.antwort)]?.id ?? stile[empfohlen - 1]!.id}${antwort.empfohlen ? " (deine Empfehlung)" : ""}. Mach jetzt weiter und gib diese Kennung als stil an.`;
    return { content: [{ type: "text" as const, text }], details: undefined };
  },
});

/** Fills in the look the teacher picked when a later call of the piece tools leaves `stil` out (e.g. a retry after an error). */
export function stilMerken<T extends { name: string; execute: (...args: any[]) => any }>(list: readonly T[], gewaehlt: Map<string, string>): T[] {
  return list.map((t) => {
    if (t.name !== "erklaerstueck_erstellen" && t.name !== "praesentation_erstellen") return t;
    return { ...t, execute: (id: string, params: any, ...rest: any[]) => t.execute(id, params && !params.stil && gewaehlt.has(t.name) ? { ...params, stil: gewaehlt.get(t.name) } : params, ...rest) };
  });
}
