/**
 * Draws an explainer piece (see szene.ts) as ONE html file that runs offline in any browser:
 * an svg stage, fonts and anime.js inline. The timeline is planned here once; the page only plays it.
 * `window.seek(ms)` shows any moment, so the same description always gives the same pictures (and a video can be cut from it later).
 * No random values and no clock in the picture.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { fontFile, SERIF } from "../material/layout.ts";
import { H, stueckSetzen, W, type Box, type Erklaerstueck, type GesetzteSzene, type Palette, type Teil, type Tempo } from "./szene.ts";

export interface Farben { bg: string; ink: string; soft: string; accent: string; fills: [string, string, string]; sonne: string; wolke: string; huegel: string; wasser: string }
export const PALETTE: Record<Palette, Farben> = {
  wasser: { bg: "#f4efe6", ink: "#23201b", soft: "#5a5348", accent: "#2f6f8f", fills: ["#bcd5de", "#cfd8e3", "#a8bf9f"], sonne: "#efb04a", wolke: "#b7c5d6", huegel: "#6f9a73", wasser: "#5f97b4" },
  wiese: { bg: "#f6f1e3", ink: "#23201b", soft: "#5a5348", accent: "#3f6b4a", fills: ["#cfe0b8", "#e8dcb0", "#bcd5de"], sonne: "#e8a93c", wolke: "#c3ced9", huegel: "#7fa56a", wasser: "#6aa3b8" },
  abend: { bg: "#f3ebe4", ink: "#2a1f1c", soft: "#5f5049", accent: "#8a4a2a", fills: ["#e6c9c0", "#d9cfe6", "#f0d9a8"], sonne: "#e58a4a", wolke: "#cbbfdc", huegel: "#8a7a9c", wasser: "#7f93b8" },
};

/** Milliseconds: pause between two elements, how long one fades in, how long a finished scene stays. */
export const TAKT: Record<Tempo, { schritt: number; ein: number; halten: number }> = {
  ruhig: { schritt: 1100, ein: 700, halten: 2400 },
  mittel: { schritt: 800, ein: 600, halten: 1700 },
  zuegig: { schritt: 550, ein: 450, halten: 1100 },
};
const AUS = 500;

interface Schritt { id: string; at: number; dauer: number; art: "ein" | "pfeil" }
interface Ablauf { szenen: { id: string; start: number; ende: number; schritte: Schritt[] }[]; dauer: number }

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const n = (v: number) => Math.round(v * 10) / 10;

/** One frame of the stage per scene; the title picture is scene 0. */
function planen(szenen: GesetzteSzene[], tempo: Tempo): Ablauf {
  const t = TAKT[tempo];
  const out: Ablauf["szenen"] = [];
  let start = 0;
  const alle = [{ id: "s0", n: 1 }, ...szenen.map((s, i) => ({ id: `s${i + 1}`, n: s.elemente.length + (s.titel ? 1 : 0) }))];
  alle.forEach((s, i) => {
    const schritte: Schritt[] = [];
    let at = start;
    if (i === 0) {
      schritte.push({ id: "s0t", at, dauer: t.ein, art: "ein" });
      at += t.schritt;
    } else {
      const sz = szenen[i - 1]!;
      if (sz.titel) (schritte.push({ id: `${s.id}t`, at, dauer: t.ein, art: "ein" }), (at += t.schritt));
      sz.elemente.forEach((e, j) => {
        schritte.push({ id: `${s.id}e${j}`, at, dauer: e.teil.k === "pfeil" ? t.ein * 1.6 : t.ein, art: e.teil.k === "pfeil" ? "pfeil" : "ein" });
        at += t.schritt;
      });
    }
    const ende = at - t.schritt + t.ein * 1.6 + t.halten + (i < alle.length - 1 ? AUS : 0);
    out.push({ id: s.id, start, ende, schritte });
    start = ende;
  });
  return { szenen: out, dauer: start };
}

const textSvg = (zeilen: string[], cx: number, top: number, size: number, fill: string, lead = 1.28) =>
  zeilen.map((z, i) => `<text x="${n(cx)}" y="${n(top + i * size * lead + size * 0.95)}" font-size="${size}" fill="${fill}" text-anchor="middle">${esc(z)}</text>`).join("");

