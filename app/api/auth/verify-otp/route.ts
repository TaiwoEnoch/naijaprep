import { NextRequest } from "next/server"
import { ok, err, rateLimitErr } from "@/lib/api-response"
import { rateLimit } from "@/lib/rate-limit"
import { redis } from "@/lib/redis"
import { z } from "zod"
import crypto from "crypto"
import * as Sentry from "@sentry/nextjs"

const verifySchema = z.object({
  phone: z.string().regex(/^0[789][01]\d{8}$/),
  otp: z.string().length(6),
})

export async function POST(req: NextRequest) {
  try {
    // 1. Rate limit check first (5 requests per minute per IP)
    const { success, reset } = await rateLimit(req, { max: 5, window: 60 })
    if (!success) {
      const resetSeconds = Math.ceil((reset - Date.now()) / 1000)
      return rateLimitErr(resetSeconds)
    }

    // 2. Validate request body with Zod
    let body
    try {
      body = await req.json()
    } catch {
      return err("Invalid JSON body", 400)
    }

    const validation = verifySchema.safeParse(body)
    if (!validation.success) {
      return err("Invalid request body. Phone number and 6-digit OTP are required.", 400)
    }
    const { phone, otp } = validation.data

    // 3. Business logic: retrieve stored hash
    const storedHash = await redis.get<string>(`otp:${phone}`)
    if (!storedHash) {
      return err("Invalid or expired code", 400)
    }

    // Hash the provided OTP and compare
    const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex")
    if (hashedOtp !== storedHash) {
      return err("Invalid or expired code", 400)
    }

    // Delete the OTP from Redis
    await redis.del(`otp:${phone}`)

    // Store verified flag in Redis (15 mins TTL) for register route
    await redis.setex(`verified:${phone}`, 900, "true")

    return ok({ verified: true, phone })
  } catch (error) {
    Sentry.captureException(error)
    return err("An unexpected error occurred", 500)
  }
}
