/**
 * Lesson plan for one lesson (Stundenverlauf): the model delivers structured content, this file draws one page for the teacher.
 * The look comes from layout.ts, like all material.
 */
import { MaterialError, SANS, SERIF, SOFT, mm, newSheet, printable, str, table } from "./layout.ts";

export interface Phase {
  minuten: number;
  /** e.g. Einstieg, Erarbeitung, Sicherung. */
  phase: string;
  /** What happens, written for the teacher. */
  inhalt: string;
  sozialform?: string;
  material?: string;
}

export interface Verlauf {
  titel: string;
  fach?: string;
  klasse?: string;
  datum?: string;
  /** Length of the lesson in minutes. When given, the phases must add up to it. */
  dauer?: number;
  lernziele: string[];
  /** What the students need to know or have from the lessons before. */
  voraussetzungen?: string;
  phasen: Phase[];
  /** How the lesson helps students who need more support or more challenge. */
  differenzierung?: string;
  /** Typical stumbling blocks and what to watch for. */
  hinweise?: string;
  fuss?: string;
}

export function parseVerlauf(raw: unknown): Verlauf {
  const o = (raw ?? {}) as Record<string, unknown>;
  if (!Array.isArray(o.phasen) || o.phasen.length === 0) throw new MaterialError("Es fehlt: mindestens eine Phase.");
  if (o.phasen.length > 12) throw new MaterialError("Mehr als 12 Phasen sind für eine Stunde zu viele. Fasse sie zusammen.");
  const lernziele = Array.isArray(o.lernziele) ? o.lernziele.map((z, i) => str(z, `Lernziel ${i + 1}`, 300, true)!) : [];
  if (lernziele.length === 0) throw new MaterialError("Es fehlt: mindestens ein Lernziel.");
  if (lernziele.length > 5) throw new MaterialError("Mehr als 5 Lernziele sind für eine Stunde zu viele.");
  const phasen = o.phasen.map((p, i): Phase => {
    const r = (p ?? {}) as Record<string, unknown>;
    const minuten = Number(r.minuten);
    if (!Number.isInteger(minuten) || minuten < 1 || minuten > 180) throw new MaterialError(`Phase ${i + 1}: Die Minuten müssen eine ganze Zahl zwischen 1 und 180 sein.`);
    return {
      minuten,
      phase: str(r.phase, `der Name von Phase ${i + 1}`, 40, true)!,
      inhalt: str(r.inhalt, `der Inhalt von Phase ${i + 1}`, 700, true)!,
      sozialform: str(r.sozialform, `die Sozialform von Phase ${i + 1}`, 40),
      material: str(r.material, `das Material von Phase ${i + 1}`, 120),
    };
  });
  const dauer = o.dauer === undefined ? undefined : Number(o.dauer);
  if (dauer !== undefined && (!Number.isInteger(dauer) || dauer < 5 || dauer > 400)) throw new MaterialError("Die Dauer der Stunde muss in Minuten angegeben sein, zum Beispiel 45 oder 90.");
  const sum = phasen.reduce((n, p) => n + p.minuten, 0);
  if (dauer !== undefined && Math.abs(sum - dauer) > 3) {
    throw new MaterialError(`Die Phasen ergeben ${sum} Minuten, die Stunde dauert aber ${dauer}. Passe die Zeiten an.`);
  }
  return {
    titel: str(o.titel, "das Thema der Stunde", 120, true)!,
    fach: str(o.fach, "das Fach", 60),
    klasse: str(o.klasse, "die Klasse", 60),
    datum: str(o.datum, "das Datum", 30),
    dauer,
    lernziele,
    voraussetzungen: str(o.voraussetzungen, "die Voraussetzungen", 600),
    phasen,
    differenzierung: str(o.differenzierung, "die Differenzierung", 800),
    hinweise: str(o.hinweise, "die Hinweise", 800),
    fuss: str(o.fuss, "der Fußtext", 200),
  };
}

export async function renderVerlauf(v: Verlauf): Promise<{ pdf: Buffer; pages: number }> {
  const sheet = newSheet(v.titel);
  const { doc, left, width } = sheet;
  sheet.header({ kicker: [v.fach, v.klasse, "Stundenverlauf"].filter(Boolean).join(" · "), title: v.titel });

  const sum = v.phasen.reduce((n, p) => n + p.minuten, 0);
  const facts = [v.datum, `${v.dauer ?? sum} Minuten`].filter(Boolean).join("  ·  ");
  doc.font(SANS).fontSize(10.5).fillColor(SOFT).text(printable(facts), left, sheet.y, { width });
  sheet.y += mm(7);

  sheet.box({ title: "Das können die Schülerinnen und Schüler am Ende", text: v.lernziele.map((z) => `– ${z}`).join("\n") });
  if (v.voraussetzungen) sheet.box({ title: "Daran knüpft die Stunde an", text: v.voraussetzungen });

  sheet.paragraph("Ablauf", { font: SERIF, size: 13, gap: mm(2.5) });
  let t = 0;
  const withForm = v.phasen.some((p) => p.sozialform);
  const withMaterial = v.phasen.some((p) => p.material);
  const cols = [
    { title: "Zeit", share: 0.11, bold: true },
    { title: "Phase", share: 0.15 },
    { title: "Was passiert", share: 0 },
    ...(withForm ? [{ title: "Sozialform", share: 0.13 }] : []),
    ...(withMaterial ? [{ title: "Material", share: 0.17 }] : []),
  ];
  cols.find((c) => c.share === 0)!.share = 1 - cols.reduce((n, c) => n + c.share, 0);
  table(
    sheet,
    cols,
    v.phasen.map((p) => {
      const from = t;
      t += p.minuten;
      return [`${from}–${t} min`, p.phase, p.inhalt, ...(withForm ? [p.sozialform ?? ""] : []), ...(withMaterial ? [p.material ?? ""] : [])];
    }),
  );

  if (v.differenzierung) sheet.box({ title: "Differenzierung", text: v.differenzierung });
  if (v.hinweise) sheet.box({ title: "Darauf achten", text: v.hinweise });
  return sheet.finish(v.fuss);
}
