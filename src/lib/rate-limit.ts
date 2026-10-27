const buckets = new Map<string, { count: number; resetAt: number }>();

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;

export interface RateLimitOptions {
  windowMs?: number;
  max?: number;
}

/**
 * Fixed-window in-memory rate limiter.
 * Defaults to 10 attempts / 15 minutes (used by login).
 * Pass custom options for stricter limits (e.g. registration: 5 / hour).
 */
export function rateLimit(key: string, options?: RateLimitOptions) {
  const windowMs = options?.windowMs ?? WINDOW_MS;
  const max = options?.max ?? MAX_ATTEMPTS;
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: max - 1 };
  }

  bucket.count += 1;
  if (bucket.count > max) {
    return { success: false, remaining: 0, retryAfterMs: bucket.resetAt - now };
  }
  return { success: true, remaining: max - bucket.count };
}
