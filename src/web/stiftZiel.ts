/** Describes an element of the page so the developer can find it in the code. Pure functions over a small node shape, so they can be tested without a browser. */
export interface KnotenLike {
  tag: string;
  id?: string;
  klassen: string[];
  /** Position among siblings with the same tag, starting at 1, and how many there are. */
  typIndex: number;
  typAnzahl: number;
  eltern: KnotenLike | null;
}

const safe = (s: string) => /^[A-Za-z_][\w-]*$/.test(s);

/** A short CSS path, up to `tiefe` levels or the nearest element with an id: `div.rueckmeldung > button.rueck-knopf:nth-of-type(2)`. */
export function selektor(k: KnotenLike, tiefe = 4): string {
  const teile: string[] = [];
  let n: KnotenLike | null = k;
  for (let i = 0; n && i < tiefe; i++, n = n.eltern) {
    const tag = n.tag.toLowerCase();
    if (tag === "body" || tag === "html") break;
    if (n.id && safe(n.id)) {
      teile.unshift(`${tag}#${n.id}`);
      break;
    }
    const klassen = n.klassen.filter(safe).slice(0, 2).map((c) => `.${c}`).join("");
    teile.unshift(`${tag}${klassen}${n.typAnzahl > 1 ? `:nth-of-type(${n.typIndex})` : ""}`);
  }
  return teile.join(" > ");
}

export function ausElement(el: Element): KnotenLike {
  const eltern = el.parentElement;
  const gleiche = eltern ? [...eltern.children].filter((c) => c.tagName === el.tagName) : [el];
  return {
    tag: el.tagName,
    id: el.id || undefined,
    klassen: [...el.classList],
    typIndex: gleiche.indexOf(el) + 1,
    typAnzahl: gleiche.length,
    eltern: eltern && eltern.tagName !== "HTML" ? ausElement(eltern) : null,
  };
}

const kurz = (s: string, max: number) => {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
};

export function beschreibe(el: Element) {
  const h = el as HTMLElement;
  return {
    selektor: selektor(ausElement(el)),
    tag: el.tagName.toLowerCase(),
    text: kurz(h.innerText ?? el.textContent ?? "", 120) || undefined,
    beschriftung: el.getAttribute("aria-label") ?? el.getAttribute("title") ?? el.getAttribute("placeholder") ?? el.getAttribute("alt") ?? undefined,
    rolle: el.getAttribute("role") ?? undefined,
  };
}

/** The headings the teacher can see now, so a note says in which view it was written. */
export function ueberschriften(root: ParentNode = document): string[] {
  return [...root.querySelectorAll("h1, h2")].filter((h) => (h as HTMLElement).offsetParent !== null && !(h as HTMLElement).closest("[data-stift]")).slice(0, 4).map((h) => kurz(h.textContent ?? "", 80)).filter(Boolean);
}
