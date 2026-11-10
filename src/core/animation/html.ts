/**
 * Draws an explainer piece (see szene.ts) as ONE html file that runs offline in any browser: slides in html and css
 * (the open kit in assets/baukasten plus Pult's layouts in assets/animation/szenen.css), fonts and anime.js inline.
 * The timeline is planned here once; the page only plays it. `window.seek(ms)` stops and shows any moment, so the same
 * description always gives the same pictures (and a video can be cut from it later). No random values and no clock in the picture.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { grundCss, kontrast, stil as stilMitId, STANDARD_STIL, stilInfo, themeCss, type Schrift } from "./stile.ts";
import { symbolMitId } from "./symbole.ts";
import type { Erklaerstueck, Punkt, Szene, Tempo } from "./szene.ts";

const asset = (pfad: string) => readFileSync(fileURLToPath(new URL(`../../../assets/${pfad}`, import.meta.url)));
const imScript = (code: string) => code.replace(/<\/script/gi, "<\\/script");
const szenenCss = () => asset("animation/szenen.css").toString("utf8");

/** Milliseconds: pause between two parts, how long one fades in, how long a finished scene stays. */
export const TAKT: Record<Tempo, { schritt: number; ein: number; halten: number }> = {
  ruhig: { schritt: 1100, ein: 700, halten: 2400 },
  mittel: { schritt: 800, ein: 600, halten: 1700 },
  zuegig: { schritt: 550, ein: 450, halten: 1100 },
};
const AUS = 500;

type Art = "ein" | "pfeil";
interface Schritt { id: string; at: number; dauer: number; art: Art }
interface Ablauf { szenen: { id: string; start: number; ende: number; schritte: Schritt[] }[]; dauer: number }

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function mix(a: string, b: string, t: number): string {
  const c = (h: string, i: number) => parseInt(h.slice(1 + 2 * i, 3 + 2 * i), 16);
  return "#" + [0, 1, 2].map((i) => Math.round(c(a, i) * (1 - t) + c(b, i) * t).toString(16).padStart(2, "0")).join("");
}

// ---------- one slide per scene ----------

/** A slide and the kinds of its parts in the order they appear. Part j carries the id `<slide id>e<j>`. */
interface Folie { html: string; teile: Art[] }

const sym = (id?: string) => (id ? `<svg class="sym" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${symbolMitId(id)?.d ?? ""}</svg>` : "");
const PFEIL = `<svg viewBox="0 0 72 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" preserveAspectRatio="none" aria-hidden="true"><path class="ar" pathLength="1" d="M2 12H68"/><path class="ah" d="M58 4l10 8-10 8" vector-effect="non-scaling-stroke"/></svg>`;

