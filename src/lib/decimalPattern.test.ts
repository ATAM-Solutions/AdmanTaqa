import { describe, expect, it } from "vitest";
import { currencyDecimals, decimalPattern } from "./decimalPattern";

describe("decimalPattern follows the currency's minor units", () => {
  it("2 decimals (SAR, USD...)", () => {
    const re = decimalPattern(2);
    expect(["10", "10.5", "10.55"].every((v) => re.test(v))).toBe(true);
    expect(["10.555", "-1", "1e3", "", ".5", "1,5"].some((v) => re.test(v))).toBe(false);
  });
  it("3 decimals (OMR, KWD, BHD) accept 250.500 and 1250.5", () => {
    const re = decimalPattern(3);
    expect(["250.500", "1250.5", "0.001", "7"].every((v) => re.test(v))).toBe(true);
    expect(re.test("1.2345")).toBe(false);
  });
  it("0 decimals accepts whole numbers only", () => {
    const re = decimalPattern(0);
    expect(re.test("1200")).toBe(true);
    expect(re.test("1200.5")).toBe(false);
  });
});

describe("currencyDecimals", () => {
  it("knows the three-decimal and zero-decimal currencies, defaults to 2", () => {
    expect(["OMR", "kwd", "BHD"].map(currencyDecimals)).toEqual([3, 3, 3]);
    expect(currencyDecimals("JPY")).toBe(0);
    expect([currencyDecimals("SAR"), currencyDecimals(null), currencyDecimals(undefined)]).toEqual([2, 2, 2]);
  });
});
