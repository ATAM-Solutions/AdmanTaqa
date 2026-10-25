import { describe, expect, it, vi } from "vitest";
import {
  assetCapabilities,
  assetKeys,
  assetToForm,
  buildCreateBody,
  buildDocumentBody,
  buildInspectionBody,
  buildMaintenanceBody,
  buildUpdateBody,
  buildWarrantyBody,
  buildWarrantyUpdate,
  classifyAssetError,
  emptyAssetForm,
  formatDateOnly,
  hasActiveFilters,
  hasChanges,
  isAllowedDocumentUrl,
  isSafeLinkHref,
  isTerminalAssetError,
  isValidDateOnly,
  isWarrantyDate,
  localInputToIso,
  nowLocalInput,
  paginate,
  toListParams,
  validateAssetForm,
  validateDocumentForm,
  validateInspectionForm,
  validateMaintenanceForm,
  validateWarrantyForm,
  warrantyProviderChoices,
  warrantyProviderName,
  warrantyStatus,
  warrantyToEditValues,
  type AssetFormValues,
} from "./assets";
import { ROUTE_ACCESS_RULES, canAccessByRule, canAccessPath } from "./accessControl";
import type { Asset } from "@/types/asset";

const has = (...codes: string[]) => (c: string) => codes.includes(c);
const valid = (over: Partial<AssetFormValues> = {}): AssetFormValues => emptyAssetForm({ branchId: "5", name: "Pump 1", maintenanceType: "INTERNAL", ...over });
const asset = (over: Partial<Asset> = {}): Asset => ({
  id: 9, branchId: 5, name: "Pump 1", maintenanceType: "INTERNAL", description: null, type: null, manufacturer: null, model: null, serialNumber: null,
  location: null, installationDate: null, purchaseDate: null, purchaseCost: null, warrantyExpiry: null, status: "ACTIVE", ...over,
});

describe("permissions", () => {
  it("read-only user: can view, nothing else", () => {
    expect(assetCapabilities(has("assets.read"))).toEqual({ read: true, create: false, update: false, manageRecords: false, deleteDocument: false });
  });
  it("assets.create opens creation AND record maintenance", () => {
    const c = assetCapabilities(has("assets.read", "assets.create"));
    expect([c.create, c.manageRecords, c.update]).toEqual([true, true, false]);
  });
  it("assets.manage_records alone maintains records but cannot create (creation denied, records still allowed)", () => {
    const c = assetCapabilities(has("assets.read", "assets.manage_records"));
    expect([c.create, c.manageRecords]).toEqual([false, true]);
  });
  it("update and delete are independent; delete only means 'delete a document'", () => {
    const c = assetCapabilities(has("assets.read", "assets.update", "assets.delete"));
    expect([c.update, c.deleteDocument, c.create, c.manageRecords]).toEqual([true, true, false, false]);
  });
  it("nothing without permissions", () => {
    expect(Object.values(assetCapabilities(has())).every((v) => v === false)).toBe(true);
  });
});

