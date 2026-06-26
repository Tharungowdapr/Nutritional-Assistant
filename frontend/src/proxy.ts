/**
 * NutriSync — Next.js Middleware (disabled)
 *
 * Server-side route protection was causing a race condition:
 * document.cookie writes may not be committed before the next
 * navigation fires, so the middleware couldn't see the token and
 * kept redirecting back to /login.
 *
 * Auth is now handled entirely client-side by AuthProvider.
 * This file is kept as a no-op to avoid build errors.
 */
import { NextRequest, NextResponse } from "next/server";

export function middleware(_req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/).*)",
  ],
};
