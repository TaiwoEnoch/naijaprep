import { NextRequest } from "next/server"
import { ok, err, rateLimitErr } from "@/lib/api-response"
import { rateLimit } from "@/lib/rate-limit"
import { getCache, setCache } from "@/lib/redis"
import { createClient } from "@/lib/supabase/server"
import * as Sentry from "@sentry/nextjs"

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

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

    // Extract search query parameters
    const { searchParams } = req.nextUrl
    const subjectId = searchParams.get("subjectId")
    const examType = searchParams.get("examType")
    const countParam = searchParams.get("count")
    const count = countParam ? parseInt(countParam, 10) : 20

    if (!subjectId || !examType) {
      return err("Missing required parameters: subjectId and examType", 400)
    }

    // 3. Cache check before database query
    const cacheKey = `questions:${subjectId}:${examType}:v1`
    const cachedQuestions = await getCache<any[]>(cacheKey)
    let questionsList: any[] = []

    if (cachedQuestions) {
      questionsList = typeof cachedQuestions === "string" ? JSON.parse(cachedQuestions) : cachedQuestions
    } else {
      // Query database for all questions matching subject and examType
      const { data, error: dbError } = await supabase
        .from("questions")
        .select("*")
        .eq("subject_id", subjectId)
        .eq("exam_type", examType)
        .eq("is_active", true)

      if (dbError) {
        console.error("Fetch questions error:", dbError)
        return err("Failed to retrieve questions", 500)
      }
      questionsList = data || []
      await setCache(cacheKey, questionsList, 3600)
    }

    if (questionsList.length === 0) {
      return ok([])
    }

    // 4. Query user progress for adaptive selection logic
    const { data: progressData, error: progressError } = await supabase
      .from("user_progress")
      .select("topic_id, correct_count, total_count")
      .eq("user_id", user.id)
      .eq("subject_id", subjectId)

    if (progressError) {
      console.error("Fetch user progress error:", progressError)
    }

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

    // Classify all questions
    const weakQs: any[] = []
    const improvingQs: any[] = []
    const strongQs: any[] = []

    questionsList.forEach((q) => {
      if (!q.topic_id) {
        weakQs.push(q) // treat unclassified/unseen as weak
        return
      }
      if (weakTopics.has(q.topic_id)) {
        weakQs.push(q)
      } else if (improvingTopics.has(q.topic_id)) {
        improvingQs.push(q)
      } else if (strongTopics.has(q.topic_id)) {
        strongQs.push(q)
      } else {
        weakQs.push(q) // default unseen topics to weak
      }
    })

    // Calculate targets: 70% Weak, 20% Improving, 10% Strong
    const targetWeak = Math.round(0.70 * count)
    const targetImproving = Math.round(0.20 * count)
    const targetStrong = count - targetWeak - targetImproving

    const selectedQuestions: any[] = []
    const selectRandom = (bucket: any[], limit: number) => {
      const shuffled = shuffleArray(bucket)
      return shuffled.slice(0, limit)
    }

    const selectedWeak = selectRandom(weakQs, targetWeak)
    const selectedImproving = selectRandom(improvingQs, targetImproving)
    const selectedStrong = selectRandom(strongQs, targetStrong)

    selectedQuestions.push(...selectedWeak, ...selectedImproving, ...selectedStrong)

    // Backfill with remaining questions if targets aren't fully satisfied
    if (selectedQuestions.length < count) {
      const remainingCount = count - selectedQuestions.length
      const selectedIds = new Set(selectedQuestions.map((q) => q.id))
      const remainingPool = questionsList.filter((q) => !selectedIds.has(q.id))
      const extra = selectRandom(remainingPool, remainingCount)
      selectedQuestions.push(...extra)
    }

    return ok(shuffleArray(selectedQuestions.slice(0, count)))
  } catch (error) {
    Sentry.captureException(error)
    return err("An unexpected error occurred", 500)
  }
}
