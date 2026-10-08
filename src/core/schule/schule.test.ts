import { mkdtemp, readdir, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { beforeEach, describe, expect, it } from "vitest";
import { UserError } from "../workspace/index.ts";
import { loadSchule, logoBytes, LOGO_BOX, MAX_LOGO_BYTES, removeLogo, saveLogo, saveSchulname, schulkopf } from "./index.ts";

let home: string;
beforeEach(async () => {
  home = process.env.PULT_HOME = await mkdtemp(join(tmpdir(), "pult-schule-"));
});

/** A colored picture: red, with a blue square. */
function picture(w: number, h: number, type: "image/png" | "image/jpeg" = "image/png") {
  const c = createCanvas(w, h);
  const x = c.getContext("2d");
  x.fillStyle = "#cc2200";
  x.fillRect(0, 0, w, h);
  x.fillStyle = "#0044cc";
  x.fillRect(w / 8, h / 8, w / 4, h / 2);
  return type === "image/png" ? c.toBuffer("image/png") : c.toBuffer("image/jpeg");
}

const svg = (body = '<rect width="300" height="80" fill="#d00"/><circle cx="40" cy="40" r="30" fill="#04c"/>') => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="300" height="80">${body}</svg>`);

describe("school name", () => {
  it("is saved in the data folder, tidied up, and removed by an empty entry", async () => {
    expect(schulkopf()).toBeUndefined();
    await saveSchulname("  Berufskolleg \n Musterstadt\t ");
    expect(schulkopf()).toEqual({ name: "Berufskolleg Musterstadt", logo: undefined });
    expect(await readFile(join(home, "Einstellungen", "Schule.md"), "utf8")).toContain("Name: Berufskolleg Musterstadt");
    expect(await loadSchule()).toEqual({ name: "Berufskolleg Musterstadt", hasLogo: false });
    await saveSchulname("   ");
    expect(schulkopf()).toBeUndefined();
  });

  it("turns down a name that is far too long, in plain words", async () => {
    await expect(saveSchulname("x".repeat(121))).rejects.toThrow(/zu lang/);
    await expect(saveSchulname("x".repeat(121))).rejects.toBeInstanceOf(UserError);
  });
});

describe("school logo", () => {
  it("saves a colored picture as a gray PNG that is not larger than the box", async () => {
    await saveLogo(picture(2400, 600));
    const png = (await logoBytes())!;
    const image = await loadImage(png);
    expect(image.width).toBeLessThanOrEqual(LOGO_BOX.width);
    expect(image.height).toBeLessThanOrEqual(LOGO_BOX.height);
    expect(image.width / image.height).toBeCloseTo(4, 1); // shape kept
    const c = createCanvas(image.width, image.height);
    const x = c.getContext("2d");
    x.drawImage(image, 0, 0);
    const { data } = x.getImageData(0, 0, image.width, image.height);
    let colored = 0;
    let dark = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] !== data[i + 1] || data[i + 1] !== data[i + 2]) colored++;
      if (data[i]! < 200) dark++;
    }
    expect(colored).toBe(0);
    expect(dark).toBeGreaterThan(0); // not an empty white sheet
    expect(schulkopf()!.logo).toMatchObject({ width: image.width, height: image.height });
  });

  it("takes PNG, JPG and SVG, small pictures stay as large as they are", async () => {
    for (const bytes of [picture(300, 100), picture(300, 100, "image/jpeg"), svg()]) {
      await saveLogo(bytes);
      expect(schulkopf()!.logo!.width).toBe(300);
    }
  });

  it("turns transparent parts into white", async () => {
    const c = createCanvas(50, 50);
    const x = c.getContext("2d");
    x.fillStyle = "#000000";
    x.fillRect(0, 0, 25, 50); // the right half stays transparent
    await saveLogo(c.toBuffer("image/png"));
    const image = await loadImage((await logoBytes())!);
    const out = createCanvas(50, 50);
    const ox = out.getContext("2d");
    ox.drawImage(image, 0, 0);
    expect([...ox.getImageData(40, 25, 1, 1).data]).toEqual([255, 255, 255, 255]);
    expect(ox.getImageData(10, 25, 1, 1).data[0]).toBeLessThan(10);
  });

  it("replaces and removes the logo, and only the small gray PNG is stored, not the original", async () => {
    await saveLogo(picture(300, 100));
    await saveLogo(picture(100, 300, "image/jpeg"));
    expect(schulkopf()!.logo!.height).toBe(260);
    expect((await readdir(join(home, "Einstellungen"))).sort()).toEqual(["Schullogo.png"]);
    expect(await loadSchule()).toMatchObject({ hasLogo: true });
    await removeLogo();
    expect(schulkopf()).toBeUndefined();
    await removeLogo(); // nothing left: no error
  });

  it("turns down everything that is no usable picture, with a German message, and keeps the old logo", async () => {
    await saveLogo(picture(300, 100));
    const before = await logoBytes();
    const bad: [string, Buffer, RegExp][] = [
      ["empty", Buffer.alloc(0), /leer/],
      ["text", Buffer.from("Das ist ein Brief."), /kein Bild/],
      ["pdf", Buffer.from("%PDF-1.7\n1 0 obj"), /kein Bild/],
      ["too large", Buffer.alloc(MAX_LOGO_BYTES + 1, 1), /zu groß/],
      ["broken png", Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from("kaputt")]), /lässt sich nicht öffnen/],
      ["script in svg", svg("<script>alert(1)</script>"), /nicht verwende/],
      ["link in svg", svg('<image href="file:///etc/passwd" width="10" height="10"/>'), /nicht verwende/],
      ["address in svg", svg('<image xlink:href="http://example.org/a.png" width="10" height="10"/>'), /nicht verwende/],
      ["entity in svg", Buffer.from('<?xml version="1.0"?><!DOCTYPE s [<!ENTITY a "aaaa">]><svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><text>&a;</text></svg>'), /nicht verwende/],
    ];
    for (const [name, bytes, message] of bad) {
      await expect(saveLogo(bytes), name).rejects.toThrow(message);
      await expect(saveLogo(bytes), name).rejects.toBeInstanceOf(UserError);
    }
    expect((await logoBytes())!.equals(before!)).toBe(true);
  });

  it("allows pictures inside an SVG, but not links to other files", async () => {
    const dot = picture(10, 10).toString("base64");
    await saveLogo(svg(`<image href="data:image/png;base64,${dot}" width="10" height="10"/><use href="#a"/>`));
    expect(schulkopf()!.logo).toBeDefined();
  });
});
