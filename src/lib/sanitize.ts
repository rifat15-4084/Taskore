/**
 * Helpers for cleaning untrusted user-supplied text (public registration is open,
 * so names/emails must be normalized and stripped of markup).
 */

/** Strip control characters and angle brackets (prevents HTML injection in names). */
export function sanitizeName(input: string): string {
  return input
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
}

/** Trim, collapse whitespace and cut to a maximum length. */
export function sanitizeText(input: string, maxLength: number): string {
  return input.replace(/[\u0000-\u001F\u007F]/g, "").trim().slice(0, maxLength);
}

/** Normalize an email: trim + lowercase (Mongoose also lowercases on save). */
export function normalizeEmail(input: string): string {
  return input.trim().toLowerCase();
}
