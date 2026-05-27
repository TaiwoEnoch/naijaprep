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

    // Find paying users who have active streaks but haven't practiced since yesterday
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("id, first_name, phone, streak_count")
      .lt("last_active_date", yesterday)
      .gt("streak_count", 0)
      .neq("plan", "free")
      .eq("role", "student")

    if (usersError) {
      throw new Error(`Failed to fetch reminder users: ${usersError.message}`)
    }

    if (!users || users.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    }

    let sentCount = 0

    // Loop over users to send streak risk SMS via Termii
    for (const u of users) {
      const termiiResponse = await fetch(`${Deno.env.get("TERMII_BASE_URL") || "https://api.ng.termii.com"}/api/sms/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: Deno.env.get("TERMII_API_KEY"),
          to: `234${u.phone.slice(1)}`,
          from: Deno.env.get("TERMII_SENDER_ID") || "NaijaPrep",
          sms: `Hi ${u.first_name}! Your ${u.streak_count}-day streak is at risk. Study just 10 minutes on NaijaPrep to keep it alive. naijaprep.com`,
          type: "plain",
          channel: "dnd",
        }),
      })

      if (termiiResponse.ok) {
        sentCount++
      } else {
        const errorText = await termiiResponse.text()
        console.error(`Termii reminder SMS failed for ${u.phone}:`, errorText)
      }
    }

    return new Response(JSON.stringify({ sent: sentCount }), {
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
