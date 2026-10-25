import axiosInstance from "../config";

/**
 * Fetches a report file through its authenticated download route (Bearer token via the shared axios instance).
 * `downloadUrl` is the absolute URL the API returned; only a URL under the API's own base is requested, so the token is
 * never sent to another host.
 */
export async function fetchSourceReportFile(downloadUrl: string): Promise<Blob> {
  const base = String(axiosInstance.defaults.baseURL ?? "").replace(/\/+$/, "");
  const normalized = downloadUrl.replace(/\/api\/v1\//, "/api/");
  const idx = normalized.indexOf("/api/");
  const relative = normalized.startsWith(`${base}/`)
    ? normalized.slice(base.length + 1)
    : idx >= 0 && base.endsWith("/api") && normalized.slice(0, idx) === base.slice(0, -4)
      ? normalized.slice(idx + 5)
      : null;
  if (relative == null) throw new Error("Unexpected file location");
  const res = await axiosInstance.get<Blob>(relative, { responseType: "blob" });
  return res.data;
}
