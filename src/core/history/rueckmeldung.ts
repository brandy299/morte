/**
 * Feedback of the teacher on finished material: "Passt" or "Passt nicht" with one sentence.
 * It is saved with the conversation (next to the log of times and counts), stays on this computer and holds no names.
 * The export for the developers has no conversation text and no material content, and the sentence only when the teacher allows it.
 */
import { listConversations, loadConversation, saveRueckmeldungen } from "./index.ts";

export type Wertung = "passt" | "passt-nicht";
export interface Rueckmeldung {
  /** Path of the material file the card stands for. */
  pfad: string;
  wertung: Wertung;
  /** Why it did not fit, in the teacher's words. */
  satz?: string;
  zeit: string;
}

export const MAX_SATZ = 300;
export class RueckmeldungFehler extends Error {}

export interface RueckmeldungEingabe {
  pfad: unknown;
  wertung: unknown;
  satz?: unknown;
}

/** Saves or changes the feedback on one material of a conversation and returns all feedback of that conversation. */
export async function setzeRueckmeldung(id: string, eingabe: RueckmeldungEingabe, jetzt = new Date()): Promise<Rueckmeldung[]> {
  const c = await loadConversation(id).catch(() => undefined);
  if (!c) throw new RueckmeldungFehler("Dieses Gespräch gibt es nicht mehr.");
  if (eingabe.wertung !== "passt" && eingabe.wertung !== "passt-nicht") throw new RueckmeldungFehler("Die Wertung ist „passt“ oder „passt nicht“.");
  if (typeof eingabe.pfad !== "string" || !c.anzeige.some((m) => m.materials?.some((x) => x.path === eingabe.pfad))) {
    throw new RueckmeldungFehler("Dieses Material gehört nicht zu dem Gespräch.");
  }
  let satz: string | undefined;
  if (eingabe.satz !== undefined && eingabe.satz !== null && eingabe.satz !== "") {
    if (typeof eingabe.satz !== "string") throw new RueckmeldungFehler("Der Satz muss Text sein.");
    // One line of plain text: no control characters, runs of blanks closed up.
    satz = eingabe.satz.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim() || undefined;
    if (satz && satz.length > MAX_SATZ) throw new RueckmeldungFehler(`Bitte fasse dich kürzer: höchstens ${MAX_SATZ} Zeichen, es sind ${satz.length}.`);
  }
  const rest = (c.rueckmeldungen ?? []).filter((r) => r.pfad !== eingabe.pfad);
  const neu: Rueckmeldung = { pfad: eingabe.pfad, wertung: eingabe.wertung, ...(satz ? { satz } : {}), zeit: jetzt.toISOString() };
  const alle = [...rest, neu];
  await saveRueckmeldungen(id, alle);
  return alle;
}

interface ModelPart { type?: string; name?: string; arguments?: { name?: string } }
interface ModelMessage { role?: string; content?: unknown; provider?: string; model?: string }
interface LogLine { kind?: string; name?: string; ok?: boolean }

/** The kind of material from its file name: 2026-10-14_Mi3_Arbeitsblatt-Interview.pdf -> Arbeitsblatt. */
export const artVon = (pfad: string): string => /^(?:\d{4}-\d\d-\d\d_)?(?:[A-Za-z]{2}\d{0,4}_)?([A-Za-z]+)-/.exec(pfad.split(/[\\/]/).pop() ?? "")?.[1] ?? "Datei";

export interface RueckmeldungExport {
  version: 1;
  erzeugt: string;
  hinweis: string;
  eintraege: {
    datum: string;
    material: string;
    wertung: Wertung;
    satz?: string;
    modell?: string;
    anleitungen: string[];
    werkzeugaufrufe: number;
    abgelehnt: number;
  }[];
}

/** All feedback of all conversations as data for the developers. The sentence is in it only with `mitSatz`. */
export async function exportRueckmeldungen(opts: { mitSatz: boolean; jetzt?: Date }): Promise<RueckmeldungExport> {
  const eintraege: RueckmeldungExport["eintraege"] = [];
  for (const info of await listConversations(10_000)) {
    const c = await loadConversation(info.id).catch(() => undefined);
    if (!c?.rueckmeldungen?.length) continue;
    const messages = (c.modell ?? []) as ModelMessage[];
    const first = messages.find((m) => m.role === "assistant" && m.model);
    const anleitungen = [...new Set(messages.flatMap((m) => (Array.isArray(m.content) ? (m.content as ModelPart[]) : []).flatMap((p) => (p.type === "toolCall" && p.name === "skill_laden" && typeof p.arguments?.name === "string" ? [p.arguments.name] : []))))];
    const log = (c.ablauf ?? []) as LogLine[];
    const tools = log.filter((l) => l.kind === "tool");
    for (const r of c.rueckmeldungen) {
      eintraege.push({
        datum: r.zeit.slice(0, 10),
        material: artVon(r.pfad),
        wertung: r.wertung,
        ...(opts.mitSatz && r.satz ? { satz: r.satz } : {}),
        modell: first ? `${first.provider ?? "?"} / ${first.model}` : undefined,
        anleitungen,
        werkzeugaufrufe: tools.length,
        abgelehnt: tools.filter((l) => l.ok === false).length,
      });
    }
  }
  return {
    version: 1,
    erzeugt: (opts.jetzt ?? new Date()).toISOString(),
    hinweis: opts.mitSatz ? "Enthält die Sätze der Lehrkraft. Bitte vor dem Weitergeben prüfen, dass keine Namen von Lernenden darin stehen." : "Ohne die Sätze der Lehrkraft, ohne Gesprächstext und ohne Inhalt des Materials.",
    eintraege,
  };
}
