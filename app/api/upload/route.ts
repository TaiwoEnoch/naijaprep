import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"

export async function POST(req: NextRequest) {
  const form = await req.formData()

  const password = form.get("password") as string | null
  const file = form.get("file") as File | null
  const subject = form.get("subject") as string | null
  const examType = form.get("examType") as string | null
  const year = form.get("year") as string | null
  const imageNumber = form.get("imageNumber") as string | null

  if (!password || password !== process.env.UPLOAD_PAGE_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!file || !subject || !examType || !year || !imageNumber) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  const allowed = ["image/jpeg", "image/jpg", "image/png"]
  if (!allowed.includes(file.type)) {
    return NextResponse.json({ error: "Only JPG and PNG files are allowed" }, { status: 400 })
  }

  const slug = subject.replace(/\s+/g, "_")
  const filename = `${slug}_${examType}_${year}_IMG${imageNumber}.png`

  const buffer = await file.arrayBuffer()

  const { error } = await supabaseAdmin.storage
    .from("question-images")
    .upload(filename, buffer, { contentType: file.type, upsert: true })

  if (error) {
    console.error("Storage upload error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { data: urlData } = supabaseAdmin.storage
    .from("question-images")
    .getPublicUrl(filename)

  return NextResponse.json({ ok: true, filename, url: urlData.publicUrl })
}

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
    return { name: item.name, url: urlData.publicUrl }
  })

  return NextResponse.json({ files })
}