describe("asset form validation (mirrors the backend schema)", () => {
  it("a minimal valid form passes", () => {
    expect(validateAssetForm(valid(), { mode: "create", allowedBranchIds: [5] })).toEqual({});
  });
  it("required: station, name, maintenance type", () => {
    const e = validateAssetForm(emptyAssetForm(), { mode: "create", allowedBranchIds: [5] });
    expect(Object.keys(e).sort()).toEqual(["branchId", "maintenanceType", "name"]);
    expect(e.name?.key).toBe("required");
  });
  it("whitespace-only name is empty", () => {
    expect(validateAssetForm(valid({ name: "   " }), { mode: "create" }).name?.key).toBe("required");
  });
  it("a station outside the authorized list is refused before any request", () => {
    expect(validateAssetForm(valid({ branchId: "99" }), { mode: "create", allowedBranchIds: [5, 6] }).branchId?.key).toBe("branchNotAllowed");
    expect(validateAssetForm(valid({ branchId: "6" }), { mode: "create", allowedBranchIds: [5, 6] }).branchId).toBeUndefined();
    expect(validateAssetForm(valid({ branchId: "abc" }), { mode: "create", allowedBranchIds: [5] }).branchId?.key).toBe("required");
  });
  it("edit mode never validates the station (it cannot change)", () => {
    expect(validateAssetForm(valid({ branchId: "" }), { mode: "edit" }).branchId).toBeUndefined();
  });
  it("length limits come from the schema (255 / 2000)", () => {
    const e = validateAssetForm(valid({ name: "x".repeat(256), description: "y".repeat(2001), serialNumber: "s".repeat(256) }), { mode: "create" });
    expect([e.name?.max, e.description?.max, e.serialNumber?.max]).toEqual([255, 2000, 255]);
    expect(validateAssetForm(valid({ name: "x".repeat(255), description: "y".repeat(2000) }), { mode: "create" })).toEqual({});
  });
  it("dates must be real YYYY-MM-DD dates", () => {
    expect(isValidDateOnly("2024-02-29")).toBe(true);
    expect(isValidDateOnly("2026-02-29")).toBe(false);
    expect(isValidDateOnly("2026-13-01")).toBe(false);
    expect(isValidDateOnly("26-01-01")).toBe(false);
    const e = validateAssetForm(valid({ installationDate: "2026-02-31", purchaseDate: "nope", warrantyExpiry: "2026-12-31" }), { mode: "create" });
    expect([e.installationDate?.key, e.purchaseDate?.key, e.warrantyExpiry]).toEqual(["invalidDate", "invalidDate", undefined]);
  });
  it("purchase cost: number, not negative, two decimals, within DECIMAL(12,2)", () => {
    const key = (c: string) => validateAssetForm(valid({ purchaseCost: c }), { mode: "create" }).purchaseCost?.key;
    expect(key("")).toBeUndefined();
    expect(key("1250.50")).toBeUndefined();
    expect(key("0")).toBeUndefined();
    expect(key("abc")).toBe("invalidNumber");
    expect(key("-5")).toBe("negative");
    expect(key("1.234")).toBe("tooManyDecimals");
    expect(key("10000000000")).toBe("outOfRange");
  });
  it("status must be one of the four backend values", () => {
    expect(validateAssetForm(valid({ status: "BROKEN" as never }), { mode: "create" }).status?.key).toBe("invalidOption");
  });
});

describe("request bodies", () => {
  it("create: trims, omits empty optional fields (the schema rejects null), numbers the cost and station", () => {
    const body = buildCreateBody(valid({ name: "  Pump 1 ", serialNumber: " SN-1 ", purchaseCost: "1250.5", warrantyExpiry: "2027-01-01", description: "   " }));
    expect(body).toEqual({ branchId: 5, name: "Pump 1", maintenanceType: "INTERNAL", status: "ACTIVE", serialNumber: "SN-1", purchaseCost: 1250.5, warrantyExpiry: "2027-01-01" });
    expect(Object.values(body).includes(null as never)).toBe(false);
  });
  it("update: only what changed; the station is never sent", () => {
    const original = asset({ name: "Pump 1", serialNumber: "SN-1", status: "ACTIVE" });
    const body = buildUpdateBody(original, { ...assetToForm(original), name: "Pump 2", status: "INACTIVE", branchId: "77" });
    expect(body).toEqual({ name: "Pump 2", status: "INACTIVE" });
    expect("branchId" in body).toBe(false);
  });
  it("update: nothing changed → empty body (no request)", () => {
    const original = asset({ description: "d", purchaseCost: "12.50", installationDate: "2026-01-05" });
    expect(hasChanges(buildUpdateBody(original, assetToForm(original)))).toBe(false);
    expect(hasChanges(buildUpdateBody(original, { ...assetToForm(original), name: "  Pump 1  " }))).toBe(false);
  });
  it("update: a cleared optional field is sent as null; a set one as its value", () => {
    const original = asset({ description: "old", type: null, purchaseCost: "10.00", warrantyExpiry: "2026-05-01" });
    const body = buildUpdateBody(original, { ...assetToForm(original), description: "", type: "Dispenser", purchaseCost: "", warrantyExpiry: "" });
    expect(body).toEqual({ description: null, type: "Dispenser", purchaseCost: null, warrantyExpiry: null });
  });
  it("update: a cost typed differently but equal is not a change; a different cost is", () => {
    const original = asset({ purchaseCost: "12.50" });
    expect(hasChanges(buildUpdateBody(original, { ...assetToForm(original), purchaseCost: "12.5" }))).toBe(false);
    expect(buildUpdateBody(original, { ...assetToForm(original), purchaseCost: "13" })).toEqual({ purchaseCost: 13 });
  });
  it("populating the edit form from the API record", () => {
    const f = assetToForm(asset({ purchaseCost: "1250.00", installationDate: "2026-03-04T00:00:00.000Z", description: null, status: "UNDER_MAINTENANCE" }));
    expect([f.purchaseCost, f.installationDate, f.description, f.status, f.branchId]).toEqual(["1250", "2026-03-04", "", "UNDER_MAINTENANCE", "5"]);
  });
});

