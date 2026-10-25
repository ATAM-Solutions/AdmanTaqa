import { describe, expect, it } from "vitest";
import { isSelectionValid, selectionToItems } from "./spareParts";

describe("spare parts selection", () => {
  it("turns the picked parts into request lines with whole quantities", () => {
    expect(selectionToItems({ 5: "2", 9: "3.7" })).toEqual([{ sparePartId: 5, quantity: 2 }, { sparePartId: 9, quantity: 3 }]);
  });
  it("needs at least one part and every quantity at least 1", () => {
    expect(isSelectionValid({})).toBe(false);
    expect(isSelectionValid({ 5: "1" })).toBe(true);
    expect(isSelectionValid({ 5: "0" })).toBe(false);
    expect(isSelectionValid({ 5: "" })).toBe(false);
    expect(isSelectionValid({ 5: "2", 6: "-1" })).toBe(false);
  });
});
