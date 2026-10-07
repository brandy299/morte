/** One color per class, the same in the timetable, the class cards and the side menu. */
export const PALETTE_SIZE = 8;

/** Index into the palette (--k0 … --k7). Classes are taken in alphabetical order, so neighbours get different colors. */
export function classColors(names: string[]): Map<string, number> {
  return new Map([...new Set(names)].sort((a, b) => a.localeCompare(b, "de", { numeric: true })).map((name, i) => [name, i % PALETTE_SIZE]));
}

/** CSS variable value for a class, or nothing when it has no color (a lesson without class). */
export const classVar = (colors: Map<string, number>, name?: string): string | undefined => (name !== undefined && colors.has(name) ? `var(--k${colors.get(name)})` : undefined);
