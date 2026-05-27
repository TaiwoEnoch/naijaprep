import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { getCache, setCache } from "@/lib/redis"
import { Receiver } from "@upstash/qstash"
import * as Sentry from "@sentry/nextjs"

export async function POST(req: NextRequest) {
  try {
    // 1. Verify QStash signature
    const signature = req.headers.get("upstash-signature") || ""
    const bodyText = await req.text()

    const receiver = new Receiver({
      currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY!,
      nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY!,
    })

    const isValid = await receiver.verify({
      signature,
      body: bodyText,
    }).catch(() => false)

    if (!isValid) {
      console.warn("Unauthorized QStash signature on leaderboard refresh")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 2. Fetch active student users ordered by score descending
    const { data: users, error: usersError } = await supabaseAdmin
      .from("users")
      .select("id, predicted_score, state, school_id")
      .eq("is_active", true)
      .eq("role", "student")
      .order("predicted_score", { ascending: false })

    if (usersError) {
      throw new Error(`Failed to fetch active users: ${usersError.message}`)
    }

    if (!users || users.length === 0) {
      return NextResponse.json({ data: { updated: 0 }, success: true })
    }

    const allSnapshots: any[] = []
    const nowIso = new Date().toISOString()

    // A. National Snapshots rank calculation
    let nationalRank = 1
    let prevNationalScore = -1
    users.forEach((u, index) => {
      if (u.predicted_score !== prevNationalScore) {
        nationalRank = index + 1
        prevNationalScore = u.predicted_score
      }
      allSnapshots.push({
        user_id: u.id,
        score: u.predicted_score,
        rank: nationalRank,
        period: "week",
        scope: "national",
        state: u.state || null,
        school_id: u.school_id || null,
        snapshot_at: nowIso,
      })
    })

    // B. State Snapshots rank calculation (group by state)
    const usersByState: Record<string, typeof users> = {}
    users.forEach((u) => {
      if (u.state) {
        if (!usersByState[u.state]) usersByState[u.state] = []
        usersByState[u.state].push(u)
      }
    })
    Object.entries(usersByState).forEach(([state, stateUsers]) => {
      let stateRank = 1
      let prevStateScore = -1
      stateUsers.forEach((u, index) => {
        if (u.predicted_score !== prevStateScore) {
          stateRank = index + 1
          prevStateScore = u.predicted_score
        }
        allSnapshots.push({
          user_id: u.id,
          score: u.predicted_score,
          rank: stateRank,
          period: "week",
          scope: "state",
          state: state,
          school_id: u.school_id || null,
          snapshot_at: nowIso,
        })
      })
    })

    // C. School Snapshots rank calculation (group by school_id)
    const usersBySchool: Record<string, typeof users> = {}
    users.forEach((u) => {
      if (u.school_id) {
        if (!usersBySchool[u.school_id]) usersBySchool[u.school_id] = []
        usersBySchool[u.school_id].push(u)
      }
    })
    Object.entries(usersBySchool).forEach(([schoolId, schoolUsers]) => {
      let schoolRank = 1
      let prevSchoolScore = -1
      schoolUsers.forEach((u, index) => {
        if (u.predicted_score !== prevSchoolScore) {
          schoolRank = index + 1
          prevSchoolScore = u.predicted_score
        }
        allSnapshots.push({
          user_id: u.id,
          score: u.predicted_score,
          rank: schoolRank,
          period: "week",
          scope: "school",
          state: u.state || null,
          school_id: schoolId,
          snapshot_at: nowIso,
        })
      })
    })

    // Bulk upsert snapshot rows
    const { error: upsertError } = await supabaseAdmin
      .from("leaderboard_snapshots")
      .upsert(allSnapshots, { onConflict: "user_id,period,scope" })

    if (upsertError) {
      throw new Error(`Failed to upsert leaderboard snapshots: ${upsertError.message}`)
    }

    // Cache the top 100 national week snapshots in Redis
    const { data: top100Data, error: cacheQueryError } = await supabaseAdmin
      .from("leaderboard_snapshots")
      .select(`
        id,
        score,
        rank,
        period,
        scope,
        state,
        snapshot_at,
        users (
          id,
          first_name,
          last_name,
          avatar_url,
          state,
          schools (
            id,
            name
          )
        )
      `)
      .eq("scope", "national")
      .eq("period", "week")
      .order("score", { ascending: false })
      .limit(100)

    if (!cacheQueryError && top100Data) {
      const cacheValue = {
        leaderboard: top100Data,
      }
      await setCache("leaderboard:national:week:v1", cacheValue, 300)
    }

    return NextResponse.json({ data: { updated: allSnapshots.length }, success: true })
  } catch (error: any) {
    Sentry.captureException(error)
    console.error("Leaderboard refresh job error:", error)
    return NextResponse.json({ error: error?.message, success: false }, { status: 500 })
  }
}

export const dynamic = "force-dynamic"
