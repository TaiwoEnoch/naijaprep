import { NextRequest } from "next/server"
import { ok, err, rateLimitErr } from "@/lib/api-response"
import { rateLimit } from "@/lib/rate-limit"
import { getCache, setCache } from "@/lib/redis"
import { createClient } from "@/lib/supabase/server"
import * as Sentry from "@sentry/nextjs"

export async function GET(req: NextRequest) {
  try {
    // 1. Rate limit check first (10 requests per minute per IP)
    const { success, reset } = await rateLimit(req, { max: 10, window: 60 })
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

    // Extract reference parameter
    const { searchParams } = req.nextUrl
    const reference = searchParams.get("reference")
    if (!reference) {
      return err("Missing query parameter: reference", 400)
    }

    // 3. Cache check before database query
    const cacheKey = `user:plan:${user.id}`
    let plan = await getCache<string>(cacheKey)

    if (!plan) {
      // Query database for user plan
      const { data: userProfile, error: profileError } = await supabase
        .from("users")
        .select("plan")
        .eq("id", user.id)
        .single()

      if (profileError || !userProfile) {
        console.error("Profile plan fetch error in verify:", profileError)
        return err("Failed to retrieve user plan state", 500)
      }
      plan = userProfile.plan
      await setCache(cacheKey, plan, 300) // Cache for 5 minutes
    }

    // 4. Contact Paystack Verify transaction endpoint
    const paystackResponse = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      },
    })

    if (!paystackResponse.ok) {
      const errorText = await paystackResponse.text()
      console.error("Paystack verify transaction HTTP error:", errorText)
      return err("Failed to contact payment gateway", 502)
    }

    const paystackData = await paystackResponse.json()
    if (!paystackData.status || !paystackData.data) {
      return err(paystackData.message || "Invalid payment gateway response", 502)
    }

    const transactionStatus = paystackData.data.status

    if (transactionStatus === "success") {
      // Return success, fetching the plan from metadata for instant update consistency
      const planFromMetadata = paystackData.data.metadata?.plan || plan
      return ok({ verified: true, plan: planFromMetadata })
    } else if (transactionStatus === "ongoing" || transactionStatus === "pending") {
      return ok({ verified: false, status: "pending" })
    } else {
      return err("Payment was not successful", 400)
    }
  } catch (error) {
    Sentry.captureException(error)
    return err("An unexpected error occurred", 500)
  }
}

export const dynamic = "force-dynamic"
