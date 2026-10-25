import { describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createInstance } from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import enAssets from "@/i18n/locales/en/assets.json";
import arAssets from "@/i18n/locales/ar/assets.json";
import enCommon from "@/i18n/locales/en/common.json";
import arCommon from "@/i18n/locales/ar/common.json";
import { assetKeys, assetCapabilities, emptyAssetForm, assetToForm, type AssetCapabilities } from "@/lib/assets";
import type { Asset, AssetDetail } from "@/types/asset";

// Sources are read through Vite (`?raw`): no Node typings needed, stays inside the app's tsc project.
const sources = import.meta.glob("./**/*.tsx", { query: "?raw", import: "default", eager: true }) as Record<string, string>;
const productionSources = Object.entries(sources).filter(([path]) => !path.endsWith(".test.tsx"));

// `@/lib/utils` pulls in the app's i18n bootstrap (touches `document`) and the API client needs VITE_API_URL: stub both.
vi.mock("@/i18n/config", async () => {
  const { createInstance } = await import("i18next");
  const i = createInstance();
  await i.init({ lng: "en", resources: { en: {} }, interpolation: { escapeValue: false } });
  return { default: i, isRtl: () => false };
});
vi.mock("@/api/config", () => ({ default: {} }));
const auth = vi.hoisted(() => ({ state: { org: { id: 1, type: "FUEL_STATION" } as { id: number; type: string }, permissions: ["assets.read"] as string[] } }));
vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    hasPermission: (c: string) => auth.state.permissions.includes(c),
    organization: auth.state.org,
    permissions: auth.state.permissions,
    user: { id: 1 },
  }),
}));

import Assets from "./Assets";
import AssetDetails from "./AssetDetails";
import AssetForm from "./components/AssetForm";
import AssetDocumentsTab from "./components/AssetDocumentsTab";
import DocumentUploadForm from "./components/DocumentUploadForm";
import AssetWarrantiesTab from "./components/AssetWarrantiesTab";
import { useWarrantyProviders } from "@/hooks/Assets/useAssetManagement";
import AssetInspectionsTab from "./components/AssetInspectionsTab";
import AssetMaintenanceTab from "./components/AssetMaintenanceTab";
import AssetHistoryTab from "./components/AssetHistoryTab";
import { AssetHistoryTimeline } from "./components/AssetHistoryTimeline";

async function i18nFor(lng: "en" | "ar") {
  const i = createInstance();
  await i.use(initReactI18next).init({
    lng, fallbackLng: "en", ns: ["assets", "common"], defaultNS: "common",
    resources: { en: { assets: enAssets, common: enCommon }, ar: { assets: arAssets, common: arCommon } }, interpolation: { escapeValue: false },
  });
  return i;
}

const asset = (over: Partial<Asset> = {}): Asset => ({
  id: 1, branchId: 5, name: "Diesel Pump 1", maintenanceType: "INTERNAL", description: null, type: "Dispenser", manufacturer: "Gilbarco", model: "Encore",
  serialNumber: "SN-0001", location: "Island 2", installationDate: "2026-01-15", purchaseDate: "2025-12-01", purchaseCost: "1250.50", warrantyExpiry: "2027-01-15",
  status: "ACTIVE", Branch: { id: 5, nameEn: "Riyadh North", nameAr: "الرياض الشمالية" }, ...over,
});
const detail = (over: Partial<AssetDetail> = {}): AssetDetail => ({
  ...asset(), createdAt: "2026-02-01T10:00:00.000Z", healthScore: 85, lastMaintenanceDate: "2026-09-01", nextMaintenanceDate: "2026-11-30",
  maintenanceHistoryCount: 4, documentCount: 2, workOrderCount: 1, ...over,
});
const branch = (id: number, nameEn: string, nameAr: string) => ({ id, nameEn, nameAr, organizationId: 1 });
const BRANCHES = [branch(5, "Riyadh North", "الرياض الشمالية"), branch(6, "Jeddah East", "جدة الشرقية")];

type Seed = { key: readonly unknown[]; data?: unknown; error?: unknown };
function makeClient(seeds: Seed[]) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  for (const s of seeds) {
    if (s.error !== undefined) {
      // (an errored query with no data is reset to "pending" when it mounts, so the failure is seeded next to placeholder data)
      qc.getQueryCache().build(qc, { queryKey: s.key as unknown[] }).setState({ status: "error", error: s.error as Error, fetchStatus: "idle", data: s.data ?? [], dataUpdatedAt: Date.now(), errorUpdateCount: 1, errorUpdatedAt: Date.now() });
    } else qc.setQueryData(s.key as unknown[], s.data);
  }
  return qc;
}
async function render(node: ReactNode, { seeds = [], lng = "en", entry = "/" }: { seeds?: Seed[]; lng?: "en" | "ar"; entry?: string } = {}) {
  const i18n = await i18nFor(lng);
  return renderToStaticMarkup(
    <QueryClientProvider client={makeClient(seeds)}>
      <I18nextProvider i18n={i18n}>
        <MemoryRouter initialEntries={[entry]}>
          <div dir={lng === "ar" ? "rtl" : "ltr"}>{node}</div>
        </MemoryRouter>
      </I18nextProvider>
    </QueryClientProvider>,
  );
}
const as = (permissions: string[], orgId = 1, type = "FUEL_STATION") => { auth.state = { org: { id: orgId, type }, permissions }; };
const http = (status: number, code?: string) => ({ response: { status, data: { code, message: "english server text" } } });
const has = (html: string, id: string) => html.includes(`data-testid="${id}"`);
const disabled = (tag: string | null | undefined) => tag != null && /\sdisabled=""/.test(tag);
const tag = (html: string, id: string) => html.match(new RegExp(`<[a-z]+[^>]*data-testid="${id}"[^>]*>`))?.[0] ?? null;
const caps = (...p: string[]): AssetCapabilities => assetCapabilities((c) => p.includes(c));