describe("list helpers", () => {
  const items = Array.from({ length: 25 }, (_, i) => i + 1);
  it("client-side pagination: pages, ranges, clamping", () => {
    expect(paginate(items, 1)).toMatchObject({ page: 1, totalPages: 3, total: 25, startIndex: 1, items: items.slice(0, 10) });
    expect(paginate(items, 3).items).toEqual([21, 22, 23, 24, 25]);
    expect(paginate(items, 99).page).toBe(3);
    expect(paginate(items, 0).page).toBe(1);
    expect(paginate([], 4)).toMatchObject({ page: 1, totalPages: 1, total: 0, startIndex: 0, items: [] });
    expect(paginate(items.slice(0, 10), 1).totalPages).toBe(1);
  });
  it("filters: station + search go to the existing query params; empty values are dropped", () => {
    expect(toListParams("", "")).toEqual({});
    expect(toListParams("7", "  pump ")).toEqual({ branchId: 7, search: "pump" });
    expect(toListParams("abc", "")).toEqual({});
    expect(hasActiveFilters({})).toBe(false);
    expect(hasActiveFilters({ search: "x" })).toBe(true);
  });
  it("cache keys carry the viewer's company and the filters: nothing is shared across companies", () => {
    expect(assetKeys.list(1, {})).not.toEqual(assetKeys.list(2, {}));
    expect(assetKeys.list(1, { branchId: 3 })).not.toEqual(assetKeys.list(1, {}));
    expect(assetKeys.detail(1, 5)).not.toEqual(assetKeys.detail(2, 5));
    expect(assetKeys.detail(1, 5)).toEqual(assetKeys.detail(1, "5"));
    expect(assetKeys.sub(1, 5, "documents")).not.toEqual(assetKeys.sub(2, 5, "documents"));
    expect(assetKeys.sub(1, 7, "warrantyProviders")).not.toEqual(assetKeys.sub(2, 7, "warrantyProviders"));
    expect(assetKeys.list(null, {}).slice(0, 3)).toEqual(["assets", "manage", null]);
  });
});

describe("dates", () => {
  it("DATEONLY values are formatted as calendar dates, immune to the timezone", () => {
    for (const tz of ["Pacific/Honolulu", "Asia/Riyadh", "UTC"]) {
      vi.stubEnv("TZ", tz);
      expect(formatDateOnly("2026-01-01", "en")).toBe("Jan 1, 2026");
    }
    vi.unstubAllEnvs();
    expect(formatDateOnly(null, "en")).toBe("—");
    expect(formatDateOnly("garbage", "en")).toBe("—");
  });
  it("warranty status from the calendar", () => {
    expect(warrantyStatus({ startDate: "2026-01-01", endDate: "2026-12-31" }, "2026-06-01")).toBe("active");
    expect(warrantyStatus({ startDate: "2026-01-01", endDate: "2026-12-31" }, "2027-01-01")).toBe("expired");
    expect(warrantyStatus({ startDate: "2026-07-01", endDate: "2026-12-31" }, "2026-06-01")).toBe("upcoming");
    expect(warrantyStatus({ startDate: "2026-01-01", endDate: "2026-06-01" }, "2026-06-01")).toBe("active"); // last day counts
  });
  it("datetime-local ↔ the ISO instant the API wants", () => {
    expect(localInputToIso("2026-10-22T08:30")).toBe(new Date("2026-10-22T08:30").toISOString());
    expect(localInputToIso("2026-10-22T08:30")).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(localInputToIso("nope")).toBeNull();
    expect(localInputToIso("2026-10-22")).toBeNull();
    expect(nowLocalInput(new Date(2026, 9, 5, 7, 4))).toBe("2026-10-05T07:04");
  });
});