function folie(s: Szene, id: string, fuss: string): Folie {
  const teile: Art[] = [];
  /** Wraps one part so the timeline can show it. */
  const teil = (inner: string, klasse = "", art: Art = "ein", attr = "") => {
    teile.push(art);
    return `<div id="${id}e${teile.length - 1}" class="t ${klasse}"${attr}>${inner}</div>`;
  };
  const kopf = (mitText = true) =>
    teil(`${s.kicker ? `<p class="kicker">${esc(s.kicker)}</p>` : ""}${s.titel ? `<h2 class="h2">${esc(s.titel)}</h2>` : ""}${mitText && s.text ? `<p class="lede">${esc(s.text)}</p>` : ""}`, "kopf");
  const karte = (p: Punkt, davor = "") => `${davor}${sym(p.symbol)}<h4>${esc(p.titel)}</h4>${p.text ? `<p>${esc(p.text)}</p>` : ""}`;
  const n = s.punkte.length;
  let inhalt: string;
  if (s.layout === "punkte" || s.layout === "schritte") {
    const spalten = n >= 5 ? 3 : n; // five or six cards stand in two rows, so they stay wide enough to read
    const k = kopf(); // first, so the headline appears before the cards
    const karten = s.punkte.map((p, i) => teil(karte(p, s.layout === "schritte" ? `<div class="num">${i + 1}</div>` : ""), "card")).join("");
    inhalt = `${k}<div class="karten${n >= 5 ? " zwei" : ""}" style="--sp:${spalten}">${karten}</div>`;
  } else if (s.layout === "ablauf" || s.layout === "kreislauf") {
    const k = kopf();
    const zellen = s.punkte.map((p, i) => teil(karte(p), "card") + (i < n - 1 ? teil(`${PFEIL}${p.pfeil ? esc(p.pfeil) : ""}`, "pfeil", "pfeil") : "")).join("");
    const letzter = s.punkte[n - 1]!.pfeil;
    const zurueck = s.layout === "kreislauf" ? teil(`<svg viewBox="0 0 18 14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12l7-9 7 9"/></svg>${letzter ? `<span>${esc(letzter)}</span>` : ""}`, "zurueck") : "";
    const spalten = Array.from({ length: n }, () => "minmax(0,1fr)").join(" auto ");
    inhalt = `${k}<div class="fluss n${n}" style="--n:${n};grid-template-columns:${spalten}">${zellen}${zurueck}</div>`;
  } else if (s.layout === "zahl") {
    const z = s.zahl!;
    inhalt = `${teil(esc(z), `gross${z.length > 5 ? " l" : z.length > 3 ? " m" : ""}`)}${kopf()}`;
  } else if (s.layout === "vergleich") {
    inhalt = `${kopf()}<div class="seiten">${s.punkte.map((p) => teil(`<h3>${esc(p.titel)}</h3><ul>${p.liste!.map((z) => `<li>${esc(z)}</li>`).join("")}</ul>`, "card")).join("")}</div>`;
  } else if (s.layout === "zeitstrahl") {
    inhalt = `${kopf()}<div class="zeit${n >= 5 ? " eng" : ""}" style="--sp:${n}">${s.punkte.map((p) => teil(`<div class="jahr">${esc(p.zahl!)}</div><div class="knoten"></div><h4>${esc(p.titel)}</h4>${p.text ? `<p>${esc(p.text)}</p>` : ""}`)).join("")}</div>`;
  } else if (s.layout === "aussage") {
    inhalt = `${kopf()}${s.symbol ? teil(sym(s.symbol), "card bild") : ""}`;
  } else {
    inhalt = `${teil(`${s.kicker ? `<p class="kicker">${esc(s.kicker)}</p>` : ""}<div class="divider-accent"></div><p class="satz${s.text!.length > 90 ? " lang" : ""}">${esc(s.text!)}</p>${s.quelle ? `<p class="quelle">${esc(s.quelle)}</p>` : ""}`)}`;
  }
  return { html: `<section class="slide sz sz-${s.layout}" id="${id}"><div class="inhalt">${inhalt}</div>${fuss}</section>`, teile };
}

function titelFolie(e: Erklaerstueck): Folie {
  const inner = `${e.kopf ? `<p class="kicker">${esc(e.kopf)}</p>` : ""}<h1 class="h1${e.titel.length > 40 ? " lang" : ""}">${esc(e.titel)}</h1><div class="divider-accent"></div>${e.untertitel ? `<p class="lede">${esc(e.untertitel)}</p>` : ""}`;
  return { html: `<section class="slide sz sz-titel" id="s0"><div class="inhalt"><div id="s0e0" class="t">${inner}</div></div></section>`, teile: ["ein"] };
}

const folien = (e: Erklaerstueck): Folie[] => [
  titelFolie(e),
  ...e.szenen.map((s, i) => folie(s, `s${i + 1}`, `<div class="deck-footer"><span>${esc(e.titel)}</span><span>${i + 1} / ${e.szenen.length}</span></div>`)),
];

function planen(alle: Folie[], tempo: Tempo): Ablauf {
  const t = TAKT[tempo];
  const out: Ablauf["szenen"] = [];
  let start = 0;
  alle.forEach((f, i) => {
    let at = start;
    const schritte = f.teile.map((art, j): Schritt => {
      const s = { id: `s${i}e${j}`, at, dauer: art === "pfeil" ? t.ein * 1.6 : t.ein, art };
      at += t.schritt;
      return s;
    });
    const ende = at - t.schritt + t.ein * 1.6 + t.halten + (i < alle.length - 1 ? AUS : 0);
    out.push({ id: `s${i}`, start, ende, schritte });
    start = ende;
  });
  return { szenen: out, dauer: start };
}

