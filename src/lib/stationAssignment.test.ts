import { describe, expect, it } from "vitest";
import { sameStationSet } from "./stationAssignment";

describe("sameStationSet", () => {
  it("ignores order", () => expect(sameStationSet([3, 1, 2], [1, 2, 3])).toBe(true));
  it("ignores duplicates", () => expect(sameStationSet([1, 1, 2], [2, 1])).toBe(true));
  it("treats empty as equal to empty (organization-wide)", () => expect(sameStationSet([], [])).toBe(true));
  it("detects a missing station", () => expect(sameStationSet([1, 2], [1])).toBe(false));
  it("detects an extra station", () => expect(sameStationSet([1], [1, 2])).toBe(false));
  it("detects a different station of the same size", () => expect(sameStationSet([1, 2], [1, 3])).toBe(false));
  it("cannot confirm when the server omits the list", () => {
    expect(sameStationSet([1], undefined)).toBe(false);
    expect(sameStationSet([], null)).toBe(false);
  });
  it("compares numerically when ids arrive as strings", () => {
    expect(sameStationSet([1, 2], ["2", "1"] as unknown as number[])).toBe(true);
  });
});
