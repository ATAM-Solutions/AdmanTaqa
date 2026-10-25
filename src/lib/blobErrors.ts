/**
 * A request made with `responseType: "blob"` that FAILS carries its JSON error body as a Blob, so `error.response.data.code`
 * is unreadable. This reads that Blob once and puts the parsed body back, so the usual status/code classification works.
 */
export async function withParsedBlobError<E>(error: E): Promise<E> {
  const response = (error as { response?: { data?: unknown } } | null)?.response;
  if (response && typeof Blob !== "undefined" && response.data instanceof Blob) {
    try {
      const text = await response.data.text();
      response.data = text ? JSON.parse(text) : {};
    } catch {
      response.data = {};
    }
  }
  return error;
}
