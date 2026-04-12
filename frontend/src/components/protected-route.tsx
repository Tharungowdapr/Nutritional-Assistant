"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { Skeleton } from "./ui/skeleton";

const PUBLIC_ROUTES = ["/login", "/signup", "/forgot-password", "/reset-password"];

interface ProtectedRouteProps {
  children: React.ReactNode;
}

function FullPageSkeleton() {
  return (
    <div className="w-full max-w-2xl mx-auto space-y-6 p-8">
      <Skeleton className="h-12 w-48" />
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    </div>
  );
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user && !PUBLIC_ROUTES.includes(pathname)) {
      // Redirect to login with the originally requested page
      const redirectUrl = `/login?redirect=${encodeURIComponent(pathname)}`;
      router.replace(redirectUrl);
    }
  }, [user, loading, pathname, router]);

  // Show loading skeleton while checking auth
  if (loading) {
    return <FullPageSkeleton />;
  }

  // If not authenticated and not on public route, don't render
  if (!user && !PUBLIC_ROUTES.includes(pathname)) {
    return null;
  }

  return <>{children}</>;
}
