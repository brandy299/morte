/**
 * Draws an exercise (see schema.ts) as ONE html file that runs offline in any browser, on a phone too.
 * The page script is assets/uebung/uebung.js (plain, no library). Nothing is sent anywhere and nothing is stored:
 * the answers stay in the page and are gone when it is closed. The solutions are in the file, so a pupil who looks
 * at the source could find them: this is an exercise, not a test.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { PALETTE } from "../animation/html.ts";
import { MaterialError } from "../material/layout.ts";
import { mischen } from "../material/mischen.ts";
import type { Schritt, Uebung } from "./schema.ts";

const FONT_DIR = fileURLToPath(new URL("../../../assets/fonts/", import.meta.url));
const SCRIPT = fileURLToPath(new URL("../../../assets/uebung/uebung.js", import.meta.url));
const font = (file: string) => readFileSync(FONT_DIR + file).toString("base64");

export const FEEDBACK = { okInk: "#164c26", okBg: "#e1efd9", badInk: "#7a2509", badBg: "#f7e0d5" };

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** A picture for the page: the file as a data address, and the places biggest first, so a small place (a button) lies on top of the big one it sits in (the ribbon). */
export interface BildDaten { src: string; breite: number; hoehe: number; titel: string; elemente: { id: string; name: string; ort?: string; rechteck: [number, number, number, number] }[] }
type SeitenSchritt = Exclude<Schritt, { art: "klick" }> | { art: "klick"; aufgabe: string; bild: string; ziel: string; hinweis?: string; erklaerung?: string };

/** The data for the page. Pairs get their right sides in a fixed shuffled order, which is never the order of the left side. Every picture is in the page once, however many steps use it. */
export function daten(u: Uebung): { schritte: (SeitenSchritt & { rechts?: string[] })[]; bilder: Record<string, BildDaten> } {
  const bilder: Record<string, BildDaten> = {};
  const schritte = u.schritte.map((s, i): SeitenSchritt & { rechts?: string[] } => {
    if (s.art === "klick") {
      const b = s.bild;
      bilder[b.id] ??= {
        src: `data:image/png;base64,${b.png.toString("base64")}`,
        breite: b.breite,
        hoehe: b.hoehe,
        titel: b.titel,
        elemente: [...b.elemente].sort((x, y) => y.rechteck[2] * y.rechteck[3] - x.rechteck[2] * x.rechteck[3]).map((e) => ({ id: e.id, name: e.name, ort: e.ort, rechteck: e.rechteck })),
      };
      return { art: "klick", aufgabe: s.aufgabe, bild: b.id, ziel: s.ziel, hinweis: s.hinweis, erklaerung: s.erklaerung };
    }
    if (s.art !== "zuordnung") return s;
    const perm = mischen(s.paare.length, `${u.titel}-${i}`);
    return { ...s, rechts: perm.map((k) => s.paare[k]!.rechts) };
  });
  return { schritte, bilder };
}

