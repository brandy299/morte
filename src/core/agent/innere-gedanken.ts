/**
 * Some models write their thinking into the answer text, in English ("The teacher wants …").
 * Teachers must not see that. A text counts as such thinking when it is clearly English and not German.
 */
const ENGLISH = new Set(["the", "and", "that", "this", "is", "are", "was", "to", "of", "it", "i", "but", "so", "with", "for", "they", "should", "can", "not", "what", "which", "now", "let", "me", "my", "their", "teacher", "user", "wants", "will", "would", "have", "has", "be", "do", "does", "if", "or", "an", "in", "on", "as", "at", "from", "about", "just", "also", "then"]);
const GERMAN = new Set(["der", "die", "das", "und", "ist", "sind", "nicht", "ich", "du", "dir", "dich", "mit", "für", "ein", "eine", "einen", "zu", "von", "den", "dem", "es", "auf", "aber", "oder", "wenn", "dann", "kann", "habe", "hast", "wir", "was", "wie", "auch", "noch", "bitte", "hier", "dein", "deine", "im", "am", "als", "wird", "werden", "geht"]);

/** Needs a few words to decide; shorter text is never hidden. */
export const MIN_CHARS_TO_JUDGE = 80;

export function isEnglishThinking(text: string): boolean {
  const words = text.toLowerCase().match(/[a-zäöüß']+/g) ?? [];
  if (words.length < 12) return false;
  let en = 0;
  let de = 0;
  for (const w of words) {
    if (ENGLISH.has(w)) en++;
    else if (GERMAN.has(w)) de++;
  }
  return en >= 4 && en >= de * 3;
}
