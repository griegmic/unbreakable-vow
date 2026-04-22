/**
 * Phone number normalization — E.164 format
 *
 * RULE: Every write site that accepts a phone number MUST call normalizePhoneE164()
 * before any DB write or Twilio send. No exceptions.
 *
 * Canonical source: IMPLEMENTATION-V6.md §4.10.3
 */

/** Normalize a phone number to E.164 format. Returns null if unrecognizable. */
export function normalizePhoneE164(input: string | null | undefined): string | null {
  if (!input) return null;
  const digits = input.replace(/[^\d+]/g, '');

  // 10 digits: assume US, prepend +1
  if (/^\d{10}$/.test(digits)) return `+1${digits}`;

  // 11 digits starting with 1: prepend +
  if (/^1\d{10}$/.test(digits)) return `+${digits}`;

  // Already E.164-ish: validate length 8-15 digits after +
  if (/^\+\d{8,15}$/.test(digits)) return digits;

  return null; // unrecognized — caller must reject
}

/** Check if a phone number can be normalized to E.164. */
export function isValidPhoneE164(input: string | null | undefined): boolean {
  return normalizePhoneE164(input) !== null;
}

/** Pretty-print for UI display: +14155551234 → "(415) 555-1234" */
export function displayPhone(e164: string | null | undefined): string {
  if (!e164) return '';
  const m = e164.match(/^\+1(\d{3})(\d{3})(\d{4})$/);
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : e164;
}
