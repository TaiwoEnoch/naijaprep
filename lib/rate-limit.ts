import { Ratelimit } from "@upstash/ratelimit"
import { redis } from "./redis"
import { NextRequest } from "next/server"

export async function rateLimit(
  req: NextRequest,
  options: { max?: number; window?: number } = {}
) {
  const { max = 60, window = 60 } = options
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? req.headers.get("x-real-ip") ?? "127.0.0.1"
  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(max, `${window}s`),
    analytics: true,
  })
  return limiter.limit(`${req.nextUrl.pathname}:${ip}`)
}