describe("related-record forms", () => {
  it("documents are registered by link: http(s) or a local /uploads path only", () => {
    for (const ok of ["https://x.test/a.pdf", "http://x.test/a", "/uploads/asset-docs/a.pdf"]) expect(isAllowedDocumentUrl(ok), ok).toBe(true);
    for (const bad of ["javascript:alert(1)", "ftp://x.test/a", "data:text/html,x", "file:///etc/passwd", "x.test/a.pdf", "https://", "/etc/passwd", "https://a b"]) expect(isAllowedDocumentUrl(bad), bad).toBe(false);
    expect(isSafeLinkHref("https://x.test")).toBe(true);
    expect(isSafeLinkHref("/uploads/a.pdf")).toBe(false); // shown as text, never as a clickable relative link
    expect(isSafeLinkHref("javascript:alert(1)")).toBe(false);
  });
  it("document form: URL required and valid; limits 2048/255/128", () => {
    expect(validateDocumentForm({ fileUrl: "", title: "", fileType: "" }).fileUrl?.key).toBe("required");
    expect(validateDocumentForm({ fileUrl: "javascript:x", title: "", fileType: "" }).fileUrl?.key).toBe("invalidUrl");
    expect(validateDocumentForm({ fileUrl: "https://a.test/" + "x".repeat(2100), title: "", fileType: "" }).fileUrl?.max).toBe(2048);
    expect(validateDocumentForm({ fileUrl: "https://a.test/x", title: "t".repeat(256), fileType: "f".repeat(129) })).toMatchObject({ title: { key: "tooLong", max: 255 }, fileType: { key: "tooLong", max: 128 } });
    expect(buildDocumentBody({ fileUrl: " https://a.test/x ", title: " ", fileType: "PDF" })).toEqual({ fileUrl: "https://a.test/x", fileType: "PDF" });
  });
  it("warranty form: provider and both dates; end not before start", () => {
    expect(Object.keys(validateWarrantyForm({ providerOrganizationId: "", startDate: "", endDate: "" })).sort()).toEqual(["endDate", "providerOrganizationId", "startDate"]);
    expect(validateWarrantyForm({ providerOrganizationId: "4", startDate: "2026-05-01", endDate: "2026-04-01" }).endDate?.key).toBe("endBeforeStart");
    expect(validateWarrantyForm({ providerOrganizationId: "4", startDate: "2026-05-01", endDate: "2026-05-01" })).toEqual({});
    expect(validateWarrantyForm({ providerOrganizationId: "", startDate: "2026-05-01", endDate: "2026-06-01" }, { providerRequired: false })).toEqual({});
    expect(buildWarrantyBody({ providerOrganizationId: "4", startDate: "2026-05-01", endDate: "2026-06-01" })).toEqual({ providerOrganizationId: 4, startDate: "2026-05-01", endDate: "2026-06-01" });
  });
  it("inspection form", () => {
    expect(validateInspectionForm({ inspectionDate: "", status: "", notes: "" }).inspectionDate?.key).toBe("required");
    expect(validateInspectionForm({ inspectionDate: "2026-02-30", status: "", notes: "" }).inspectionDate?.key).toBe("invalidDate");
    expect(validateInspectionForm({ inspectionDate: "2026-02-01", status: "s".repeat(51), notes: "n".repeat(2001) })).toMatchObject({ status: { max: 50 }, notes: { max: 2000 } });
    expect(buildInspectionBody({ inspectionDate: "2026-02-01", status: " OK ", notes: "" })).toEqual({ inspectionDate: "2026-02-01", status: "OK" });
  });
  it("maintenance form: the instant is an ISO datetime", () => {
    expect(validateMaintenanceForm({ performedAt: "", notes: "" }).performedAt?.key).toBe("required");
    expect(validateMaintenanceForm({ performedAt: "2026-10-22T08:30", notes: "" })).toEqual({});
    const body = buildMaintenanceBody({ performedAt: "2026-10-22T08:30", notes: " done " });
    expect(body.performedAt).toBe(new Date("2026-10-22T08:30").toISOString());
    expect(body.notes).toBe("done");
  });
});

