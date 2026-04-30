/**
 * AaharAI NutriSync — Next.js Middleware
 * Server-side route protection. Runs before any page renders.
 * Replaces client-side-only ProtectedRoute which flashed content before redirecting.
 */
import { NextRequest, NextResponse } from "next/server";

// Routes that require a valid JWT token
const PROTECTED_PREFIXES = [
  "/tracker",
  "/meal-plan",
  "/recipes",
  "/chat",
  "/analysis",
  "/explore",
  "/settings",
  "/profile",
  "/admin",
];

// Routes that logged-in users should not see (redirect to dashboard)
const AUTH_ONLY_PATHS = ["/login", "/signup", "/register"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Read token from cookie (preferred) or Authorization header
  // The token is stored in localStorage on the client, so we also check
  // a nutrisync_token cookie that auth.ts should set on login.
  const tokenCookie = req.cookies.get("nutrisync_token")?.value;

  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );
  const isAuthOnly = AUTH_ONLY_PATHS.some((p) => pathname === p);

  // Redirect unauthenticated users away from protected pages
  if (isProtected && !tokenCookie) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname); // preserve intended destination
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from login/signup
  if (isAuthOnly && tokenCookie) {
    const homeUrl = req.nextUrl.clone();
    homeUrl.pathname = "/";
    return NextResponse.redirect(homeUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Run on all routes except Next.js internals and static files
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/).*)",
  ],
};
