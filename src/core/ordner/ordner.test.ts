import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { dataDir } from "../paths.ts";
import { changeDataDir, OrdnerError, ordnerInfo, resetDataDir } from "./index.ts";

let root: string;
let home: string;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "morte-ordner-"));
  home = join(root, "home");
  await mkdir(home);
  vi.stubEnv("HOME", home);
  vi.stubEnv("USERPROFILE", home);
  vi.stubEnv("MORTE_HOME", "");
  delete process.env.MORTE_HOME;
});
afterEach(async () => {
  vi.unstubAllEnvs();
  await rm(root, { recursive: true, force: true });
});

describe("data folder", () => {
  it("copies the data, remembers the new place and keeps the old folder", async () => {
    const old = join(home, "morte-daten");
    await mkdir(join(old, "Klassen", "11a"), { recursive: true });
    await writeFile(join(old, "Klassen", "11a", "Klasse.md"), "Business English");
    const target = join(root, "neu");
    await changeDataDir(target);
    expect(dataDir()).toBe(target);
    expect(await readFile(join(target, "Klassen", "11a", "Klasse.md"), "utf8")).toBe("Business English");
    expect(await readFile(join(old, "Klassen", "11a", "Klasse.md"), "utf8")).toBe("Business English");
    await resetDataDir();
    expect(dataDir()).toBe(old);
  });

  it("refuses a folder that is not empty, relative, the same or nested", async () => {
    const full = join(root, "voll");
    await mkdir(full);
    await writeFile(join(full, "etwas.txt"), "x");
    await expect(changeDataDir(full)).rejects.toThrow(/nicht leer/);
    await expect(changeDataDir("relativ/pfad")).rejects.toThrow(/ganzen Pfad/);
    await expect(changeDataDir(join(home, "morte-daten"))).rejects.toThrow(/schon der aktuelle/);
    await expect(changeDataDir(join(home, "morte-daten", "innen"))).rejects.toThrow(OrdnerError);
    expect(dataDir()).toBe(join(home, "morte-daten"));
  });

  it("cannot be changed when the environment fixes it", async () => {
    vi.stubEnv("MORTE_HOME", join(root, "fest"));
    expect(ordnerInfo().fest).toBe(true);
    await expect(changeDataDir(join(root, "neu"))).rejects.toThrow(/festgelegt/);
  });
});
