/**
 * NutriSync — Next.js Middleware
 * Server-side route protection. Runs before any page renders.
 */
import { NextRequest, NextResponse } from "next/server";

// Routes that require a valid JWT token
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/tracker",
  "/meal-plan",
  "/recipes",
  "/chat",
  "/settings",
  "/profile",
  "/admin",
];

/** Decode JWT payload without verifying the signature (middleware has no secret). */
function decodeToken(token: string): { exp?: number } | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    // Base64-decode (handle URL-safe base64)
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/** Deletes the stale token cookie on a given response. */
function clearStaleCookie(response: NextResponse) {
  response.cookies.set("nutrisync_token", "", { maxAge: 0, path: "/" });
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const rawToken = req.cookies.get("nutrisync_token")?.value;

  let tokenActive = false;
  if (rawToken) {
    const decoded = decodeToken(rawToken);
    if (decoded && decoded.exp) {
      tokenActive = decoded.exp * 1000 > Date.now();
    }
  }
  // If the cookie exists but the token is expired, clear it.
  if (rawToken && !tokenActive) {
    const isProtected = PROTECTED_PREFIXES.some((prefix) =>
      pathname.startsWith(prefix)
    );
    if (isProtected) {
      const loginUrl = req.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.searchParams.set("redirect", pathname);
      const res = NextResponse.redirect(loginUrl);
      clearStaleCookie(res);
      return res;
    }
    const res = NextResponse.next();
    clearStaleCookie(res);
    return res;
  }

  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );

  // Redirect unauthenticated users away from protected pages
  if (isProtected && !tokenActive) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/).*)",
  ],
};
