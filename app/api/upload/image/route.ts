import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"

export async function POST(req: NextRequest) {
  const password = req.headers.get("x-upload-password")
  if (!password || password !== process.env.UPLOAD_PAGE_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const form = await req.formData()
  const file = form.get("file") as File | null
  const filename = form.get("filename") as string | null

  if (!file || !filename) {
    return NextResponse.json({ error: "Missing file or filename" }, { status: 400 })
  }

  const allowed = ["image/jpeg", "image/jpg", "image/png"]
  if (!allowed.includes(file.type)) {
    return NextResponse.json({ error: "Only JPG and PNG files are allowed" }, { status: 400 })
  }

  const buffer = await file.arrayBuffer()

  const { error } = await supabaseAdmin.storage
    .from("question-images")
    .upload(filename, buffer, {
      contentType: file.type,
      upsert: true,
    })

  if (error) {
    console.error("Storage upload error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { data: urlData } = supabaseAdmin.storage
    .from("question-images")
    .getPublicUrl(filename)

  return NextResponse.json({ ok: true, filename, url: urlData.publicUrl })
}