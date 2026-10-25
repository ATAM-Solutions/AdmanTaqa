import { beforeEach, describe, expect, it, vi } from "vitest";

const get = vi.hoisted(() => vi.fn());
vi.mock("./../config", () => ({ default: { get } }));

import { downloadFinalReportPdf, fetchFinalReport } from "./finalReportService";

describe("final report API", () => {
  beforeEach(() => get.mockReset());
  it("work order and request reports use the record's own routes", async () => {
    get.mockResolvedValue({ data: { data: { reference: "MR-WO-000001" } } });
    await fetchFinalReport("workOrder", 4);
    await fetchFinalReport("stationRequest", 9);
    expect(get).toHaveBeenNthCalledWith(1, "internal/work-orders/4/final-report");
    expect(get).toHaveBeenNthCalledWith(2, "station/requests/9/final-report");
  });
  it("the PDF is an authenticated blob request with the chosen language, saved locally (never a public link)", async () => {
    get.mockResolvedValue({ data: new Blob(["%PDF-"], { type: "application/pdf" }) });
    const created = vi.fn(() => "blob:x");
    const revoked = vi.fn();
    Object.assign(URL, { createObjectURL: created, revokeObjectURL: revoked });
    const clicks: string[] = [];
    vi.stubGlobal("document", {
      createElement: () => { const el: { href?: string; download?: string; click: () => void } = { click: () => clicks.push(el.download ?? "") }; return el; },
      body: { appendChild: () => undefined, removeChild: () => undefined },
    });
    await downloadFinalReportPdf("stationRequest", 9, "ar", "MR-ER-000009");
    expect(get).toHaveBeenCalledWith("station/requests/9/final-report/pdf", { params: { lang: "ar" }, responseType: "blob" });
    expect(clicks).toEqual(["maintenance-report-MR-ER-000009-ar.pdf"]);
    expect(revoked).toHaveBeenCalled();
  });
});
