import { NextRequest } from "next/server"
import { ok, err, rateLimitErr } from "@/lib/api-response"
import { rateLimit } from "@/lib/rate-limit"
import { getCache, setCache } from "@/lib/redis"
import { createClient } from "@/lib/supabase/server"
import * as Sentry from "@sentry/nextjs"
import { z } from "zod"

const startExamSchema = z.object({
  subjectId: z.string().uuid(),
  examType: z.string().refine((val) => ["JAMB", "WAEC", "NECO"].includes(val)),
  mode: z.string().refine((val) => ["practice", "mock", "topic", "speed"].includes(val)),
})

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

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

    const validation = startExamSchema.safeParse(body)
    if (!validation.success) {
      return err("Invalid request body. subjectId, examType (JAMB/WAEC/NECO), and mode (practice/mock/topic/speed) are required.", 400)
    }
    const { subjectId, examType, mode } = validation.data

    // Mode-specific configurations
    let questionCount = 20
    let timeLimitSeconds = 1800 // 30 mins

    if (mode === "mock") {
      questionCount = 60
      timeLimitSeconds = 7200 // 2 hours
    } else if (mode === "topic") {
      questionCount = 10
      timeLimitSeconds = 900 // 15 mins
    } else if (mode === "speed") {
      questionCount = 15
      timeLimitSeconds = 600 // 10 mins
    }

    // Check user plan
    const { data: userProfile, error: profileError } = await supabase
      .from("users")
      .select("plan")
      .eq("id", user.id)
      .single()

    if (profileError || !userProfile) {
      console.error("Profile retrieval error:", profileError)
      return err("Failed to retrieve user details", 500)
    }

    // Enforce 10 questions/day limit for free plan
    if (userProfile.plan === "free") {
      const startOfToday = new Date()
      startOfToday.setHours(0, 0, 0, 0)

      const { data: todaySessions, error: sessionCountError } = await supabase
        .from("exam_sessions")
        .select("total_questions")
        .eq("user_id", user.id)
        .gte("created_at", startOfToday.toISOString())

      if (sessionCountError) {
        console.error("Today session count fetch error:", sessionCountError)
      }

      const questionsAnsweredToday = (todaySessions || []).reduce((acc, curr) => acc + curr.total_questions, 0)
      if (questionsAnsweredToday + questionCount > 10) {
        return err("Free plan limit reached (10 questions per day). Please upgrade your subscription to continue practicing.", 403)
      }
    }

    // Fetch questions list (cached or fresh)
    const cacheKey = `questions:${subjectId}:${examType}:v1`
    const cachedQuestions = await getCache<any[]>(cacheKey)
    let questionsList: any[] = []

    if (cachedQuestions) {
      questionsList = typeof cachedQuestions === "string" ? JSON.parse(cachedQuestions) : cachedQuestions
    } else {
      const { data, error: dbError } = await supabase
        .from("questions")
        .select("*")
        .eq("subject_id", subjectId)
        .eq("exam_type", examType)
        .eq("is_active", true)

      if (dbError) {
        console.error("Database questions fetch error:", dbError)
        return err("Failed to retrieve questions", 500)
      }
      questionsList = data || []
      await setCache(cacheKey, questionsList, 3600)
    }

    if (questionsList.length === 0) {
      return err("No questions available for this subject and exam type.", 404)
    }

    // Get user progress
    const { data: progressData } = await supabase
      .from("user_progress")
      .select("topic_id, correct_count, total_count")
      .eq("user_id", user.id)
      .eq("subject_id", subjectId)

    const weakTopics = new Set<string>()
    const improvingTopics = new Set<string>()
    const strongTopics = new Set<string>()

    if (progressData) {
      progressData.forEach((p) => {
        if (!p.topic_id) return
        const pct = p.total_count > 0 ? (p.correct_count / p.total_count) * 100 : 0
        if (pct < 60) {
          weakTopics.add(p.topic_id)
        } else if (pct <= 75) {
          improvingTopics.add(p.topic_id)
        } else {
          strongTopics.add(p.topic_id)
        }
      })
    }

    const weakQs: any[] = []
    const improvingQs: any[] = []
    const strongQs: any[] = []

    questionsList.forEach((q) => {
      if (!q.topic_id) {
        weakQs.push(q)
        return
      }
      if (weakTopics.has(q.topic_id)) {
        weakQs.push(q)
      } else if (improvingTopics.has(q.topic_id)) {
        improvingQs.push(q)
      } else if (strongTopics.has(q.topic_id)) {
        strongQs.push(q)
      } else {
        weakQs.push(q)
      }
    })

    const targetWeak = Math.round(0.70 * questionCount)
    const targetImproving = Math.round(0.20 * questionCount)
    const targetStrong = questionCount - targetWeak - targetImproving

    const selectRandom = (bucket: any[], limit: number) => {
      return shuffleArray(bucket).slice(0, limit)
    }

    const selectedWeak = selectRandom(weakQs, targetWeak)
    const selectedImproving = selectRandom(improvingQs, targetImproving)
    const selectedStrong = selectRandom(strongQs, targetStrong)

    const selectedQuestions = [...selectedWeak, ...selectedImproving, ...selectedStrong]

    if (selectedQuestions.length < questionCount) {
      const remainingCount = questionCount - selectedQuestions.length
      const selectedIds = new Set(selectedQuestions.map((q) => q.id))
      const remainingPool = questionsList.filter((q) => !selectedIds.has(q.id))
      const extra = selectRandom(remainingPool, remainingCount)
      selectedQuestions.push(...extra)
    }

    const finalQuestions = shuffleArray(selectedQuestions.slice(0, questionCount))

    // Create active exam session
    const { data: sessionRecord, error: sessionError } = await supabase
      .from("exam_sessions")
      .insert({
        user_id: user.id,
        subject_id: subjectId,
        exam_type: examType,
        mode: mode,
        status: "active",
        total_questions: questionCount,
        time_limit_seconds: timeLimitSeconds,
      })
      .select()
      .single()

    if (sessionError || !sessionRecord) {
      console.error("Session creation error:", sessionError)
      return err("Failed to initialize practice session", 500)
    }

    // Create placeholders in exam_answers for all selected questions to bind them to the session
    const answersPlaceholders = finalQuestions.map((q) => ({
      session_id: sessionRecord.id,
      question_id: q.id,
      chosen_option: null,
      is_correct: null,
      is_flagged: false,
    }))

    const { error: answersError } = await supabase
      .from("exam_answers")
      .insert(answersPlaceholders)

    if (answersError) {
      console.error("Failed to insert exam answers placeholders:", answersError)
      // Rollback session
      await supabase.from("exam_sessions").delete().eq("id", sessionRecord.id)
      return err("Failed to initialize exam session answers", 500)
    }

    // Strip answers/explanations from questions to prevent cheating
    const clientQuestions = finalQuestions.map(({ correct_option, explanation, ...rest }) => rest)

    return ok({
      sessionId: sessionRecord.id,
      questions: clientQuestions,
      serverStartTime: sessionRecord.server_start_time,
      timeLimitSeconds: sessionRecord.time_limit_seconds,
    })
  } catch (error) {
    Sentry.captureException(error)
    return err("An unexpected error occurred", 500)
  }
}
