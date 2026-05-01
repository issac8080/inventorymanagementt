/**
 * Normalize mobile for Firestore: digits only, max 15 (E.164-style without +).
 * Strips spaces, dashes, +91 prefixes, etc.
 */
export function normalizeMobileDigits(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, 15);
}

export function isValidMobileLength(digits: string): boolean {
  return digits.length >= 10 && digits.length <= 15;
}
