import type { Completer } from "../agent/index.ts";
import type { Criterion, EvalCase, Transcript, Verdict } from "./types.ts";

const SYSTEM = `Du bist ein strenger, fairer Prüfer für Unterrichtsmaterial und die Gespräche, in denen es entsteht. Du bekommst:
1. das Gespräch zwischen einer Lehrkraft und einem Assistenten,
2. das erstellte Material als Text (Lösungsblätter sind als solche benannt),
3. die Stundentabelle der Reihe nach dem Gespräch und den Arbeitsordner (Klasse.md, Stand.md), den der Assistent lesen konnte,
4. was am Ende als Bewertungsregeln und als eigene Vorlagen gespeichert ist,
5. eine Liste von Kriterien.

Regeln:
- Beurteile jedes Kriterium einzeln mit bestanden (true) oder nicht bestanden (false). Gilt das Kriterium laut seiner Bedingung für diesen Fall nicht, gib null.
- Kriterien der Gruppe M beurteilst du am Gespräch, alle anderen am Material, bei Bewertungsregeln und Vorlagen an dem, was gespeichert ist. Was im Gespräch nur behauptet wird, im Material aber fehlt, zählt als nicht bestanden.
- Prüfe fachlich selbst nach (Rechnungen, Lösungen, Begriffe). Ein fachlicher Fehler in einer Lösung ist ein Fehler.
- Sei streng bei "Bestanden wenn". Im Zweifel nicht bestanden. Begründe jede Entscheidung in einem Satz mit einer Fundstelle (Aufgabennummer, Phase, Satz).
- Antworte ausschließlich mit einem JSON-Array, ohne Text davor oder danach: [{"id":"P1","bestanden":true,"grund":"..."}]. Jede Kennung aus der Liste kommt genau einmal vor.`;

/** The text the judge reads for one case. */
export function judgePrompt(c: EvalCase, t: Transcript, kriterien: Criterion[]): string {
  const talk = t.turns.map((x, i) => `--- Runde ${i + 1} ---\nLehrkraft: ${x.user}\nAssistent: ${x.assistant.trim() || "(keine Antwort)"}\n(Schritte des Assistenten: ${x.steps.join(", ") || "keine"}${x.fehlgeschlagen?.length ? `; vom Programm abgelehnt: ${x.fehlgeschlagen.join(", ")}` : ""})`).join("\n\n");
  const material = t.files.length
    ? t.files.map((f) => `=== ${f.name}${f.seiten ? ` (${f.seiten} Seiten)` : ""} ===\n${f.text.trim() || "(kein lesbarer Text)"}`).join("\n\n")
    : "(Es wurde kein Material erstellt.)";
  const list = kriterien.map((k) => `${k.id} [${k.gruppe}] ${k.kriterium}\n   Bestanden wenn: ${k.bestandenWenn}${k.bedingung ? `\n   Gilt nur, wenn: ${k.bedingung}` : ""}`).join("\n");
  return `Fall: ${c.id} (Anleitung: ${c.skill})\nDie Klasse hat keinen hinterlegten Lehrplan. Alle Namen, Betriebe und Daten sind erfunden.\n\n## GESPRÄCH\n${talk}\n\n## MATERIAL\n${material}${t.vorlage ? `\n\n## VORLAGE (der Text auf dem Bild, das die Lehrkraft angehängt hat)\n${t.vorlage}` : ""}\n\n## ARBEITSORDNER (das konnte der Assistent nachlesen)\n${t.ordner ?? "(nicht mitgegeben)"}\n\n## GESPEICHERT (Bewertungsregeln und eigene Vorlagen am Ende des Laufs)\n${t.gespeichert ?? "(nichts)"}\n\n## STUNDENTABELLE\n${t.tabelle || "(leer)"}\n\n## KRITERIEN\n${list}`;
}

/** Reads the judge's answer. Takes the first JSON array in the text, so a few stray words around it do no harm. */
export function parseVerdicts(answer: string, kriterien: Criterion[]): Verdict[] {
  const start = answer.indexOf("[");
  const end = answer.lastIndexOf("]");
  let raw: unknown;
  try {
    raw = JSON.parse(answer.slice(start, end + 1));
  } catch {
    throw new Error("Die Antwort des Prüfers war kein JSON.");
  }
  if (!Array.isArray(raw)) throw new Error("Die Antwort des Prüfers war keine Liste.");
  const byId = new Map(raw.map((v) => [String((v as { id?: unknown }).id), v as { bestanden?: unknown; grund?: unknown }]));
  return kriterien.map((k) => {
    const v = byId.get(k.id);
    if (!v) return { id: k.id, bestanden: null, grund: "Der Prüfer hat dieses Kriterium nicht beurteilt." };
    const b = v.bestanden;
    return { id: k.id, bestanden: b === true ? true : b === false ? false : null, grund: String(v.grund ?? "").trim() };
  });
}

/** Asks the judge. When its answer is no usable list, only the judge is asked again (up to three times), so the case does not have to be played anew. */
export async function judgeCase(judge: Completer, c: EvalCase, t: Transcript, kriterien: Criterion[]): Promise<Verdict[]> {
  if (kriterien.length === 0) return [];
  for (let attempt = 1; ; attempt++) {
    const answer = await judge.complete({ system: SYSTEM, text: judgePrompt(c, t, kriterien) }, AbortSignal.timeout(180_000));
    try {
      return parseVerdicts(answer, kriterien);
    } catch (err) {
      if (attempt >= 3) throw err;
    }
  }
}
