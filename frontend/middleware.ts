import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// ✅ Use consistent cookie names (prefer refresh-capable ones)
const ACCESS_TOKEN_COOKIE = 'access_token'
const REFRESH_TOKEN_COOKIE = 'refresh_token'
const ROLE_COOKIE_NAME = '16signals-role' // Optional: keep if you store role separately

export const config = {
  matcher: [
    '/profile/:path*',
    '/dashboard/:path*',
    '/hr/:path*',
    '/jobs/:path*',           // Include candidate job routes
    '/candidates/:path*',
    '/analytics/:path*',
    '/pipeline/:path*',
    '/settings/:path*',
  ],
}

// ✅ JWT Decoder (from middleware 2)
function decodeJwt(token: string) {
  try {
    const base64Url = token.split('.')[1]
    if (!base64Url) return null
    let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    while (base64.length % 4) base64 += '='
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    return JSON.parse(jsonPayload)
  } catch {
    return null
  }
}

export default async function middleware(request: NextRequest) {
  try {
    const { pathname } = request.nextUrl

    // ✅ Route categorization (combine both)
    const isCandidateRoute = pathname.startsWith('/profile') || 
                             pathname.startsWith('/jobs') ||
                             pathname.startsWith('/candidates')
    const isEmployerRoute = pathname.startsWith('/hr') ||
                            pathname.startsWith('/dashboard') ||
                            pathname.startsWith('/analytics') ||
                            pathname.startsWith('/pipeline') ||
                            pathname.startsWith('/settings')

    // Skip middleware for public routes
    if (!isCandidateRoute && !isEmployerRoute) {
      return NextResponse.next()
    }

    // ✅ Get tokens
    const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value
    const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value

    let payload = accessToken ? decodeJwt(accessToken) : null
    const now = Math.floor(Date.now() / 1000)

    let isTokenValid = payload?.exp && payload.exp > now
    let newCookies: string[] = []

    // ✅ Token refresh logic (if expired)
    if (!isTokenValid) {
      if (!refreshToken) {
        return NextResponse.redirect(new URL('/auth?clear_session=true', request.url))
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
      const refreshEndpoint = isEmployerRoute 
        ? '/auth/employer/refresh' 
        : '/auth/candidate/refresh'

      const refreshRes = await fetch(`${apiUrl}${refreshEndpoint}`, {
        method: 'POST',
        headers: { Cookie: `${REFRESH_TOKEN_COOKIE}=${refreshToken}` },
      })

      if (!refreshRes.ok) {
        return NextResponse.redirect(new URL('/auth?clear_session=true', request.url))
      }

      // ✅ Handle Set-Cookie from refresh response
      const setCookies = refreshRes.headers.getSetCookie?.() || []
      newCookies = setCookies.length > 0 
        ? setCookies 
        : [refreshRes.headers.get('Set-Cookie')].filter(Boolean) as string[]

      // ✅ Extract new access token from response
      try {
        const body = await refreshRes.json()
        const newToken = body?.data?.accessToken || body?.access_token
        if (newToken) payload = decodeJwt(newToken)
      } catch {
        // Fallback: use existing payload if body parsing fails
      }
    }

    // ✅ Validate payload and role
    if (!payload?.role) {
      return NextResponse.redirect(new URL('/auth?clear_session=true', request.url))
    }

    const role = String(payload.role).toLowerCase()

    // ✅ Role-based route protection
    if (isCandidateRoute && role !== 'candidate') {
      return NextResponse.redirect(new URL('/auth?clear_session=true', request.url))
    }

    if (isEmployerRoute && !['employer', 'hr', 'hr_admin'].includes(role)) {
      return NextResponse.redirect(new URL('/profile', request.url))
    }

    // ✅ Inject role header for downstream use
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-user-role', role)

    const response = NextResponse.next({ request: { headers: requestHeaders } })

    // ✅ Apply refreshed cookies if any
    newCookies.forEach((cookie) => response.headers.append('Set-Cookie', cookie))

    return response
  } catch {
    return NextResponse.redirect(new URL('/auth?clear_session=true', request.url))
  }
}