// ═══════════════════════════ list ═══════════════════════════
describe("assets list", () => {
  const list = (items: Asset[], org = 1) => [{ key: assetKeys.list(org, {}), data: items }, { key: ["branches"], data: BRANCHES }];

  it("shows each asset's name (a link to its page), serial number, station, status and warranty date", async () => {
    as(["assets.read"]);
    const html = await render(<Assets />, { seeds: list([asset(), asset({ id: 2, name: "Tank Gauge", serialNumber: null, status: "UNDER_MAINTENANCE", Branch: { id: 6, nameEn: "Jeddah East", nameAr: "جدة الشرقية" } })]) });
    expect(html).toContain('href="/assets/1"');
    expect(html).toContain("Diesel Pump 1");
    expect(html).toContain("SN-0001");
    expect(html).toContain("Riyadh North");
    expect(html).toContain("Jeddah East");
    expect(html).toContain("Active");
    expect(html).toContain("Under maintenance");
    expect(html).toContain("Jan 15, 2027");
    expect(html).toContain("Gilbarco Encore");
    for (const col of ["Asset", "Serial number", "Station", "Status"]) expect(html).toContain(col);
    expect(has(html, "asset-search")).toBe(true);
    expect(html).toContain('aria-label="Search assets"');
    expect(html).toContain('aria-label="Station"');
  });

  it("phones get one card per asset (name, status, station, serial), each a link to the asset", async () => {
    as(["assets.read"]);
    const html = await render(<Assets />, { seeds: list([asset(), asset({ id: 2, name: "Tank Gauge", serialNumber: null })]) });
    expect(has(html, "asset-cards")).toBe(true);
    expect(has(html, "asset-card-1")).toBe(true);
    expect(has(html, "asset-card-2")).toBe(true);
    expect(html.match(/<li[^>]*data-testid="asset-card-1"[\s\S]*?<\/li>/)?.[0]).toMatch(/href="\/assets\/1"[\s\S]*Diesel Pump 1[\s\S]*Active[\s\S]*Riyadh North[\s\S]*SN-0001/);
    expect(html.match(/<ul[^>]*data-testid="asset-cards"[^>]*>/)?.[0]).toContain("md:hidden");
  });

  it("Add asset is shown only to a user who holds assets.create", async () => {
    as(["assets.read"]);
    expect(has(await render(<Assets />, { seeds: list([asset()]) }), "add-asset")).toBe(false);
    as(["assets.read", "assets.update"]);
    expect(has(await render(<Assets />, { seeds: list([asset()]) }), "add-asset")).toBe(false);
    as(["assets.read", "assets.manage_records"]);
    expect(has(await render(<Assets />, { seeds: list([asset()]) }), "add-asset")).toBe(false);
    as(["assets.read", "assets.create"]);
    const html = await render(<Assets />, { seeds: list([asset()]) });
    expect(has(html, "add-asset")).toBe(true);
    expect(html).toContain('href="/assets/create"');
  });

  it("paginates on the client: 10 rows per page with a range and page links", async () => {
    as(["assets.read"]);
    const many = Array.from({ length: 25 }, (_, i) => asset({ id: i + 1, name: `Asset ${String(i + 1).padStart(2, "0")}`, serialNumber: `SN-${i + 1}` }));
    const html = await render(<Assets />, { seeds: list(many) });
    expect(html.match(/data-testid="asset-row-\d+"/g)).toHaveLength(10);
    expect(html).toContain("Asset 01");
    expect(html).toContain("Asset 10");
    expect(html).not.toContain("Asset 11");
    expect(html).toMatch(/Showing[\s\S]*>1<[\s\S]*–[\s\S]*>10<[\s\S]*of[\s\S]*>25</);
  });

  it("no pagination chrome for a single page", async () => {
    as(["assets.read"]);
    const html = await render(<Assets />, { seeds: list([asset(), asset({ id: 2, name: "B" })]) });
    expect(html.match(/data-testid="asset-row-\d+"/g)).toHaveLength(2);
    expect(html).not.toContain('aria-label="Go to next page"');
  });

  it("loading state while nothing has arrived", async () => {
    as(["assets.read"]);
    const html = await render(<Assets />, { seeds: [] });
    expect(has(html, "assets-loading")).toBe(true);
    expect(has(html, "asset-row-1")).toBe(false);
  });

  it("empty state: invites creation only if the user can create", async () => {
    as(["assets.read"]);
    let html = await render(<Assets />, { seeds: list([]) });
    expect(has(html, "assets-empty")).toBe(true);
    expect(html).toContain("No assets yet");
    expect(html).not.toContain("Add asset");
    as(["assets.read", "assets.create"]);
    html = await render(<Assets />, { seeds: list([]) });
    expect(html).toContain("Add asset");
  });

  it.each([
    [500, undefined, "Something went wrong", true],
    [503, "PERMISSION_OVERRIDES_UNAVAILABLE", "Permissions cannot be verified right now", true],
    [403, "INSUFFICIENT_PERMISSIONS", "You do not have permission", false],
    [404, undefined, "was not found", false],
  ] as const)("error %s: translated message; retry only when retrying can help", async (status, code, text, retry) => {
    as(["assets.read"]);
    const html = await render(<Assets />, { seeds: [{ key: assetKeys.list(1, {}), error: http(status, code) }, { key: ["branches"], data: BRANCHES }] });
    expect(has(html, "assets-error")).toBe(true);
    expect(html).toContain("Could not load assets.");
    expect(html).toContain(text);
    expect(html.includes("Retry")).toBe(retry);
    expect(html).not.toContain("english server text");
  });

  it("company isolation: another company's cached list is never shown", async () => {
    as(["assets.read"], 2);
    const html = await render(<Assets />, { seeds: list([asset({ name: "Secret Pump of Company 1" })], 1) });
    expect(html).not.toContain("Secret Pump of Company 1");
    expect(has(html, "assets-loading")).toBe(true);
  });

  it("Arabic: RTL strings, the station's Arabic name, the backend's asset name verbatim", async () => {
    as(["assets.read", "assets.create"]);
    const html = await render(<Assets />, { seeds: list([asset()]), lng: "ar" });
    expect(html).toContain('dir="rtl"');
    expect(html).toContain("الأصول");
    expect(html).toContain("إضافة أصل");
    expect(html).toContain("الرياض الشمالية");
    expect(html).toContain("نشط");
    expect(html).toContain("Diesel Pump 1");
    expect(html).not.toContain("Add asset");
    expect(html).toContain("ابحث بالاسم");
  });
});

