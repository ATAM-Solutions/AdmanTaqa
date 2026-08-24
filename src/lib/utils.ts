import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

/** Extract user-facing message from API error (message or errors.detail). */
export function getApiErrorMessage(error: unknown, fallback = "An error occurred."): string {
  if (!error) return fallback;
  const err = error as {
    response?: { data?: { message?: string; errors?: { detail?: string } } };
    message?: string;
  };
  const msg = err.response?.data?.message;
  const detail = err.response?.data?.errors?.detail;
  return ((typeof msg === "string" && msg) || (typeof detail === "string" && detail) || (err as Error)?.message) ?? fallback;
}
