import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { dataDir, moveLegacyDataDir } from "./paths.ts";

const saved = { HOME: process.env.HOME, PULT_HOME: process.env.PULT_HOME };
afterEach(() => Object.assign(process.env, saved));

describe("data folder after the rename from morte to Pult", () => {
  it("moves the old folder once and keeps its contents", async () => {
    const home = await mkdtemp(join(tmpdir(), "pult-paths-"));
    process.env.HOME = home;
    delete process.env.PULT_HOME;
    await mkdir(join(home, "morte-daten", "Klassen"), { recursive: true });
    await writeFile(join(home, "morte-daten", "Klassen", "x.md"), "alt");
    await moveLegacyDataDir();
    expect(dataDir()).toBe(join(home, "pult-daten"));
    expect(await readFile(join(home, "pult-daten", "Klassen", "x.md"), "utf8")).toBe("alt");
  });

  it("leaves both alone when the new folder already exists", async () => {
    const home = await mkdtemp(join(tmpdir(), "pult-paths-"));
    process.env.HOME = home;
    delete process.env.PULT_HOME;
    await mkdir(join(home, "morte-daten"));
    await mkdir(join(home, "pult-daten"));
    await writeFile(join(home, "morte-daten", "a"), "alt");
    await moveLegacyDataDir();
    expect(await readFile(join(home, "morte-daten", "a"), "utf8")).toBe("alt");
  });
});