// ---------- the look ----------

const SCHRIFT: Record<Schrift, string> = {
  serif: `--font-display:"Fraunces",Georgia,serif;--font-serif:"Fraunces",Georgia,serif;`,
  sans: `--font-display:var(--font-sans);--font-serif:"Fraunces",Georgia,serif;`,
  mono: `--font-mono:ui-monospace,"SF Mono","Cascadia Mono",Consolas,"DejaVu Sans Mono",monospace;--font-display:var(--font-mono);--font-serif:"Fraunces",Georgia,serif;`,
};

/**
 * Pult's own values on top of a theme: the bundled fonts instead of web fonts, and colors that are checked to read:
 * `--zeichen` for arrows, icons and big numbers, `--auf-akzent` for text on the accent color, and a readable kicker.
 */
function eigeneRegeln(id: string, wurzel: string): string {
  const { farben: c, dunkel } = stilInfo(id);
  const css = themeCss(id);
  const zeichen = kontrast(c.accent, c.bg) >= 3 ? "var(--accent)" : "var(--text-1)";
  const aufAkzent = kontrast("#ffffff", c.accent) >= kontrast("#111111", c.accent) ? "#ffffff" : "#111111";
  // A kicker that the theme leaves in a weak accent color (yellow on cream) takes the quiet text color instead.
  const kickerEigen = /\.kicker\{[^}]*(background|accent-2)/.test(css);
  const kicker = !kickerEigen && kontrast(c.accent, c.bg) < 4.5 ? `${wurzel} .kicker{color:var(--text-2)}` : "";
  const schrift = (stilMitId(id) ?? stilMitId(STANDARD_STIL)!).schrift;
  return `${wurzel}{--font-sans:"Source Sans 3",system-ui,-apple-system,"Segoe UI",sans-serif;${SCHRIFT[schrift]}--zeichen:${zeichen};--auf-akzent:${aufAkzent};--knopf:${dunkel ? mix(c.bg, "#ffffff", 0.1) : "#ffffff"}}${kicker}`;
}

const schriftDatei = (name: string, familie: string, gewicht: string, stil = "normal") =>
  `@font-face{font-family:"${familie}";src:url(data:font/ttf;base64,${asset(`fonts/${name}`).toString("base64")}) format("truetype");font-weight:${gewicht};font-style:${stil}}`;

/** The bundled fonts a look needs. Fraunces only where a serif shows. */
function schriften(id: string): string {
  const serif = (stilMitId(id) ?? stilMitId(STANDARD_STIL)!).schrift === "serif";
  return (
    schriftDatei("SourceSans3_400Regular.ttf", "Source Sans 3", "100 500") +
    schriftDatei("SourceSans3_700Bold.ttf", "Source Sans 3", "600 900") +
    (serif ? schriftDatei("Fraunces_400Regular.ttf", "Fraunces", "100 500") + schriftDatei("Fraunces_600SemiBold.ttf", "Fraunces", "600 900") + schriftDatei("Fraunces_400Regular_Italic.ttf", "Fraunces", "100 900", "italic") : "")
  );
}