const css = (u: Uebung) => {
  const c = PALETTE[u.palette];
  return `
@font-face{font-family:"Fraunces";src:url(data:font/ttf;base64,${font("Fraunces_400Regular.ttf")}) format("truetype");font-weight:400}
@font-face{font-family:"Fraunces";src:url(data:font/ttf;base64,${font("Fraunces_600SemiBold.ttf")}) format("truetype");font-weight:600}
*{box-sizing:border-box}
:root{--bg:${c.bg};--ink:${c.ink};--soft:${c.soft};--accent:${c.accent};--tint:${c.fills[0]};--card:#fffaf0;--okInk:${FEEDBACK.okInk};--okBg:${FEEDBACK.okBg};--badInk:${FEEDBACK.badInk};--badBg:${FEEDBACK.badBg}}
html,body{margin:0;background:var(--bg);color:var(--ink)}
body{font:400 19px/1.5 "Fraunces",Georgia,serif;min-height:100vh}
main{max-width:720px;margin:0 auto;padding:20px 16px 48px}
header.kopf h1{font-weight:600;font-size:28px;line-height:1.2;margin:8px 0 2px}
header.kopf p{margin:0;color:var(--soft)}
.fortschritt{display:flex;align-items:center;gap:12px;margin:18px 0 14px}
.spur{flex:1;height:10px;border-radius:5px;background:${c.fills[1]};overflow:hidden}
.fuell{height:100%;background:var(--accent)}
.zahl{color:var(--soft);font-size:16px;white-space:nowrap}
.karte{background:var(--card);border:2px solid var(--soft);border-radius:14px;padding:20px 18px}
.phase{margin:0;font-size:14px;letter-spacing:.06em;text-transform:uppercase;color:var(--soft)}
h2{font-weight:600;font-size:24px;line-height:1.3;margin:6px 0 14px;outline:none}
h2.kurz{font-size:18px;font-weight:400;color:var(--soft)}
.frage{font-weight:600;font-size:22px;margin:0 0 6px}
.hinweis{color:var(--soft);font-size:16px;margin:0 0 10px}
.text{margin:0 0 10px}
.punkte{padding-left:22px;margin:0 0 10px}
.optionen{display:flex;flex-direction:column;gap:10px}
.option{display:block;position:relative;padding:12px 14px 12px 46px;border:2px solid var(--soft);border-radius:10px;background:#fff;cursor:pointer;min-height:48px}
.option input{position:absolute;left:14px;top:14px;width:22px;height:22px}
.option .marke,.paar .marke{display:block;font-weight:600;margin-top:4px}
.option .erkl{display:block;font-size:16px;margin-top:4px}
.option.ok,.paar.ok,.luecke.ok{background:var(--okBg);border-color:var(--okInk);color:var(--okInk)}
.option.bad,.paar.bad,.luecke.bad{background:var(--badBg);border-color:var(--badInk);color:var(--badInk)}
.option.fehlt{border-style:dashed;border-color:var(--okInk)}
.option.fehlt .marke{color:var(--okInk)}
.luecken{line-height:2.4}
input.luecke,select,textarea{font:inherit;color:var(--ink);background:#fff;border:2px solid var(--soft);border-radius:8px;padding:6px 10px;min-height:44px}
input.luecke{margin:0 4px;text-align:center}
.korrekt{font-weight:600;color:var(--okInk);margin:0 6px}
.paare{display:flex;flex-direction:column;gap:10px}
.paar{display:flex;flex-wrap:wrap;align-items:center;gap:8px 14px;padding:10px 12px;border:2px solid transparent;border-radius:10px}
.paar .links{flex:1 1 200px;font-weight:600}
.paar select{flex:1 1 220px;max-width:100%}
textarea{width:100%;resize:vertical}
.zaehler{color:var(--soft);font-size:16px;margin:6px 0 0}
.erkl{background:var(--tint);border-radius:10px;padding:10px 12px;margin:10px 0 0;font-size:17px}
.meldung{min-height:1.5em;margin:12px 0 0;font-weight:600}
.meldung.ok{color:var(--okInk)}.meldung.bad{color:var(--badInk)}
.nav{display:flex;flex-wrap:wrap;gap:10px;margin-top:14px}
button{font:600 18px "Fraunces",Georgia,serif;border-radius:10px;padding:10px 20px;min-height:48px;cursor:pointer;border:2px solid var(--soft);background:#fff;color:var(--ink)}
button.prim{background:var(--accent);border-color:var(--accent);color:#fff}
button.sek{margin-top:10px}
button.link{border:0;background:none;padding:0;min-height:0;text-decoration:underline;color:var(--accent);font-weight:400;font-size:inherit;text-align:left}
button:disabled{opacity:.45;cursor:default}
button:hover:not(:disabled){filter:brightness(.96)}
:focus-visible{outline:3px solid var(--accent);outline-offset:2px}
.ergebnis{font-size:22px;font-weight:600}
.bildkarte{position:relative;display:block;max-width:100%;margin:8px 0 10px;border:2px solid var(--soft);border-radius:8px;overflow:hidden;line-height:0;cursor:crosshair;background:#fff}
.bildkarte img{display:block;width:100%;height:auto}
button.stelle{position:absolute;margin:0;padding:0;min-height:0;min-width:0;border:0;border-radius:0;background:transparent;cursor:crosshair}
button.stelle:hover:not(:disabled){filter:none}
button.stelle.ok{outline:4px solid var(--okInk);outline-offset:-2px;background:rgba(22,76,38,.2)}
button.stelle.bad{outline:4px solid var(--badInk);outline-offset:-2px;background:rgba(122,37,9,.2)}
.kartei{background:#fff;border:2px solid var(--soft);border-radius:14px;padding:28px 20px;min-height:160px;text-align:center}
.kartei.hinten{background:var(--tint)}
.kartenseite{margin:0 0 10px;font-size:14px;letter-spacing:.06em;text-transform:uppercase;color:var(--soft)}
.kartentext{margin:0;font-size:24px;font-weight:600}
.gitter{display:grid;gap:2px;justify-content:center;margin:10px 0 14px}
.gitter .leer{aspect-ratio:1}
.gitter .zelle{position:relative;aspect-ratio:1;background:#fff;border:2px solid var(--soft);border-radius:4px}
.gitter .nr{position:absolute;left:2px;top:0;font-size:11px;line-height:1.3;color:var(--soft);pointer-events:none}
.gitter input{width:100%;height:100%;min-height:0;padding:8px 0 0;border:0;border-radius:2px;text-align:center;text-transform:uppercase;font-weight:600;font-size:20px;background:transparent}
.gitter input.ok{background:var(--okBg);color:var(--okInk)}
.gitter input.bad{background:var(--badBg);color:var(--badInk)}
h3.kopf-klein{font-size:16px;margin:12px 0 4px}
.hinweise{margin:0;padding-left:22px}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
@media (prefers-reduced-motion:no-preference){.karte{animation:ein .25s ease-out}@keyframes ein{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}}
@media print{button,.fortschritt{display:none}}
`;
};

/** The finished html file. */
export function renderUebung(u: Uebung): string {
  if (!u.schritte.length) throw new MaterialError("Es fehlen die Schritte.");
  const json = JSON.stringify(daten(u)).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
  const script = readFileSync(SCRIPT, "utf8");
  return `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(u.titel)}</title>
<!-- Erstellt mit Pult. Enthält die Schrift Fraunces (SIL OFL 1.1). Es wird nichts gespeichert und nichts gesendet. -->
<style>${css(u)}</style></head>
<body><main>
<header class="kopf"><h1>${esc(u.titel)}</h1>${u.untertitel ? `<p>${esc(u.untertitel)}</p>` : ""}</header>
<div id="app"></div>
<p id="ansage" class="sr" aria-live="polite"></p>
<noscript><p>Diese Übung braucht JavaScript. Bitte im Browser einschalten.</p></noscript>
</main>
<script type="application/json" id="daten">${json}</script>
<script>${script}</script>
</body></html>`;
}
