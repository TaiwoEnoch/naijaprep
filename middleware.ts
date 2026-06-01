import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  if (process.env.NEXT_PUBLIC_MAINTENANCE_MODE === "true") {
    const url = request.nextUrl.clone()
    const pathname = url.pathname
    const allowList = ["/maintenance", "/api/health", "/api/waitlist", "/_next", "/favicon"]
    const isAllowed = allowList.some((path) => pathname.startsWith(path))

    if (!isAllowed) {
      url.pathname = "/maintenance"
      return NextResponse.redirect(url)
    }
  }

  let response = NextResponse.next({ request: { headers: request.headers } })
  const authHeader = request.headers.get("authorization")
  const projectRef = "ouskruinmnukrwwbvtgo"

  const supabase = createServerClient(
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
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )
  await supabase.auth.getUser()
  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
