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

    // 3. Cache check
    const cacheKey = `stats:${user.id}:v1`
    const cachedStats = await getCache<any>(cacheKey)
    if (cachedStats) {
      const data = typeof cachedStats === "string" ? JSON.parse(cachedStats) : cachedStats
      return ok(data)
    }

    // 4. Query database for user profile values
    const { data: userCore } = await supabase
      .from("users")
      .select("predicted_score, readiness_pct, streak_count")
      .eq("id", user.id)
      .single()

    // Query exam session statistics
    const { data: completedSessions } = await supabase
      .from("exam_sessions")
      .select("score_pct")
      .eq("user_id", user.id)
      .eq("status", "completed")

    const totalExams = completedSessions?.length || 0
    const avgScorePct = totalExams > 0
      ? Math.round(completedSessions!.reduce((acc, curr) => acc + (curr.score_pct || 0), 0) / totalExams)
      : 0

    // Query subject average scores
    const { data: userSubjects } = await supabase
      .from("user_subjects")
      .select("avg_score, exam_type, subject_id")
      .eq("user_id", user.id)

    // Query progress statistics for weak topics (correct_count / total_count < 60%)
    const { data: progressData } = await supabase
      .from("user_progress")
      .select(`
        correct_count,
        total_count,
        topics (
          id,
          name
        ),
        subjects (
          id,
          name
        )
      `)
      .eq("user_id", user.id)

    const weakTopicsList = (progressData || [])
      .filter((p) => p.total_count > 0 && (p.correct_count / p.total_count) * 100 < 60)
      .map((p: any) => ({
        topicId: p.topics?.id || null,
        topicName: p.topics?.name || "Unknown Topic",
        subjectName: p.subjects?.name || "Unknown Subject",
        percentage: Math.round((p.correct_count / p.total_count) * 100),
      }))

    // Query last 5 recent practice sessions
    const { data: recentSessions } = await supabase
      .from("exam_sessions")
      .select(`
        id,
        mode,
        exam_type,
        score_pct,
        created_at,
        status,
        subjects (
          name
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5)

    const statsData = {
      predictedScore: userCore?.predicted_score || 0,
      readinessPct: userCore?.readiness_pct || 0,
      streakCount: userCore?.streak_count || 0,
      totalExams,
      avgScorePct,
      subjectScores: userSubjects || [],
      weakTopics: weakTopicsList,
      recentSessions: recentSessions || [],
    }

    // Populate Redis cache for 5 minutes
    await setCache(cacheKey, statsData, 300)

    return ok(statsData)
  } catch (error) {
    Sentry.captureException(error)
    return err("An unexpected error occurred", 500)
  }
}
