import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Returns a user-scoped key for localStorage to prevent data sharing between accounts.
 */
export function getStorageKey(baseKey: string, userId: string | number | null | undefined): string {
  if (!userId) return baseKey;
  return `user_${userId}_${baseKey}`;
}
