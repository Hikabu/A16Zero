import { NextRequest, NextResponse } from 'next/server'

export const config = {
  matcher: [
    '/profile/:path*',
    '/dashboard/:path*',
    '/hr/:path*',
    '/jobs/:path*',
    '/candidates/:path*',
    '/analytics/:path*',
    '/pipeline/:path*',
    '/settings/:path*',
  ],
}

export default function middleware(request: NextRequest) {
  const accessToken =
    request.cookies.get('access_token')?.value

  const { pathname } = request.nextUrl

  const isProtectedRoute =
    pathname.startsWith('/profile') ||
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/hr') ||
    pathname.startsWith('/jobs') ||
    pathname.startsWith('/candidates') ||
    pathname.startsWith('/analytics') ||
    pathname.startsWith('/pipeline') ||
    pathname.startsWith('/settings')

  if (isProtectedRoute && !accessToken) {
    return NextResponse.redirect(
      new URL('/auth', request.url),
    )
  }

  return NextResponse.next()
}