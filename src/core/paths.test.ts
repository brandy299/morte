import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { dataDir, dataDirFixed, moveLegacyDataDir } from "./paths.ts";

const saved = { HOME: process.env.HOME, PULT_HOME: process.env.PULT_HOME, MORTE_HOME: process.env.MORTE_HOME };
afterEach(() => {
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

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

  it("still honours the old variable MORTE_HOME, and PULT_HOME wins over it", () => {
    delete process.env.PULT_HOME;
    process.env.MORTE_HOME = "/alt/ordner";
    expect(dataDir()).toBe("/alt/ordner");
    expect(dataDirFixed()).toBe(true);
    process.env.PULT_HOME = "/neu/ordner";
    expect(dataDir()).toBe("/neu/ordner");
  });

  it("takes over a data folder that was chosen in the settings under the old name", async () => {
    const home = await mkdtemp(join(tmpdir(), "pult-paths-"));
    process.env.HOME = home;
    process.env.USERPROFILE = home;
    delete process.env.PULT_HOME;
    delete process.env.MORTE_HOME;
    await writeFile(join(home, ".morte-ordner"), "/irgendwo/meine-daten");
    expect(dataDir()).toBe("/irgendwo/meine-daten"); // found even before the move
    await moveLegacyDataDir();
    expect(await readFile(join(home, ".pult-ordner"), "utf8")).toBe("/irgendwo/meine-daten");
    await expect(readFile(join(home, ".morte-ordner"))).rejects.toThrow();
    expect(dataDir()).toBe("/irgendwo/meine-daten");
  });
});
