import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { dataDir } from "../paths.ts";

export interface ProviderSettings {
  provider: string;
  model: string;
  /** Only for an own OpenAI-compatible server. */
  baseUrl?: string;
  contextWindow?: number;
}

const file = () => join(dataDir(), "Einstellungen", "Provider.md");

/** Provider.md holds the chosen provider and model, never the API key (that lives in the keychain). */
export async function loadProviderSettings(): Promise<ProviderSettings | undefined> {
  try {
    const text = await readFile(file(), "utf8");
    const provider = /^Anbieter:\s*(.+)$/m.exec(text)?.[1]?.trim();
    const model = /^Modell:\s*(.+)$/m.exec(text)?.[1]?.trim();
    const baseUrl = /^Adresse:\s*(.+)$/m.exec(text)?.[1]?.trim();
    const contextWindow = Number(/^Gedächtnis:\s*(\d+)/m.exec(text)?.[1]) || undefined;
    return provider && model ? { provider, model, ...(baseUrl ? { baseUrl } : {}), ...(contextWindow ? { contextWindow } : {}) } : undefined;
  } catch {
    return undefined;
  }
}

export async function saveProviderSettings(s: ProviderSettings): Promise<void> {
  await mkdir(join(file(), ".."), { recursive: true });
  await writeFile(
    file(),
    `# Provider\n\nAnbieter: ${s.provider}\nModell: ${s.model}\n${s.baseUrl ? `Adresse: ${s.baseUrl}\n` : ""}${s.contextWindow ? `Gedächtnis: ${s.contextWindow}\n` : ""}\nDer Zugangsschlüssel steht nicht hier, sondern im Schlüsselbund.\n`,
  );
}
