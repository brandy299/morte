/** One color per class, the same in the timetable, the class cards and the side menu. */
export const PALETTE_SIZE = 8;

/** Index into the palette (--k0 … --k7). Classes are taken in alphabetical order, so neighbours get different colors. */
export function classColors(classes: { name: string; farbe?: number }[]): Map<string, number> {
  const sorted = [...new Map(classes.map((k) => [k.name, k])).values()].sort((a, b) => a.name.localeCompare(b.name, "de", { numeric: true }));
  // A color the teacher chose wins over the automatic one.
  return new Map(sorted.map((k, i) => [k.name, k.farbe !== undefined && k.farbe >= 0 && k.farbe < PALETTE_SIZE ? k.farbe : i % PALETTE_SIZE]));
}

/** CSS variable value for a class, or nothing when it has no color (a lesson without class). */
export const classVar = (colors: Map<string, number>, name?: string): string | undefined => (name !== undefined && colors.has(name) ? `var(--k${colors.get(name)})` : undefined);
