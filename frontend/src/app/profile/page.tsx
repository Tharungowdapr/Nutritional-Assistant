"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
// Profile is now a tab inside /settings
export default function ProfileRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/settings"); }, [router]);
  return null;
}