describe("error classification (by stable status/code, never by message)", () => {
  const http = (status: number, code?: string, errors?: unknown) => ({ response: { status, data: { code, errors, message: "english text" } } });
  it("maps the handled failures", () => {
    expect(classifyAssetError(http(409)).kind).toBe("conflict");
    expect(classifyAssetError(http(400, undefined, [{ field: "body.name", message: "Required" }]))).toMatchObject({ kind: "validation", fieldErrors: { name: "Required" } });
    expect(classifyAssetError(http(400, "UNSAFE_MEDIA_URL")).kind).toBe("unsafeUrl");
    expect(classifyAssetError(http(403, "BRANCH_ACCESS_DENIED")).kind).toBe("branchDenied");
    expect(classifyAssetError(http(403, "INSUFFICIENT_PERMISSIONS")).kind).toBe("forbidden");
    expect(classifyAssetError(http(401)).kind).toBe("forbidden");
    expect(classifyAssetError(http(404)).kind).toBe("notFound");
    expect(classifyAssetError(http(503, "PERMISSION_OVERRIDES_UNAVAILABLE")).kind).toBe("unavailable");
    expect(classifyAssetError(http(500)).kind).toBe("server");
    expect(classifyAssetError(new Error("Network Error")).kind).toBe("network");
    expect(classifyAssetError(undefined).kind).toBe("network");
  });
  it("only forbidden / station-denied / not-found are terminal (no retry button)", () => {
    for (const k of ["forbidden", "branchDenied", "notFound"] as const) expect(isTerminalAssetError(k)).toBe(true);
    for (const k of ["server", "network", "unavailable", "conflict", "validation"] as const) expect(isTerminalAssetError(k)).toBe(false);
  });
});

describe("existing endpoints, used as they are", () => {
  it("every call hits the documented URL and verb; there is no asset delete", async () => {
    vi.resetModules();
    const ok = (data: unknown) => ({ data: { success: true, data } });
    const get = vi.fn(async () => ok([])), post = vi.fn(async () => ok({ id: 1 })), patch = vi.fn(async () => ok({ id: 1 })), del = vi.fn(async () => ({ data: { success: true } }));
    vi.doMock("@/api/config", () => ({ default: { get, post, patch, delete: del, put: vi.fn() } }));
    const { assetService } = await import("@/api/services/assetService");
    await assetService.list({ branchId: 3, search: " pump " });
    expect(get).toHaveBeenLastCalledWith("assets", { params: { branchId: 3, search: "pump" } });
    await assetService.list({});
    expect(get).toHaveBeenLastCalledWith("assets", { params: {} });
    await assetService.get(7);
    expect(get).toHaveBeenLastCalledWith("assets/7");
    await assetService.create({ branchId: 1, name: "a", maintenanceType: "INTERNAL" });
    expect(post).toHaveBeenLastCalledWith("assets", { branchId: 1, name: "a", maintenanceType: "INTERNAL" });
    await assetService.update(7, { name: "b" });
    expect(patch).toHaveBeenLastCalledWith("assets/7", { name: "b" });
    await assetService.listDocuments(7); expect(get).toHaveBeenLastCalledWith("assets/7/documents");
    await assetService.createDocument(7, { fileUrl: "https://x.test/a" }); expect(post).toHaveBeenLastCalledWith("assets/7/documents", { fileUrl: "https://x.test/a" });
    await assetService.deleteDocument(3); expect(del).toHaveBeenLastCalledWith("assets/documents/3");
    await assetService.listWarranties(7); expect(get).toHaveBeenLastCalledWith("assets/7/warranties");
    await assetService.listWarrantyProviders(7); expect(get).toHaveBeenLastCalledWith("assets/7/warranty-providers");
    await assetService.createWarranty(7, { providerOrganizationId: 2, startDate: "2026-01-01", endDate: "2026-02-01" });
    expect(post).toHaveBeenLastCalledWith("assets/7/warranties", { providerOrganizationId: 2, startDate: "2026-01-01", endDate: "2026-02-01" });
    await assetService.updateWarranty(7, 4, { endDate: "2026-03-01" }); expect(patch).toHaveBeenLastCalledWith("assets/7/warranties/4", { endDate: "2026-03-01" });
    await assetService.listInspections(7); expect(get).toHaveBeenLastCalledWith("assets/7/inspections");
    await assetService.createInspection(7, { inspectionDate: "2026-01-01" }); expect(post).toHaveBeenLastCalledWith("assets/7/inspections", { inspectionDate: "2026-01-01" });
    await assetService.listMaintenance(7); expect(get).toHaveBeenLastCalledWith("assets/7/internal-maintenance");
    await assetService.createMaintenance(7, { performedAt: "2026-01-01T00:00:00.000Z" }); expect(post).toHaveBeenLastCalledWith("assets/7/internal-maintenance", { performedAt: "2026-01-01T00:00:00.000Z" });
    await assetService.listHistory(7); expect(get).toHaveBeenLastCalledWith("assets/7/history", { params: {} });
    await assetService.listHistory(7, { limit: 25, cursor: "abc" }); expect(get).toHaveBeenLastCalledWith("assets/7/history", { params: { limit: 25, cursor: "abc" } });
    expect(Object.keys(assetService).filter((k) => /delete/i.test(k))).toEqual(["deleteDocument"]);
    vi.doUnmock("@/api/config");
  });
  it("a list answer that is not an array becomes an empty list", async () => {
    vi.resetModules();
    vi.doMock("@/api/config", () => ({ default: { get: vi.fn(async () => ({ data: { success: true, data: null } })) } }));
    const { assetService } = await import("@/api/services/assetService");
    expect(await assetService.list()).toEqual([]);
    vi.doUnmock("@/api/config");
  });
});

