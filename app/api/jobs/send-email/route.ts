import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { Receiver } from "@upstash/qstash"
import { Resend } from "resend"
import * as Sentry from "@sentry/nextjs"

export async function POST(req: NextRequest) {
  try {
    // 1. Verify QStash signature
    const signature = req.headers.get("upstash-signature") || ""
    const bodyText = await req.text()

    const receiver = new Receiver({
      currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY!,
      nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY!,
    })

    const isValid = await receiver.verify({
      signature,
      body: bodyText,
    }).catch(() => false)

    if (!isValid) {
      console.warn("Unauthorized QStash signature on send-email job")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = JSON.parse(bodyText)
    const { userId, type } = payload

    if (!userId || !type) {
      return NextResponse.json({ error: "Missing required parameters: userId and type" }, { status: 400 })
    }

    // Fetch user details from public users table
    const { data: dbUser, error: userError } = await supabaseAdmin
      .from("users")
      .select("first_name, phone")
      .eq("id", userId)
      .single()

    if (userError || !dbUser) {
      throw new Error(`User not found: ${userError?.message || ""}`)
    }

    // Retrieve email from Auth or fallback to phone-based email
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId)
    const email = authUser?.user?.email || `${dbUser.phone}@naijaprep.com`
    const firstName = dbUser.first_name

    // Prepare email contents based on type
    let subject = ""
    let htmlContent = ""

    if (type === "subscription") {
      subject = "Subscription Activated! - NaijaPrep"
      htmlContent = `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2>Congratulations, ${firstName}!</h2>
          <p>Your Pro subscription plan has been successfully activated on NaijaPrep.</p>
          <p>You now have unlimited daily questions, full access to mock exams, performance statistics, and AI-powered step-by-step explanations.</p>
          <p>Happy learning!</p>
          <hr/>
          <p style="font-size: 12px; color: #888;">This is a transactional email from NaijaPrep.</p>
        </div>
      `
    } else if (type === "welcome") {
      subject = "Welcome to NaijaPrep!"
      htmlContent = `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2>Welcome to NaijaPrep, ${firstName}!</h2>
          <p>We are excited to help you prepare and ace your upcoming WAEC, NECO, or JAMB exams.</p>
          <p>Get started by practicing weak topics, taking mock exams, and tracking your streaks.</p>
          <p>Let's unlock your potential together!</p>
          <hr/>
          <p style="font-size: 12px; color: #888;">NaijaPrep team.</p>
        </div>
      `
    } else if (type === "streak_alert") {
      subject = "Keep your practice streak alive! 🔥"
      htmlContent = `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2>Don't break your streak, ${firstName}!</h2>
          <p>You've been doing great. Take a quick practice session today to keep your exam preparation momentum active.</p>
          <p>Practice makes perfect!</p>
          <hr/>
          <p style="font-size: 12px; color: #888;">NaijaPrep team.</p>
        </div>
      `
    } else {
      return NextResponse.json({ error: "Invalid email notification type" }, { status: 400 })
    }

    // Call Resend client API
    const resend = new Resend(process.env.RESEND_API_KEY!)
    const { error: sendError } = await resend.emails.send({
      from: process.env.FROM_EMAIL || "NaijaPrep <info@naijaprep.com>",
      to: email,
      subject: subject,
      html: htmlContent,
    })

    if (sendError) {
      throw new Error(`Resend email delivery failed: ${sendError.message}`)
    }

    return NextResponse.json({ data: { sent: true }, success: true })
  } catch (error: any) {
    Sentry.captureException(error)
    console.error("QStash email send job error:", error)
    return NextResponse.json({ error: error?.message, success: false }, { status: 500 })
  }
}

export const dynamic = "force-dynamic"
