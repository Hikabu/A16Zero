import { CookieOptions, Request, Response } from 'express';

export const ACCESS_COOKIE = 'access_token';
export const REFRESH_COOKIE = 'refresh_token';
export const ROLE_COOKIE = '16signals-role';

export const ACCESS_TOKEN_MAX_AGE_MS = 1000 * 60 * 15;
export const REFRESH_TOKEN_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30;

function isProduction() {
  return process.env.NODE_ENV === 'production';
}

export function getAuthCookieOptions(maxAge?: number): CookieOptions {
  return {
    httpOnly: true,
    secure: isProduction(),
    sameSite: isProduction() ? 'none' : 'lax',
    path: '/',
    ...(maxAge ? { maxAge } : {}),
  };
}

export function getRoleCookieOptions(maxAge?: number): CookieOptions {
  return {
    httpOnly: false,
    secure: isProduction(),
    sameSite: isProduction() ? 'none' : 'lax',
    path: '/',
    ...(maxAge ? { maxAge } : {}),
  };
}

export function setAuthCookies(
  res: Response,
  tokens: { accessToken: string; refreshToken: string; role: string },
) {
  res.cookie(
    ACCESS_COOKIE,
    tokens.accessToken,
    getAuthCookieOptions(ACCESS_TOKEN_MAX_AGE_MS),
  );
  res.cookie(
    REFRESH_COOKIE,
    tokens.refreshToken,
    getAuthCookieOptions(REFRESH_TOKEN_MAX_AGE_MS),
  );
  res.cookie(
    ROLE_COOKIE,
    tokens.role.toLowerCase(),
    getRoleCookieOptions(REFRESH_TOKEN_MAX_AGE_MS),
  );
}

export function clearAuthCookies(res: Response) {
  res.clearCookie(ACCESS_COOKIE, getAuthCookieOptions());
  res.clearCookie(REFRESH_COOKIE, getAuthCookieOptions());
  res.clearCookie(ROLE_COOKIE, getRoleCookieOptions());
}

export function getCookieToken(req: Request | any, name: string): string | null {
  return req?.cookies?.[name] ?? null;
}
