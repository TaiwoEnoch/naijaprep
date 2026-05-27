import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { enqueue } from "@/lib/queue"
import * as Sentry from "@sentry/nextjs"
import crypto from "crypto"

export async function POST(req: NextRequest) {
  try {
    // 1. Read raw body as text (NO rate limit, NO auth checks)
    const rawBody = await req.text()

    // 2. Verify HMAC-SHA512 signature
    const expectedSignature = crypto
      .createHmac("sha512", process.env.PAYSTACK_WEBHOOK_SECRET!)
      .update(rawBody)
      .digest("hex")

    const receivedSignature = req.headers.get("x-paystack-signature")

    if (expectedSignature !== receivedSignature) {
      console.warn("Paystack webhook signature mismatch")
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    }

    const event = JSON.parse(rawBody)

    // 3. Handle event types: charge.success
    if (event.event === "charge.success") {
      const data = event.data
      const reference = data.reference
      const metadata = data.metadata

      if (!metadata || !metadata.userId || !metadata.plan) {
        console.error("Missing metadata details in webhook event:", reference)
        return NextResponse.json({ received: true })
      }

      const { userId, plan, billingCycle } = metadata

      // Calculate expiration date based on plan / billingCycle
      let days = 30
      if (plan === "school") {
        days = 120 // 4 months for school term
      } else if (billingCycle === "annual") {
        days = 365
      }

      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + days)

      // Update payment record in database
      const { data: paymentRecord, error: paymentError } = await supabaseAdmin
        .from("payments")
        .update({
          status: "success",
          paystack_data: data,
        })
        .eq("reference", reference)
        .select()
        .single()

      if (paymentError) {
        throw new Error(`Failed to update payment status: ${paymentError.message}`)
      }

      // Update users table plan and expiration date
      const { error: userError } = await supabaseAdmin
        .from("users")
        .update({
          plan: plan,
          plan_expires_at: expiresAt.toISOString(),
        })
        .eq("id", userId)

      if (userError) {
        throw new Error(`Failed to update user plan: ${userError.message}`)
      }

      // Insert subscription record (ensure billingCycle conforms to CHECK constraint 'monthly'/'annual')
      const dbBillingCycle = plan === "school" ? "annual" : (billingCycle || "monthly")

      const { error: subError } = await supabaseAdmin
        .from("subscriptions")
        .insert({
          user_id: userId,
          plan: plan,
          billing_cycle: dbBillingCycle,
          amount_kobo: paymentRecord.amount_kobo,
          status: "active",
          paystack_sub_code: data.subscription_code || null,
          started_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
        })

      if (subError) {
        throw new Error(`Failed to create subscription record: ${subError.message}`)
      }

      // Queue welcome / confirmation email via QStash
      await enqueue("/api/jobs/send-email", { userId, type: "subscription" }).catch((e) => {
        console.error("Subscription email queueing failed:", e)
      })
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    Sentry.captureException(error)
    console.error("Paystack webhook processing error:", error)
    // Always return 200 to prevent Paystack from retrying webhook delivery repeatedly
    return NextResponse.json({ received: true, error: error?.message })
  }
}

export const dynamic = "force-dynamic"
