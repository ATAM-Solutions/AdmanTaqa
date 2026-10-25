import { beforeEach, describe, expect, it, vi } from "vitest";

const get = vi.fn();
vi.mock("@/api/config", () => ({ default: { defaults: { baseURL: "https://backend.servexa.tech/api/" }, get: (...a: unknown[]) => get(...a) } }));

import { fetchSourceReportFile } from "./sourceReportService";

beforeEach(() => get.mockReset());

describe("fetchSourceReportFile", () => {
  it("requests the API route as a blob through the authenticated client", async () => {
    const blob = new Blob(["x"]);
    get.mockResolvedValue({ data: blob });
    const out = await fetchSourceReportFile("https://backend.servexa.tech/api/internal/work-orders/60/source-report/attachments/9/file");
    expect(get).toHaveBeenCalledWith("internal/work-orders/60/source-report/attachments/9/file", { responseType: "blob" });
    expect(out).toBe(blob);
  });
  it("accepts the /api/v1 alias", async () => {
    get.mockResolvedValue({ data: new Blob() });
    await fetchSourceReportFile("https://backend.servexa.tech/api/v1/station/requests/3/source-report/attachments/4/file");
    expect(get.mock.calls[0][0]).toBe("station/requests/3/source-report/attachments/4/file");
  });
  it("never sends the token to another host", async () => {
    await expect(fetchSourceReportFile("https://evil.example/api/internal/work-orders/1/source-report/attachments/1/file")).rejects.toThrow();
    await expect(fetchSourceReportFile("https://backend.servexa.tech.evil.example/api/x")).rejects.toThrow();
    expect(get).not.toHaveBeenCalled();
  });
});
