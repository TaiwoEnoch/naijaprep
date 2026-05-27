import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8"

Deno.serve(async (req) => {
  try {
    const auth = req.headers.get("Authorization")
    if (auth !== `Bearer ${Deno.env.get("CRON_SECRET")}`) {
      return new Response("Unauthorized", { status: 401 })
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    // 1. Fetch active students in the last 30 days
    const { data: activeUsers, error: usersError } = await supabase
      .from("users")
      .select("id")
      .gte("last_active_date", thirtyDaysAgo.split("T")[0])
      .eq("role", "student")

    if (usersError) {
      throw new Error(`Failed to fetch active users: ${usersError.message}`)
    }

    if (!activeUsers || activeUsers.length === 0) {
      return new Response(JSON.stringify({ updated: 0 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    }

    const updates: any[] = []
    let updatedCount = 0

    // 2. Loop over users to calculate performance metrics
    for (const u of activeUsers) {
      // Calculate average score across all subjects
      const { data: subjectsData, error: subjectsError } = await supabase
        .from("user_subjects")
        .select("avg_score")
        .eq("user_id", u.id)

      if (subjectsError) {
        console.error(`Fetch user_subjects error for ${u.id}:`, subjectsError)
        continue
      }

      const totalScore = (subjectsData || []).reduce((acc, curr) => acc + (curr.avg_score || 0), 0)
      const subjectCount = subjectsData?.length || 0
      const avgScore = subjectCount > 0 ? totalScore / subjectCount : 0

      // predicted_score = ROUND(weighted_avg * 4) (JAMB is out of 400)
      const predictedScore = Math.round(avgScore * 4)

      // Count completed sessions in the last 30 days
      const { count: sessionCount, error: sessionError } = await supabase
        .from("exam_sessions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", u.id)
        .eq("status", "completed")
        .gte("created_at", thirtyDaysAgo)

      if (sessionError) {
        console.error(`Fetch completed sessions error for ${u.id}:`, sessionError)
        continue
      }

      // readiness_pct = MIN(100, ROUND((sessions_last_30_days / 30) * 100))
      const sessionsLast30Days = sessionCount || 0
      const readinessPct = Math.min(100, Math.round((sessionsLast30Days / 30) * 100))

      updates.push({
        id: u.id,
        predicted_score: predictedScore,
        readiness_pct: readinessPct,
      })

      // Batch update of 100
      if (updates.length === 100) {
        const { error: upsertError } = await supabase.from("users").upsert(updates)
        if (upsertError) {
          throw new Error(`Failed to upsert score predictor batch updates: ${upsertError.message}`)
        }
        updatedCount += updates.length
        updates.length = 0
      }
    }

    // Process remaining batch
    if (updates.length > 0) {
      const { error: upsertError } = await supabase.from("users").upsert(updates)
      if (upsertError) {
        throw new Error(`Failed to upsert score predictor remainder updates: ${upsertError.message}`)
      }
      updatedCount += updates.length
    }

    return new Response(JSON.stringify({ updated: updatedCount }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
})
