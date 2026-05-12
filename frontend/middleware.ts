import { NextRequest, NextResponse } from "next/server";

type Role = "candidate" | "employer";

const PROTECTED_PREFIXES = [
  "/profile",
  "/dashboard",
  "/hr",
  "/jobs",
  "/candidates",
  "/analytics",
  "/pipeline",
  "/settings",
] as const;

const EMPLOYER_PREFIXES = [
  "/dashboard",
  "/hr",
  "/candidates",
  "/analytics",
  "/pipeline",
] as const;

const CANDIDATE_PREFIXES = ["/profile", "/jobs", "/settings"] as const;

export const config = {
  matcher: [
    "/profile/:path*",
    "/dashboard/:path*",
    "/hr/:path*",
    "/jobs/:path*",
    "/candidates/:path*",
    "/analytics/:path*",
    "/pipeline/:path*",
    "/settings/:path*",
  ],
};

function startsWithAny(pathname: string, prefixes: readonly string[]) {
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function requiredRoleForPath(pathname: string): Role | null {
  if (startsWithAny(pathname, EMPLOYER_PREFIXES)) return "employer";
  if (startsWithAny(pathname, CANDIDATE_PREFIXES)) return "candidate";
  return null;
}

function redirectToAuth(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = "/auth";
  url.search = "";
  url.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(url);
}

function redirectForRole(request: NextRequest, role: Role) {
  const url = request.nextUrl.clone();
  url.pathname = role === "employer" ? "/dashboard" : "/profile";
  url.search = "";
  return NextResponse.redirect(url);
}

async function refreshFromMiddleware(request: NextRequest, role: Role | null) {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiBaseUrl) return null;

  const roles: Role[] = role ? [role] : ["candidate", "employer"];
  const cookie = request.headers.get("cookie") ?? "";

  for (const nextRole of roles) {
    const endpoint =
      nextRole === "employer"
        ? "/auth/employer/refresh"
        : "/auth/candidate/refresh";

    const response = await fetch(new URL(endpoint, apiBaseUrl), {
      method: "POST",
      headers: {
        cookie,
        accept: "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) continue;

    const next = NextResponse.next();
    const setCookies =
      (response.headers as unknown as { getSetCookie?: () => string[] })
        .getSetCookie?.() ??
      (response.headers.get("set-cookie")
        ? [response.headers.get("set-cookie") as string]
        : []);

    for (const cookie of setCookies) {
      next.headers.append("set-cookie", cookie);
    }
    return next;
  }

  return null;
}

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!startsWithAny(pathname, PROTECTED_PREFIXES)) {
    return NextResponse.next();
  }

  const accessToken = request.cookies.get("access_token")?.value;
  const refreshToken = request.cookies.get("refresh_token")?.value;
  const roleCookie = request.cookies.get("16signals-role")?.value as
    | Role
    | undefined;
  const requiredRole = requiredRoleForPath(pathname);

  if (!accessToken && refreshToken) {
    const refreshed = await refreshFromMiddleware(request, roleCookie ?? requiredRole);
    if (refreshed) return refreshed;
  }

  if (!accessToken) {
    return redirectToAuth(request);
  }

  if (
    requiredRole &&
    (roleCookie === "candidate" || roleCookie === "employer") &&
    roleCookie !== requiredRole
  ) {
    return redirectForRole(request, roleCookie);
  }

  return NextResponse.next();
}
