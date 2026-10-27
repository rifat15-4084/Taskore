const buckets = new Map<string, { count: number; resetAt: number }>();

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;

export function rateLimit(key: string) {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { success: true, remaining: MAX_ATTEMPTS - 1 };
  }

  bucket.count += 1;
  if (bucket.count > MAX_ATTEMPTS) {
    return { success: false, remaining: 0, retryAfterMs: bucket.resetAt - now };
  }
  return { success: true, remaining: MAX_ATTEMPTS - bucket.count };
}
