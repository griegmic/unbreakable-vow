export const VAGUE_VERBS = ['try', 'hope', 'want', 'attempt', 'work on', 'think about'];
export const VAGUE_ADJECTIVES = ['better', 'more', 'less', 'healthier', 'productive'];
export const VAGUE_NOUNS = ['things', 'stuff', 'something'];

/**
 * Check if vow text contains a numeric quantifier (e.g. "3 times", "10k steps", "30 minutes").
 */
function hasNumericQuantifier(text: string): boolean {
  return /\d+\s*(?:x|times?|k|minutes?|mins?|hours?|hrs?|days?|pages?|miles?|reps?|sets?|steps)/i.test(text);
}

/**
 * Determines if vow text is vague — lacks specificity, measurability, or concrete action.
 * Supplements (does not replace) analyzeVow in vow-logic.ts.
 */
export function isVague(text: string): boolean {
  const lower = text.toLowerCase().trim();

  // If it has a numeric quantifier, it's probably specific enough
  if (hasNumericQuantifier(lower)) return false;

  // Check for vague verbs at the start
  const startsWithVague = VAGUE_VERBS.some((verb) => {
    const pattern = new RegExp(`^(?:i\\s+(?:will\\s+)?)?${verb.replace(/\s+/g, '\\s+')}\\b`, 'i');
    return pattern.test(lower);
  });

  if (startsWithVague) return true;

  // Check for vague adjectives without quantifiers
  const hasVagueAdj = VAGUE_ADJECTIVES.some((adj) => lower.includes(adj));
  if (hasVagueAdj && !hasNumericQuantifier(lower)) return true;

  // Check for vague nouns
  const hasVagueNoun = VAGUE_NOUNS.some((noun) => {
    const pattern = new RegExp(`\\b${noun}\\b`, 'i');
    return pattern.test(lower);
  });

  if (hasVagueNoun) return true;

  return false;
}
