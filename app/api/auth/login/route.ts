import { NextRequest } from "next/server"
import { ok, err, rateLimitErr } from "@/lib/api-response"
import { rateLimit } from "@/lib/rate-limit"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { z } from "zod"
import bcrypt from "bcryptjs"
import * as Sentry from "@sentry/nextjs"

const loginSchema = z.object({
  phone: z.string().regex(/^0[789][01]\d{8}$/),
  pin: z.string().regex(/^\d{4}$/),
})

export async function POST(req: NextRequest) {
  try {
    // 1. Rate limit check first (10 requests per minute per IP)
    const { success, reset } = await rateLimit(req, { max: 10, window: 60 })
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

    const validation = loginSchema.safeParse(body)
    if (!validation.success) {
      return err("Incorrect phone number or PIN", 401)
    }
    const { phone, pin } = validation.data

    // 3. Business logic: Look up user by phone
    const { data: userRecord, error: dbError } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("phone", phone)
      .maybeSingle()

    if (dbError || !userRecord) {
      return err("Incorrect phone number or PIN", 401)
    }

    // Compare PIN with stored bcrypt hash
    const isPinValid = await bcrypt.compare(pin, userRecord.pin_hash)
    if (!isPinValid) {
      return err("Incorrect phone number or PIN", 401)
    }

    // Create Supabase session using plain PIN as Auth password
    const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
      email: `${phone}@naijaprep.com`,
      password: pin,
    })

    if (authError || !authData.session) {
      console.error("Supabase Auth session sign-in error:", authError)
      return err("Incorrect phone number or PIN", 401)
    }

    return ok({
      user: userRecord,
      session: authData.session,
      accessToken: authData.session.access_token,
    })
  } catch (error) {
    Sentry.captureException(error)
    return err("An unexpected error occurred", 500)
  }
}