describe("route visibility", () => {
  const fs = (...perms: string[]) => (path: string) => canAccessPath(path, "FUEL_STATION", perms);
  it("Assets list and details need assets.read; Fuel Station only", () => {
    const can = fs("assets.read");
    expect(can("/assets")).toBe(true);
    expect(can("/assets/12")).toBe(true);
    expect(canAccessPath("/assets", "FUEL_STATION", ["team.read"])).toBe(false);
    for (const org of ["SERVICE_PROVIDER", "AUTHORITY", "SUPER_ADMIN"] as const) expect(canAccessPath("/assets", org, ["assets.read", "assets.create"]), org).toBe(false);
  });
  it("the create page needs assets.create (assets.manage_records alone is not enough)", () => {
    expect(fs("assets.read")("/assets/create")).toBe(false);
    expect(fs("assets.read", "assets.manage_records")("/assets/create")).toBe(false);
    expect(fs("assets.read", "assets.create")("/assets/create")).toBe(true);
  });
  it("the edit page needs assets.update", () => {
    expect(fs("assets.read", "assets.create")("/assets/12/edit")).toBe(false);
    expect(fs("assets.read", "assets.update")("/assets/12/edit")).toBe(true);
  });
  it("rules exist for exactly the four routes", () => {
    expect(["assets", "assets/create", "assets/:id", "assets/:id/edit"].every((k) => ROUTE_ACCESS_RULES[k])).toBe(true);
    expect(canAccessByRule(ROUTE_ACCESS_RULES["assets"], "FUEL_STATION", ["assets.read"])).toBe(true);
  });
});

