import { NextRequest } from "next/server"
import { ok, err, rateLimitErr } from "@/lib/api-response"
import { redis } from "@/lib/redis"
import { Ratelimit } from "@upstash/ratelimit"
import { z } from "zod"
import crypto from "crypto"
import * as Sentry from "@sentry/nextjs"

const phoneSchema = z.string().regex(/^0[789][01]\d{8}$/)

export async function POST(req: NextRequest) {
  try {
    // Parse body to retrieve the phone number for rate limiting
    let body
    try {
      body = await req.json()
    } catch {
      return err("Invalid JSON body", 400)
    }

    // Validate phone number format
    const phoneResult = phoneSchema.safeParse(body.phone)
    if (!phoneResult.success) {
      return err("Invalid Nigerian phone number. Must be in format 080xxxxxxxx", 400)
    }
    const phone = phoneResult.data

    // Rate limit: 3 requests per minute per phone number
    const limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(3, "60s"),
      analytics: true,
    })
    const { success, reset } = await limiter.limit(`send-otp:${phone}`)
    if (!success) {
      const resetSeconds = Math.ceil((reset - Date.now()) / 1000)
      return rateLimitErr(resetSeconds)
    }

    // Generate 6-digit OTP
    const otp = String(Math.floor(100000 + Math.random() * 900000))

    // Hash the OTP using SHA-256
    const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex")

    // Store in Redis (10 minutes TTL)
    await redis.setex(`otp:${phone}`, 600, hashedOtp)

    // Call Termii API to send SMS
    const termiiResponse = await fetch(`${process.env.TERMII_BASE_URL}/api/sms/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: process.env.TERMII_API_KEY,
        to: `234${phone.slice(1)}`,
        from: process.env.TERMII_SENDER_ID,
        sms: `Your NaijaPrep code is ${otp}. Valid 10 mins. Do not share.`,
        type: "plain",
        channel: "dnd",
      }),
    })

    if (!termiiResponse.ok) {
      const errorText = await termiiResponse.text()
      console.error("Termii SMS Send error:", errorText)
      return err("Failed to send OTP SMS. Please try again.", 500)
    }

    return ok({ message: "OTP sent successfully" })
  } catch (error) {
    Sentry.captureException(error)
    return err("An unexpected error occurred", 500)
  }
}
