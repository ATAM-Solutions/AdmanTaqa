import { describe, expect, it, vi } from "vitest";

vi.mock("./../config", () => ({ default: { get: vi.fn() } }));

import { withPaymentRecord } from "./stationService";

describe("the API's PaymentRecord reaches the pages as paymentRecord", () => {
  it("maps the PascalCase include (the cause of the invisible payment)", () => {
    const job = withPaymentRecord({ id: 91, status: "AWAITING_PAYMENT", PaymentRecord: { status: "STATION_CONFIRMED_SENT", referenceNumber: "T1" } });
    expect(job?.paymentRecord?.status).toBe("STATION_CONFIRMED_SENT");
    expect(job?.paymentRecord?.referenceNumber).toBe("T1");
  });
  it("keeps an existing camelCase record and leaves a job without a payment alone", () => {
    expect(withPaymentRecord({ id: 1, paymentRecord: { status: "REJECTED" } })?.paymentRecord?.status).toBe("REJECTED");
    expect(withPaymentRecord({ id: 2 })?.paymentRecord).toBeUndefined();
    expect(withPaymentRecord(undefined)).toBeUndefined();
  });
});
