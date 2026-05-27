import { NextRequest } from "next/server"
import { ok, err, rateLimitErr } from "@/lib/api-response"
import { rateLimit } from "@/lib/rate-limit"
import { createClient } from "@/lib/supabase/server"
import * as Sentry from "@sentry/nextjs"

export async function POST(req: NextRequest) {
  try {
    // 1. Every API route MUST check rate limit FIRST (20 requests per minute per IP)
    const { success, reset } = await rateLimit(req, { max: 20, window: 60 })
    if (!success) {
      const resetSeconds = Math.ceil((reset - Date.now()) / 1000)
      return rateLimitErr(resetSeconds)
    }

    // 2. Every API route MUST check authentication SECOND before any business logic
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return err("Unauthorized", 401)
    }

    // 3. Business logic: Sign out
    const { error: signOutError } = await supabase.auth.signOut()
    if (signOutError) {
      console.error("Supabase Auth sign-out error:", signOutError)
      return err("Logout failed", 500)
    }

    return ok({ message: "Logged out successfully" })
  } catch (error) {
    Sentry.captureException(error)
    return err("An unexpected error occurred", 500)
  }
}
