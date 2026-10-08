interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitRecord>();

/**
 * Basic in-memory rate limiter.
 * @param key Unique key (e.g. IP or IP:phone)
 * @param maxRequests Maximum requests allowed within windowMs
 * @param windowMs Time window in milliseconds (default 60000ms / 1 min)
 */
export function checkRateLimit(
  key: string,
  maxRequests = 20,
  windowMs = 60000
): { isRateLimited: boolean; remaining: number } {
  const now = Date.now();

  // Periodically clean expired records to prevent unbounded memory growth
  if (rateLimitMap.size > 5000) {
    rateLimitMap.forEach((v, k) => {
      if (v.resetAt < now) {
        rateLimitMap.delete(k);
      }
    });
  }

  const record = rateLimitMap.get(key);

  if (!record || record.resetAt < now) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return { isRateLimited: false, remaining: maxRequests - 1 };
  }

  if (record.count >= maxRequests) {
    return { isRateLimited: true, remaining: 0 };
  }

  record.count += 1;
  return { isRateLimited: false, remaining: maxRequests - record.count };
}
