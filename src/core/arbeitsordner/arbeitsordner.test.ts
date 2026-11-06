import { mkdir, mkdtemp, readFile, symlink, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { ArbeitsordnerError, aufloesen, auflisten, lesen, pruefeOrdner, schreiben } from "./index.ts";
import { ordnerTools } from "../agent/ordner-tools.ts";

let dir: string;
let aussen: string;
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "pult-ordner-"));
  aussen = await mkdtemp(join(tmpdir(), "pult-aussen-"));
  await writeFile(join(dir, "Notiz.md"), "# Hallo");
  await writeFile(join(aussen, "geheim.txt"), "nicht für dich");
});

describe("only the chosen folder is reachable", () => {
  it("refuses .., absolute paths and links that lead out", async () => {
    await expect(aufloesen(dir, "../x")).rejects.toThrow(ArbeitsordnerError);
    await expect(aufloesen(dir, join(aussen, "geheim.txt"))).rejects.toThrow(ArbeitsordnerError);
    await symlink(aussen, join(dir, "Link"));
    await expect(lesen(dir, "Link/geheim.txt")).rejects.toThrow(/außerhalb/);
    await expect(schreiben(dir, "Link/neu.txt", "x")).rejects.toThrow(/außerhalb/);
  });

  it("refuses the whole disk and the whole user folder", async () => {
    await expect(pruefeOrdner("/")).rejects.toThrow(/zu viel/);
    await expect(pruefeOrdner(homedir())).rejects.toThrow(/zu viel/);
    await expect(pruefeOrdner("relativ/pfad")).rejects.toThrow(ArbeitsordnerError);
    expect(await pruefeOrdner(dir)).toBeTruthy();
  });
});

describe("reading and writing", () => {
  it("lists, hides dot files and reads text", async () => {
    await mkdir(join(dir, "Klausuren"));
    await writeFile(join(dir, ".versteckt"), "x");
    const { eintraege } = await auflisten(dir);
    expect(eintraege.map((e) => e.name)).toEqual(["Klausuren", "Notiz.md"]);
    expect((await lesen(dir, "Notiz.md")).text).toContain("Hallo");
  });

  it("creates new files, also in new subfolders, and never overwrites", async () => {
    expect(await schreiben(dir, "Neu/Liste.txt", "a")).toEqual({ pfad: "Neu/Liste.txt", neu: true });
    await expect(schreiben(dir, "Neu/Liste.txt", "b")).rejects.toThrow(/gibt es schon/);
    expect(await readFile(join(dir, "Neu/Liste.txt"), "utf8")).toBe("a");
    expect((await schreiben(dir, "Neu/Liste.txt", "b", true)).neu).toBe(false);
    expect(await readFile(join(dir, "Neu/Liste.txt"), "utf8")).toBe("b");
  });

  it("writes only plain text files", async () => {
    await expect(schreiben(dir, "programm.exe", "x")).rejects.toThrow(/nur Textdateien/);
    await expect(schreiben(dir, "ordner/", "x")).rejects.toThrow(ArbeitsordnerError);
  });
});

describe("tools", () => {
  it("say so when no folder is chosen and ask before replacing", async () => {
    const [ansehen, , anlegen, ersetzen] = ordnerTools(() => undefined) as any[];
    expect((await ansehen.execute("1", {})).content[0].text).toMatch(/kein Ordner gewählt/);
    expect((await anlegen.execute("1", { datei: "a.txt", inhalt: "x" })).content[0].text).toMatch(/kein Ordner gewählt/);
    expect(ersetzen.ask({ datei: "a.txt" })).toMatch(/ersetzen/);
    expect(anlegen.ask).toBeUndefined();
  });

  it("work inside the chosen folder and report folder problems as text", async () => {
    const [ansehen, lese, anlegen] = ordnerTools(() => dir) as any[];
    expect((await ansehen.execute("1", {})).content[0].text).toContain("Notiz.md");
    expect((await lese.execute("1", { datei: "Notiz.md" })).content[0].text).toContain("Hallo");
    expect((await anlegen.execute("1", { datei: "Notiz.md", inhalt: "x" })).content[0].text).toMatch(/gibt es schon/);
    expect((await lese.execute("1", { datei: "../x" })).content[0].text).toMatch(/außerhalb/);
  });
});