/** The finished html file. */
export function renderHtml(e: Erklaerstueck): string {
  const alle = folien(e);
  const ablauf = planen(alle, e.tempo);
  const { farben: c } = stilInfo(e.stil);
  const serif = stilMitId(e.stil)?.schrift === "serif";
  const anime = imScript(readFileSync(fileURLToPath(new URL("../../../node_modules/animejs/dist/bundles/anime.umd.min.js", import.meta.url)), "utf8"));
  const mitHintergrund = e.hintergrund !== "keiner";
  const hintergrundFarben = { accent: c.accent, fills: [mix(c.bg, c.accent, 0.2), mix(c.bg, c.ink, 0.12), mix(c.bg, c.accent, 0.35)], ton: c.soft };

  return `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(e.titel)}</title>
<!-- Erstellt mit Pult. Enthält anime.js 4.5.0 (MIT, Julian Garnier), Gestaltungsregeln aus html-ppt (MIT, lewis), Symbole von Tabler Icons (MIT, Paweł Kuna) und die Schrift${serif ? "en Fraunces und" : ""} Source Sans 3 (SIL OFL 1.1). -->
<style>${schriften(e.stil)}
${grundCss()}
${szenenCss()}
${themeCss(e.stil)}
${eigeneRegeln(e.stil, ":root")}</style></head>
<body>
<main id="rahmen"><div class="buehne" id="buehne">
${mitHintergrund ? `<canvas id="hg" width="1280" height="720"></canvas>` : ""}
${alle.map((f) => f.html).join("\n")}
</div></main>
<nav aria-label="Steuerung"><button id="zurueck" type="button">Zurück</button><button id="spiel" type="button">Pause</button><button id="weiter" type="button">Weiter</button></nav>
<script>${anime}</script>
${mitHintergrund ? `<script>${imScript(asset("animation/hintergrund.js").toString("utf8"))}</script>` : ""}
<script>
const PLAN=${JSON.stringify(ablauf)};
const TITEL=${JSON.stringify([e.titel, ...e.szenen.map((s) => s.titel ?? s.text ?? "")]).replace(/</g, "\\u003c")};
const {createTimeline}=anime;
const $=(s,r=document)=>r.querySelector(s);
const reduced=matchMedia("(prefers-reduced-motion: reduce)").matches;
const starts=PLAN.szenen.map(s=>s.start);
const buehne=$("#buehne"),rahmen=$("#rahmen");
// The stage is always 1280 x 720 and is scaled to the window, so every screen shows the same picture.
const passen=()=>buehne.style.setProperty("--k",Math.min(rahmen.clientWidth/1280,rahmen.clientHeight/720));
passen();addEventListener("resize",passen);
// Every slide is fitted once: little content is laid out narrower and shown larger, so the slide is well filled;
// content that is too tall is scaled down as a whole, so nothing is ever cut off.
function einpassen(){document.querySelectorAll(".slide").forEach(s=>{const i=$(".inhalt",s);i.style.transform="";i.style.width="";const cs=getComputedStyle(s);const frei=s.clientHeight-parseFloat(cs.paddingTop)-parseFloat(cs.paddingBottom);const breit=s.clientWidth-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight);let k=1;
if(!s.matches(".sz-titel,.sz-merksatz"))for(const z of [1.3,1.2,1.1]){i.style.width=breit/z+"px";if(i.scrollHeight*z<=frei*.88&&i.scrollWidth<=breit/z+1){k=z;break;}i.style.width="";}
if(k===1)k=Math.min(1,frei/i.scrollHeight,breit/i.scrollWidth);if(k!==1)i.style.transform="scale("+k+")";});}
document.querySelectorAll(".t").forEach(t=>{t.style.opacity=0;});
document.querySelectorAll(".ah").forEach(p=>{p.style.opacity=0;});
let tl=null,idx=0,aktuell=()=>0;
const spiel=$("#spiel");
// The background follows the timeline, not the clock: a paused or sought piece shows the same picture every time.
const HG=${JSON.stringify(mitHintergrund ? e.hintergrund : null)},HF=${JSON.stringify(hintergrundFarben)};
const hgc=HG?$("#hg").getContext("2d"):null;let hgT=-1;
function hgMalen(t){if(!hgc||t===hgT)return;hgT=t;hgc.setTransform(1,0,0,1,0,0);hgc.clearRect(0,0,1280,720);hgc.globalAlpha=1;hgc.lineCap="butt";PULT_HINTERGRUND[HG](hgc,1280,720,t,HF);hgc.globalAlpha=1;}
function zeige(i){
  idx=Math.max(0,Math.min(PLAN.szenen.length-1,i));
  PLAN.szenen.forEach((s,k)=>{const g=$("#"+s.id);g.style.opacity=k===idx?1:0;g.style.zIndex=k===idx?2:0;g.setAttribute("aria-hidden",k===idx?"false":"true");s.schritte.forEach(x=>{const el=$("#"+x.id);el.style.opacity=1;if(x.art==="pfeil"){$(".ar",el).style.strokeDashoffset=0;$(".ah",el).style.opacity=1;}});});
}
if(reduced){
  spiel.hidden=true;zeige(0);hgMalen(0);
  $("#zurueck").onclick=()=>zeige(idx-1);$("#weiter").onclick=()=>zeige(idx+1);
  addEventListener("keydown",e=>{if(e.key==="ArrowRight")zeige(idx+1);if(e.key==="ArrowLeft")zeige(idx-1);});
  window.seek=()=>{};window.dauer=0;aktuell=()=>idx;
}else{
  tl=createTimeline({autoplay:false,defaults:{ease:"outQuad"}});
  PLAN.szenen.forEach((s,k)=>{
    tl.add("#"+s.id,{opacity:[0,1],duration:1},s.start);
    s.schritte.forEach(x=>{
      if(x.art==="pfeil"){
        tl.add("#"+x.id,{opacity:[0,1],duration:300},x.at)
          .add("#"+x.id+" .ar",{strokeDashoffset:[1,0],duration:x.dauer,ease:"inOutSine"},x.at)
          .add("#"+x.id+" .ah",{opacity:[0,1],duration:200},x.at+x.dauer-100);
      }else tl.add("#"+x.id,{opacity:[0,1],translateY:[16,0],duration:x.dauer},x.at);
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
  window.seek=ms=>{if(!tl.paused)pause();tl.seek(ms);hgMalen(Math.round(tl.currentTime)/1000);};aktuell=()=>{if(!tl.paused)pause();return jetzt();};window.dauer=PLAN.dauer;
  tl.seek(0);
  if(hgc){const malen=()=>{hgMalen(Math.round(tl.currentTime)/1000);requestAnimationFrame(malen);};malen();}
}
// Pult's preview asks which scene is showing, so a teacher can leave a note on it. Standing alone, nobody asks.
addEventListener("message",e=>{if(!e.data||e.data.pult!=="szene?"||e.source!==parent)return;const n=aktuell();parent.postMessage({pult:"szene",n,titel:TITEL[n]||""},"*");});
window.ready=document.fonts.ready.then(()=>{einpassen();if(tl&&!new URLSearchParams(location.search).has("still"))$("#spiel").click();return true;});
</script>
</body></html>`;
}

