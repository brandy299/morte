/**
 * Quality check of the bundled skills. Plays every test case with the chosen model and lets a (stronger) judge model
 * score the results against the criteria in evals/. Usage:
 *   PULT_EVAL_API_KEY=... npm run eval -- --modell openrouter/anthropic/claude-haiku-4.5 --pruefer openrouter/anthropic/claude-sonnet-4.5
 * Options: --skill a,b   only these skills     --limit 3   stop when the cost passes this many US dollars
 *          --ohne-pruefer   only the checks the program can decide (no judge, much cheaper)
 *          --wdh 2   play every test case this many times (models answer differently each time)
 *          --pruefer jev   rough, fast check with Jev (TypeSafe) instead of a language model, about a cent for all cases.
 *                          Needs TYPESAFE_API_KEY. Good after changing a skill, not for the numbers in BASELINE.md.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createCompleter } from "../src/core/agent/index.ts";
import { JEV_MODEL, JEV_PRICE, jevJudgeCase, judgeCase, loadSuites, markdown, PROGRAMM, runCase, type CaseResult, type Verdict } from "../src/core/eval/index.ts";

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
const apiKey = process.env.PULT_EVAL_API_KEY;
if (!apiKey) throw new Error("PULT_EVAL_API_KEY ist nicht gesetzt. Den Schlüssel nie in einen Befehl oder Quelltext schreiben, sondern als Umgebungsvariable setzen.");
const ohnePruefer = flag("ohne-pruefer");
const useJev = !ohnePruefer && opt("pruefer") === "jev";
const jevKey = useJev ? process.env.TYPESAFE_API_KEY : undefined;
if (useJev && !jevKey) throw new Error("TYPESAFE_API_KEY ist nicht gesetzt. Den Schlüssel als Umgebungsvariable setzen, nie in einen Befehl oder Quelltext.");
const judgeSpec = ohnePruefer || useJev ? undefined : split(opt("pruefer"), "--pruefer");
const limit = Number(opt("limit") ?? 3);
const only = opt("skill")?.split(",");
const repeats = Math.max(1, Number(opt("wdh") ?? 1));

let spent = 0;
const judge = judgeSpec ? createCompleter({ ...judgeSpec, apiKey: process.env.PULT_EVAL_PRUEFER_KEY ?? apiKey }, { onUsage: (d) => (spent += d.cost) }) : undefined;

const suites = await loadSuites(join(process.cwd(), "evals"), only);
const stamp = new Date().toISOString();
const now = `${stamp.slice(0, 10)} ${stamp.slice(11, 16)}`;
const parts: string[] = [`# Prüfung der Anleitungen`, "", `Datum: ${now}  `, `Modell für das Material: ${gen.provider}/${gen.model}  `, `Prüfer: ${useJev ? `${JEV_MODEL} (grober Vortest, nicht mit einem Sprachmodell als Prüfer vergleichbar)` : judgeSpec ? `${judgeSpec.provider}/${judgeSpec.model}` : "keiner (nur Programmprüfungen)"}`, ""];
const json: Record<string, CaseResult[]> = {};
const dir = join(process.cwd(), "evals", "ergebnisse");
const base = join(dir, `${stamp.slice(0, 10)}_${stamp.slice(11, 16).replace(":", "")}_${gen.model.replace(/[^\w.-]+/g, "-")}`);
/** Written after every skill, so a crash or a stop does not lose what is done. */
const save = async () => {
  await mkdir(dir, { recursive: true });
  await writeFile(`${base}.md`, [...parts, `Kosten bisher: etwa ${spent.toFixed(2)} US-$.`].join("\n"));
  await writeFile(`${base}.json`, JSON.stringify(json, null, 2));
};

for (const suite of suites) {
  const results: CaseResult[] = [];
  for (const c of suite.faelle.flatMap((x) => Array.from({ length: repeats }, (_, n) => (repeats > 1 ? { ...x, id: `${x.id}#${n + 1}` } : x)))) {
    if (spent > limit) {
      console.error(`Das Kostenlimit von ${limit} US-$ ist erreicht, ich höre auf.`);
      break;
    }
    process.stderr.write(`${suite.skill} / ${c.id} … `);
    // Rate limits and a judge that answers badly happen now and then: one more try before the case counts as failed.
    for (let attempt = 1; ; attempt++) {
      try {
        const t = await runCase(c, { ...gen, apiKey });
        spent += t.kosten;
        const verdicts: Verdict[] = suite.kriterien.filter((k) => k.art === "Programm").map((k) => {
          const check = PROGRAMM[k.id];
          if (!check) throw new Error(`Für das Programmkriterium ${k.id} gibt es keine Prüfung.`);
          return { id: k.id, ...check(c, t) };
        });
        const pruefer = suite.kriterien.filter((k) => k.art === "Prüfer");
        if (judge) verdicts.push(...(await judgeCase(judge, c, t, pruefer)));
        if (jevKey) {
          const jev = await jevJudgeCase(c, t, pruefer, { apiKey: jevKey, signal: AbortSignal.timeout(60_000) });
          spent += jev.tokens * JEV_PRICE;
          verdicts.push(...jev.verdicts);
        }
        results.push({ fall: c, verdicts, kosten: t.kosten, transkript: t });
        process.stderr.write(`${verdicts.filter((v) => v.bestanden === false).length} nicht bestanden (bisher ${spent.toFixed(2)} US-$)\n`);
        break;
      } catch (err) {
        if (attempt < 2) {
          process.stderr.write(`Fehler (${(err as Error).message.slice(0, 80)}), neuer Versuch … `);
          await new Promise((r) => setTimeout(r, 15_000));
          continue;
        }
        results.push({ fall: c, verdicts: [], fehler: (err as Error).message, kosten: 0 });
        process.stderr.write(`Fehler: ${(err as Error).message.slice(0, 120)}\n`);
        break;
      }
    }
  }
  json[suite.skill] = results;
  parts.push(markdown({ skill: suite.skill, kriterien: suite.kriterien, results, modell: gen.model, pruefer: useJev ? JEV_MODEL : (judgeSpec?.model ?? ""), datum: now }), "");
  await save();
}
await save();
console.log(`Ergebnis: ${base}.md`);


