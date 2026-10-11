import { describe, expect, it } from "vitest";
import { geoName, geoPathLabel, getApiErrorCode } from "./geography";

describe("geoName", () => {
  const node = { name: "Makkah Al Mukarramah", nameAr: "مكة المكرمة" };
  it("uses the Arabic name in the Arabic UI and English otherwise", () => {
    expect(geoName(node, "ar")).toBe("مكة المكرمة");
    expect(geoName(node, "ar-SA")).toBe("مكة المكرمة");
    expect(geoName(node, "en")).toBe("Makkah Al Mukarramah");
  });
  it("falls back to the other language for legacy rows without nameAr", () => {
    expect(geoName({ name: "Al Awali", nameAr: null }, "ar")).toBe("Al Awali");
    expect(geoName({ name: "", nameAr: "العوالي" }, "en")).toBe("العوالي");
  });
  it("is empty for missing nodes", () => {
    expect(geoName(null, "en")).toBe("");
  });
});

describe("geoPathLabel / getApiErrorCode", () => {
  it("joins non-empty parts", () => {
    expect(geoPathLabel([{ name: "Al Rawdah" }, null, { name: "Jeddah" }], "en")).toBe("Al Rawdah · Jeddah");
  });
  it("reads the stable error code", () => {
    expect(getApiErrorCode({ response: { data: { code: "GEOGRAPHY_IN_USE" } } })).toBe("GEOGRAPHY_IN_USE");
    expect(getApiErrorCode(new Error("x"))).toBeNull();
  });
});
