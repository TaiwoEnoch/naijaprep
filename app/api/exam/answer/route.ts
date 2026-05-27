import { NextRequest } from "next/server"
import { ok, err, rateLimitErr } from "@/lib/api-response"
import { rateLimit } from "@/lib/rate-limit"
import { createClient } from "@/lib/supabase/server"
import * as Sentry from "@sentry/nextjs"
import { z } from "zod"

const answerSchema = z.object({
  sessionId: z.string().uuid(),
  questionId: z.string().uuid(),
  chosenOption: z.string().refine((val) => ["A", "B", "C", "D"].includes(val)),
  isFlagged: z.boolean().optional(),
})

export async function POST(req: NextRequest) {
  try {
    // 1. Rate limit check first (120 requests per minute per IP)
    const { success, reset } = await rateLimit(req, { max: 120, window: 60 })
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

    const validation = answerSchema.safeParse(body)
    if (!validation.success) {
      return err("Invalid request body. sessionId, questionId, and chosenOption (A/B/C/D) are required.", 400)
    }
    const { sessionId, questionId, chosenOption, isFlagged } = validation.data

    // Fetch and verify exam session ownership and status
    const { data: sessionRecord, error: sessionError } = await supabase
      .from("exam_sessions")
      .select("id, user_id, status")
      .eq("id", sessionId)
      .single()

    if (sessionError || !sessionRecord) {
      return err("Exam session not found", 404)
    }

    if (sessionRecord.user_id !== user.id) {
      return err("Unauthorized session access", 403)
    }

    if (sessionRecord.status !== "active") {
      return err("This exam session is no longer active", 400)
    }

    // Fetch correct answer key to evaluate correctness
    const { data: questionRecord, error: questionError } = await supabase
      .from("questions")
      .select("correct_option")
      .eq("id", questionId)
      .single()

    if (questionError || !questionRecord) {
      return err("Question not found", 404)
    }

    const isCorrect = chosenOption === questionRecord.correct_option

    // Upsert into exam_answers table
    const { error: upsertError } = await supabase
      .from("exam_answers")
      .upsert({
        session_id: sessionId,
        question_id: questionId,
        chosen_option: chosenOption,
        is_correct: isCorrect,
        is_flagged: isFlagged ?? false,
        answered_at: new Date().toISOString(),
      }, {
        onConflict: "session_id,question_id"
      })

    if (upsertError) {
      console.error("Upsert answer record error:", upsertError)
      return err("Failed to record answer", 500)
    }

    return ok({ saved: true })
  } catch (error) {
    Sentry.captureException(error)
    return err("An unexpected error occurred", 500)
  }
}
