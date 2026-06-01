import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const { password } = await req.json().catch(() => ({}))

  if (!password || password !== process.env.UPLOAD_PAGE_PASSWORD) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 })
  }

  return NextResponse.json({ ok: true })
}