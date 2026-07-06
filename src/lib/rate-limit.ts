/**
 * In-memory sliding-window rate limiter for local/single-instance dev.
 * Swap for a Redis-backed limiter (e.g. Upstash) before scaling past one Node process.
 */
type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt < now) buckets.delete(key);
  }
}, 60_000).unref?.();

export function rateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number }
): { success: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt < now) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { success: true, remaining: limit - 1, resetAt };
  }

  if (existing.count >= limit) {
    return { success: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  return { success: true, remaining: limit - existing.count, resetAt: existing.resetAt };
}

export const RATE_LIMITS = {
  message: { limit: 20, windowMs: 10_000 },
  auth: { limit: 10, windowMs: 60_000 },
  upload: { limit: 15, windowMs: 60_000 },
  api: { limit: 60, windowMs: 60_000 },
} as const;
