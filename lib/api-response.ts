import { NextResponse } from "next/server"

export const ok = (data: unknown, status = 200) =>
  NextResponse.json({ data, success: true }, { status })

export const err = (message: string, status = 400) =>
  NextResponse.json({ error: message, success: false }, { status })

export const rateLimitErr = (reset: number) =>
  NextResponse.json(
    { error: "Too many requests. Please slow down.", success: false },
    { status: 429, headers: { "Retry-After": String(reset) } }
  )
