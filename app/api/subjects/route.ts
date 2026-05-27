import { NextRequest } from "next/server"
import { ok, err, rateLimitErr } from "@/lib/api-response"
import { rateLimit } from "@/lib/rate-limit"
import { getCache, setCache } from "@/lib/redis"
import { createClient } from "@/lib/supabase/server"
import * as Sentry from "@sentry/nextjs"

export async function GET(req: NextRequest) {
  try {
    // 1. Rate limit check first
    const { success, reset } = await rateLimit(req, { max: 120, window: 60 })
    if (!success) {
      const resetSeconds = Math.ceil((reset - Date.now()) / 1000)
      return rateLimitErr(resetSeconds)
    }

    // 2. Authentication check second
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    console.log("[DEBUG SUBJECTS] Auth result:", { user, authError })
    if (authError || !user) {
      return err("Unauthorized", 401)
    }

    // 3. Cache check before database query
    const cacheKey = "subjects:v1"
    const cachedData = await getCache<any[]>(cacheKey)
    if (cachedData) {
      const data = typeof cachedData === "string" ? JSON.parse(cachedData) : cachedData
      return ok(data)
    }

    // 4. Query database for active subjects
    const { data: subjects, error: dbError } = await supabase
      .from("subjects")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })

    if (dbError) {
      console.error("Fetch subjects error:", dbError)
      return err("Failed to retrieve subjects", 500)
    }

    // 5. Populate Redis cache
    await setCache(cacheKey, subjects, 86400)

    return ok(subjects)
  } catch (error) {
    Sentry.captureException(error)
    return err("An unexpected error occurred", 500)
  }
}
