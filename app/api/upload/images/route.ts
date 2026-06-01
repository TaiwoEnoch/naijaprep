import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"

export async function GET(req: NextRequest) {
  const password = req.headers.get("x-upload-password")
  if (!password || password !== process.env.UPLOAD_PAGE_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data, error } = await supabaseAdmin.storage
    .from("question-images")
    .list("", { limit: 200, sortBy: { column: "created_at", order: "desc" } })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const files = (data ?? []).map((item) => {
    const { data: urlData } = supabaseAdmin.storage
      .from("question-images")
      .getPublicUrl(item.name)
    return { name: item.name, url: urlData.publicUrl, created_at: item.created_at }
  })

  return NextResponse.json({ files })
}