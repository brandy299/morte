import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { dataDir } from "../paths.ts";

const file = () => join(dataDir(), "Einstellungen", "Internet.md");

/** Whether the assistant may search the web and read pages. On unless the teacher switched it off. */
export async function internetAn(): Promise<boolean> {
  try {
    return !/^Internet:\s*aus\b/im.test(await readFile(file(), "utf8"));
  } catch {
    return true;
  }
}

export async function setzeInternet(an: boolean): Promise<void> {
  await mkdir(join(file(), ".."), { recursive: true });
  await writeFile(file(), `# Internet\n\nInternet: ${an ? "an" : "aus"}\n\nWenn das an ist, darf Pult im Internet suchen und Seiten lesen.\n`);
}
