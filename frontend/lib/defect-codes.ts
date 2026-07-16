/**
 * Shared helpers for the QC-register defect-code scheme:
 *   A, B, … Z, then Aa, Bb, … Zz, then Aaa, Bbb, … — single letters first, then
 *   the same letter repeated. Codes sort by LENGTH first, then alphabetically
 *   within a length (so every single-letter code precedes any double-letter one).
 */

/** Compare two defect codes in register order: shorter codes first, then
 *  alphabetical within the same length. Empty/missing codes sort last. */
export function compareDefectCodes(a: string, b: string): number {
  const ca = (a || "").trim();
  const cb = (b || "").trim();
  if (!ca && !cb) return 0;
  if (!ca) return 1; // empty sorts last
  if (!cb) return -1;
  if (ca.length !== cb.length) return ca.length - cb.length;
  return ca.localeCompare(cb);
}

/** Ordinal position of a code in the scheme (0-based): A=0 … Z=25, Aa=26 … Zz=51,
 *  Aaa=52 … Derived from the first letter + the code length. Returns -1 for an
 *  empty or non-alphabetic code. */
function codeToOrdinal(code: string): number {
  const c = code.trim();
  if (!c) return -1;
  const letterIndex = c.toUpperCase().charCodeAt(0) - 65; // A..Z -> 0..25
  if (letterIndex < 0 || letterIndex > 25) return -1;
  return (c.length - 1) * 26 + letterIndex;
}

/** Build the code at a given ordinal: 0 -> "A", 25 -> "Z", 26 -> "Aa", 51 -> "Zz",
 *  52 -> "Aaa". */
function ordinalToCode(ordinal: number): string {
  const length = Math.floor(ordinal / 26) + 1;
  const letterIndex = ordinal % 26;
  const upper = String.fromCharCode(65 + letterIndex);
  const lower = String.fromCharCode(97 + letterIndex);
  return upper + lower.repeat(length - 1);
}

/** Given all current codes, return the next unused code in the sequence. Finds
 *  the true max by register order, then increments it. Empty list -> "A". */
export function getNextDefectCode(existingCodes: string[]): string {
  const valid = existingCodes.map((c) => (c || "").trim()).filter(Boolean);
  if (valid.length === 0) return ordinalToCode(0); // "A"
  const max = valid.reduce((m, c) => (compareDefectCodes(c, m) > 0 ? c : m));
  const maxOrdinal = codeToOrdinal(max);
  // A non-standard max (ordinal -1) falls back to starting the sequence.
  return ordinalToCode(maxOrdinal + 1);
}
