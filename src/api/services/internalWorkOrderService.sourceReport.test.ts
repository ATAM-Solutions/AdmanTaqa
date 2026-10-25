import { beforeEach, describe, expect, it, vi } from "vitest";

const get = vi.fn();
vi.mock("@/api/config", () => ({ default: { get: (...a: unknown[]) => get(...a) } }));

import { fetchInternalWorkOrderById } from "./internalWorkOrderService";

beforeEach(() => get.mockReset());

describe("work order detail keeps the report's files", () => {
  it("carries sourceReport.attachments through the normalizer (it used to be dropped)", async () => {
    const attachments = [{ id: 1, fileType: "IMAGE", caption: "leak", downloadUrl: "https://b/api/internal/work-orders/5/source-report/attachments/1/file" }];
    get.mockResolvedValue({ data: { data: { id: 5, title: "t", status: "OPEN", sourceReport: { id: 9, attachments } } } });
    const order = await fetchInternalWorkOrderById(5);
    expect(order?.sourceReport?.attachments).toEqual(attachments);
  });
  it("is null when the order has no source report", async () => {
    get.mockResolvedValue({ data: { data: { id: 5, title: "t", status: "OPEN", sourceReport: null } } });
    expect((await fetchInternalWorkOrderById(5))?.sourceReport).toBeNull();
  });
});
