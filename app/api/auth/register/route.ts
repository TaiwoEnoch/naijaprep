import { NextRequest } from "next/server"
import { ok, err, rateLimitErr } from "@/lib/api-response"
import { rateLimit } from "@/lib/rate-limit"
import { redis } from "@/lib/redis"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { z } from "zod"
import bcrypt from "bcryptjs"
import * as Sentry from "@sentry/nextjs"

const registerSchema = z.object({
  phone: z.string().regex(/^0[789][01]\d{8}$/),
  firstName: z.string().min(1).max(50),
  lastName: z.string().max(50).optional(),
  pin: z.string().regex(/^\d{4}$/),
  examTypes: z.array(z.string()).default([]),
  targetScore: z.number().int().min(0).max(400).default(280),
})

export async function POST(req: NextRequest) {
  let createdAuthUserId: string | null = null
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

    const validation = registerSchema.safeParse(body)
    if (!validation.success) {
      return err("Invalid registration details. PIN must be 4 digits, phone must be valid.", 400)
    }
    const { phone, firstName, lastName, pin, examTypes, targetScore } = validation.data

    // 3. Business logic: Check phone was OTP-verified in Redis
    const verified = await redis.get<string>(`verified:${phone}`)
    if (verified !== "true") {
      return err("Phone number not verified via OTP. Please verify first.", 400)
    }

    // Hash the 4-digit PIN using bcryptjs
    const pinHash = await bcrypt.hash(pin, 12)

    // Check if user already exists in db
    const { data: existingUser } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("phone", phone)
      .maybeSingle()

    if (existingUser) {
      return err("An account with this phone number already exists.", 400)
    }

    // Create Supabase Auth user (email is phone@naijaprep.com, password is the plain PIN)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: `${phone}@naijaprep.com`,
      email_confirm: true,
      password: pin,
      user_metadata: { role: "student" },
    })

    if (authError || !authData.user) {
      console.error("Supabase Auth user creation error:", authError)
      return err(authError?.message || "Failed to create authentication user", 400)
    }

    createdAuthUserId = authData.user.id

    // Insert user record in public.users table (mapping id from Supabase Auth)
    const { data: userRecord, error: dbError } = await supabaseAdmin
      .from("users")
      .insert({
        id: createdAuthUserId,
        phone,
        first_name: firstName,
        last_name: lastName || null,
        pin_hash: pinHash,
        plan: "free",
        exam_types: examTypes,
        target_score: targetScore,
        role: "student",
      })
      .select()
      .single()

    if (dbError) {
      console.error("Database user insertion error:", dbError)
      // Cleanup: delete Auth user if db insert fails to maintain sync
      await supabaseAdmin.auth.admin.deleteUser(createdAuthUserId)
      return err("Failed to create database record. Cleaned up credentials.", 500)
    }

    // Delete verified flag from Redis to prevent duplicate submissions
    await redis.del(`verified:${phone}`)

    return ok({ user: userRecord, message: "Account created successfully" })
  } catch (error) {
    Sentry.captureException(error)
    // Cleanup if something unexpected happened but auth user was created
    if (createdAuthUserId) {
      await supabaseAdmin.auth.admin.deleteUser(createdAuthUserId).catch(() => {})
    }
    return err("An unexpected error occurred", 500)
  }
}
