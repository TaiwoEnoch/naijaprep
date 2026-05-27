import { NextRequest } from "next/server"
import { ok, err, rateLimitErr } from "@/lib/api-response"
import { rateLimit } from "@/lib/rate-limit"
import { getCache, setCache } from "@/lib/redis"
import { createClient } from "@/lib/supabase/server"
import * as Sentry from "@sentry/nextjs"

export async function GET(req: NextRequest) {
  try {
    // 1. Rate limit check first (60 requests per minute per IP)
    const { success, reset } = await rateLimit(req, { max: 60, window: 60 })
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

    // Parse query options
    const { searchParams } = req.nextUrl
    const scope = searchParams.get("scope") || "national"
    const period = searchParams.get("period") || "all_time"

    if (!["national", "state", "school"].includes(scope)) {
      return err("Invalid scope parameter. Must be national, state, or school.", 400)
    }
    if (!["week", "month", "all_time"].includes(period)) {
      return err("Invalid period parameter. Must be week, month, or all_time.", 400)
    }

    // 3. Cache check
    const cacheKey = `leaderboard:${scope}:${period}:v1`
    const cachedLeaderboard = await getCache<any>(cacheKey)
    if (cachedLeaderboard) {
      const data = typeof cachedLeaderboard === "string" ? JSON.parse(cachedLeaderboard) : cachedLeaderboard
      return ok(data)
    }

    // Fetch user details to filter state or school if scoped
    const { data: currentUserRecord } = await supabase
      .from("users")
      .select("state, school_id")
      .eq("id", user.id)
      .single()

    // 4. Query Top 100 from database
    let query = supabase
      .from("leaderboard_snapshots")
      .select(`
        id,
        score,
        rank,
        period,
        scope,
        state,
        snapshot_at,
        users (
          id,
          first_name,
          last_name,
          avatar_url,
          state,
          schools (
            id,
            name
          )
        )
      `)
      .eq("scope", scope)
      .eq("period", period)
      .order("score", { ascending: false })
      .limit(100)

    if (scope === "state" && currentUserRecord?.state) {
      query = query.eq("state", currentUserRecord.state)
    } else if (scope === "school" && currentUserRecord?.school_id) {
      query = query.eq("school_id", currentUserRecord.school_id)
    }

    const { data: leaderboard, error: dbError } = await query
    if (dbError) {
      console.error("Fetch leaderboard error:", dbError)
      return err("Failed to retrieve leaderboard details", 500)
    }

    // Query user's current rank
    let rankQuery = supabase
      .from("leaderboard_snapshots")
      .select("rank, score")
      .eq("user_id", user.id)
      .eq("scope", scope)
      .eq("period", period)

    if (scope === "state" && currentUserRecord?.state) {
      rankQuery = rankQuery.eq("state", currentUserRecord.state)
    } else if (scope === "school" && currentUserRecord?.school_id) {
      rankQuery = rankQuery.eq("school_id", currentUserRecord.school_id)
    }

    const { data: userRankRecord } = await rankQuery.maybeSingle()

    const resultData = {
      leaderboard: leaderboard || [],
      currentUser: {
        rank: userRankRecord?.rank || null,
        score: userRankRecord?.score || 0,
      },
    }

    // Cache leaderboard output for 5 minutes
    await setCache(cacheKey, resultData, 300)

    return ok(resultData)
  } catch (error) {
    Sentry.captureException(error)
    return err("An unexpected error occurred", 500)
  }
}
