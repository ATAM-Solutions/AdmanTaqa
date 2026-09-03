/**
 * Resolves a media reference returned by the API into a URL the browser can load.
 *
 * The backend stores local uploads as public paths ("/uploads/…") and prefixes
 * them with PUBLIC_BASE_URL when that env var is set. When it is not (local dev,
 * or a deployment that forgot it), the path would otherwise resolve against the
 * admin app's own origin — so we fall back to the API origin derived from VITE_API_URL.
 */
export function resolveMediaUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  if (/^(https?:)?\/\//i.test(value) || value.startsWith("data:") || value.startsWith("blob:")) return value;
  const apiUrl = (import.meta.env.VITE_API_URL as string | undefined) ?? "";
  try {
    const origin = new URL(apiUrl, window.location.origin).origin;
    return `${origin}${value.startsWith("/") ? value : `/${value}`}`;
  } catch {
    return value;
  }
}
