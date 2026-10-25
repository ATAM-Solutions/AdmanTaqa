import { describe, expect, it } from "vitest";
import { keepIfEqual, samePermissions, shouldRefreshSession, SESSION_REFRESH_MIN_GAP_MS } from "./sessionRefresh";

describe("session refresh rules", () => {
  it("refreshes only after the minimum gap", () => {
    expect(shouldRefreshSession(10_000, 10_000 - SESSION_REFRESH_MIN_GAP_MS + 1)).toBe(false);
    expect(shouldRefreshSession(10_000, 10_000 - SESSION_REFRESH_MIN_GAP_MS)).toBe(true);
    expect(shouldRefreshSession(1_000_000, 0)).toBe(true);
  });
  it("compares permission lists regardless of order", () => {
    expect(samePermissions(["a", "b"], ["b", "a"])).toBe(true);
    expect(samePermissions(["a"], ["a", "b"])).toBe(false);
    expect(samePermissions(["a", "b"], ["a", "c"])).toBe(false);
    expect(samePermissions([], [])).toBe(true);
  });
  it("keeps the previous reference when nothing changed, so an idle refresh re-renders nothing", () => {
    const prev = { id: 1, roles: [{ name: "x" }] };
    expect(keepIfEqual(prev, { id: 1, roles: [{ name: "x" }] })).toBe(prev);
    const next = { id: 1, roles: [] };
    expect(keepIfEqual(prev, next)).toBe(next);
  });
});
