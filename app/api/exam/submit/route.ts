import { NextRequest } from "next/server"
import { ok, err, rateLimitErr } from "@/lib/api-response"
import { rateLimit } from "@/lib/rate-limit"
import { invalidateCache } from "@/lib/redis"
import { createClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { enqueue } from "@/lib/queue"
import * as Sentry from "@sentry/nextjs"
import { z } from "zod"

const submitExamSchema = z.object({
  sessionId: z.string().uuid(),
  answers: z.record(z.string().uuid(), z.string().refine((val) => ["A", "B", "C", "D"].includes(val))),
})

export async function POST(req: NextRequest) {
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

    // Validate request body
    let body
    try {
      body = await req.json()
    } catch {
      return err("Invalid JSON body", 400)
    }

    const validation = submitExamSchema.safeParse(body)
    if (!validation.success) {
      return err("Invalid request body. sessionId and answers object are required.", 400)
    }
    const { sessionId, answers } = validation.data

    // Fetch the active session
    const { data: session, error: sessionError } = await supabase
      .from("exam_sessions")
      .select("id, user_id, subject_id, total_questions, time_limit_seconds, server_start_time, status")
      .eq("id", sessionId)
      .single()

    if (sessionError || !session) {
      return err("Exam session not found", 404)
    }

    if (session.user_id !== user.id) {
      return err("Unauthorized session ownership", 403)
    }

    if (session.status !== "active") {
      return err("This exam session is no longer active", 400)
    }

    // SERVER-SIDE TIMING CHECK
    const startTime = new Date(session.server_start_time).getTime()
    const elapsedSeconds = (Date.now() - startTime) / 1000

    if (elapsedSeconds > session.time_limit_seconds + 30) {
      // Mark session as abandoned/expired
      await supabase
        .from("exam_sessions")
        .update({ status: "abandoned" })
        .eq("id", sessionId)

      return err("Exam time expired", 400)
    }

    // Fetch questions assigned to this exam session via the exam_answers table
    const { data: boundAnswers, error: boundError } = await supabase
      .from("exam_answers")
      .select(`
        question_id,
        chosen_option,
        is_flagged,
        questions (
          correct_option,
          topic_id
        )
      `)
      .eq("session_id", sessionId)

    if (boundError || !boundAnswers || boundAnswers.length === 0) {
      console.error("Bound answers fetch error:", boundError)
      return err("Failed to retrieve session questions", 500)
    }

    let score = 0
    const upsertData: any[] = []
    const topicProgressMap: Record<string, { correct: number; total: number }> = {}

    // Evaluate answers
    boundAnswers.forEach((item: any) => {
      const qId = item.question_id
      const questionInfo = item.questions as unknown as { correct_option: string; topic_id: string }
      const correctOption = questionInfo.correct_option
      const topicId = questionInfo.topic_id

      // Determine final chosen option: prioritize final submitted answers, fallback to incrementally saved chosen_option
      const finalChosen = answers[qId] !== undefined ? answers[qId] : item.chosen_option
      const isCorrect = finalChosen === correctOption

      if (finalChosen && isCorrect) {
        score += 1
      }

      // Prepare answer record for upsert
      upsertData.push({
        session_id: sessionId,
        question_id: qId,
        chosen_option: finalChosen || null,
        is_correct: finalChosen ? isCorrect : null,
        is_flagged: item.is_flagged || false,
        answered_at: new Date().toISOString(),
      })

      // Update topic progress aggregation (for active questions with topics)
      if (topicId) {
        if (!topicProgressMap[topicId]) {
          topicProgressMap[topicId] = { correct: 0, total: 0 }
        }
        topicProgressMap[topicId].total += 1
        if (finalChosen && isCorrect) {
          topicProgressMap[topicId].correct += 1
        }
      }
    })

    // Upsert finalized answers back to exam_answers
    const { error: answersUpsertError } = await supabase
      .from("exam_answers")
      .upsert(upsertData, { onConflict: "session_id,question_id" })

    if (answersUpsertError) {
      console.error("Final answers upsert error:", answersUpsertError)
      return err("Failed to finalize student answers", 500)
    }

    const scorePct = Math.round((score / session.total_questions) * 100)

    // Check if this session is a personal best for the user in this subject
    const { data: previousSessions } = await supabase
      .from("exam_sessions")
      .select("score_pct")
      .eq("user_id", user.id)
      .eq("subject_id", session.subject_id)
      .eq("status", "completed")

    const highestPreviousScore = previousSessions && previousSessions.length > 0
      ? Math.max(...previousSessions.map((s) => s.score_pct || 0))
      : -1

    const isPersonalBest = scorePct > highestPreviousScore

    // Update exam_sessions record to completed
    const { error: sessionUpdateError } = await supabase
      .from("exam_sessions")
      .update({
        status: "completed",
        score: score,
        score_pct: scorePct,
        time_taken_seconds: Math.round(elapsedSeconds),
        is_personal_best: isPersonalBest,
        submitted_at: new Date().toISOString(),
      })
      .eq("id", sessionId)

    if (sessionUpdateError) {
      console.error("Session finalize error:", sessionUpdateError)
      return err("Failed to complete exam session", 500)
    }

    // Update topic progress details in user_progress table
    if (Object.keys(topicProgressMap).length > 0) {
      const { data: existingProgress } = await supabase
        .from("user_progress")
        .select("topic_id, correct_count, total_count")
        .eq("user_id", user.id)
        .eq("subject_id", session.subject_id)

      const progressUpserts = Object.entries(topicProgressMap).map(([topicId, diff]) => {
        const exist = (existingProgress || []).find((ep) => ep.topic_id === topicId)
        return {
          user_id: user.id,
          subject_id: session.subject_id,
          topic_id: topicId,
          correct_count: (exist?.correct_count || 0) + diff.correct,
          total_count: (exist?.total_count || 0) + diff.total,
          last_seen_at: new Date().toISOString(),
        }
      })

      const { error: progressUpsertError } = await supabase
        .from("user_progress")
        .upsert(progressUpserts, { onConflict: "user_id,subject_id,topic_id" })

      if (progressUpsertError) {
        console.error("Progress aggregation upsert error:", progressUpsertError)
      }
    }

    // Update streak counts and predicted score via admin client (secured columns)
    const { data: dbUser } = await supabaseAdmin
      .from("users")
      .select("last_active_date, streak_count, longest_streak")
      .eq("id", user.id)
      .single()

    const todayStr = new Date().toISOString().split("T")[0]
    let newStreak = 1
    let longestStreak = dbUser?.longest_streak || 0

    if (dbUser) {
      if (dbUser.last_active_date) {
        const lastActive = new Date(dbUser.last_active_date)
        const todayDate = new Date(todayStr)
        const diffTime = todayDate.getTime() - lastActive.getTime()
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

        if (diffDays === 1) {
          newStreak = (dbUser.streak_count || 0) + 1
        } else if (diffDays === 0) {
          newStreak = dbUser.streak_count || 1
        }
      }
      longestStreak = Math.max(longestStreak, newStreak)
    }

    // Recalculate predicted score via Postgres DB function
    let predictedScore = 0
    const { data: calculatedScore, error: functionError } = await supabaseAdmin.rpc("calculate_user_score", {
      p_user_id: user.id,
    })

    if (!functionError && calculatedScore !== null) {
      predictedScore = calculatedScore
    }

    // Update user profile record
    const { error: userUpdateError } = await supabaseAdmin
      .from("users")
      .update({
        last_active_date: todayStr,
        streak_count: newStreak,
        longest_streak: longestStreak,
        predicted_score: predictedScore,
        readiness_pct: Math.min(Math.round((predictedScore / 400) * 100), 100),
      })
      .eq("id", user.id)

    if (userUpdateError) {
      console.error("User stats update error:", userUpdateError)
    }

    // Invalidate user cache
    await invalidateCache(`stats:${user.id}:v1`)

    // Enqueue leaderboard refresh background job via QStash
    await enqueue("/api/jobs/leaderboard-refresh", { userId: user.id }).catch((e) => {
      console.error("Leaderboard refresh job queueing failed:", e)
    })

    return ok({
      score: score,
      scorePct: scorePct,
      totalQuestions: session.total_questions,
      isPersonalBest: isPersonalBest,
      timeTakenSeconds: Math.round(elapsedSeconds),
    })
  } catch (error) {
    Sentry.captureException(error)
    return err("An unexpected error occurred", 500)
  }
}
