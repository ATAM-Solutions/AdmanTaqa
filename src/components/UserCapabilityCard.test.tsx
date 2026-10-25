import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createInstance } from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import enUsers from "@/i18n/locales/en/users.json";
import arUsers from "@/i18n/locales/ar/users.json";
import enCatalog from "@/i18n/locales/en/permissionCatalog.json";
import arCatalog from "@/i18n/locales/ar/permissionCatalog.json";
import type { CapabilityState } from "@/api/services/warehouseService";
import { capabilityQueryKey, classifyCapabilityError } from "@/lib/userCapabilities";
/** Mirrors enrgy-BE src/constants/permissionCatalog.js: a code added there must be translated here. */
const BACKEND_CATALOG_CODES = ["maintenance_issues.create", "maintenance_issues.read", "maintenance_issues.supervisor_review", "maintenance_issues.ops_approve", "maintenance_issues.decide", "station.maintenance_requests.create", "external_maintenance_v2.create", "workorders.create", "internal_tasks.read", "internal_tasks.assign", "internal_tasks.update_status", "internal_tasks.upload", "internal_tasks.review", "internal_tasks.close", "internal_work_orders.read", "internal_work_orders.create", "internal_work_orders.update", "internal_work_orders.review", "internal_work_orders.close", "internal_work_orders.warehouse_return", "internal_work_orders.ops_confirm", "station.requests.read", "station.requests.send_to_providers", "station.requests.select_quote", "station.job_orders.read", "station.job_orders.review", "external_maintenance_v2.read", "external_maintenance_v2.maintenance_review", "external_maintenance_v2.ops_closure", "warehouse.read", "warehouse.manage", "warehouse_items.create", "warehouse_orders.read", "warehouse_orders.create", "warehouse_orders.submit", "warehouse_orders.maintenance_approve", "warehouse_orders.review", "warehouse_orders.approve", "warehouse_orders.reject", "warehouse_orders.issue", "warehouse_orders.deliver", "warehouse_orders.close", "warehouse_orders.upload", "warehouse_orders.assign", "warehouse_orders.update_status", "assets.create", "assets.update", "assets.delete", "provider.rfqs.read", "provider.quotes.create", "provider.quotes.revise", "provider.quotes.withdraw", "provider.job_orders.read", "provider.job_orders.assign_operator", "provider.job_orders.update_status", "provider.job_orders.upload", "provider.jobs.execute", "provider.jobs.submit_review", "provider.visits.checkin", "provider.visits.upload", "provider.reports.create", "provider.reports.submit", "provider_job_v2.assign_technician", "provider_job_v2.execute", "provider_job_v2.review_report", "provider.payments.confirm_received", "operators.read", "operators.create", "operators.update", "provider_warehouse.read", "provider_warehouse.create", "provider_warehouse.approve", "provider_warehouse.issue", "provider.profile.manage", "provider.offerings.manage", "provider.categories.manage", "organizations.update", "team.read", "team.invite", "team.deactivate"];
// sources read through Vite (`?raw`): no Node typings needed, stays inside the app's tsc project
import cardSource from "./UserCapabilityCard.tsx?raw";
import userDetailsSource from "../pages/Users/UserDetails.tsx?raw";

// `@/lib/utils` pulls in the app's i18n bootstrap (touches `document`) and the API client needs VITE_API_URL: stub both.
vi.mock("@/i18n/config", async () => {
  const { createInstance } = await import("i18next");
  const i = createInstance();
  await i.init({ lng: "en", resources: { en: {} }, interpolation: { escapeValue: false } });
  return { default: i, isRtl: () => false };
});
vi.mock("@/api/config", () => ({ default: {} }));
const auth = vi.hoisted(() => ({
  state: { permissions: ["team.assign_roles"] as string[], org: { id: 1, type: "FUEL_STATION" }, viewer: { id: 1 } },
}));
vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    hasPermission: (code: string) => auth.state.permissions.includes(code),
    organization: auth.state.org,
    user: auth.state.viewer,
  }),
}));

