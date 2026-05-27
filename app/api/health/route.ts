import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { redis } from "@/lib/redis"
import * as Sentry from "@sentry/nextjs"

export const dynamic = "force-dynamic"

export async function GET() {
  let dbHealthy = false
  let redisHealthy = false
  try {
    const { error } = await supabaseAdmin.from("subjects").select("id").limit(1)
    dbHealthy = !error
  } catch (e) {
    console.error("Health Check DB Error:", e)
  }

  try {
    const pong = await redis.ping()
    redisHealthy = pong === "PONG"
  } catch (e) {
    console.error("Health Check Redis Error:", e)
  }

  const ok = dbHealthy && redisHealthy
  const responseData = {
    db: dbHealthy,
    redis: redisHealthy,
    ok,
    ts: new Date().toISOString(),
  }

  return NextResponse.json(
    { data: responseData, success: ok },
    { status: ok ? 200 : 503 }
  )
}