/**
 * One still picture of a sample scene in a look, as inline svg for the screen. The kit's rules are nested under one class,
 * so they cannot touch the page around it; the fonts come from the page. No script inside.
 */
export function vorschauSvg(id: string): string {
  const klasse = `pv-${id}`;
  const beispiel: Szene = {
    layout: "schritte", kicker: "Erdkunde · Klasse 7", titel: "Der Wasserkreislauf in drei Schritten",
    punkte: [
      { titel: "Verdunstung", text: "Wasser steigt als Dampf auf." },
      { titel: "Wolken", text: "Der Dampf kühlt ab." },
      { titel: "Regen", text: "Tropfen fallen zur Erde." },
    ],
  };
  const f = folie(beispiel, `${klasse}-s`, "");
  // `:root` and `body` of the kit mean the preview box here.
  const hier = (css: string) => css.replace(/:root\b/g, "&").replace(/(^|\})\s*(html,)?body\{/g, "$1&{");
  const regeln = `.${klasse}{${hier(grundCss())}${hier(szenenCss().replace(/^html,body\{[^}]*\}\s*body\{[^}]*\}/m, ""))}${hier(themeCss(id))}}${eigeneRegeln(id, `.${klasse}`)}.${klasse}{position:relative;width:1280px;height:720px;overflow:hidden;text-align:left}.${klasse} .slide{opacity:1;zoom:1.3}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" role="img" aria-hidden="true" focusable="false"><foreignObject width="1280" height="720"><div xmlns="http://www.w3.org/1999/xhtml" lang="de" class="${klasse}"><style>${regeln}</style>${f.html.replace(/class="ar"/g, "")}</div></foreignObject></svg>`;
}
