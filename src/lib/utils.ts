import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import i18n from "@/i18n/config"
import { formatRateLimitMessage, getRateLimitInfo } from "@/lib/rateLimit"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

/** Extract user-facing message from API error (message or errors.detail). */
export function getApiErrorMessage(error: unknown, fallback = "An error occurred."): string {
  if (!error) return fallback;
  // 429 / RATE_LIMITED: the server text is English-only ("Too many requests from this IP…"); show the
  // localized sentence with the real wait instead.
  const rateLimit = getRateLimitInfo(error);
  if (rateLimit) return formatRateLimitMessage(rateLimit.retryAfterSeconds, (key, options) => i18n.t(key, options) as string);
  const err = error as {
    response?: { data?: { message?: string; errors?: { detail?: string } } };
    message?: string;
  };
  const msg = err.response?.data?.message;
  const detail = err.response?.data?.errors?.detail;
  return ((typeof msg === "string" && msg) || (typeof detail === "string" && detail) || (err as Error)?.message) ?? fallback;
}
