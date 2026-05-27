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

    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0]

    // Reset streaks for users who missed yesterday
    const { data, error, count } = await supabase
      .from("users")
      .update({ streak_count: 0 })
      .lt("last_active_date", yesterday)
      .gt("streak_count", 0)
      .select()

    if (error) {
      throw new Error(`Failed to reset streaks: ${error.message}`)
    }

    // Update longest streaks
    await supabase.rpc("update_longest_streaks")

    const resetCount = count !== null ? count : (data ? data.length : 0)

    return new Response(JSON.stringify({ reset: resetCount }), {
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
