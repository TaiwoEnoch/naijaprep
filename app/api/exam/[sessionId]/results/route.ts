import { NextRequest } from "next/server"
import { ok, err, rateLimitErr } from "@/lib/api-response"
import { rateLimit } from "@/lib/rate-limit"
import { getCache, setCache } from "@/lib/redis"
import { createClient } from "@/lib/supabase/server"
import * as Sentry from "@sentry/nextjs"

export async function GET(req: NextRequest, { params }: { params: { sessionId: string } }) {
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

    const { sessionId } = params

    // 3. Cache check
    const cacheKey = `results:${sessionId}`
    const cachedResults = await getCache<any>(cacheKey)
    if (cachedResults) {
      const data = typeof cachedResults === "string" ? JSON.parse(cachedResults) : cachedResults
      return ok(data)
    }

    // 4. Query database for session
    const { data: session, error: sessionError } = await supabase
      .from("exam_sessions")
      .select("*")
      .eq("id", sessionId)
      .single()

    if (sessionError || !session) {
      return err("Exam session not found", 404)
    }

    // Verify session belongs to the user
    if (session.user_id !== user.id) {
      return err("Unauthorized session results access", 403)
    }

    // Query answers joined with questions (including correct_option and explanation)
    const { data: answers, error: answersError } = await supabase
      .from("exam_answers")
      .select(`
        question_id,
        chosen_option,
        is_correct,
        is_flagged,
        questions (
          id,
          question_text,
          option_a,
          option_b,
          option_c,
          option_d,
          correct_option,
          explanation,
          year,
          image_url
        )
      `)
      .eq("session_id", sessionId)

    if (answersError) {
      console.error("Fetch exam answers error:", answersError)
      return err("Failed to retrieve exam answers", 500)
    }

    const resultData = {
      session,
      answers: answers || [],
    }

    // Cache results for 5 minutes
    await setCache(cacheKey, resultData, 300)

    return ok(resultData)
  } catch (error) {
    Sentry.captureException(error)
    return err("An unexpected error occurred", 500)
  }
}