describe("warranty provider rules (Phase 3G.2)", () => {
  const rec = (over: Record<string, unknown> = {}) => ({ id: 4, assetId: 1, providerOrganizationId: 20, startDate: "2026-01-01", endDate: "2027-01-01", ...over }) as Parameters<typeof warrantyToEditValues>[0] & { id: number };

  it("warranty dates: real calendar dates within the API's 1900..2999 range only", () => {
    for (const ok of ["2026-02-28", "2028-02-29", "2000-02-29", "1900-01-01", "2999-12-31"]) expect(isWarrantyDate(ok), ok).toBe(true);
    for (const bad of ["2026-02-30", "2027-02-29", "2100-02-29", "2026-13-01", "2026-00-10", "0000-00-00", "1899-12-31", "3000-01-01", "2026-1-1", ""]) expect(isWarrantyDate(bad), bad).toBe(false);
    expect(validateWarrantyForm({ providerOrganizationId: "4", startDate: "2026-02-30", endDate: "2027-01-01" }).startDate?.key).toBe("invalidDate");
    expect(validateWarrantyForm({ providerOrganizationId: "4", startDate: "0000-00-00", endDate: "2027-01-01" }).startDate?.key).toBe("invalidDate");
  });

  it("provider display name follows the language and falls back to the other one; nothing is invented", () => {
    const p = { name: "Gulf Cooling", nameAr: "الخليج للتبريد" };
    expect(warrantyProviderName(p, "en")).toBe("Gulf Cooling");
    expect(warrantyProviderName(p, "ar")).toBe("الخليج للتبريد");
    expect(warrantyProviderName({ name: "Gulf Cooling", nameAr: null }, "ar")).toBe("Gulf Cooling");
    expect(warrantyProviderName({ name: null, nameAr: "الخليج" }, "en")).toBe("الخليج");
    expect(warrantyProviderName({ name: "  ", nameAr: "" }, "en")).toBeNull();
    expect(warrantyProviderName(undefined, "en")).toBeNull();
    expect(warrantyProviderName({ name: "X", nameAr: null }, "ar-SA")).toBe("X");
  });

  it("edit sends ONLY what changed, and nothing at all when nothing did", () => {
    const w = rec();
    const start = warrantyToEditValues(w);
    expect(start).toEqual({ providerOrganizationId: "20", startDate: "2026-01-01", endDate: "2027-01-01" });
    expect(buildWarrantyUpdate(w, start)).toBeNull();
    expect(buildWarrantyUpdate(w, { ...start, endDate: "2028-01-01" })).toEqual({ endDate: "2028-01-01" });
    expect(buildWarrantyUpdate(w, { ...start, providerOrganizationId: "21" })).toEqual({ providerOrganizationId: 21 });
    expect(buildWarrantyUpdate(w, { providerOrganizationId: "21", startDate: "2026-02-01", endDate: "2028-01-01" })).toEqual({ providerOrganizationId: 21, startDate: "2026-02-01", endDate: "2028-01-01" });
    // choosing the current provider again, or retyping the same dates, is no change
    expect(buildWarrantyUpdate(w, { ...start, providerOrganizationId: "20", startDate: "2026-01-01" })).toBeNull();
    // timestamps from the API are compared as calendar dates
    expect(buildWarrantyUpdate(rec({ startDate: "2026-01-01T00:00:00.000Z" }), start)).toBeNull();
    // garbage provider values never produce a body
    expect(buildWarrantyUpdate(w, { ...start, providerOrganizationId: "" })).toBeNull();
    expect(buildWarrantyUpdate(w, { ...start, providerOrganizationId: "abc" })).toBeNull();
  });

  it("edit choices: the eligible providers, plus the CURRENT provider when it is no longer eligible (shown, with its state)", () => {
    const eligible = [{ id: 20, name: "A", nameAr: null }, { id: 21, name: "B", nameAr: null }];
    const current = (provider: unknown) => ({ providerOrganizationId: 30, provider }) as Parameters<typeof warrantyProviderChoices>[0];
    expect(warrantyProviderChoices({ providerOrganizationId: 20 }, eligible).map((c) => [c.id, c.isCurrent, c.historicalState])).toEqual([[20, true, undefined], [21, false, undefined]]);
    const inactive = warrantyProviderChoices(current({ id: 30, name: "Old", nameAr: null, state: "INACTIVE" }), eligible);
    expect(inactive.map((c) => c.id)).toEqual([30, 20, 21]);
    expect(inactive[0]).toMatchObject({ isCurrent: true, historicalState: "INACTIVE", name: "Old" });
    expect(warrantyProviderChoices(current({ id: 30, name: "Gone", nameAr: null, state: "UNLINKED" }), eligible)[0].historicalState).toBe("UNLINKED");
    // unavailable / missing display: no name, never an invented one
    const unavailable = warrantyProviderChoices(current({ id: 30, name: null, nameAr: null, state: "UNAVAILABLE" }), eligible)[0];
    expect([unavailable.historicalState, unavailable.name]).toEqual(["UNAVAILABLE", null]);
    expect(warrantyProviderChoices(current(undefined), [])[0].historicalState).toBe("UNAVAILABLE");
    // nothing ineligible is offered as a NEW choice: only the current one is added
    expect(inactive.filter((c) => !c.isCurrent).every((c) => eligible.some((e) => e.id === c.id))).toBe(true);
  });

  it("the four warranty error codes are classified by CODE (not message), before the generic 400/409 kinds", () => {
    const err = (status: number, code: string) => ({ response: { status, data: { code, message: "anything" } } });
    expect(classifyAssetError(err(400, "WARRANTY_PROVIDER_NOT_ELIGIBLE")).kind).toBe("warrantyProvider");
    expect(classifyAssetError(err(400, "WARRANTY_DATE_INVALID")).kind).toBe("warrantyDate");
    expect(classifyAssetError(err(400, "WARRANTY_DATE_RANGE_INVALID")).kind).toBe("warrantyRange");
    expect(classifyAssetError(err(409, "WARRANTY_DUPLICATE")).kind).toBe("warrantyDuplicate");
    expect(classifyAssetError(err(409, "OTHER")).kind).toBe("conflict");
    expect(classifyAssetError(err(400, "OTHER")).kind).toBe("validation");
    for (const k of ["warrantyProvider", "warrantyDate", "warrantyRange", "warrantyDuplicate"] as const) expect(isTerminalAssetError(k), k).toBe(false);
  });
});
