import { describe, expect, it, vi } from "vitest";
import type { ApiUser } from "@/types/user";
import { fetchAllCompanyUsers, userDetailPath } from "./userDirectory";
import detailHook from "@/hooks/Users/useGetUserById.ts?raw";
import listHook from "@/hooks/Users/useGetUsers.ts?raw";

const user = (id: number) => ({ id, email: `u${id}@t.test`, fullName: `U${id}`, organizationId: 1 }) as ApiUser;

describe("userDetailPath", () => {
  it("uses the broad endpoint only for users.read holders", () => {
    expect(userDetailPath(7, true)).toBe("users/7");
  });
  it("uses the company-scoped team endpoint for a team.read-only manager", () => {
    expect(userDetailPath(7, false)).toBe("team/users/7");
    expect(userDetailPath("12", false)).toBe("team/users/12");
  });
});

describe("fetchAllCompanyUsers", () => {
  it("walks every page until the reported total is reached", async () => {
    const pages = [Array.from({ length: 100 }, (_, i) => user(i + 1)), Array.from({ length: 30 }, (_, i) => user(i + 101))];
    const fetchPage = vi.fn(async (page: number) => ({ items: pages[page - 1] ?? [], total: 130 }));
    const all = await fetchAllCompanyUsers(fetchPage);
    expect(all).toHaveLength(130);
    expect(fetchPage).toHaveBeenCalledTimes(2);
    expect(fetchPage).toHaveBeenNthCalledWith(1, 1, 100);
    expect(fetchPage).toHaveBeenNthCalledWith(2, 2, 100);
  });
  it("stops on an empty page even if the total is wrong (no endless loop)", async () => {
    const fetchPage = vi.fn(async (page: number) => ({ items: page === 1 ? [user(1)] : [], total: 999 }));
    expect(await fetchAllCompanyUsers(fetchPage)).toHaveLength(1);
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });
  it("returns an empty list for a company with no users", async () => {
    expect(await fetchAllCompanyUsers(async () => ({ items: [], total: 0 }))).toEqual([]);
  });
});

describe("hook wiring", () => {
  it("detail hook decides the endpoint from users.read and never hard-codes users/:id", () => {
    expect(detailHook).toContain('hasPermission("users.read")');
    expect(detailHook).toContain("userDetailPath(");
    expect(detailHook).not.toMatch(/get<[^>]*>\(`users\//);
  });
  it("list hook falls back to the own-company endpoint only without users.read and never for a cross-company query", () => {
    expect(listHook).toContain('!hasPermission("users.read") && hasPermission("team.read") && params?.organizationId == null');
    expect(listHook).toContain("organizations/me/users");
  });
});