function formSvg(form: string, b: Box, c: Farben): string {
  const sx = b.w / 180;
  const sy = b.h / 120;
  const g = (inner: string) => `<g transform="translate(${n(b.x)} ${n(b.y)}) scale(${n(sx)} ${n(sy)})"><g filter="url(#wc)">${inner}</g></g>`;
  if (form === "sonne") return g(`<circle cx="90" cy="60" r="46" fill="${c.sonne}"/>`);
  if (form === "wolke") return g(`<ellipse cx="90" cy="58" rx="62" ry="30" fill="${c.wolke}"/><ellipse cx="58" cy="70" rx="44" ry="26" fill="${c.wolke}" opacity=".85"/><ellipse cx="122" cy="72" rx="40" ry="24" fill="${c.wolke}" opacity=".85"/>`);
  if (form === "huegel") return g(`<path d="M0 118 C 30 40 80 20 120 58 C 145 80 165 96 180 118 Z" fill="${c.huegel}"/>`);
  return g(`<ellipse cx="90" cy="70" rx="86" ry="34" fill="${c.wasser}"/>`);
}

function teilSvg(t: Teil, nr: number, c: Farben): string {
  if (t.k === "text") return textSvg(t.zeilen, t.x + t.w / 2, t.y, t.groesse, c.ink);
  if (t.k === "kasten") {
    const hoehe = t.zeilen.length * t.groesse * 1.28;
    return `<g filter="url(#wc)"><rect x="${n(t.x)}" y="${n(t.y)}" width="${n(t.w)}" height="${n(t.h)}" rx="14" fill="${c.fills[nr % 3]}"/></g>${textSvg(t.zeilen, t.x + t.w / 2, t.y + (t.h - hoehe) / 2, t.groesse, c.ink)}`;
  }
  if (t.k === "zahl") {
    const z = `<text x="${n(t.x + t.w / 2)}" y="${n(t.y + t.groesse * 0.98)}" font-size="${t.groesse}" fill="${c.accent}" text-anchor="middle">${esc(t.zahl)}</text>`;
    return z + textSvg(t.zeilen, t.x + t.w / 2, t.y + t.groesse * 1.28, 26, c.ink);
  }
  if (t.k === "form") return formSvg(t.form, t, c);
  const [x0, y0] = t.von;
  const [x1, y1] = t.nach;
  const a = Math.atan2(y1 - y0, x1 - x0);
  const head = (da: number) => `${n(x1 - 18 * Math.cos(a + da))} ${n(y1 - 18 * Math.sin(a + da))}`;
  const e = t.etikett;
  return (
    `<g filter="url(#line)" fill="none" stroke="${c.accent}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">` +
    `<path class="ar" pathLength="1" d="M${n(x0)} ${n(y0)} L${n(x1)} ${n(y1)}"/><path class="ah" d="M${head(-0.45)} L${n(x1)} ${n(y1)} L${head(0.45)}"/></g>` +
    (e ? `<g class="al"><rect x="${n(e.x)}" y="${n(e.y)}" width="${n(e.w)}" height="${n(e.h)}" rx="8" fill="${c.bg}" opacity=".92"/>${textSvg(e.zeilen, e.x + e.w / 2, e.y + 3, 24, c.ink)}</g>` : "")
  );
}

const css = (c: Farben, fraunces: string) => `
@font-face{font-family:"Fraunces";src:url(data:font/ttf;base64,${fraunces}) format("truetype");font-weight:600}
*{box-sizing:border-box}
html,body{margin:0;height:100%;background:${c.bg};color:${c.ink}}
body{display:flex;flex-direction:column;font-family:"Fraunces",Georgia,serif}
svg{display:block;flex:1;min-height:0;width:100%}
text{font-family:"Fraunces",Georgia,serif;font-weight:600}
.g{transform-box:fill-box;transform-origin:center}
nav{display:flex;gap:10px;justify-content:center;padding:10px 16px;background:${c.bg}}
button{font:600 18px "Fraunces",Georgia,serif;color:${c.ink};background:#fffaf0;border:2px solid ${c.soft};border-radius:10px;padding:8px 18px;cursor:pointer;min-height:44px}
button:hover{background:#fff}
button:focus-visible{outline:3px solid ${c.accent};outline-offset:2px}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
`;

