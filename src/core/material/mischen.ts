/** Seeded shuffling, so a sheet always looks the same: the PDF, the Word file and the teacher's copy. */
function rng(seed: string): () => number {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  let x = (h >>> 0) || 1;
  return () => (x = (Math.imul(x, 1664525) + 1013904223) >>> 0) / 2 ** 32;
}

/** A permutation of 0..n-1 that moves every element (for n >= 2), the same every time for the same seed. */
export function mischen(n: number, seed: string): number[] {
  const r = rng(seed);
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  if (n >= 2) {
    for (let i = 0; i < n; i++) {
      if (a[i] === i) {
        const j = (i + 1) % n;
        [a[i], a[j]] = [a[j]!, a[i]!];
      }
    }
  }
  return a;
}
