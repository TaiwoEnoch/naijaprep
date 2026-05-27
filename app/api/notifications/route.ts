import { NextRequest } from "next/server"
import { ok, err, rateLimitErr } from "@/lib/api-response"
import { rateLimit } from "@/lib/rate-limit"
import { createClient } from "@/lib/supabase/server"
import * as Sentry from "@sentry/nextjs"
import { z } from "zod"

const patchNotificationSchema = z.object({
  id: z.string().uuid(),
})

export async function GET(req: NextRequest) {
  try {
    // 1. Rate limit check first (60 requests per minute per IP)
    const { success, reset } = await rateLimit(req, { max: 60, window: 60 })
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

    // Query user notifications ordered by date descending
    const { data: notifications, error: dbError } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (dbError) {
      console.error("Fetch notifications error:", dbError)
      return err("Failed to retrieve notifications", 500)
    }

    return ok(notifications)
  } catch (error) {
    Sentry.captureException(error)
    return err("An unexpected error occurred", 500)
  }
}

export async function PATCH(req: NextRequest) {
  try {
    // 1. Rate limit check first (60 requests per minute per IP)
    const { success, reset } = await rateLimit(req, { max: 60, window: 60 })
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

    // Validate body
    let body
    try {
      body = await req.json()
    } catch {
      return err("Invalid JSON body", 400)
    }

    const validation = patchNotificationSchema.safeParse(body)
    if (!validation.success) {
      return err("Invalid payload. UUID 'id' is required.", 400)
    }
    const { id } = validation.data

    // Verify ownership of the notification
    const { data: notification, error: getError } = await supabase
      .from("notifications")
      .select("user_id")
      .eq("id", id)
      .single()

    if (getError || !notification) {
      return err("Notification not found", 404)
    }

    if (notification.user_id !== user.id) {
      return err("Unauthorized notification modification", 403)
    }

    // Update notification read status
    const { data: updatedRecord, error: patchError } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id)
      .select()
      .single()

    if (patchError) {
      console.error("Patch notification error:", patchError)
      return err("Failed to mark notification as read", 500)
    }

    return ok(updatedRecord)
  } catch (error) {
    Sentry.captureException(error)
    return err("An unexpected error occurred", 500)
  }
}
