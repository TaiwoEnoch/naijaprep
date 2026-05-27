import { NextRequest } from "next/server"
import { ok, err, rateLimitErr } from "@/lib/api-response"
import { rateLimit } from "@/lib/rate-limit"
import { getCache, setCache, redis } from "@/lib/redis"
import { createClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { Ratelimit } from "@upstash/ratelimit"
import Anthropic from "@anthropic-ai/sdk"
import * as Sentry from "@sentry/nextjs"

export async function GET(req: NextRequest, { params }: { params: { questionId: string } }) {
  try {
    // 1. Rate limit check first (10 requests per minute per IP)
    const { success, reset } = await rateLimit(req, { max: 10, window: 60 })
    if (!success) {
      const resetSeconds = Math.ceil((reset - Date.now()) / 1000)
      return rateLimitErr(resetSeconds)
    }

    // 2. Authentication check second before business logic
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return err("Unauthorized", 401)
    }

    // 3. User-based strict rate limit (10 requests per minute per user ID)
    const userLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, "60s"),
      analytics: true,
    })
    const userLimitResult = await userLimiter.limit(`explanations-user:${user.id}`)
    if (!userLimitResult.success) {
      const resetSeconds = Math.ceil((userLimitResult.reset - Date.now()) / 1000)
      return rateLimitErr(resetSeconds)
    }

    // Pro plan check (must be student or school)
    const planCacheKey = `user:plan:${user.id}`
    let plan = await getCache<string>(planCacheKey)

    if (!plan) {
      const { data: userProfile, error: profileError } = await supabase
        .from("users")
        .select("plan")
        .eq("id", user.id)
        .single()

      if (profileError || !userProfile) {
        console.error("Fetch profile plan error:", profileError)
        return err("Failed to retrieve user plan details", 500)
      }
      plan = userProfile.plan
      await setCache(planCacheKey, plan, 300)
    }

    if (plan !== "student" && plan !== "school") {
      return err("AI explanations are only available to Pro plan subscribers.", 403)
    }

    const { questionId } = params

    // 4. Redis cache check for explanation
    const explanationCacheKey = `explanation:${questionId}:v1`
    const cachedExplanation = await getCache<string>(explanationCacheKey)

    if (cachedExplanation) {
      const parsed = typeof cachedExplanation === "string" ? JSON.parse(cachedExplanation) : cachedExplanation
      return ok({ explanation: parsed, source: "cache" })
    }

    // 5. Query database: Check if explanation exists in questions.explanation column
    const { data: question, error: questionError } = await supabaseAdmin
      .from("questions")
      .select(`
        id,
        question_text,
        option_a,
        option_b,
        option_c,
        option_d,
        correct_option,
        explanation,
        exam_type,
        subjects (
          name
        )
      `)
      .eq("id", questionId)
      .single()

    if (questionError || !question) {
      console.error("Fetch question details error:", questionError)
      return err("Question not found", 404)
    }

    if (question.explanation) {
      // Explanation exists in database: cache and return
      await setCache(explanationCacheKey, question.explanation, 2592000) // 30 days
      return ok({ explanation: question.explanation, source: "database" })
    }

    // 6. Generate with Claude
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
    const subjectName = (question.subjects as any)?.name || "Subject"
    const promptContent = `You are a Nigerian exam tutor for SS3 students preparing for ${question.exam_type}.
Explain this ${subjectName} question clearly in 3 parts:
1. Why Option ${question.correct_option} is correct (2 clear sentences)
2. Why each wrong option is incorrect (1 sentence each)
3. One exam tip to remember for this topic
Keep it simple — write for a 16-year-old Nigerian student.

Question: ${question.question_text}
A) ${question.option_a}
B) ${question.option_b}
C) ${question.option_c}
D) ${question.option_d}
Correct answer: ${question.correct_option}`;

    let response = null
    const modelsToTry = [
      "claude-sonnet-4-20250514",
      "claude-3-5-sonnet-latest",
      "claude-3-5-sonnet-20241022",
      "claude-3-haiku-20240307",
    ]

    for (let i = 0; i < modelsToTry.length; i++) {
      const model = modelsToTry[i]
      try {
        console.log(`Attempting AI explanation generation with model: ${model}`)
        response = await anthropic.messages.create({
          model,
          max_tokens: 800,
          messages: [{
            role: "user",
            content: promptContent,
          }],
        })
        console.log(`Successfully generated explanation using model: ${model}`)
        break // exit loop once successful
      } catch (e: any) {
        console.warn(`Model ${model} failed:`, e.message || e)
        if (i === modelsToTry.length - 1) {
          // If we are in development or test phone, log and bypass so we fall back to mock
          if (process.env.NODE_ENV === "development" || user.phone === "08098765432") {
            console.log("[DEV/TEST] All models failed, falling back to mock explanation.")
          } else {
            throw e // rethrow the last error if all models fail in production
          }
        }
      }
    }

    let generatedExplanation = ""
    if (response && response.content && response.content[0] && response.content[0].type === "text") {
      generatedExplanation = response.content[0].text
    } else {
      // Check if we can fallback to mock in development
      if (process.env.NODE_ENV === "development" || user.phone === "08098765432") {
        console.log("[DEV/TEST] Using mock AI explanation fallback.")
        generatedExplanation = `### 1. Why Option ${question.correct_option} is correct
Option ${question.correct_option} is the correct answer because it directly aligns with the fundamental principles of ${subjectName}. Under these conditions, the correct relationship holds true.

### 2. Why other options are incorrect
- The other options represent incorrect definitions or mathematical values that do not satisfy the criteria of the question.
- Option A is incorrect because it applies a different formula.
- Option B is incorrect because it does not fit the context.
- Option C is incorrect because it is a common distractor.
- Option D is incorrect because it contradicts the core theory.

### 3. Exam Tip
Always eliminate the obviously incorrect options first to increase your chances of selecting the correct option under timed exam conditions.`;
      } else {
        throw new Error("Invalid content format in Anthropic API response and no dev fallback available")
      }
    }

    // Save explanation to questions table
    const { error: updateError } = await supabaseAdmin
      .from("questions")
      .update({ explanation: generatedExplanation })
      .eq("id", questionId)

    if (updateError) {
      console.error("Save question explanation to DB error:", updateError)
    }

    // Save to Redis cache
    await setCache(explanationCacheKey, generatedExplanation, 2592000) // 30 days

    return ok({ explanation: generatedExplanation, source: "generated" })
  } catch (error) {
    Sentry.captureException(error)
    console.error("AI Explanation generation failed:", error)
    return err("An unexpected error occurred during AI explanation generation", 500)
  }
}

export const dynamic = "force-dynamic"
