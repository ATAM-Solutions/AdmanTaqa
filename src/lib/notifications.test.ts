import { describe, expect, it } from "vitest";
import { getNotificationText, getNotificationWebPath } from "./notifications";

describe("getNotificationText", () => {
  const item = { title: "Report rejected", body: "Report #1 was rejected.", titleAr: "تم رفض البلاغ", bodyAr: "تم رفض البلاغ رقم 1." };
  it("uses Arabic text in the Arabic UI and English otherwise", () => {
    expect(getNotificationText(item, "ar")).toEqual({ title: "تم رفض البلاغ", body: "تم رفض البلاغ رقم 1." });
    expect(getNotificationText(item, "en")).toEqual({ title: "Report rejected", body: "Report #1 was rejected." });
  });
  it("falls back to the stored text when there is no Arabic rendering (ad-hoc notification types)", () => {
    expect(getNotificationText({ title: "Test", body: null, titleAr: null, bodyAr: null }, "ar")).toEqual({ title: "Test", body: null });
  });
});

describe("getNotificationWebPath", () => {
  it("maps a maintenance-report notification to the admin report page for stations", () => {
    expect(getNotificationWebPath({ entity: { type: "maintenance_issue", id: 12 } }, "FUEL_STATION")).toBe("/maintenance-reports/12");
  });
  it("never links an organization type to a page it does not have", () => {
    expect(getNotificationWebPath({ entity: { type: "maintenance_issue", id: 12 } }, "SERVICE_PROVIDER")).toBeNull();
    expect(getNotificationWebPath({ entity: { type: "job_order", id: 3 } }, "SERVICE_PROVIDER")).toBe("/provider-job-orders/3");
  });
  it("returns null without a usable entity", () => {
    expect(getNotificationWebPath({ entity: null }, "FUEL_STATION")).toBeNull();
    expect(getNotificationWebPath({ entity: { type: "maintenance_issue", id: 0 } }, "FUEL_STATION")).toBeNull();
    expect(getNotificationWebPath({ entity: { type: "warehouse_order", id: 5 } }, "FUEL_STATION")).toBeNull();
  });
});
