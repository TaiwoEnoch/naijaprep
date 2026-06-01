import { NextRequest } from "next/server"
import { ok, err } from "@/lib/api-response"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { z } from "zod"

const schema = z.object({
  phone: z.string().min(10).max(15),
})

export async function POST(req: NextRequest) {
  let body
  try {
    body = await req.json()
  } catch {
    return err("Invalid JSON body", 400)
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return err("Invalid phone number", 400)
  }

  const { phone } = parsed.data

  const { error } = await supabaseAdmin.from("waitlist").insert({ phone })

  if (error) {
    if (error.code === "23505") {
      return ok({ message: "Already on waitlist" })
    }
    console.error("Waitlist insert error:", error)
    return err("Failed to join waitlist", 500)
  }

  return ok({ message: "Added to waitlist" })
}
