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

import { partsFormState } from "./spareParts";

describe("parts form state", () => {
  const q = (o: Partial<{ isLoading: boolean; isError: boolean; isSuccess: boolean }>) => ({ isLoading: false, isError: false, isSuccess: false, ...o });
  it("shows the picker whenever there are warehouse parts", () => expect(partsFormState(q({ isSuccess: true }), 2, false)).toBe("picker"));
  it("explains an empty catalogue (the written request applies then)", () => expect(partsFormState(q({ isSuccess: true }), 0, false)).toBe("empty"));
  it("an error is shown with retry, never silently replaced by the textarea", () => {
    expect(partsFormState(q({ isError: true }), 0, false)).toBe("error");
    expect(partsFormState(q({ isError: true }), 0, true)).toBe("manual");
  });
  it("loading (or not started yet) never looks like the written form", () => {
    expect(partsFormState(q({ isLoading: true }), 0, false)).toBe("loading");
    expect(partsFormState(q({}), 0, false)).toBe("loading");
  });
});
