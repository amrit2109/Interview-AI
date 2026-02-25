/**
 * Deterministic English-only validation for interview transcripts.
 * Used by client (on final transcript) and server (on submit).
 */

const MIN_LENGTH_FOR_DETECTION = 15;
const NON_ENGLISH_REASON = "Please answer in English only.";

/** Non-Latin scripts that indicate non-English. */
const NON_LATIN_SCRIPTS = [
  /[\u0400-\u04FF]/, // Cyrillic
  /[\u0900-\u097F]/, // Devanagari
  /[\u0600-\u06FF]/, // Arabic
  /[\u4E00-\u9FFF]/, // CJK
  /[\u0E00-\u0E7F]/, // Thai
  /[\uAC00-\uD7AF]/, // Hangul
];

export interface EnglishCheckResult {
  isEnglish: boolean;
  reason?: string;
}

/**
 * Returns true only if the text appears to be English.
 * Short text (< MIN_LENGTH_FOR_DETECTION chars) is accepted (cannot reliably detect).
 * Rejects text containing non-Latin scripts (Cyrillic, Devanagari, Arabic, CJK, Thai, Hangul).
 */
export function isEnglish(text: string): EnglishCheckResult {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length < MIN_LENGTH_FOR_DETECTION) {
    return { isEnglish: true };
  }
  for (const re of NON_LATIN_SCRIPTS) {
    if (re.test(trimmed)) {
      return { isEnglish: false, reason: NON_ENGLISH_REASON };
    }
  }
  return { isEnglish: true };
}
