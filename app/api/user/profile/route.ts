import { NextRequest } from "next/server"
import { ok, err, rateLimitErr } from "@/lib/api-response"
import { rateLimit } from "@/lib/rate-limit"
import { invalidateCache } from "@/lib/redis"
import { createClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import * as Sentry from "@sentry/nextjs"
import { z } from "zod"

const profileUpdateSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().max(50).optional().nullable(),
  examTypes: z.array(z.string()).optional(),
  targetScore: z.number().int().min(0).max(400).optional(),
  examDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(), // YYYY-MM-DD
  state: z.string().max(50).optional().nullable(),
})

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

    // Fetch user record joined with school details
    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select(`
        *,
        schools (
          id,
          name,
          state,
          lga
        )
      `)
      .eq("id", user.id)
      .single()

    if (profileError || !profile) {
      console.error("Fetch profile details error:", profileError)
      return err("Failed to retrieve user profile", 500)
    }

    // Fetch user subjects list
    const { data: subjects, error: subjectsError } = await supabase
      .from("user_subjects")
      .select("*")
      .eq("user_id", user.id)

    if (subjectsError) {
      console.error("Fetch user subjects error:", subjectsError)
    }

    // Teacher school student query
    let students: any[] = []
    let recentActivity: any[] = []
    if (profile.role === "teacher" || profile.role === "admin") {
      const { data: schoolStudents } = await supabaseAdmin
        .from("users")
        .select(`
          id,
          first_name,
          last_name,
          phone,
          plan,
          exam_types,
          target_score,
          exam_date,
          avatar_url,
          streak_count,
          longest_streak,
          readiness_pct,
          predicted_score,
          created_at
        `)
        .eq("school_id", profile.school_id)
        .eq("role", "student")
        .eq("is_active", true)
        
      students = schoolStudents || []

      if (students.length > 0) {
        const studentIds = students.map((s) => s.id)
        const { data: activityData } = await supabaseAdmin
          .from("exam_sessions")
          .select(`
            id,
            score_pct,
            created_at,
            user_id,
            status,
            subjects (
              name
            ),
            users (
              first_name,
              last_name
            )
          `)
          .in("user_id", studentIds)
          .eq("status", "completed")
          .order("created_at", { ascending: false })
          .limit(10)

        recentActivity = (activityData || []).map((session: any) => ({
          id: session.id,
          scorePct: session.score_pct,
          createdAt: session.created_at,
          userId: session.user_id,
          subjectName: session.subjects?.name || "Unknown Subject",
          studentName: `${session.users?.first_name || ""} ${session.users?.last_name || ""}`.trim()
        }))
      }
    }

    return ok({
      profile,
      subjects: subjects || [],
      students,
      recentActivity,
    })
  } catch (error) {
    Sentry.captureException(error)
    return err("An unexpected error occurred", 500)
  }
}

export async function PUT(req: NextRequest) {
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

    // Validate body
    let body
    try {
      body = await req.json()
    } catch {
      return err("Invalid JSON body", 400)
    }

    const validation = profileUpdateSchema.safeParse(body)
    if (!validation.success) {
      return err("Invalid profile update payload. Verify schema constraints.", 400)
    }
    const updates = validation.data

    const dbUpdates: Record<string, any> = {}
    if (updates.firstName !== undefined) dbUpdates.first_name = updates.firstName
    if (updates.lastName !== undefined) dbUpdates.last_name = updates.lastName
    if (updates.examTypes !== undefined) dbUpdates.exam_types = updates.examTypes
    if (updates.targetScore !== undefined) dbUpdates.target_score = updates.targetScore
    if (updates.examDate !== undefined) dbUpdates.exam_date = updates.examDate
    if (updates.state !== undefined) dbUpdates.state = updates.state
    dbUpdates.updated_at = new Date().toISOString()

    // Update record
    const { data: updatedProfile, error: updateError } = await supabase
      .from("users")
      .update(dbUpdates)
      .eq("id", user.id)
      .select()
      .single()

    if (updateError) {
      console.error("Profile update error:", updateError)
      return err("Failed to update user profile", 500)
    }

    // Invalidate stats cache key for this user
    await invalidateCache(`stats:${user.id}:v1`)

    return ok({
      profile: updatedProfile,
      message: "Profile updated successfully",
    })
  } catch (error) {
    Sentry.captureException(error)
    return err("An unexpected error occurred", 500)
  }
}
