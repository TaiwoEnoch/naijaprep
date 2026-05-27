import { createServerClient } from "@supabase/ssr"
import { cookies, headers } from "next/headers"

export function createClient() {
  const cookieStore = cookies()
  const reqHeaders = headers()
  const authHeader = reqHeaders.get("authorization")
  const projectRef = "ouskruinmnukrwwbvtgo"

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          if (authHeader && authHeader.startsWith("Bearer ")) {
            const token = authHeader.substring(7)
            const session = {
              access_token: token,
              refresh_token: "",
              expires_in: 3600,
              expires_at: Math.floor(Date.now() / 1000) + 3600,
              token_type: "bearer",
              user: {},
            }
            return [
              {
                name: `sb-${projectRef}-auth-token`,
                value: JSON.stringify(session),
              },
            ]
          }
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing sessions.
          }
        },
      },
    }
  )
}
