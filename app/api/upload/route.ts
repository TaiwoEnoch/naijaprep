import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"

// POST — upload a single file with a pre-generated filename
export async function POST(req: NextRequest) {
  const form = await req.formData()

  const password = form.get("password") as string | null
  const file = form.get("file") as File | null
  const filename = form.get("filename") as string | null

  if (!password || password !== process.env.UPLOAD_PAGE_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

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

// DELETE — remove a file from storage
export async function DELETE(req: NextRequest) {
  const { filename, password } = await req.json().catch(() => ({}))

  if (!password || password !== process.env.UPLOAD_PAGE_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!filename) {
    return NextResponse.json({ error: "Missing filename" }, { status: 400 })
  }

  const { error } = await supabaseAdmin.storage
    .from("question-images")
    .remove([filename])

  if (error) {
    console.error("Storage delete error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, deleted: true, filename })
}

// GET — list uploaded images
export async function GET(req: NextRequest) {
  const password = req.headers.get("x-upload-password")
  if (!password || password !== process.env.UPLOAD_PAGE_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data, error } = await supabaseAdmin.storage
    .from("question-images")
    .list("", { limit: 500, sortBy: { column: "created_at", order: "desc" } })

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