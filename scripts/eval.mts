/**
 * Quality check of the bundled skills. Plays every test case with the chosen model and lets a (stronger) judge model
 * score the results against the criteria in evals/. Usage:
 *   MORTE_EVAL_API_KEY=... npm run eval -- --modell openrouter/anthropic/claude-haiku-4.5 --pruefer openrouter/anthropic/claude-sonnet-4.5
 * Options: --skill a,b   only these skills     --limit 3   stop when the cost passes this many US dollars
 *          --ohne-pruefer   only the checks the program can decide (no judge, much cheaper)
 *          --wdh 2   play every test case this many times (models answer differently each time)
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createCompleter } from "../src/core/agent/index.ts";
import { judgeCase, loadSuites, markdown, PROGRAMM, runCase, type CaseResult, type Verdict } from "../src/core/eval/index.ts";

const args = process.argv.slice(2);
const opt = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const flag = (name: string) => args.includes(`--${name}`);
const split = (spec: string | undefined, what: string) => {
  const m = /^([^/]+)\/(.+)$/.exec(spec ?? "");
  if (!m) throw new Error(`${what} fehlt oder hat nicht die Form anbieter/modell, zum Beispiel openrouter/anthropic/claude-haiku-4.5`);
  return { provider: m[1]!, model: m[2]! };
};

const gen = split(opt("modell"), "--modell");
const apiKey = process.env.MORTE_EVAL_API_KEY;
if (!apiKey) throw new Error("MORTE_EVAL_API_KEY ist nicht gesetzt. Den Schlüssel nie in einen Befehl oder Quelltext schreiben, sondern als Umgebungsvariable setzen.");
const ohnePruefer = flag("ohne-pruefer");
const judgeSpec = ohnePruefer ? undefined : split(opt("pruefer"), "--pruefer");
const limit = Number(opt("limit") ?? 3);
const only = opt("skill")?.split(",");
const repeats = Math.max(1, Number(opt("wdh") ?? 1));

let spent = 0;
const judge = judgeSpec ? createCompleter({ ...judgeSpec, apiKey: process.env.MORTE_EVAL_PRUEFER_KEY ?? apiKey }, { onUsage: (d) => (spent += d.cost) }) : undefined;

const suites = await loadSuites(join(process.cwd(), "evals"), only);
const stamp = new Date().toISOString();
const now = `${stamp.slice(0, 10)} ${stamp.slice(11, 16)}`;
const parts: string[] = [`# Prüfung der Anleitungen`, "", `Datum: ${now}  `, `Modell für das Material: ${gen.provider}/${gen.model}  `, `Prüfer: ${judgeSpec ? `${judgeSpec.provider}/${judgeSpec.model}` : "keiner (nur Programmprüfungen)"}`, ""];
const json: Record<string, CaseResult[]> = {};

for (const suite of suites) {
  const results: CaseResult[] = [];
  for (const c of suite.faelle.flatMap((x) => Array.from({ length: repeats }, (_, n) => (repeats > 1 ? { ...x, id: `${x.id}#${n + 1}` } : x)))) {
    if (spent > limit) {
      console.error(`Das Kostenlimit von ${limit} US-$ ist erreicht, ich höre auf.`);
      break;
    }
    process.stderr.write(`${suite.skill} / ${c.id} … `);
    try {
      const t = await runCase(c, { ...gen, apiKey });
      spent += t.kosten;
      const verdicts: Verdict[] = suite.kriterien.filter((k) => k.art === "Programm").map((k) => {
        const check = PROGRAMM[k.id];
        if (!check) throw new Error(`Für das Programmkriterium ${k.id} gibt es keine Prüfung.`);
        return { id: k.id, ...check(c, t) };
      });
      if (judge) verdicts.push(...(await judgeCase(judge, c, t, suite.kriterien.filter((k) => k.art === "Prüfer"))));
      results.push({ fall: c, verdicts, kosten: t.kosten, transkript: t });
      process.stderr.write(`${verdicts.filter((v) => v.bestanden === false).length} nicht bestanden (bisher ${spent.toFixed(2)} US-$)\n`);
    } catch (err) {
      results.push({ fall: c, verdicts: [], fehler: (err as Error).message, kosten: 0 });
      process.stderr.write(`Fehler: ${(err as Error).message}\n`);
    }
  }
  json[suite.skill] = results;
  parts.push(markdown({ skill: suite.skill, kriterien: suite.kriterien, results, modell: gen.model, pruefer: judgeSpec?.model ?? "", datum: now }), "");
}

parts.push(`Gesamtkosten: etwa ${spent.toFixed(2)} US-$.`);
const dir = join(process.cwd(), "evals", "ergebnisse");
await mkdir(dir, { recursive: true });
const base = join(dir, `${stamp.slice(0, 10)}_${stamp.slice(11, 16).replace(":", "")}_${gen.model.replace(/[^\w.-]+/g, "-")}`);
await writeFile(`${base}.md`, parts.join("\n"));
await writeFile(`${base}.json`, JSON.stringify(json, null, 2));
console.log(`Ergebnis: ${base}.md`);
