import { Redis } from "@upstash/redis"

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export async function getCache<T>(key: string): Promise<T | null> {
  try { return await redis.get<T>(key) }
  catch (e) { console.error("Redis get error:", e); return null }
}

export async function setCache(key: string, value: unknown, ttl: number) {
  try { await redis.setex(key, ttl, JSON.stringify(value)) }
  catch (e) { console.error("Redis set error:", e) }
}

export async function invalidateCache(...keys: string[]) {
  try { if (keys.length > 0) await redis.del(...keys) }
  catch (e) { console.error("Redis del error:", e) }
}
