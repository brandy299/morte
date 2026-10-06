import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { dehyphenate } from "../core/lehrplan/clean.ts";
import { samplePlan } from "../core/lehrplan/fixtures.ts";
import { createClass, readKlasse } from "../core/workspace/index.ts";
import { createApp, type AppState } from "./index.ts";

let app: ReturnType<typeof createApp>;
let state: AppState;

beforeEach(async () => {
  process.env.PULT_HOME = await mkdtemp(join(tmpdir(), "morte-lps-"));
  state = {
    secrets: { kind: "file", get: async () => undefined, set: async () => {}, delete: async () => {} },
    session: undefined,
    configured: undefined,
    choice: { provider: "anthropic", model: "m" },
    makeCompleter: () => ({
      vision: true,
      price: { input: 3, output: 15 },
      complete: async ({ text }) => dehyphenate(text).replace(/^(\d+\. .*)$/gm, "## $1").replace(/\t/g, " | "),
    }),
  };
  app = createApp(state);
  await createClass({ name: "11a", schulform: "Berufskolleg", stufe: "11", faecher: ["Business English"] });
});

const upload = async (data: Uint8Array | string, fileName: string) => {
  const form = new FormData();
  form.set("file", new File([data as BlobPart], fileName));
  return app.request("/api/lehrplan/pruefen", { method: "POST", body: form });
};
const post = (url: string, body: unknown) => app.request(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
const events = async (res: Response) =>
  (await res.text()).split("\n\n").filter((b) => b.startsWith("data:")).map((b) => JSON.parse(b.slice(5)) as { type: string } & Record<string, unknown>);

describe("importing a curriculum", () => {
  it("checks a PDF, says what it will cost, converts with progress, saves and assigns", async () => {
    const check = await (await upload(await samplePlan(), "lp.pdf")).json();
    expect(check).toMatchObject({ art: "pdf", seiten: 4, bilder: 0, anfragen: 1, dateiname: "lp.pdf" });
    expect(check.kostenUsd).toBeGreaterThan(0);

    const res = await post("/api/lehrplan/umwandeln", { token: check.token, name: "Höhere Handelsschule" });
    const ev = await events(res);
    expect(ev.at(-1)).toMatchObject({ type: "fertig", name: "Höhere Handelsschule", warnungen: [] });
    expect(ev.some((e) => e.type === "fortschritt")).toBe(true);
    expect((ev.at(-1)!.gliederung as unknown[]).length).toBeGreaterThan(0);

    await post("/api/lehrplan/zuordnen", { name: "Höhere Handelsschule", klassen: ["11a"] });
    expect(await readKlasse("11a")).toContain("Lehrplan: Höhere Handelsschule");
    const list = await (await app.request("/api/lehrplan")).json();
    expect(list.klassen).toEqual(["11a"]);
    expect(list.lehrplaene[0]).toMatchObject({ name: "Höhere Handelsschule", hasPlan: true, klassen: ["11a"] });
  });

  it("takes a text file as it is, without the model", async () => {
    state.makeCompleter = () => {
      throw new Error("must not be used");
    };
    const check = await (await upload("# Plan\n\n## Ziele\nText des Plans", "plan.md")).json();
    expect(check).toMatchObject({ art: "text" });
    const ev = await events(await post("/api/lehrplan/umwandeln", { token: check.token, name: "Eigener Plan" }));
    expect(ev.at(-1)).toMatchObject({ type: "fertig", abschnitte: 3 });
  });

  it("does not replace a plan by accident", async () => {
    const first = await (await upload("## A\nEin Plan mit genug Text.", "a.md")).json();
    await events(await post("/api/lehrplan/umwandeln", { token: first.token, name: "Plan" }));
    const second = await (await upload("## B\nNoch ein Plan mit genug Text.", "b.md")).json();
    const refused = await post("/api/lehrplan/umwandeln", { token: second.token, name: "plan" });
    expect(refused.status).toBe(409);
    expect((await refused.json()).existiert).toBe(true);
    const ok = await events(await post("/api/lehrplan/umwandeln", { token: second.token, name: "Plan", ersetzen: true }));
    expect(ok.at(-1)!.type).toBe("fertig");
  });

  it("answers plainly to wrong files and to the demo mode", async () => {
    expect((await upload("<html>", "x.pdf")).status).toBe(400);
    expect((await upload("MZ", "x.exe")).status).toBe(400);
    const check = await (await upload(await samplePlan(), "lp.pdf")).json();
    state.choice = { provider: "demo" };
    const res = await post("/api/lehrplan/umwandeln", { token: check.token, name: "X" });
    expect(res.status).toBe(409);
    expect((await res.json()).error).toMatch(/echte KI/);
  });

  it("removes a plan", async () => {
    const check = await (await upload("## A\nEin Plan mit genug Text.", "a.md")).json();
    await events(await post("/api/lehrplan/umwandeln", { token: check.token, name: "Weg" }));
    expect((await app.request("/api/lehrplan/Weg", { method: "DELETE" })).status).toBe(200);
    expect((await (await app.request("/api/lehrplan")).json()).lehrplaene).toEqual([]);
  });

  it("refuses empty text files and models without vision for scanned pages", async () => {
    const empty = await upload("  \n ", "leer.txt");
    expect(empty.status).toBe(400);
    expect((await empty.json()).error).toMatch(/kein Text/);
  });

  it("lets only one conversion run at a time, even when two requests arrive together", async () => {
    const a = await (await upload("## A\nEin Plan mit genug Text.", "a.md")).json();
    const b = await (await upload("## B\nNoch ein Plan mit genug Text.", "b.md")).json();
    const [first, second] = await Promise.all([post("/api/lehrplan/umwandeln", { token: a.token, name: "Eins" }), post("/api/lehrplan/umwandeln", { token: b.token, name: "Zwei" })]);
    expect([first.status, second.status].sort()).toEqual([200, 409]);
    await first.text();
    await second.text();
    // After the first one is done, the next may run.
    const c2 = await (await upload("## C\nNoch ein dritter Plan mit Text.", "c.md")).json();
    expect((await post("/api/lehrplan/umwandeln", { token: c2.token, name: "Drei" })).status).toBe(200);
  });

  it("refuses a PDF with scanned pages when the model cannot see pictures", async () => {
    state.makeCompleter = () => ({ vision: false, complete: async () => "" });
    const { readPdf } = await import("../core/lehrplan/pdf.ts");
    const text = await readPdf(await samplePlan({ pages: 1 }));
    const png = await text.renderPage(1, 500);
    await text.close();
    const res = await upload(await samplePlan({ pages: 3, scanPage: png }), "scan.pdf");
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/keine Bilder lesen/);
  });
});