import UserCapabilityCard, { CapabilityList } from "./UserCapabilityCard";

async function i18nFor(lng: "en" | "ar") {
  const i = createInstance();
  await i.use(initReactI18next).init({
    lng, fallbackLng: "en", ns: ["users"], defaultNS: "users",
    resources: { en: { users: enUsers }, ar: { users: arUsers } }, interpolation: { escapeValue: false },
  });
  return i;
}
const cap = (over: Partial<CapabilityState> = {}): CapabilityState => ({
  code: "assets.create", effective: false, byRole: false, override: null, eligible: true, eligibilityReason: null, ...over,
});
const wh = (over: Partial<CapabilityState> = {}): CapabilityState => ({ code: "warehouse_items.create", effective: false, byRole: false, override: null, ...over });

type ListProps = Parameters<typeof CapabilityList>[0];
async function renderList(props: Partial<ListProps> & { capabilities: ListProps["capabilities"] }, lng: "en" | "ar" = "en") {
  const i18n = await i18nFor(lng);
  return renderToStaticMarkup(
    <I18nextProvider i18n={i18n}>
      <div dir={lng === "ar" ? "rtl" : "ltr"}>
        <CapabilityList mode="edit" reason={null} {...props} />
      </div>
    </I18nextProvider>,
  );
}
const has = (html: string, id: string) => html.includes(`data-testid="${id}"`);
const tag = (html: string, id: string) => html.match(new RegExp(`<button[^>]*data-testid="${id}"[^>]*>`))?.[0] ?? null;
const disabled = (t: string | null) => t != null && /\sdisabled=""/.test(t); // the attribute, not Tailwind's `disabled:` classes

describe("both capabilities, each with its own state", () => {
  it("shows Create assets and Create warehouse items, in that order, with effective access, role source and individual setting", async () => {
    const html = await renderList({ capabilities: [cap({ effective: true, byRole: true }), wh({ override: "DENY" })] });
    expect(html.indexOf("Create assets")).toBeGreaterThan(-1);
    expect(html.indexOf("Create assets")).toBeLessThan(html.indexOf("Create warehouse items"));
    expect(html).toMatch(/data-testid="capability-state-assets.create"[^>]*>Allowed</);
    expect(html).toMatch(/data-testid="capability-state-warehouse_items.create"[^>]*>Not allowed</);
    expect(html).toMatch(/data-testid="capability-role-assets.create"[^>]*>The role grants it</);
    expect(html).toMatch(/data-testid="capability-role-warehouse_items.create"[^>]*>The role does not grant it</);
    expect(html).toMatch(/data-testid="capability-override-assets.create"[^>]*>Not set — follows the role</);
    expect(html).toMatch(/data-testid="capability-override-warehouse_items.create"[^>]*>Denied for this person</);
  });
});

