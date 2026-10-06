import type { Criterion, EvalCase, Transcript, Verdict } from "./types.ts";

export interface CaseResult {
  fall: EvalCase;
  verdicts: Verdict[];
  fehler?: string;
  kosten: number;
  /** What was said and made, kept in the JSON so a failure can be understood afterwards. */
  transkript?: Transcript;
}

export interface Rate {
  id: string;
  gruppe: string;
  kriterium: string;
  bestanden: number;
  gezaehlt: number;
}

/** Pass rate per criterion over all cases. Skipped criteria (null) are not counted. */
export function rates(kriterien: Criterion[], results: CaseResult[]): Rate[] {
  return kriterien.map((k) => {
    const v = results.flatMap((r) => r.verdicts.filter((x) => x.id === k.id && x.bestanden !== null));
    return { id: k.id, gruppe: k.gruppe, kriterium: k.kriterium, bestanden: v.filter((x) => x.bestanden).length, gezaehlt: v.length };
  });
}

const pct = (a: number, b: number) => (b === 0 ? "–" : `${Math.round((a / b) * 100)} %`);

export function markdown(opts: { skill: string; kriterien: Criterion[]; results: CaseResult[]; modell: string; pruefer: string; datum: string }): string {
  const { skill, kriterien, results } = opts;
  const r = rates(kriterien, results);
  const all = r.reduce((n, x) => ({ b: n.b + x.bestanden, g: n.g + x.gezaehlt }), { b: 0, g: 0 });
  const lines = [
    `## ${skill}`,
    "",
    `Bestanden: ${all.b} von ${all.g} Kriterien (${pct(all.b, all.g)}), ${results.length} Testsätze, Kosten etwa ${results.reduce((n, x) => n + x.kosten, 0).toFixed(2)} US-$.`,
    "",
    "| Kennung | Gruppe | Kriterium | Bestanden |",
    "|---|---|---|---|",
    ...r.map((x) => `| ${x.id} | ${x.gruppe} | ${x.kriterium} | ${x.gezaehlt === 0 ? "–" : `${x.bestanden}/${x.gezaehlt} (${pct(x.bestanden, x.gezaehlt)})`} |`),
  ];
  const fails = results.flatMap((res) => res.verdicts.filter((v) => v.bestanden === false).map((v) => `- **${res.fall.id}**, ${v.id} ${kriterien.find((k) => k.id === v.id)?.kriterium ?? ""}: ${v.grund}`));
  const errors = results.filter((x) => x.fehler).map((x) => `- **${x.fall.id}**: ${x.fehler}`);
  if (fails.length) lines.push("", "Nicht bestanden:", "", ...fails);
  if (errors.length) lines.push("", "Fehler beim Lauf:", "", ...errors);
  return lines.join("\n");
}