// ═══════════════════════════ form ═══════════════════════════
describe("asset form", () => {
  const baseProps = { onSubmit: async () => undefined, submitting: false, onCancel: () => undefined };
  const seeds: Seed[] = [{ key: ["branches"], data: BRANCHES }];

  it("create: every field has a real label; station, name and maintenance type are required", async () => {
    as(["assets.create"]);
    const html = await render(<AssetForm mode="create" initialValues={emptyAssetForm()} {...baseProps} />, { seeds });
    for (const label of ["Station", "Asset name", "Maintenance type", "Status", "Description", "Type", "Manufacturer", "Model", "Serial number", "Location at the station", "Installation date", "Purchase date", "Purchase cost", "Warranty expiry"]) {
      expect(html, label).toContain(`>${label}`);
    }
    expect((html.match(/<label[^>]*for="/g) ?? []).length).toBeGreaterThanOrEqual(14);
    expect(html.match(/aria-hidden="true">\*</g)).toHaveLength(3);
    expect(html).toContain("Must be unique within your company.");
    expect(html).toContain("Create asset");
    expect(has(html, "station-readonly")).toBe(false);
    expect(html).toMatch(/type="date"[^>]*dir="ltr"|dir="ltr"[^>]*type="date"/);
  });

  it("create: no stations available → explanation and the submit button is disabled", async () => {
    as(["assets.create"]);
    const html = await render(<AssetForm mode="create" initialValues={emptyAssetForm()} {...baseProps} />, { seeds: [{ key: ["branches"], data: [] }] });
    expect(has(html, "no-stations")).toBe(true);
    expect(html).toContain("You have no stations available");
    expect(disabled(tag(html, "asset-submit"))).toBe(true);
  });

  it("edit: populated from the record; the station is read-only and explained", async () => {
    as(["assets.update"]);
    const a = asset({ description: "Main diesel pump", purchaseCost: "1250.50" });
    const html = await render(<AssetForm mode="edit" initialValues={assetToForm(a)} stationName="Riyadh North" {...baseProps} />, { seeds });
    expect(html).toContain('value="Diesel Pump 1"');
    expect(html).toContain('value="SN-0001"');
    expect(html).toContain('value="1250.5"');
    expect(html).toContain('value="2026-01-15"');
    expect(html).toContain("Main diesel pump");
    expect(has(html, "station-readonly")).toBe(true);
    expect(html).toContain("Riyadh North");
    expect(html).toContain("The station cannot be changed after the asset is created.");
    expect(html).toContain("Save changes");
    expect(html.match(/aria-hidden="true">\*</g)).toHaveLength(2); // station is not editable, so no asterisk on it
  });

  it("a server-rejected field (duplicate serial number) is flagged accessibly with its translated message", async () => {
    as(["assets.create"]);
    const html = await render(<AssetForm mode="create" initialValues={emptyAssetForm({ name: "X", serialNumber: "SN-1" })} {...baseProps} fieldErrors={{ serialNumber: "An asset with this serial number already exists in your company." }} />, { seeds });
    expect(html).toContain("An asset with this serial number already exists in your company.");
    expect(html).toMatch(/aria-invalid="true"[^>]*aria-describedby="[^"]*serialNumber-error"|aria-describedby="[^"]*serialNumber-error"[^>]*aria-invalid="true"/);
    expect(html).toMatch(/id="[^"]*serialNumber-error"[^>]*role="alert"|role="alert"[^>]*id="[^"]*serialNumber-error"/);
  });

  it("failure banner, no-changes notice and in-flight state", async () => {
    as(["assets.update"]);
    let html = await render(<AssetForm mode="edit" initialValues={assetToForm(asset())} stationName="S" {...baseProps} error="Could not reach the server. Nothing was changed." notice="There are no changes to save." />, { seeds });
    expect(has(html, "form-error")).toBe(true);
    expect(html).toContain("Nothing was changed");
    expect(html).toContain("There are no changes to save.");
    html = await render(<AssetForm mode="edit" initialValues={assetToForm(asset())} stationName="S" {...baseProps} submitting />, { seeds });
    expect(disabled(tag(html, "asset-submit"))).toBe(true);
    expect(html).toContain("Saving…");
    expect(html).toContain("animate-spin");
  });

  it("Arabic form", async () => {
    as(["assets.create"]);
    const html = await render(<AssetForm mode="create" initialValues={emptyAssetForm()} {...baseProps} />, { seeds, lng: "ar" });
    for (const s of ["المحطة", "اسم الأصل", "نوع الصيانة", "الرقم التسلسلي", "إنشاء الأصل", "تكلفة الشراء"]) expect(html, s).toContain(s);
    expect(html).not.toContain("Create asset");
  });
});

// ═══════════════════════════ details ═══════════════════════════
describe("asset details", () => {
  const page = (seeds: Seed[], entry = "/assets/1", lng: "en" | "ar" = "en") =>
    render(<Routes><Route path="/assets/:id" element={<AssetDetails />} /></Routes>, { seeds, entry, lng });
  const seed = (d = detail(), org = 1): Seed => ({ key: assetKeys.detail(org, d.id), data: d });

  it("General tab: the information the backend returns, formatted", async () => {
    as(["assets.read"]);
    const html = await page([seed()]);
    expect(html).toContain("Diesel Pump 1");
    expect(html).toContain("Riyadh North");
    for (const s of ["Dispenser", "Gilbarco", "Encore", "SN-0001", "Island 2", "Jan 15, 2026", "Dec 1, 2025", "1,250.50", "Jan 15, 2027"]) expect(html, s).toContain(s);
    expect(html).toContain("85");
    expect(html).toContain("Sep 1, 2026");
    expect(html).toContain("Nov 30, 2026");
    for (const tab of ["General", "Documents", "Warranties", "Inspections", "Maintenance", "History"]) expect(html, tab).toContain(`>${tab}<`);
  });

  it("Edit is offered only with assets.update", async () => {
    as(["assets.read"]);
    expect(has(await page([seed()]), "edit-asset")).toBe(false);
    as(["assets.read", "assets.create"]);
    expect(has(await page([seed()]), "edit-asset")).toBe(false);
    as(["assets.read", "assets.update"]);
    const html = await page([seed()]);
    expect(has(html, "edit-asset")).toBe(true);
    expect(html).toContain('href="/assets/1/edit"');
  });

  it("?tab= opens that tab's content (and only that tab fetches)", async () => {
    as(["assets.read"]);
    const html = await page([seed(), { key: assetKeys.sub(1, 1, "history"), data: hist([hev()]) }], "/assets/1?tab=history");
    expect(html).toContain("Asset created");
    expect(html).not.toContain("General information");
  });

  it.each([
    [404, undefined, "asset-unavailable", false],
    [403, "BRANCH_ACCESS_DENIED", "asset-unavailable", false],
    [403, "INSUFFICIENT_PERMISSIONS", "asset-unavailable", false],
    [500, undefined, "asset-load-error", true],
    [503, "PERMISSION_OVERRIDES_UNAVAILABLE", "asset-load-error", true],
  ] as const)("error %s %s → %s (retry: %s)", async (status, code, testId, retry) => {
    as(["assets.read"]);
    const html = await page([{ key: assetKeys.detail(1, 1), error: http(status, code) }]);
    expect(has(html, testId)).toBe(true);
    expect(html.includes("Retry")).toBe(retry);
    expect(html).toContain("Back to assets");
    expect(html).not.toContain("english server text");
  });

  it("a malformed id is not requested at all", async () => {
    as(["assets.read"]);
    const html = await render(<Routes><Route path="/assets/:id" element={<AssetDetails />} /></Routes>, { entry: "/assets/abc" });
    expect(html).toContain("Asset not found");
  });

  it("company isolation: an asset cached for another company is never shown", async () => {
    as(["assets.read"], 2);
    const html = await page([seed(detail({ name: "Secret Asset of Company 1" }), 1)]);
    expect(html).not.toContain("Secret Asset of Company 1");
    expect(has(html, "asset-loading")).toBe(true);
  });

  it("Arabic details", async () => {
    as(["assets.read", "assets.update"]);
    const html = await page([seed()], "/assets/1", "ar");
    for (const s of ["المعلومات العامة", "الرياض الشمالية", "المستندات", "الضمانات", "الفحوصات", "الصيانة", "السجل", "تعديل"]) expect(html, s).toContain(s);
    expect(html).toContain("Diesel Pump 1");
  });
});

// ═══════════════════════════ related records ═══════════════════════════
const sub = (kind: "documents" | "warranties" | "warrantyProviders" | "inspections" | "maintenance" | "history", data: unknown, org = 1): Seed => ({ key: assetKeys.sub(org, 1, kind), data });
/** A seeded history cache (what useInfiniteQuery stores): pages of { events, page }. */
const hev = (over: Record<string, unknown> = {}) => ({ eventId: "audit-1", id: 1, assetId: 1, organizationId: 1, performedByUserId: 2, actorName: "Sara Ali", eventType: "asset.created", source: "audit", details: { name: "Pump" }, createdAt: "2026-02-01T10:00:00.000Z", ...over });
const hist = (events: unknown[], page: { hasMore?: boolean; nextCursor?: string | null } = {}) => ({ pages: [{ events, page: { limit: 25, hasMore: false, nextCursor: null, ...page } }], pageParams: [null] });

describe("documents tab", () => {
  const docs = [
    { id: 1, assetId: 1, fileUrl: "https://files.example.com/manual.pdf", fileType: "PDF", title: "Service manual", uploadedByUserId: 3, createdAt: "2026-03-01T09:00:00.000Z", UploadedByUser: { id: 3, fullName: "Sara Ali" } },
    { id: 2, assetId: 1, fileUrl: "javascript:alert(1)", fileType: null, title: null, uploadedByUserId: 4, createdAt: "2026-03-02T09:00:00.000Z", UploadedByUser: null },
  ];
  it("lists link documents exactly as before (no upload help for read-only users); opens only safe links", async () => {
    as(["assets.read"]);
    const html = await render(<AssetDocumentsTab assetId={1} caps={caps("assets.read")} />, { seeds: [sub("documents", docs)] });
    expect(has(html, "documents-help")).toBe(false);
    expect(html).not.toContain("Uploading a file directly is not available.");
    expect(html).toContain("Service manual");
    expect(html).toContain("Added by Sara Ali");
    expect(html).toContain("Added by a team member");
    expect(html).toContain("Untitled document");
    expect(html).toContain('href="https://files.example.com/manual.pdf"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).not.toContain('href="javascript:');
    expect(html).toContain("javascript:alert(1)"); // shown as inert text
  });
  it("Add document needs record management; Delete needs assets.delete", async () => {
    const run = (...p: string[]) => render(<AssetDocumentsTab assetId={1} caps={caps(...p)} />, { seeds: [sub("documents", docs)] });
    let html = await run("assets.read");
    expect([has(html, "add-document"), has(html, "delete-document-1")]).toEqual([false, false]);
    html = await run("assets.read", "assets.manage_records");
    expect([has(html, "add-document"), has(html, "delete-document-1")]).toEqual([true, false]);
    html = await run("assets.read", "assets.create");
    expect(has(html, "add-document")).toBe(true);
    html = await run("assets.read", "assets.manage_records", "assets.delete");
    expect([has(html, "add-document"), has(html, "delete-document-1"), has(html, "delete-document-2")]).toEqual([true, true, true]);
  });
  it("empty and failed states", async () => {
    let html = await render(<AssetDocumentsTab assetId={1} caps={caps("assets.read")} />, { seeds: [sub("documents", [])] });
    expect(html).toContain("No documents have been added.");
    html = await render(<AssetDocumentsTab assetId={1} caps={caps("assets.read")} />, { seeds: [{ key: assetKeys.sub(1, 1, "documents"), error: http(500) }] });
    expect(has(html, "records-error")).toBe(true);
    expect(html).toContain("Retry");
    html = await render(<AssetDocumentsTab assetId={1} caps={caps("assets.read")} />, { seeds: [{ key: assetKeys.sub(1, 1, "documents"), error: http(403) }] });
    expect(html).not.toContain("Retry");
  });
  it("Arabic", async () => {
    const html = await render(<AssetDocumentsTab assetId={1} caps={caps("assets.read", "assets.manage_records")} />, { seeds: [sub("documents", docs)], lng: "ar" });
    expect(html).toContain("ارفع ملف PDF أو صورة");
    expect(html).toContain("إضافة مستند");
    expect(html).toContain("Service manual");
  });
});

describe("documents tab — uploads (Phase 3D.2)", () => {
  const base = { assetId: 1, uploadedByUserId: 3, createdAt: "2026-03-01T09:00:00.000Z", UploadedByUser: { id: 3, fullName: "Sara Ali" } };
  const upload = (id: number, over: Record<string, unknown>) => ({ ...base, id, source: "UPLOAD", fileUrl: null, fileType: "PDF", title: null, originalName: `file${id}.pdf`, mimeType: "application/pdf", sizeBytes: 1536, sha256: "a".repeat(64), scanStatus: "NOT_SCANNED", downloadUrl: `http://api.test/api/assets/documents/${id}/file`, ...over });
  const docs = [
    upload(1, { title: "Photo", originalName: "pump.png", mimeType: "image/png", fileType: "PNG" }),
    upload(2, { title: "Unscanned manual" }),
    upload(3, { title: "Clean manual", scanStatus: "CLEAN" }),
    upload(4, { title: "Bad file", scanStatus: "INFECTED" }),
    upload(5, { title: "Failed scan", scanStatus: "SCAN_FAILED", mimeType: "image/png" }),
    { ...base, id: 6, source: "LINK", fileUrl: "https://files.example.com/old.pdf", fileType: "PDF", title: "Old link" },
  ];
  const run = (perms: string[], lng: "en" | "ar" = "en") => { as(perms); return render(<AssetDocumentsTab assetId={1} caps={caps(...perms)} />, { seeds: [sub("documents", docs)], lng }); };

  it("shows name, type, size, uploader, date and an honest scan status for uploads", async () => {
    const html = await run(["assets.read"]);
    for (const x of ["Photo", "Unscanned manual", "Clean manual", "PNG", "1.5 KB", "Added by Sara Ali", "Not scanned", "Scanned — clean"]) expect(html).toContain(x);
    expect(tag(html, "document-scan-2")).not.toBeNull();
  });
  it("images preview + download; unscanned PDFs are download-only with an explanation; CLEAN PDFs preview", async () => {
    const html = await run(["assets.read"]);
    expect([has(html, "preview-document-1"), has(html, "download-document-1")]).toEqual([true, true]);
    expect([has(html, "preview-document-2"), has(html, "download-document-2"), has(html, "document-pdf-note-2")]).toEqual([false, true, true]);
    expect(html).toContain("PDF files can only be downloaded until they have been scanned.");
    expect([has(html, "preview-document-3"), has(html, "download-document-3"), has(html, "document-pdf-note-3")]).toEqual([true, true, false]);
  });
  it("blocked files offer neither preview nor download, and say why", async () => {
    const html = await run(["assets.read"]);
    for (const id of [4, 5]) expect([has(html, `preview-document-${id}`), has(html, `download-document-${id}`), has(html, `document-blocked-${id}`)]).toEqual([false, false, true]);
    expect(html).toContain("This file is blocked and cannot be opened or downloaded.");
    expect(html).toContain("Scan failed — blocked");
  });
  it("links keep their behaviour: Open link, no preview/download, no scan badge", async () => {
    const html = await run(["assets.read"]);
    expect(html).toContain('href="https://files.example.com/old.pdf"');
    expect([has(html, "preview-document-6"), has(html, "download-document-6"), has(html, "document-scan-6")]).toEqual([false, false, false]);
  });
  it("never renders a protected URL, storage key or path into the page", async () => {
    const html = await run(["assets.read", "assets.manage_records", "assets.delete"]);
    expect(html).not.toContain("downloadUrl");
    expect(html).not.toContain("/documents/2/file");
    expect(html).not.toContain("private:");
    expect(html).not.toContain("a".repeat(64));
  });
  it("permissions: read-only sees no upload/add control; upload needs manage_records OR create; delete needs assets.delete", async () => {
    let html = await run(["assets.read"]);
    expect([has(html, "add-document"), has(html, "delete-document-1"), has(html, "documents-help")]).toEqual([false, false, false]);
    expect(has(html, "download-document-1")).toBe(true);
    html = await run(["assets.read", "assets.manage_records"]);
    expect([has(html, "add-document"), has(html, "delete-document-1")]).toEqual([true, false]);
    html = await run(["assets.read", "assets.create"]);
    expect(has(html, "add-document")).toBe(true);
    html = await run(["assets.read", "assets.delete"]);
    expect([has(html, "add-document"), has(html, "delete-document-2"), has(html, "delete-document-6")]).toEqual([false, true, true]);
  });
  it("Arabic: strings and RTL, with technical values kept LTR", async () => {
    const html = await run(["assets.read", "assets.delete"], "ar");
    for (const x of ["لم يُفحص", "تم الفحص — سليم", "ملفات PDF لا يمكن إلا تنزيلها", "هذا الملف محظور", "تنزيل", "معاينة"]) expect(html).toContain(x);
    expect(html).toContain('dir="rtl"');
    expect(html).toContain('dir="ltr"');
  });
  it("source rules: authenticated blob fetch only — no direct anchor/img to a protected URL; sandboxed PDF frame; no Idempotency-Key header", () => {
    const tab = sources["./components/AssetDocumentsTab.tsx"];
    const form = sources["./components/DocumentUploadForm.tsx"];
    expect(tab).not.toMatch(/href=\{[^}]*downloadUrl/);
    expect(tab).not.toMatch(/src=\{[^}]*downloadUrl/);
    expect(tab).toContain('sandbox=""');
    expect(form).not.toMatch(/Idempotency-Key/i);
  });
});

describe("document upload form", () => {
  const form = async (lng: "en" | "ar" = "en") => { as(["assets.read", "assets.manage_records"]); return render(<DocumentUploadForm assetId={1} onUploaded={() => {}} onClose={() => {}} />, { lng }); };
  it("offers a file picker for PDF/images (camera on phones), optional title, 15MB hint, submit disabled until a file is chosen", async () => {
    const html = await form();
    expect(html).toContain('type="file"');
    expect(html).toContain("application/pdf,image/jpeg,image/png,image/gif,image/webp");
    expect(html).toContain("up to 15 MB");
    expect(html).toContain("Title (optional)");
    expect(html).toContain("No file selected");
    expect(disabled(tag(html, "document-upload-submit"))).toBe(true);
    expect(has(html, "document-progress")).toBe(false);
  });
  it("Arabic", async () => {
    const html = await form("ar");
    for (const x of ["اختر ملفًا", "لم يتم اختيار ملف", "العنوان (اختياري)", "رفع"]) expect(html).toContain(x);
  });
  it("the tab offers both modes, Upload first, and the link form is intact", () => {
    const tab = sources["./components/AssetDocumentsTab.tsx"];
    expect(tab).toContain('document-mode-');
    expect(tab).toContain('useState<"upload" | "link">("upload")');
    expect(tab).toContain('data-testid="document-form"');
    expect(tab).toContain("buildDocumentBody(values)");
  });
});

describe("warranties tab", () => {
  const prov = (id: number, name: string | null, nameAr: string | null, state: string) => ({ id, name, nameAr, state });
  const warranties = [
    { id: 1, assetId: 1, providerOrganizationId: 20, startDate: "2000-01-01", endDate: "2001-01-01", provider: prov(20, "Gulf Services", "خدمات الخليج", "ELIGIBLE") },
    { id: 2, assetId: 1, providerOrganizationId: 21, startDate: "2000-01-01", endDate: "2099-01-01", provider: prov(21, "Najd Maintenance", null, "INACTIVE") },
    { id: 3, assetId: 1, providerOrganizationId: 99, startDate: "2090-01-01", endDate: "2099-01-01", provider: prov(99, null, null, "UNAVAILABLE") },
    { id: 4, assetId: 1, providerOrganizationId: 22, startDate: "2010-01-01", endDate: "2011-01-01", provider: prov(22, "Old Partner", "الشريك القديم", "UNLINKED") },
    { id: 5, assetId: 1, providerOrganizationId: 77, startDate: "2012-01-01", endDate: "2013-01-01" }, // an older API: no provider object
  ];
  it("shows the provider's real name from the warranty itself, a state badge when it is no longer usable, and a status from the calendar", async () => {
    const html = await render(<AssetWarrantiesTab assetId={1} caps={caps("assets.read")} />, { seeds: [sub("warranties", warranties)] });
    expect(html).toContain("Gulf Services");
    expect(html).toContain("Najd Maintenance");
    expect(html).toContain("Old Partner");
    expect(html).toContain("Jan 1, 2000");
    expect(html).toMatch(/data-testid="warranty-status-1"[^>]*>Expired</);
    expect(html).toMatch(/data-testid="warranty-status-2"[^>]*>Active</);
    expect(html).toMatch(/data-testid="warranty-status-3"[^>]*>Upcoming</);
    // eligible: no badge; inactive / unlinked: a translated badge; every historical warranty is still listed
    expect(has(html, "warranty-provider-state-1")).toBe(false);
    expect(html).toMatch(/data-testid="warranty-provider-state-2"[^>]*>Provider inactive</);
    expect(html).toMatch(/data-testid="warranty-provider-state-4"[^>]*>Provider not linked</);
    for (const id of [1, 2, 3, 4, 5]) expect(has(html, `warranty-${id}`), `warranty ${id}`).toBe(true);
  });
  it("an unavailable provider gets a translated fallback: no name, no organization id; an older API falls back to the id it has", async () => {
    const html = await render(<AssetWarrantiesTab assetId={1} caps={caps("assets.read")} />, { seeds: [sub("warranties", warranties)] });
    expect(html).toMatch(/data-testid="warranty-provider-3"[^>]*>Provider no longer available</);
    expect(html).not.toContain("Provider #99");
    expect(html).not.toMatch(/data-testid="warranty-provider-3"[^>]*>[^<]*99/);
    expect(html).toContain("Provider #77");
  });
  it("Add needs record management; Edit needs assets.update; nobody sees edit controls without it", async () => {
    const run = (...p: string[]) => render(<AssetWarrantiesTab assetId={1} caps={caps(...p)} />, { seeds: [sub("warranties", warranties)] });
    let html = await run("assets.read");
    expect([has(html, "add-warranty"), has(html, "edit-warranty-1")]).toEqual([false, false]);
    html = await run("assets.read", "assets.manage_records");
    expect([has(html, "add-warranty"), has(html, "edit-warranty-1")]).toEqual([true, false]);
    html = await run("assets.read", "assets.create");
    expect([has(html, "add-warranty"), has(html, "edit-warranty-1")]).toEqual([true, false]);
    html = await run("assets.read", "assets.update");
    expect([has(html, "add-warranty"), has(html, "edit-warranty-1")]).toEqual([false, true]);
    expect(html).toMatch(/data-testid="edit-warranty-1"[^>]*>.*Edit</);
    // the edit controls exist for every warranty, including ones whose provider is gone (dates stay correctable)
    expect([2, 3, 4, 5].every((id) => has(html, `edit-warranty-${id}`))).toBe(true);
  });
  it("needs no linked-provider permission to view, and does not ask for the provider list until a form opens", async () => {
    as(["assets.read"]);
    const html = await render(<AssetWarrantiesTab assetId={1} caps={caps("assets.read")} />, { seeds: [sub("warranties", warranties)] });
    expect(html).toContain("Gulf Services");
    const tab = sources["./components/AssetWarrantiesTab.tsx"];
    expect(tab).toContain("useWarrantyProviders(assetId, adding || editing != null)");
    expect(tab).not.toContain("linked-providers");
    expect(tab).not.toContain("stationService");
  });
  it("empty; Arabic uses nameAr, RTL labels and the Arabic fallbacks", async () => {
    let html = await render(<AssetWarrantiesTab assetId={1} caps={caps("assets.read")} />, { seeds: [sub("warranties", [])] });
    expect(html).toContain("No warranties have been recorded.");
    html = await render(<AssetWarrantiesTab assetId={1} caps={caps("assets.read", "assets.update")} />, { seeds: [sub("warranties", warranties)], lng: "ar" });
    expect(html).toContain("الضمانات");
    expect(html).toContain("منتهٍ");
    expect(html).toContain("خدمات الخليج"); // nameAr preferred
    expect(html).toContain("Najd Maintenance"); // no nameAr: falls back to name
    expect(html).toContain("الشريك القديم");
    expect(html).toContain("المزوّد غير نشط");
    expect(html).toContain("المزوّد غير مرتبط");
    expect(html).toContain("المزوّد لم يعد متاحًا");
    expect(html).toMatch(/data-testid="edit-warranty-1"[^>]*>.*تعديل</);
    expect(html).toContain('dir="rtl"');
  });
  it("the picker is fed by the asset's own warranty-providers API, per company and per asset", async () => {
    const Picker = () => { const q = useWarrantyProviders(1, true); return <ul>{(q.data ?? []).map((p) => <li key={p.id}>{p.name}</li>)}</ul>; };
    as(["assets.read"]);
    const seed: Seed = { key: assetKeys.sub(1, 1, "warrantyProviders"), data: [{ id: 20, name: "Gulf Services", nameAr: null }, { id: 21, name: "Najd Maintenance", nameAr: null }] };
    let html = await render(<Picker />, { seeds: [seed] });
    expect(html).toContain("Gulf Services");
    expect(html).toContain("Najd Maintenance");
    // another asset's or another company's cache entry is never shown here
    html = await render(<Picker />, { seeds: [{ key: assetKeys.sub(1, 2, "warrantyProviders"), data: [{ id: 5, name: "Other asset", nameAr: null }] }, { key: assetKeys.sub(2, 1, "warrantyProviders"), data: [{ id: 6, name: "Other company", nameAr: null }] }] });
    expect(html).not.toContain("Other asset");
    expect(html).not.toContain("Other company");
  });
  it("the edit dialog compares against the saved values, sends only changes and disables Save when there are none (source-level wiring)", () => {
    const tab = sources["./components/AssetWarrantiesTab.tsx"];
    expect(tab).toContain("buildWarrantyUpdate(editing, editValues)");
    expect(tab).toContain("if (!body) return; // nothing changed: no request");
    expect(tab).toContain("disabled={update.isPending || !changes}");
    expect(tab).toContain("warrantyProviderChoices(editing, eligible)");
    expect(tab).toContain("await update.mutateAsync({ id: editing.id, body });");
    expect(tab.indexOf("await update.mutateAsync")).toBeLessThan(tab.indexOf('toast.success(t("toasts.warrantyUpdated"))'));
    expect(tab.indexOf("await create.mutateAsync")).toBeLessThan(tab.indexOf('toast.success(t("toasts.warrantyAdded"))'));
  });
});

describe("inspections, maintenance and history tabs", () => {
  it("inspections: list + permission-aware Record button + empty", async () => {
    const items = [{ id: 1, assetId: 1, inspectionDate: "2026-05-10", status: "Passed", notes: "All good" }, { id: 2, assetId: 1, inspectionDate: "2026-04-01", status: null, notes: null }];
    let html = await render(<AssetInspectionsTab assetId={1} caps={caps("assets.read")} />, { seeds: [sub("inspections", items)] });
    expect(html).toContain("May 10, 2026");
    expect(html).toContain("Passed");
    expect(html).toContain("All good");
    expect(html).toContain("No result recorded");
    expect(has(html, "add-inspection")).toBe(false);
    html = await render(<AssetInspectionsTab assetId={1} caps={caps("assets.read", "assets.manage_records")} />, { seeds: [sub("inspections", [])] });
    expect(has(html, "add-inspection")).toBe(true);
    expect(html).toContain("No inspections have been recorded.");
  });
  it("maintenance: who/when/notes, permission-aware, empty", async () => {
    const items = [{ id: 1, assetId: 1, performedByUserId: 2, performedAt: "2026-09-01T08:30:00.000Z", notes: "Replaced filter", performedByName: "Omar Khalid" }, { id: 2, assetId: 1, performedByUserId: 3, performedAt: "2026-08-01T08:30:00.000Z", notes: null, performedByName: null }];
    let html = await render(<AssetMaintenanceTab assetId={1} caps={caps("assets.read")} />, { seeds: [sub("maintenance", items)] });
    expect(html).toContain("By Omar Khalid");
    expect(html).toContain("By a team member");
    expect(html).toContain("Replaced filter");
    expect(has(html, "add-maintenance")).toBe(false);
    html = await render(<AssetMaintenanceTab assetId={1} caps={caps("assets.read", "assets.create")} />, { seeds: [sub("maintenance", [])] });
    expect(has(html, "add-maintenance")).toBe(true);
    expect(html).toContain("No maintenance has been recorded.");
  });
  it("history: read-only timeline; empty state", async () => {
    let html = await render(<AssetHistoryTab assetId={1} />, { seeds: [sub("history", hist([hev({ eventType: "asset.updated", details: { changes: [] } })]))] });
    expect(html).toContain("Asset updated");
    expect(html).not.toMatch(/data-testid="add-/);
    html = await render(<AssetHistoryTab assetId={1} />, { seeds: [sub("history", hist([]))] });
    expect(html).toContain("No history events have been recorded for this asset.");
  });
  it("other company's cached records are never shown", async () => {
    as(["assets.read"], 2);
    const html = await render(<AssetHistoryTab assetId={1} />, { seeds: [sub("history", hist([hev({ eventType: "secret.event" })]), 1)] });
    expect(html).not.toContain("secret.event");
    as(["assets.read"], 1);
  });
});


// ═══════════════════════════ asset activity timeline (Phase 3E.2) ═══════════════════════════
describe("asset activity timeline", () => {
  const FULL = [
    hev({ eventId: "audit-9", eventType: "asset_document.deleted", details: { documentId: 4, source: "UPLOAD", title: "Manual", originalName: "manual.pdf", mimeType: "application/pdf", sizeBytes: 2048, fileRemoved: true } }),
    hev({ eventId: "audit-8", eventType: "asset_document.uploaded", details: { documentId: 4, title: "Manual", originalName: "manual.pdf", mimeType: "application/pdf", sizeBytes: 2048, scanStatus: "NOT_SCANNED" } }),
    hev({ eventId: "audit-7", eventType: "asset_document.link_added", details: { documentId: 3, title: "Spec sheet" } }),
    hev({ eventId: "audit-6", eventType: "asset_maintenance.recorded", details: { maintenanceId: 1, performedAt: "2026-06-06T08:00:00.000Z", hasNotes: true } }),
    hev({ eventId: "audit-5", eventType: "asset_inspection.recorded", details: { inspectionId: 1, inspectionDate: "2026-05-05", status: "PASSED", hasNotes: false } }),
    hev({ eventId: "audit-4", eventType: "asset_warranty.updated", details: { warrantyId: 1, changes: [{ field: "endDate", from: "2027-01-01", to: "2029-01-01" }] } }),
    hev({ eventId: "audit-3", eventType: "asset_warranty.created", details: { warrantyId: 1, startDate: "2026-01-01", endDate: "2027-01-01" } }),
    hev({ eventId: "audit-2", eventType: "asset.updated", details: { changes: [{ field: "status", from: "ACTIVE", to: "UNDER_MAINTENANCE" }, { field: "name", from: "Pump", to: "Pump 2" }, { field: "installationDate", from: null, to: "2026-03-01" }, { field: "purchaseCost", redacted: true }] } }),
    hev({ eventId: "audit-1", eventType: "asset.created", details: { name: "Diesel Pump 1" } }),
  ];
  // bidi isolation marks (U+2066–2069) wrap embedded values so mixed-direction sentences stay readable; tests compare the visible text
  const run = async (events: unknown[], opts: { lng?: "en" | "ar"; page?: { hasMore?: boolean; nextCursor?: string | null } } = {}) => { as(["assets.read"]); return (await render(<AssetHistoryTab assetId={1} />, { seeds: [sub("history", hist(events, opts.page))], lng: opts.lng })).replace(/[\u2066-\u2069]/g, ""); };

  it("every supported event has a translated title, description and its safe details", async () => {
    const html = await run(FULL);
    for (const x of ["Asset created", "Asset added: Diesel Pump 1", "Asset updated", "Warranty added", "Warranty added, valid", "Warranty updated", "The warranty dates were updated.", "Inspection recorded", "Inspection recorded for", "Maintenance recorded", "Internal maintenance recorded for", "Document link added", "Link added: Spec sheet", "Document uploaded", "File uploaded: Manual", "Document deleted", "Document deleted: Manual"]) expect(html, x).toContain(x);
    for (const e of FULL) expect(has(html, `history-event-${(e as { eventId: string }).eventId}`)).toBe(true);
    expect(html).toContain("Result: PASSED");
    expect(html).toContain("The stored file was removed.");
    expect(html).toContain("Uploaded file");
    expect(html).toContain("2 KB");
    expect(html).toContain("Not scanned");
  });
  it("shows the events newest first exactly as the API ordered them", async () => {
    const html = await run(FULL);
    const order = FULL.map((e) => html.indexOf(`history-event-${(e as { eventId: string }).eventId}`));
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });
  it("actor name, localized time and a <time> element on every event", async () => {
    const html = await run([hev()]);
    expect(html).toContain("By Sara Ali");
    expect(html).toMatch(/<time dateTime="2026-02-01T10:00:00.000Z"[^>]*>Feb 1, 2026/);
  });
  it("missing actor falls back to 'A team member'", async () => {
    const html = await run([hev({ actorName: null, performedByUserId: null })]);
    expect(html).toContain("By A team member");
  });
  it("updates: translated field names, translated status values, formatted dates, before/after", async () => {
    const html = await run([FULL[7]]);
    for (const x of ["Changed fields", "Status", "Active", "Under maintenance", "Asset name", "Pump 2", "Installation date", "(empty)", "Mar 1, 2026", "Before", "After"]) expect(html, x).toContain(x);
    expect(has(html, "history-change-status")).toBe(true);
  });
  it("redacted fields show THAT they changed, never values", async () => {
    const html = await run([hev({ eventType: "asset.updated", details: { changes: [{ field: "purchaseCost", redacted: true, from: "1250.00", to: "9999" }, { field: "description", redacted: true, from: "secret text", to: "more secret" }] } })]);
    expect(has(html, "history-redacted-purchaseCost")).toBe(true);
    expect(has(html, "history-redacted-description")).toBe(true);
    expect(html).toContain("Purchase cost");
    expect(html).toContain("changed — value not shown");
    expect(html).not.toMatch(/1250|9999|secret text|more secret/);
    expect(html).not.toContain("Before");
  });
  it("inspection / maintenance: only whether notes exist, never note text", async () => {
    const html = await run([FULL[3], FULL[4], hev({ eventId: "audit-20", eventType: "asset_inspection.recorded", details: { inspectionDate: "2026-05-05", hasNotes: true, notes: "TOPSECRET NOTE" } })]);
    expect(html).toContain("Notes were provided.");
    expect(html).toContain("No notes were provided.");
    expect(html).not.toContain("TOPSECRET");
  });
  it("document events show only the safe snapshot (title or file name); nothing private ever renders", async () => {
    const html = await run([hev({ eventType: "asset_document.uploaded", details: { title: null, originalName: "Report.pdf", sha256: "f".repeat(64), storageKey: "private:asset-documents/2026/01/x.pdf", path: "/var/private/x.pdf", token: "Bearer abc" } })]);
    expect(html).toContain("File uploaded: Report.pdf");
    expect(html).not.toMatch(/private:|\/var\/|Bearer|f{20}/);
  });
  it("legacy rows: generic title + code, no details needed", async () => {
    const html = await run([hev({ eventId: "legacy-7", id: 7, source: "legacy", eventType: "LEGACY_SERVICED", details: null, actorName: null })]);
    expect(html).toContain("Earlier recorded event");
    expect(html).toContain("This event was recorded before detailed history was introduced.");
    expect(html).toContain("Event code: LEGACY_SERVICED");
  });
  it("unknown future events and malformed details never crash", async () => {
    const weird = [
      hev({ eventId: "audit-31", eventType: "asset.teleported", details: { anything: 1 } }),
      hev({ eventId: "audit-32", eventType: "asset.updated", details: "oops" }),
      hev({ eventId: "audit-33", eventType: "asset.updated", details: { changes: "nope" } }),
      hev({ eventId: "audit-34", eventType: "asset.updated", details: { changes: [null, 5, { field: 7 }, { field: "wat", from: { a: 1 }, to: [1] }] } }),
      hev({ eventId: "audit-35", eventType: "asset_document.deleted", details: [] }),
      hev({ eventId: "audit-36", eventType: "asset_warranty.created", details: null }),
      hev({ eventId: "audit-37", eventType: 42 as unknown as string, details: undefined }),
      hev({ eventId: "audit-38", eventType: "asset.created", createdAt: "not a date", actorName: 5 as unknown as string }),
    ];
    const html = await run(weird);
    expect(html).toContain("Activity recorded");
    expect(html).toContain("Event code: asset.teleported");
    expect(html).toContain("Asset updated");
    expect(weird.every((e) => html.includes(`history-event-${(e as { eventId: string }).eventId}`))).toBe(true);
  });
  it("user-supplied strings render as plain text (escaped) and long ones are truncated", async () => {
    const long = "A".repeat(300);
    const html = await run([hev({ eventType: "asset_document.link_added", details: { title: `<img src=x onerror=alert(1)>${long}` } })]);
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;img");
    expect(html).not.toContain("A".repeat(100));
    expect(html).toContain("…");
  });
  it("empty history: friendly state with the 'history starts now' hint", async () => {
    const html = await run([]);
    expect(html).toContain("No history events have been recorded for this asset.");
    expect(html).toContain("History is recorded from the moment this feature was introduced");
    expect(has(html, "history-list")).toBe(false);
  });
  it("loading and API errors; a forbidden answer has no retry", async () => {
    as(["assets.read"]);
    let html = await render(<AssetHistoryTab assetId={1} />);
    expect(has(html, "history-loading")).toBe(true);
    html = await render(<AssetHistoryTab assetId={1} />, { seeds: [{ key: assetKeys.sub(1, 1, "history"), error: http(500), data: { pages: [], pageParams: [] } }] });
    expect(has(html, "records-error")).toBe(true);
    expect(html).toContain("Retry");
    html = await render(<AssetHistoryTab assetId={1} />, { seeds: [{ key: assetKeys.sub(1, 1, "history"), error: http(403), data: { pages: [], pageParams: [] } }] });
    expect(has(html, "records-error")).toBe(true);
    expect(html).not.toContain("Retry");
  });
  it("switching asset or company never shows another asset's / company's cached events", async () => {
    as(["assets.read"]);
    const other = await render(<AssetHistoryTab assetId={2} />, { seeds: [sub("history", hist([hev({ eventType: "asset.created", details: { name: "ASSET-ONE-ONLY" } })]))] });
    expect(other).not.toContain("ASSET-ONE-ONLY");
    expect(has(other, "history-loading")).toBe(true);
    as(["assets.read"], 2);
    const company = await render(<AssetHistoryTab assetId={1} />, { seeds: [sub("history", hist([hev({ details: { name: "COMPANY-ONE-ONLY" } })]), 1)] });
    expect(company).not.toContain("COMPANY-ONE-ONLY");
    as(["assets.read"], 1);
  });
  it("pagination controls: Load more only when more exists; loading disables it; a failed page keeps the events and offers retry", async () => {
    let html = await run(FULL.slice(0, 2));
    expect(has(html, "history-load-more")).toBe(false);
    html = await run(FULL.slice(0, 2), { page: { hasMore: true, nextCursor: "abc" } });
    expect(has(html, "history-load-more")).toBe(true);
    expect(html).toContain("Load more");
    const i18n = await i18nFor("en");
    const view = (props: Record<string, unknown>) => renderToStaticMarkup(<I18nextProvider i18n={i18n}><AssetHistoryTimeline events={FULL.slice(0, 2) as never} locale="en" hasMore loadingMore={false} loadMoreFailed={false} onLoadMore={() => {}} {...props} /></I18nextProvider>);
    const loading = view({ loadingMore: true });
    expect(disabled(tag(loading, "history-load-more"))).toBe(true);
    expect(loading).toContain("Loading…");
    const failed = view({ loadMoreFailed: true });
    expect(has(failed, "history-load-more-error")).toBe(true);
    expect(failed).toContain("More history could not be loaded.");
    expect(has(failed, "history-event-audit-9")).toBe(true);
    expect(has(failed, "history-event-audit-8")).toBe(true);
  });
  it("the same event delivered on two pages is shown once", async () => {
    as(["assets.read"]);
    const dup = { pages: [{ events: [hev({ eventId: "audit-1" }), hev({ eventId: "audit-2", id: 2 })], page: { limit: 2, hasMore: true, nextCursor: "c" } }, { events: [hev({ eventId: "audit-2", id: 2 }), hev({ eventId: "legacy-2", id: 2, source: "legacy", eventType: "OLD" })], page: { limit: 2, hasMore: false, nextCursor: null } }], pageParams: [null, "c"] };
    const html = await render(<AssetHistoryTab assetId={1} />, { seeds: [sub("history", dup)] });
    expect(html.match(/data-testid="history-event-audit-2"/g)?.length).toBe(1);
    expect(has(html, "history-event-legacy-2")).toBe(true);
  });
  it("Arabic: translated titles, field names, status values and RTL; technical codes stay LTR", async () => {
    const html = await run([...FULL.slice(7, 9), hev({ eventId: "legacy-3", id: 3, source: "legacy", eventType: "OLD_CODE", details: null, actorName: null })], { lng: "ar" });
    for (const x of ["تم تحديث الأصل", "تم إنشاء الأصل", "الحقول التي تغيّرت", "الحالة", "نشط", "تحت الصيانة", "اسم الأصل", "تغيّر — القيمة غير معروضة", "حدث مسجَّل سابقًا", "بواسطة أحد أعضاء الفريق", "بواسطة Sara Ali"]) expect(html, x).toContain(x);
    expect(html).toContain('dir="rtl"');
    expect(html).toContain('class="font-mono"');
    const raw = renderToStaticMarkup(<I18nextProvider i18n={await i18nFor("ar")}><AssetHistoryTimeline events={[hev({ eventId: "legacy-3", id: 3, source: "legacy", eventType: "OLD_CODE", details: null }) as never]} locale="ar" hasMore={false} loadingMore={false} loadMoreFailed={false} onLoadMore={() => {}} /></I18nextProvider>);
    expect(raw).toContain("\u2066OLD_CODE\u2069"); // the code is an LTR island inside the Arabic sentence
  });
  it("source rules: no raw HTML injection, no physical left/right classes, no AuditLog access, event key is eventId", () => {
    for (const f of ["./components/AssetHistoryTimeline.tsx", "./components/AssetHistoryTab.tsx"]) {
      const src = sources[f];
      expect(src, f).not.toMatch(/dangerouslySetInnerHTML|innerHTML/);
      expect(src, f).not.toMatch(/\/audit|AuditLog/);
    }
    expect(sources["./components/AssetHistoryTimeline.tsx"]).toContain("key={event.eventId}");
  });
});

// ═══════════════════════════ source conventions ═══════════════════════════
describe("source conventions", () => {
  it("only logical (RTL-safe) utilities — no physical left/right classes", () => {
    for (const [path, src] of productionSources) expect(src, path).not.toMatch(/\b(?:ml|mr|pl|pr|left|right)-\d|\btext-(?:left|right)\b|\b(?:left|right)-0\b/);
  });
  it("there is no asset deletion in the UI (the backend has no such endpoint) and no direct HTTP outside the service", () => {
    for (const [path, src] of productionSources) {
      expect(src, path).not.toMatch(/assetService\.delete\(|deleteAsset\b|useDeleteAsset\b(?!Document)/);
      expect(src, path).not.toMatch(/\bfetch\(|axios\./);
      expect(src, path).not.toContain("dangerouslySetInnerHTML");
    }
  });
  it("success toasts are only reported from awaited mutations (after the API confirmed)", () => {
    for (const [path, src] of productionSources) {
      for (const m of src.matchAll(/toast\.success\([^)]*\)/g)) {
        const before = src.slice(0, m.index);
        expect(before.lastIndexOf("await "), `${path}: ${m[0]}`).toBeGreaterThan(before.lastIndexOf("catch"));
      }
    }
  });
});

describe("history: warranty provider corrections", () => {
  const events = [hev({ eventId: "audit-9", id: 9, eventType: "asset_warranty.updated", details: { warrantyId: 1, changes: [{ field: "providerOrganizationId", from: 4711, to: 4712 }, { field: "endDate", from: "2027-01-01", to: "2029-01-01" }] } })];
  const view = async (lng: "en" | "ar") => renderToStaticMarkup(<I18nextProvider i18n={await i18nFor(lng)}><AssetHistoryTimeline events={events as never} locale={lng} hasMore={false} loadingMore={false} loadMoreFailed={false} onLoadMore={() => {}} /></I18nextProvider>);
  it("labels the field 'Warranty provider' and says it changed, without printing organization ids; other changes still show their values", async () => {
    const html = await view("en");
    expect(html).toContain("Warranty provider");
    expect(html).toMatch(/data-testid="history-valueless-providerOrganizationId"[^>]*>The warranty provider was changed\.</);
    expect(html).not.toContain("4711");
    expect(html).not.toContain("4712");
    expect(html).not.toContain("providerOrganizationId</");
    expect(html).toContain("Jan 1, 2029");
  });
  it("Arabic label and sentence", async () => {
    const html = await view("ar");
    expect(html).toContain("مزوّد الضمان");
    expect(html).toContain("تم تغيير مزوّد الضمان.");
    expect(html).not.toContain("4711");
  });
  it("a malformed provider entry cannot leak values or crash", async () => {
    const odd = [hev({ eventId: "audit-10", id: 10, eventType: "asset_warranty.updated", details: { changes: [{ field: "providerOrganizationId", from: { x: 1 }, to: "<b>Evil Org</b>" }] } })];
    const html = renderToStaticMarkup(<I18nextProvider i18n={await i18nFor("en")}><AssetHistoryTimeline events={odd as never} locale="en" hasMore={false} loadingMore={false} loadMoreFailed={false} onLoadMore={() => {}} /></I18nextProvider>);
    expect(html).not.toContain("Evil Org");
    expect(html).toContain("The warranty provider was changed.");
  });
});
