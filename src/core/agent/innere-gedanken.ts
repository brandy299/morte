/**
 * Some models write their thinking into the answer text, in English ("The teacher wants …").
 * Teachers must not see that. A text counts as such thinking when it is clearly English and not German.
 */
const ENGLISH = new Set(["the", "and", "that", "this", "is", "are", "was", "to", "of", "it", "i", "but", "so", "with", "for", "they", "should", "can", "not", "what", "which", "now", "let", "me", "my", "their", "teacher", "user", "wants", "will", "would", "have", "has", "be", "do", "does", "if", "or", "an", "in", "on", "as", "at", "from", "about", "just", "also", "then"]);
const GERMAN = new Set(["der", "die", "das", "und", "ist", "sind", "nicht", "ich", "du", "dir", "dich", "mit", "für", "ein", "eine", "einen", "zu", "von", "den", "dem", "es", "auf", "aber", "oder", "wenn", "dann", "kann", "habe", "hast", "wir", "was", "wie", "auch", "noch", "bitte", "hier", "dein", "deine", "im", "am", "als", "wird", "werden", "geht"]);

/** Needs a few words to decide; shorter text is never hidden. */
export const MIN_CHARS_TO_JUDGE = 80;

const count = (text: string) => {
  const words = text.toLowerCase().match(/[a-zäöüß']+/g) ?? [];
  let en = 0;
  let de = 0;
  for (const w of words) {
    if (ENGLISH.has(w)) en++;
    else if (GERMAN.has(w)) de++;
  }
  return { words: words.length, en, de };
};

export function isEnglishThinking(text: string): boolean {
  const { words, en, de } = count(text);
  return words >= 12 && en >= 4 && en >= de * 3;
}

/**
 * Whether the teacher writes in English (an English class, say). Then English answers are wanted and nothing is hidden.
 * Meant to be generous, so short messages count too.
 */
export function writesEnglish(text: string): boolean {
  const { en, de } = count(text);
  return en >= 2 && en > de;
}
