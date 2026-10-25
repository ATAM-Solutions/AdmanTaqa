import { beforeEach, describe, expect, it, vi } from "vitest";

const patch = vi.hoisted(() => vi.fn());
vi.mock("./../config", () => ({ default: { patch, get: vi.fn(), post: vi.fn(), put: vi.fn() } }));

import { normalizeOrder, runOrderAction } from "./warehouseService";

describe("warehouse order actions send the bodies the API validates", () => {
  beforeEach(() => patch.mockReset().mockResolvedValue({ data: {} }));

  it("a full approval and a full issue send no body (the server defaults apply)", async () => {
    await runOrderAction(5, { kind: "approve" });
    await runOrderAction(5, { kind: "issue" });
    expect(patch).toHaveBeenNthCalledWith(1, "warehouse-orders/5/approve", {});
    expect(patch).toHaveBeenNthCalledWith(2, "warehouse-orders/5/issue", {});
  });
  it("a partial approval sends itemDecisions with approved quantities or NOT_AVAILABLE", async () => {
    const decisions = [{ itemId: 1, status: "APPROVED" as const, approvedQuantity: 2 }, { itemId: 2, status: "NOT_AVAILABLE" as const }];
    await runOrderAction(5, { kind: "approve", decisions });
    expect(patch).toHaveBeenCalledWith("warehouse-orders/5/approve", { itemDecisions: decisions });
  });
  it("issue quantities use itemIssuedQuantities", async () => {
    await runOrderAction(5, { kind: "issue", quantities: [{ itemId: 1, quantity: 3 }] });
    expect(patch).toHaveBeenCalledWith("warehouse-orders/5/issue", { itemIssuedQuantities: [{ itemId: 1, quantity: 3 }] });
  });
  it("sending a return back carries the reason", async () => {
    await runOrderAction(5, { kind: "rejectReturn", reason: "count again" });
    expect(patch).toHaveBeenCalledWith("warehouse-orders/5/return/reject-submission", { reason: "count again" });
  });
});

describe("normalizeOrder keeps the quantity trail", () => {
  it("maps requested, approved, issued, used, returned and the stock level", () => {
    const o = normalizeOrder({
      id: 9, status: "DELIVERED",
      WarehouseOrderItems: [{ id: 1, partName: "Filter", quantity: 4, approvedQuantity: 3, issuedQuantity: 3, usedQuantity: 2, returnedQuantity: 1, availableQuantity: 7, status: "DELIVERED", sparePartId: 5 },
        { id: 2, partName: "Free text", quantity: 1, status: "REQUESTED" }],
    });
    expect(o?.items[0]).toMatchObject({ quantity: 4, approvedQuantity: 3, issuedQuantity: 3, usedQuantity: 2, returnedQuantity: 1, availableQuantity: 7 });
    expect(o?.items[1]).toMatchObject({ usedQuantity: null, returnedQuantity: null, availableQuantity: null });
  });
});
