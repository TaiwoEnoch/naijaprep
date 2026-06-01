"use client"

import { useEffect, useMemo, useState } from "react"
import { ArrowRight, CheckCircle2, Sparkles, ShieldCheck } from "lucide-react"

const STORAGE_KEY = "naijaprep-waitlist-phone"

function sanitizePhone(value: string) {
  const digitsOnly = value.replace(/\D/g, "")
  if (digitsOnly.startsWith("0") && digitsOnly.length === 11) {
    return digitsOnly.slice(1)
  }
  return digitsOnly.slice(0, 10)
}

export default function MaintenancePage() {
  const [phone, setPhone] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [message, setMessage] = useState("")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const storedPhone = window.localStorage.getItem(STORAGE_KEY)
    if (storedPhone) {
      setPhone(storedPhone.replace(/^\+234/, ""))
      setStatus("success")
      setMessage("You are on the list — we will notify you the moment NaijaPrep launches")
    }
  }, [])

  const phoneDisplay = useMemo(() => `+234${phone}`, [phone])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const sanitized = sanitizePhone(phone)

    if (sanitized.length !== 10) {
      setStatus("error")
      setMessage("Please enter a valid Nigerian mobile number.")
      return
    }

    const fullPhone = `+234${sanitized}`
    setStatus("loading")
    setMessage("")

    try {
      window.localStorage.setItem(STORAGE_KEY, fullPhone)
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: fullPhone }),
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error || "Unable to join waitlist.")
      }

      setPhone(sanitized)
      setStatus("success")
      setMessage("You are on the list — we will notify you the moment NaijaPrep launches")
    } catch (error) {
      setStatus("error")
      setMessage(error instanceof Error ? error.message : "Unable to join waitlist.")
    }
  }

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-[#081810] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(20,163,112,0.18),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(77,196,160,0.16),_transparent_28%),radial-gradient(circle_at_bottom,_rgba(10,74,53,0.42),_transparent_35%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <div className="orb orb-one" />
        <div className="orb orb-two" />
        <div className="orb orb-three" />
      </div>

      <style>{`
        @keyframes drift {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(18px, -24px, 0) scale(1.06); }
        }
        .orb {
          position: absolute;
          border-radius: 9999px;
          filter: blur(18px);
          animation: drift 14s ease-in-out infinite;
          background: radial-gradient(circle, rgba(88, 201, 155, 0.42), rgba(15, 110, 86, 0.05) 68%, transparent 72%);
        }
        .orb-one { width: 18rem; height: 18rem; top: 6%; left: 6%; }
        .orb-two { width: 22rem; height: 22rem; top: 18%; right: 6%; animation-delay: -5s; }
        .orb-three { width: 16rem; height: 16rem; bottom: 10%; left: 20%; animation-delay: -9s; }
      `}</style>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-10">
        <div className="w-full max-w-3xl rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-10">
          <header className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#16a36f] to-[#0b553d] shadow-lg shadow-emerald-950/40">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-emerald-200/80">NaijaPrep</p>
                <h1 className="text-lg font-semibold text-white/90">NaijaPrep</h1>
              </div>
            </div>

          </header>

          <div className="mt-14 space-y-6 text-center sm:mt-20">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/15 bg-emerald-300/10 px-4 py-2 text-xs font-medium text-emerald-100/90">
              <ShieldCheck className="h-4 w-4" />
              Building something sharper for exam success
            </div>

            <div className="space-y-4">
              <h2 className="mx-auto max-w-2xl text-4xl font-black tracking-tight text-white sm:text-6xl">
                Something amazing is coming
              </h2>
              <p className="mx-auto max-w-2xl text-base leading-8 text-emerald-50/75 sm:text-lg">
                We are putting the finishing touches on Nigeria&apos;s most advanced exam prep platform. Be the first to know when we launch.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="mx-auto mt-10 max-w-xl">
              <label className="mb-3 block text-left text-sm font-medium text-emerald-100/80" htmlFor="waitlist-phone">
                Join the waitlist
              </label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="flex min-h-14 flex-1 items-center rounded-2xl border border-white/10 bg-[#07130f]/90 px-4 shadow-inner shadow-black/20">
                  <span className="mr-3 text-sm font-semibold text-emerald-100/80">+234</span>
                  <input
                    id="waitlist-phone"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel"
                    maxLength={10}
                    value={phone}
                    onChange={(event) => setPhone(sanitizePhone(event.target.value))}
                    placeholder="8012345678"
                    className="w-full bg-transparent text-base text-white outline-none placeholder:text-emerald-100/30"
                    aria-label="Phone number"
                  />
                </div>
                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#18a16d] to-[#0b5b40] px-6 font-semibold text-white shadow-lg shadow-emerald-950/30 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {status === "loading" ? "Joining..." : "Join Waitlist"}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>

              {mounted && phoneDisplay && (
                <p className="mt-3 text-left text-xs text-emerald-100/45">We will keep this number on file as {phoneDisplay}</p>
              )}

              {message && (
                <div
                  className={`mt-4 rounded-2xl border px-4 py-3 text-left text-sm ${
                    status === "success"
                      ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-50"
                      : "border-rose-400/20 bg-rose-400/10 text-rose-100"
                  }`}
                >
                  {status === "success" && <CheckCircle2 className="mr-2 inline-block h-4 w-4 align-[-2px]" />}
                  {message}
                </div>
              )}
            </form>
          </div>

          <footer className="mt-12 flex flex-col items-center gap-3 border-t border-white/10 pt-6 text-center sm:mt-16">
            <p className="text-xs uppercase tracking-[0.35em] text-emerald-100/50">Covered exams</p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              {["JAMB", "WAEC", "NECO"].map((badge) => (
                <span key={badge} className="rounded-full border border-emerald-200/15 bg-white/5 px-4 py-2 text-xs font-semibold tracking-[0.28em] text-emerald-50/80">
                  {badge}
                </span>
              ))}
            </div>
          </footer>
        </div>
      </div>
    </main>
  )
}