import { beforeEach, describe, expect, it, vi } from "vitest";
import { InfiniteQueryObserver, QueryClient } from "@tanstack/react-query";

const listHistory = vi.fn();
vi.mock("@/api/services/assetService", () => ({ assetService: { listHistory: (...a: unknown[]) => listHistory(...a) } }));
vi.mock("@/api/services/stationService", () => ({ fetchLinkedProviders: vi.fn() }));
vi.mock("@/context/AuthContext", () => ({ useAuth: () => ({ organization: { id: 1 } }) }));

import { assetHistoryOptions } from "./useAssetManagement";
import { assetKeys } from "@/lib/assets";
import { HISTORY_PAGE_SIZE, flattenHistory } from "@/lib/assetHistory";

const ev = (n: number) => ({ eventId: `audit-${n}`, id: n });
const page = (events: unknown[], next: string | null) => ({ events, page: { limit: HISTORY_PAGE_SIZE, hasMore: next !== null, nextCursor: next } });
const client = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });
const observe = (qc: QueryClient, org: number, id: number) => new InfiniteQueryObserver(qc, assetHistoryOptions(org, id) as never);

beforeEach(() => listHistory.mockReset());

describe("asset history paging", () => {
  it("first page has no cursor, the next page sends nextCursor, and it stops when hasMore is false", async () => {
    listHistory.mockResolvedValueOnce(page([ev(3), ev(2)], "c1")).mockResolvedValueOnce(page([ev(1)], null));
    const obs = observe(client(), 1, 5);
    await obs.refetch();
    expect(listHistory).toHaveBeenLastCalledWith(5, { limit: HISTORY_PAGE_SIZE, cursor: null });
    expect(obs.getCurrentResult().hasNextPage).toBe(true);
    await obs.fetchNextPage();
    expect(listHistory).toHaveBeenLastCalledWith(5, { limit: HISTORY_PAGE_SIZE, cursor: "c1" });
    expect(obs.getCurrentResult().hasNextPage).toBe(false);
    expect(flattenHistory(obs.getCurrentResult().data?.pages as never).map((e) => e.eventId)).toEqual(["audit-3", "audit-2", "audit-1"]);
  });
  it("repeated Load more while a page is pending sends ONE request (cancelRefetch: false)", async () => {
    let release!: (v: unknown) => void;
    listHistory.mockResolvedValueOnce(page([ev(3)], "c1")).mockImplementationOnce(() => new Promise((r) => { release = r; }));
    const obs = observe(client(), 1, 5);
    await obs.refetch();
    const a = obs.fetchNextPage({ cancelRefetch: false });
    const b = obs.fetchNextPage({ cancelRefetch: false });
    const c = obs.fetchNextPage({ cancelRefetch: false });
    release(page([ev(2)], null));
    await Promise.all([a, b, c]);
    expect(listHistory).toHaveBeenCalledTimes(2);
    expect(flattenHistory(obs.getCurrentResult().data?.pages as never)).toHaveLength(2);
  });
  it("a failed next page keeps the loaded events and can be retried", async () => {
    listHistory.mockResolvedValueOnce(page([ev(3)], "c1")).mockRejectedValueOnce(new Error("boom")).mockRejectedValueOnce(new Error("boom")).mockResolvedValueOnce(page([ev(2)], null)); // (the query policy retries a non-terminal failure once)
    const obs = observe(client(), 1, 5);
    await obs.refetch();
    await obs.fetchNextPage();
    const failed = obs.getCurrentResult();
    expect(failed.isError).toBe(true);
    expect(flattenHistory(failed.data?.pages as never)).toHaveLength(1);
    await obs.fetchNextPage();
    expect(flattenHistory(obs.getCurrentResult().data?.pages as never)).toHaveLength(2);
  });
  it("another asset or company starts again from the first page with its own cache", async () => {
    listHistory.mockResolvedValue(page([ev(1)], "c1"));
    const qc = client();
    await observe(qc, 1, 5).refetch();
    expect(assetHistoryOptions(1, 5).queryKey).not.toEqual(assetHistoryOptions(1, 6).queryKey);
    expect(assetHistoryOptions(1, 5).queryKey).not.toEqual(assetHistoryOptions(2, 5).queryKey);
    expect(assetHistoryOptions(1, 5).queryKey).toEqual(assetKeys.sub(1, 5, "history"));
    const other = observe(qc, 1, 6);
    expect(other.getCurrentResult().data).toBeUndefined();
    await other.refetch();
    expect(listHistory).toHaveBeenLastCalledWith(6, { limit: HISTORY_PAGE_SIZE, cursor: null });
  });
});
