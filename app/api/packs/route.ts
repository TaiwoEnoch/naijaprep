import { NextRequest } from "next/server"
import { ok, err, rateLimitErr } from "@/lib/api-response"
import { rateLimit } from "@/lib/rate-limit"
import { getCache, setCache } from "@/lib/redis"
import { createClient } from "@/lib/supabase/server"
import * as Sentry from "@sentry/nextjs"

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

    // 3. Cache check for global offline packs list
    const cacheKey = "packs:v1"
    const cachedPacks = await getCache<any[]>(cacheKey)
    let packsList: any[] = []

    if (cachedPacks) {
      packsList = typeof cachedPacks === "string" ? JSON.parse(cachedPacks) : cachedPacks
    } else {
      const { data, error: dbError } = await supabase
        .from("offline_packs")
        .select(`
          *,
          subjects (
            name
          )
        `)
        .eq("is_active", true)

      if (dbError) {
        console.error("Fetch offline packs error:", dbError)
        return err("Failed to retrieve offline packs", 500)
      }
      packsList = data || []
      await setCache(cacheKey, packsList, 3600)
    }

    // Query user pack download status in real time
    const { data: userDownloads, error: downloadError } = await supabase
      .from("user_pack_downloads")
      .select("pack_id, downloaded_at")
      .eq("user_id", user.id)

    if (downloadError) {
      console.error("Fetch user downloads error:", downloadError)
    }

    const downloadMap = new Map<string, string>()
    if (userDownloads) {
      userDownloads.forEach((d) => {
        downloadMap.set(d.pack_id, d.downloaded_at)
      })
    }

    // Join active packs with download status
    const joinedPacks = packsList.map((pack) => {
      const downloadedAt = downloadMap.get(pack.id)
      return {
        ...pack,
        downloaded: !!downloadedAt,
        downloadedAt: downloadedAt || null,
      }
    })

    return ok(joinedPacks)
  } catch (error) {
    Sentry.captureException(error)
    return err("An unexpected error occurred", 500)
  }
}