describe("GRANT / DENY / DEFAULT controls", () => {
  it("no override: Allow and Deny offered, no reset", async () => {
    const html = await renderList({ capabilities: [cap()] });
    expect(disabled(tag(html, "capability-grant-assets.create"))).toBe(false);
    expect(disabled(tag(html, "capability-deny-assets.create"))).toBe(false);
    expect(has(html, "capability-reset-assets.create")).toBe(false);
    expect(html).toContain("Allow for this person");
    expect(html).toContain("Deny for this person");
  });
  it("GRANT override: Allow is spent, Back to role default appears", async () => {
    const html = await renderList({ capabilities: [cap({ override: "GRANT", effective: true })] });
    expect(disabled(tag(html, "capability-grant-assets.create"))).toBe(true);
    expect(disabled(tag(html, "capability-deny-assets.create"))).toBe(false);
    expect(has(html, "capability-reset-assets.create")).toBe(true);
    expect(html).toContain("Back to role default");
    expect(html).toMatch(/capability-override-assets.create"[^>]*>Allowed for this person</);
  });
  it("DENY override: Deny is spent, reset appears", async () => {
    const html = await renderList({ capabilities: [cap({ override: "DENY", byRole: true })] });
    expect(disabled(tag(html, "capability-deny-assets.create"))).toBe(true);
    expect(disabled(tag(html, "capability-grant-assets.create"))).toBe(false);
    expect(has(html, "capability-reset-assets.create")).toBe(true);
  });
  it("controls lock while a request is in flight; the pending row shows a spinner", async () => {
    const html = await renderList({ capabilities: [cap(), wh()], pendingCode: "assets.create" });
    for (const id of ["capability-grant-assets.create", "capability-deny-assets.create", "capability-grant-warehouse_items.create", "capability-deny-warehouse_items.create"]) expect(disabled(tag(html, id)), id).toBe(true);
    expect(tag(html, "capability-grant-assets.create")).not.toBeNull();
    expect(html.match(/animate-spin/g)?.length).toBe(1);
  });
});

describe("platform (Super Admin) restriction", () => {
  const restricted = cap({ eligible: false, eligibilityReason: "ROLE_NOT_ELIGIBLE", restrictedByPlatform: true });
  it("GRANT is disabled, the explanation is shown, and the effective state is visibly dimmed", async () => {
    const html = await renderList({ capabilities: [restricted] });
    expect(disabled(tag(html, "capability-grant-assets.create"))).toBe(true);
    expect(disabled(tag(html, "capability-deny-assets.create"))).toBe(false);
    expect(has(html, "capability-restricted-assets.create")).toBe(true);
    expect(html).toContain("The platform administrator has not allowed this person&#x27;s Job Title to hold this permission");
    expect(html).toMatch(/opacity-60[^>]*data-testid="capability-state-assets.create"|data-testid="capability-state-assets.create"[^>]*opacity-60|opacity-60[^"]*"[^>]*data-testid="capability-state-assets.create"/);
    expect(html).toMatch(/capability-state-assets.create"[^>]*>Not allowed</);
  });
  it("a stored GRANT on a restricted role is shown as such but cannot be re-granted; it can be removed", async () => {
    const html = await renderList({ capabilities: [{ ...restricted, override: "GRANT" }] });
    expect(disabled(tag(html, "capability-grant-assets.create"))).toBe(true);
    expect(has(html, "capability-reset-assets.create")).toBe(true);
  });
  it("policy that cannot be verified: its own message, GRANT unavailable", async () => {
    const html = await renderList({ capabilities: [cap({ eligible: false, eligibilityReason: "POLICY_UNAVAILABLE" })] });
    expect(html).toContain("cannot be checked right now");
    expect(disabled(tag(html, "capability-grant-assets.create"))).toBe(true);
  });
  it("the restriction is per capability: the warehouse row of the same person stays fully editable", async () => {
    const html = await renderList({ capabilities: [restricted, wh()] });
    expect(disabled(tag(html, "capability-grant-warehouse_items.create"))).toBe(false);
    expect(has(html, "capability-restricted-warehouse_items.create")).toBe(false);
  });
});

describe("read-only: own account and protected administrators", () => {
  it.each([["self", "You can&#x27;t change your own permissions."], ["protected", "company administrator"]] as const)("%s: information stays, no editing controls", async (reason, text) => {
    const html = await renderList({ capabilities: [cap({ effective: true, byRole: true }), wh()], mode: "readonly", reason });
    expect(has(html, "capability-readonly")).toBe(true);
    expect(html).toContain(text);
    expect(html).not.toMatch(/data-testid="capability-(grant|deny|reset)-/);
    expect(html).toContain("Allowed"); // still shows what the person can do
  });
});

describe("failures are shown per capability, translated", () => {
  it.each([
    ["selfChange", "can&#x27;t change your own"],
    ["protectedUser", "protected administrator"],
    ["roleNotEligible", "has not allowed this person&#x27;s Job Title to hold this permission"],
    ["unavailable", "can&#x27;t be verified right now"],
    ["network", "Could not reach the server. Nothing was changed."],
    ["server", "Something went wrong. Nothing was changed."],
  ] as const)("%s", async (kind, text) => {
    const html = await renderList({ capabilities: [cap(), wh()], errors: { "assets.create": kind } });
    expect(has(html, "capability-error-assets.create")).toBe(true);
    expect(html).toContain(text);
    expect(has(html, "capability-error-warehouse_items.create")).toBe(false);
    expect(html).toContain('role="alert"');
  });
});

describe("Arabic RTL / English LTR", () => {
  it("Arabic strings, with the same structure", async () => {
    const html = await renderList({ capabilities: [cap({ eligible: false, eligibilityReason: "ROLE_NOT_ELIGIBLE" }), wh({ override: "GRANT", effective: true })] }, "ar");
    expect(html).toContain('dir="rtl"');
    expect(html).toContain("إنشاء الأصول");
    expect(html).toContain("إنشاء أصناف المستودع");
    expect(html).toContain("لم يسمح مسؤول المنصة للمسمّى الوظيفي");
    expect(html).toContain("السماح لهذا الشخص");
    expect(html).toContain("مسموح لهذا الشخص");
    expect(html).not.toContain("Create assets");
  });
  it("English and Arabic define exactly the same capabilities keys", () => {
    const keys = (o: unknown, prefix = ""): string[] =>
      Object.entries(o as Record<string, unknown>).flatMap(([k, v]) => (v && typeof v === "object" ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`]));
    expect(keys(arUsers.capabilities).sort()).toEqual(keys(enUsers.capabilities).sort());
  });
});

describe("the card (container): visibility, company isolation", () => {
  async function renderCard(opts: { permissions?: string[]; org?: { id: number; type: string }; viewerId?: number; target?: number; roleNames?: string[]; seed?: { orgId: number | null; list: CapabilityState[] } }) {
    auth.state = { permissions: opts.permissions ?? ["team.assign_roles"], org: opts.org ?? { id: 1, type: "FUEL_STATION" }, viewer: { id: opts.viewerId ?? 1 } };
    const qc = new QueryClient();
    const target = opts.target ?? 2;
    const seed = opts.seed ?? { orgId: auth.state.org.id, list: [cap(), wh()] };
    qc.setQueryData(capabilityQueryKey(seed.orgId, target), seed.list);
    const i18n = await i18nFor("en");
    return renderToStaticMarkup(
      <QueryClientProvider client={qc}>
        <I18nextProvider i18n={i18n}>
          <UserCapabilityCard userId={target} roleNames={opts.roleNames ?? ["Technician"]} />
        </I18nextProvider>
      </QueryClientProvider>,
    );
  }
  it("authorized Company Manager sees the card with editing controls", async () => {
    const html = await renderCard({});
    expect(has(html, "capability-card")).toBe(true);
    expect(html).toContain("Individual permissions");
    expect(tag(html, "capability-grant-assets.create")).not.toBeNull();
    expect(tag(html, "capability-grant-warehouse_items.create")).not.toBeNull();
  });
  it("a user without team.assign_roles sees nothing at all", async () => {
    expect(await renderCard({ permissions: ["users.read", "assets.read"] })).toBe("");
  });
  it("platform tenants see nothing; a Service Provider administrator sees the card (providers have delegable permissions too)", async () => {
    for (const type of ["AUTHORITY", "SUPER_ADMIN"]) expect(await renderCard({ org: { id: 1, type } }), type).toBe("");
    expect(has(await renderCard({ org: { id: 1, type: "SERVICE_PROVIDER" } }), "capability-card")).toBe(true);
  });
  it("own account: card shown read-only", async () => {
    const html = await renderCard({ viewerId: 2, target: 2 });
    expect(has(html, "capability-readonly")).toBe(true);
    expect(html).not.toMatch(/data-testid="capability-(grant|deny|reset)-/);
  });
  it("company administrator: card shown read-only", async () => {
    const html = await renderCard({ roleNames: ["Station Owner"] });
    expect(html).toContain("company administrator");
    expect(html).not.toMatch(/data-testid="capability-(grant|deny|reset)-/);
  });
  it("company isolation: data cached for another company is never shown", async () => {
    const html = await renderCard({ org: { id: 2, type: "FUEL_STATION" }, seed: { orgId: 1, list: [cap({ effective: true })] } });
    expect(html).toContain("Loading…");
    expect(html).not.toContain("capability-row-");
  });
  it("only the capabilities the API returned are shown (no asset row when the API omits it)", async () => {
    const html = await renderCard({ seed: { orgId: 1, list: [wh()] } });
    expect(has(html, "capability-row-warehouse_items.create")).toBe(true);
    expect(has(html, "capability-row-assets.create")).toBe(false);
  });
});

describe("source conventions and page compatibility", () => {
  it("uses logical (RTL-safe) utilities only", () => {
    expect(cardSource).not.toMatch(/\b(?:ml|mr|pl|pr|left|right)-\d|\btext-(?:left|right)\b|\b(?:left|right)-0\b/);
  });
  it("does not recompute eligibility or role grants (reads the API's fields)", () => {
    expect(cardSource).not.toMatch(/holdsAssetCreate|allowedRole|\.eligible\b|eligibilityReason/);
  });
  it("the User Details page still renders the card once, now with the person's role names", () => {
    expect(userDetailsSource.match(/<UserCapabilityCard /g)?.length).toBe(1);
    expect(userDetailsSource).toContain("<UserCapabilityCard userId={user.id} roleNames={user.roles?.map((r) => r.name)} />");
  });
  it("success is reported only from the mutation's onSuccess", () => {
    const successToasts = cardSource.match(/toast\.success/g) ?? [];
    expect(successToasts.length).toBe(1);
    expect(cardSource.indexOf("toast.success")).toBeGreaterThan(cardSource.indexOf("onSuccess:"));
    expect(cardSource.indexOf("toast.success")).toBeLessThan(cardSource.indexOf("onError:"));
  });
});

// ── D3: every module, grouped, with reasons ─────────────────────────────────────────────────────────────────────
describe("dynamic permissions: modules, labels, reasons", () => {
  const rows: CapabilityState[] = [
    { code: "maintenance_issues.decide", effective: true, byRole: true, override: null, eligible: true, eligibilityReason: null, module: "maintenance_decision", decisionKind: "formal_decision", sensitive: true },
    { code: "station.maintenance_requests.create", effective: false, byRole: false, override: null, eligible: false, eligibilityReason: "NOT_GRANTABLE", module: "maintenance_decision", decisionKind: "direct_request" },
    { code: "internal_tasks.assign", effective: false, byRole: false, override: null, eligible: false, eligibilityReason: "ROLE_NOT_ELIGIBLE", module: "internal_tasks", restrictedByPlatform: true },
    { code: "warehouse_orders.approve", effective: false, byRole: false, override: null, eligible: false, eligibilityReason: "NO_JOB_TITLE", module: "warehouse" },
    { code: "internal_tasks.read", effective: true, byRole: false, override: "GRANT", eligible: true, eligibilityReason: null, module: "internal_tasks" },
  ];
  async function renderCatalog(lng: "en" | "ar" = "en", list: CapabilityState[] = rows) {
    auth.state = { permissions: ["team.assign_roles"], org: { id: 1, type: "FUEL_STATION" }, viewer: { id: 1 } };
    const qc = new QueryClient();
    qc.setQueryData(capabilityQueryKey(1, 2), list);
    const i = createInstance();
    await i.use(initReactI18next).init({
      lng, fallbackLng: "en", ns: ["users", "permissionCatalog"], defaultNS: "users",
      resources: { en: { users: enUsers, permissionCatalog: enCatalog }, ar: { users: arUsers, permissionCatalog: arCatalog } }, interpolation: { escapeValue: false },
    });
    return renderToStaticMarkup(
      <QueryClientProvider client={qc}>
        <I18nextProvider i18n={i}>
          <div dir={lng === "ar" ? "rtl" : "ltr"}><UserCapabilityCard userId={2} roleNames={["Quality Lead"]} /></div>
        </I18nextProvider>
      </QueryClientProvider>,
    );
  }
  it("groups permissions by module in the platform order and names them from the catalog", async () => {
    const html = await renderCatalog();
    expect(has(html, "capability-module-maintenance_decision") && has(html, "capability-module-internal_tasks") && has(html, "capability-module-warehouse")).toBe(true);
    expect(html.indexOf("capability-module-maintenance_decision")).toBeLessThan(html.indexOf("capability-module-internal_tasks"));
    expect(html.indexOf("capability-module-internal_tasks")).toBeLessThan(html.indexOf("capability-module-warehouse"));
    expect(html).toContain("Internal / external decision");
    expect(html).toContain("Maintenance decision on a report");
    expect(html).toContain("Assign technicians");
    expect(html).toMatch(/1 allowed of 2/);
  });
  it("separates the formal decision from direct request-type selection and flags sensitive permissions", async () => {
    const html = await renderCatalog();
    expect(html).toContain("Formal decision");
    expect(html).toContain("Request-type selection");
    expect(html).toContain("Sensitive");
    expect(html).toContain("This is request-type selection, not the formal decision.");
  });
  it("explains why each permission is unavailable, with a different message per reason", async () => {
    const html = await renderCatalog();
    expect(has(html, "capability-unavailable-station.maintenance_requests.create")).toBe(true);
    expect(html).toContain("has not made this permission available to allow per person");
    expect(html).toContain("has not allowed this person&#x27;s Job Title to hold this permission");
    expect(html).toContain("This person has no Job Title");
    expect(disabled(tag(html, "capability-grant-internal_tasks.assign"))).toBe(true);
    expect(disabled(tag(html, "capability-grant-warehouse_orders.approve"))).toBe(true);
    expect(disabled(tag(html, "capability-deny-warehouse_orders.approve"))).toBe(false); // tightening is always offered
  });
  it("offers filters (all / allowed / can be allowed / unavailable)", async () => {
    const html = await renderCatalog();
    for (const f of ["all", "allowed", "available", "unavailable"]) expect(has(html, `capability-filter-${f}`)).toBe(true);
    expect(html).toContain("Unavailable");
    expect(html).toContain("without signing in again");
  });
  it("Arabic: same structure, translated modules, names and reasons", async () => {
    const html = await renderCatalog("ar");
    expect(html).toContain('dir="rtl"');
    expect(html).toContain("قرار الصيانة داخلي / خارجي");
    expect(html).toContain("قرار الصيانة على البلاغ");
    expect(html).toContain("هذا الشخص بلا مسمّى وظيفي");
    expect(html).toContain("اختيار نوع الطلب");
    expect(html).not.toContain("Maintenance decision on a report");
  });
  it("English and Arabic define the same catalog keys, and every backend catalog code is translated", () => {
    const keys = (o: unknown, prefix = ""): string[] =>
      Object.entries(o as Record<string, unknown>).flatMap(([k, v]) => (v && typeof v === "object" ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`]));
    expect(keys(arCatalog).sort()).toEqual(keys(enCatalog).sort());
    for (const code of BACKEND_CATALOG_CODES) {
      const k = code.replace(/\./g, "_");
      expect((enCatalog.codes as Record<string, { name?: string }>)[k]?.name, `en ${code}`).toBeTruthy();
      expect((arCatalog.codes as Record<string, { name?: string }>)[k]?.name, `ar ${code}`).toBeTruthy();
    }
  });
  it("new failure kinds are classified by code and translated", () => {
    expect(classifyCapabilityError({ response: { status: 409, data: { code: "NO_JOB_TITLE" } } })).toBe("noJobTitle");
    expect(classifyCapabilityError({ response: { status: 409, data: { code: "CAPABILITY_NOT_GRANTABLE" } } })).toBe("notGrantable");
    for (const kind of ["noJobTitle", "notGrantable"]) {
      expect((enUsers.capabilities.errors as Record<string, string>)[kind]).toBeTruthy();
      expect((arUsers.capabilities.errors as Record<string, string>)[kind]).toBeTruthy();
    }
  });
});
