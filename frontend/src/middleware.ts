/**
 * NutriSync — Next.js Middleware
 * Server-side route protection. Runs before any page renders.
 */
import { NextRequest, NextResponse } from "next/server";

// Routes that require a valid JWT token
const PROTECTED_PREFIXES = [
  "/tracker",
  "/meal-plan",
  "/recipes",
  "/chat",
  "/settings",
  "/profile",
  "/admin",
];

// Routes that logged-in users should not see (redirect to dashboard)
const AUTH_ONLY_PATHS = ["/login", "/signup", "/register"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const tokenCookie = req.cookies.get("nutrisync_token")?.value;

  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );
  const isAuthOnly = AUTH_ONLY_PATHS.some((p) => pathname === p);

  // Redirect unauthenticated users away from protected pages
  if (isProtected && !tokenCookie) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("redirect", pathname);
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
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/).*)",
  ],
};
