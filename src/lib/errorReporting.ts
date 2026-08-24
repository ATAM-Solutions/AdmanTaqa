/**
 * Single centralized place for logging caught errors, so the logging
 * destination (currently just the console) only needs to change in one spot.
 */
export function reportError(context: string, error: unknown, extra?: unknown): void {
  const err = error as { response?: { data?: unknown }; message?: string } | undefined;
  const detail = err?.response?.data ?? err?.message ?? error;

  if (extra !== undefined) {
    console.error(context, detail, extra);
  } else {
    console.error(context, detail);
  }
}
