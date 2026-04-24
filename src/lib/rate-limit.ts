// In-memory rate limiter – sliding window, 10 requests per 60 seconds per IP.
//
// NOTE: This in-memory store is per-process. For multi-instance / serverless
// production deployments (e.g. multiple Vercel function instances) replace this
// with Upstash Redis:
//
//   import { Ratelimit } from '@upstash/ratelimit'
//   import { Redis }     from '@upstash/redis'
//
//   const ratelimit = new Ratelimit({
//     redis: Redis.fromEnv(),
//     limiter: Ratelimit.slidingWindow(10, '60 s'),
//   })
//
//   export async function rateLimiter(ip: string): Promise<boolean> {
//     const { success } = await ratelimit.limit(ip)
//     return !success
//   }

interface Entry {
  count: number
  resetAt: number
}

const store = new Map<string, Entry>()

export function rateLimiter(ip: string): boolean {
  const now = Date.now()
  const windowMs = 60_000
  const maxRequests = 10

  const entry = store.get(ip)

  if (!entry || now > entry.resetAt) {
    store.set(ip, { count: 1, resetAt: now + windowMs })
    return false // not limited
  }

  if (entry.count >= maxRequests) {
    return true // limited
  }

  entry.count++
  return false // not limited
}

// Periodically purge expired entries to prevent unbounded memory growth.
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, value] of store.entries()) {
      if (now > value.resetAt) store.delete(key)
    }
  }, 60_000)
}
