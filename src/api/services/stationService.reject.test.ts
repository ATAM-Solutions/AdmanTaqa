import { beforeEach, describe, expect, it, vi } from "vitest";

const post = vi.hoisted(() => vi.fn());
vi.mock("./../config", () => ({ default: { post, get: vi.fn() } }));

import { rejectReport, rejectStationJobOrder, rejectStationRequestQuote } from "./stationService";

describe("station rejections send the field names the API validates", () => {
  beforeEach(() => post.mockReset().mockResolvedValue({ data: {} }));

  it("report reject: `reason` from the UI becomes `rejectionReason` (the API requires it)", async () => {
    await rejectReport(7, { reason: "photos missing" });
    expect(post).toHaveBeenCalledWith("station/reports/7/reject", { rejectionReason: "photos missing" });
  });
  it("report reject keeps an explicit rejectionReason and optional review note", async () => {
    await rejectReport(7, { rejectionReason: "bad", reviewNote: "see photos" });
    expect(post).toHaveBeenCalledWith("station/reports/7/reject", { rejectionReason: "bad", reviewNote: "see photos" });
  });
  it("job order reject and quote reject use rejectionReason too", async () => {
    await rejectStationJobOrder(3, { reason: "redo" });
    expect(post.mock.calls[0][1]).toMatchObject({ rejectionReason: "redo" });
    await rejectStationRequestQuote(4, { providerQuoteId: 9, rejectionReason: "too high" });
    expect(post.mock.calls[1][1]).toEqual({ providerQuoteId: 9, rejectionReason: "too high" });
  });
});
