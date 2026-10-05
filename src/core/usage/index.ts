import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { dataDir } from "../paths.ts";

/** What one answer used. Cost is in US dollars at the catalog price, so it is an estimate, not a bill. */
export interface UsageDelta {
  input: number;
  output: number;
  cost: number;
}

const file = () => join(dataDir(), "Einstellungen", "Verbrauch.json");
const monthKey = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" }).slice(0, 7);

let chain: Promise<unknown> = Promise.resolve();

async function load(): Promise<Record<string, UsageDelta>> {
  try {
    return JSON.parse(await readFile(file(), "utf8"));
  } catch {
    return {};
  }
}

/** Adds to this month's total. Writes are serialized so parallel answers do not lose counts. */
export function addUsage(delta: UsageDelta): Promise<void> {
  const run = async () => {
    const all = await load();
    const m = all[monthKey()] ?? { input: 0, output: 0, cost: 0 };
    all[monthKey()] = { input: m.input + delta.input, output: m.output + delta.output, cost: m.cost + delta.cost };
    await mkdir(join(file(), ".."), { recursive: true });
    await writeFile(file(), JSON.stringify(all, null, 2));
  };
  const next = chain.then(run, run);
  chain = next.catch(() => {});
  return next;
}

export async function monthUsage(): Promise<UsageDelta> {
  return (await load())[monthKey()] ?? { input: 0, output: 0, cost: 0 };
}