/** The finished html file. */
export function renderHtml(e: Erklaerstueck): string {
  const c = PALETTE[e.palette];
  const szenen = stueckSetzen(e);
  const ablauf = planen(szenen, e.tempo);
  const fraunces = readFileSync(fontFile(SERIF)).toString("base64");
  const anime = readFileSync(fileURLToPath(new URL("../../../node_modules/animejs/dist/bundles/anime.umd.min.js", import.meta.url)), "utf8").replace(/<\/script/gi, "<\\/script");

  const titelBild = `<g id="s0" class="sc" opacity="0"><g id="s0t" opacity="0">${textSvg([e.titel], W / 2, H / 2 - 70, 70, c.ink)}${e.untertitel ? textSvg([e.untertitel], W / 2, H / 2 + 40, 34, c.soft) : ""}<rect x="${W / 2 - 80}" y="${H / 2 + 14}" width="160" height="6" rx="3" fill="${c.accent}"/></g></g>`;
  const bilder = szenen.map((s, i) => {
    const id = `s${i + 1}`;
    const titel = s.titel ? `<g id="${id}t" opacity="0">${textSvg(s.titel.zeilen, W / 2, s.titel.y, s.titel.groesse, c.ink)}</g>` : "";
    const teile = s.elemente.map((el, j) => `<g id="${id}e${j}" opacity="0">${teilSvg(el.teil, j, c)}</g>`).join("");
    return `<g id="${id}" class="sc" opacity="0">${titel}${teile}</g>`;
  });
  const lesetext = [e.titel, e.untertitel, ...e.szenen.flatMap((s) => [s.titel, ...s.elemente.map((x) => [x.text, x.zahl].filter(Boolean).join(": ") || undefined)])]
    .filter(Boolean)
    .map((t) => `<li>${esc(t!)}</li>`)
    .join("");

  const defs = `<defs>
<filter id="wc" x="-15%" y="-15%" width="130%" height="130%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="3" seed="4" result="warp"/><feDisplacementMap in="SourceGraphic" in2="warp" scale="14" xChannelSelector="R" yChannelSelector="G" result="d"/><feGaussianBlur in="d" stdDeviation="1.1" result="soft"/><feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="11" result="mott"/><feColorMatrix in="mott" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1.5 -0.18" result="mottA"/><feComposite in="soft" in2="mottA" operator="in" result="body"/><feMorphology in="soft" operator="erode" radius="3" result="core"/><feGaussianBlur in="core" stdDeviation="6" result="coreB"/><feComposite in="soft" in2="coreB" operator="out" result="rim"/><feMerge><feMergeNode in="body"/><feMergeNode in="rim"/></feMerge></filter>
<filter id="line" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="2" result="w"/><feDisplacementMap in="SourceGraphic" in2="w" scale="5" xChannelSelector="R" yChannelSelector="G"/></filter>
<filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7"/><feColorMatrix type="matrix" values="0 0 0 0 0.35  0 0 0 0 0.3  0 0 0 0 0.22  0 0 0 0.55 -0.12"/></filter>
</defs>`;

  return `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(e.titel)}</title>
<!-- Erstellt mit Pult. Enthält anime.js 4.5.0 (MIT, Julian Garnier) und die Schrift Fraunces (SIL OFL 1.1). -->
<style>${css(c, fraunces)}</style></head>
<body>
<svg id="stage" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(e.titel)}" preserveAspectRatio="xMidYMid meet">
${defs}
<rect width="${W}" height="${H}" fill="${c.bg}"/>
${titelBild}
${bilder.join("\n")}
<rect width="${W}" height="${H}" filter="url(#grain)" style="mix-blend-mode:multiply" opacity=".45" pointer-events="none"/>
</svg>
<nav aria-label="Steuerung"><button id="zurueck" type="button">Zurück</button><button id="spiel" type="button">Pause</button><button id="weiter" type="button">Weiter</button></nav>
<ul class="sr">${lesetext}</ul>
<script>${anime}</script>
<script>
const PLAN=${JSON.stringify(ablauf)};
const TITEL=${JSON.stringify([e.titel, ...e.szenen.map((s) => s.titel ?? "")]).replace(/</g, "\\u003c")};
const {createTimeline}=anime;
const $=(s,r=document)=>r.querySelector(s);
const reduced=matchMedia("(prefers-reduced-motion: reduce)").matches;
const starts=PLAN.szenen.map(s=>s.start);
const sicht=(el,v)=>{el.style.opacity=v;};
document.querySelectorAll(".ar").forEach(p=>{p.style.strokeDasharray="1";p.style.strokeDashoffset="1";});
document.querySelectorAll(".ah,.al").forEach(p=>sicht(p,0));
let tl=null,idx=0,aktuell=()=>0;
const spiel=$("#spiel");
function zeige(i){
  idx=Math.max(0,Math.min(PLAN.szenen.length-1,i));
  PLAN.szenen.forEach((s,k)=>{const g=$("#"+s.id);g.style.display=k===idx?"":"none";sicht(g,k===idx?1:0);s.schritte.forEach(x=>{const e=$("#"+x.id);sicht(e,1);if(x.art==="pfeil"){const g2=$(".ar",e);g2.style.strokeDashoffset=0;e.querySelectorAll(".ah,.al").forEach(q=>sicht(q,1));}});});
}
if(reduced){
  spiel.hidden=true;zeige(0);
  $("#zurueck").onclick=()=>zeige(idx-1);$("#weiter").onclick=()=>zeige(idx+1);
  addEventListener("keydown",e=>{if(e.key==="ArrowRight")zeige(idx+1);if(e.key==="ArrowLeft")zeige(idx-1);});
  window.seek=()=>{};window.dauer=0;aktuell=()=>idx;
}else{
  tl=createTimeline({autoplay:false,defaults:{ease:"outQuad"}});
  PLAN.szenen.forEach((s,k)=>{
    tl.add("#"+s.id,{opacity:[0,1],duration:1},s.start);
    s.schritte.forEach(x=>{
      if(x.art==="pfeil"){
        tl.add("#"+x.id,{opacity:[0,1],duration:1},x.at)
          .add("#"+x.id+" .ar",{strokeDashoffset:[1,0],duration:x.dauer,ease:"inOutSine"},x.at)
          .add("#"+x.id+" .ah",{opacity:[0,1],duration:200},x.at+x.dauer-100)
          .add("#"+x.id+" .al",{opacity:[0,1],duration:300},x.at+x.dauer*.4);
      }else tl.add("#"+x.id,{opacity:[0,1],translateY:[14,0],duration:x.dauer},x.at);
    });
    if(k<PLAN.szenen.length-1)tl.add("#"+s.id,{opacity:[1,0],duration:${AUS}},s.ende-${AUS});
  });
  const zu=i=>{idx=Math.max(0,Math.min(starts.length-1,i));tl.seek(starts[idx]+1);};
  const spielen=()=>{if(tl.currentTime>=PLAN.dauer-1)tl.seek(0);tl.play();spiel.textContent="Pause";};
  const pause=()=>{tl.pause();spiel.textContent="Weiter spielen";};
  const jetzt=()=>{let k=0;starts.forEach((s,i)=>{if(tl.currentTime>=s)k=i;});return k;};
  spiel.onclick=()=>tl.paused?spielen():pause();
  $("#zurueck").onclick=()=>{const k=jetzt();zu(tl.currentTime-starts[k]>1500?k:k-1);};
  $("#weiter").onclick=()=>zu(jetzt()+1);
  addEventListener("keydown",e=>{if(e.key===" "&&e.target.tagName!=="BUTTON"){e.preventDefault();spiel.click();}if(e.key==="ArrowRight")$("#weiter").click();if(e.key==="ArrowLeft")$("#zurueck").click();});
  window.seek=ms=>{tl.seek(ms);};aktuell=()=>{if(!tl.paused)pause();return jetzt();};window.dauer=PLAN.dauer;
  tl.seek(0);
  document.fonts.ready.then(()=>{if(!new URLSearchParams(location.search).has("still"))spielen();});
}
// Pult's preview asks which scene is showing, so a teacher can leave a note on it. Standing alone, nobody asks.
addEventListener("message",e=>{if(!e.data||e.data.pult!=="szene?"||e.source!==parent)return;const n=aktuell();parent.postMessage({pult:"szene",n,titel:TITEL[n]||""},"*");});
window.ready=document.fonts.ready.then(()=>true);
</script>
</body></html>`;
}
