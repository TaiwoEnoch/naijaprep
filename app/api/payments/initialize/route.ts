import { NextRequest } from "next/server"
import { ok, err, rateLimitErr } from "@/lib/api-response"
import { rateLimit } from "@/lib/rate-limit"
import { createClient } from "@/lib/supabase/server"
import * as Sentry from "@sentry/nextjs"
import { z } from "zod"

const initializeSchema = z.object({
  plan: z.enum(["student", "school"]),
  billingCycle: z.enum(["monthly", "annual"]).default("monthly"),
})

export async function POST(req: NextRequest) {
  try {
    // 1. Rate limit check first (5 requests per minute per IP)
    const { success, reset } = await rateLimit(req, { max: 5, window: 60 })
    if (!success) {
      const resetSeconds = Math.ceil((reset - Date.now()) / 1000)
      return rateLimitErr(resetSeconds)
    }

    // 2. Authentication check second
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return err("Unauthorized", 401)
    }

    // Validate body
    let body
    try {
      body = await req.json()
    } catch {
      return err("Invalid JSON body", 400)
    }

    const validation = initializeSchema.safeParse(body)
    if (!validation.success) {
      return err("Invalid payload. plan (student/school) and billingCycle (monthly/annual) are required.", 400)
    }
    const { plan, billingCycle } = validation.data

    // Fetch user profile details to get phone
    const { data: userProfile, error: profileError } = await supabase
      .from("users")
      .select("phone")
      .eq("id", user.id)
      .single()

    if (profileError || !userProfile) {
      console.error("User profile fetch error in initialize:", profileError)
      return err("Failed to retrieve user details", 500)
    }

    const phone = userProfile.phone

    // Calculate kobo amount
    let amountKobo = 250000 // Student Monthly: ₦2,500 (250,000 kobo)
    if (plan === "student") {
      amountKobo = billingCycle === "annual" ? 2100000 : 250000 // Student Annual: ₦21,000
    } else if (plan === "school") {
      amountKobo = 2500000 // School Term: ₦25,000 (2,500,000 kobo)
    }

    // Generate unique transaction reference
    const reference = `np_${Date.now()}_${user.id.slice(0, 8)}`

    // Create payment record in DB (status pending)
    const { error: dbError } = await supabase
      .from("payments")
      .insert({
        user_id: user.id,
        amount_kobo: amountKobo,
        reference: reference,
        status: "pending",
      })

    if (dbError) {
      console.error("Create pending payment record error:", dbError)
      return err("Failed to record transaction initialization", 500)
    }

    // Call Paystack API
    const paystackResponse = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: `${phone}@naijaprep.com`,
        amount: amountKobo,
        reference: reference,
        metadata: {
          userId: user.id,
          plan: plan,
          billingCycle: billingCycle,
          userPhone: phone,
        },
        callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/verify`,
      }),
    })

    if (!paystackResponse.ok) {
      const errorText = await paystackResponse.text()
      console.error("Paystack Initialize transaction failed:", errorText)
      return err("Failed to contact payment gateway", 502)
    }

    const paystackData = await paystackResponse.json()
    if (!paystackData.status || !paystackData.data) {
      return err(paystackData.message || "Invalid payment gateway response", 502)
    }

    return ok({
      reference: reference,
      authorizationUrl: paystackData.data.authorization_url,
      amount: amountKobo,
      plan: plan,
    })
  } catch (error) {
    Sentry.captureException(error)
    return err("An unexpected error occurred", 500)
  }
}

export const dynamic = "force-dynamic"
