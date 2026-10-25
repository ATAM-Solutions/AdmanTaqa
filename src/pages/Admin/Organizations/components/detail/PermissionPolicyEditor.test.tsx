import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createInstance } from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import enOrg from "@/i18n/locales/en/adminOrganizations.json";
import arOrg from "@/i18n/locales/ar/adminOrganizations.json";
import enCatalog from "@/i18n/locales/en/permissionCatalog.json";
import arCatalog from "@/i18n/locales/ar/permissionCatalog.json";
import type { AdminPermissionPolicy, PolicyPermission } from "@/types/adminOrganization";
import tabSource from "./PermissionPolicyTab.tsx?raw";
import pageSource from "../../AdminOrganizationDetail.tsx?raw";

vi.mock("@/i18n/config", async () => {
  const { createInstance } = await import("i18next");
  const i = createInstance();
  await i.init({ lng: "en", resources: { en: {} }, interpolation: { escapeValue: false } });
  return { default: i, isRtl: () => false };
});

import { PermissionPolicyEditor } from "./PermissionPolicyEditor";

async function i18nFor(lng: "en" | "ar") {
  const i = createInstance();
  await i.use(initReactI18next).init({
    lng, fallbackLng: "en", ns: ["adminOrganizations", "permissionCatalog"], defaultNS: "adminOrganizations",
    resources: { en: { adminOrganizations: enOrg, permissionCatalog: enCatalog }, ar: { adminOrganizations: arOrg, permissionCatalog: arCatalog } },
    interpolation: { escapeValue: false },
  });
  return i;
}
const perm = (code: string, over: Partial<PolicyPermission> = {}): PolicyPermission => ({
  code, managedBy: "permission_policy", grantDefault: "closed", decisionKind: null, sensitive: false, restricted: false, eligibleRoleNames: null, holdingRoleNames: [], ...over,
});
const policy = (over: Partial<AdminPermissionPolicy> = {}): AdminPermissionPolicy => ({
  organizationId: 7, organizationType: "FUEL_STATION", usersWithoutJobTitle: 0,
  roles: [
    { id: 1, name: "Station Owner", isSystem: true, isCompanyAdmin: true },
    { id: 2, name: "Station Manager", isSystem: true, isCompanyAdmin: false },
    { id: 3, name: "Maintenance Manager", isSystem: true, isCompanyAdmin: false },
  ],
  modules: [
    { id: "maintenance_decision", permissions: [
      perm("maintenance_issues.decide", { decisionKind: "formal_decision", sensitive: true, holdingRoleNames: ["Station Owner", "Maintenance Manager"] }),
      perm("station.maintenance_requests.create", { decisionKind: "direct_request", restricted: true, eligibleRoleNames: ["Station Owner", "Maintenance Manager"], holdingRoleNames: ["Station Owner", "Station Manager", "Maintenance Manager"] }),
    ] },
    { id: "assets", permissions: [perm("assets.create", { managedBy: "asset_policy", grantDefault: "open", restricted: true, eligibleRoleNames: ["Station Owner"], holdingRoleNames: ["Station Owner"] })] },
  ],
  ...over,
});
async function render(p: AdminPermissionPolicy, lng: "en" | "ar" = "en", props: Partial<Parameters<typeof PermissionPolicyEditor>[0]> = {}) {
  const i18n = await i18nFor(lng);
  return renderToStaticMarkup(
    <I18nextProvider i18n={i18n}>
      <div dir={lng === "ar" ? "rtl" : "ltr"}><PermissionPolicyEditor policy={p} onSave={async () => undefined} isSaving={false} {...props} /></div>
    </I18nextProvider>,
  );
}
const has = (html: string, id: string) => html.includes(`data-testid="${id}"`);
/** The whole opening tag of the button carrying the test id (attribute order is not significant). */
const button = (html: string, id: string) => html.match(new RegExp(`<button[^>]*data-testid="${id}"[^>]*>`))?.[0] ?? "";
const isDisabled = (tag: string) => /\sdisabled=""/.test(tag);

describe("matrix rendering", () => {
  it("groups permissions by module with translated names, and shows who holds each today", async () => {
    const html = await render(policy());
    expect(has(html, "module-maintenance_decision") && has(html, "module-assets")).toBe(true);
    expect(html).toContain("Internal / external decision");
    expect(html).toContain("Maintenance decision on a report");
    expect(html).toContain("Held today by: Station Owner, Maintenance Manager");
  });
  it("distinguishes the formal decision from direct request-type selection and marks sensitive permissions", async () => {
    const html = await render(policy());
    expect(html).toContain("Formal decision");
    expect(html).toContain("Request-type selection");
    expect(html).toContain("Sensitive");
  });
  it("a platform-default permission explains what default means; a restricted one lists the Job Titles with the company administrator locked on", async () => {
    const html = await render(policy());
    expect(has(html, "default-note-maintenance_issues.decide")).toBe(true);
    expect(html).toContain("It cannot be granted to a person whose Job Title does not already hold it");
    expect(has(html, "roles-station.maintenance_requests.create")).toBe(true);
    expect(has(html, "roles-maintenance_issues.decide")).toBe(false);
    const owner = html.match(/<button[^>]*data-testid="role-station.maintenance_requests.create-Station Owner"[^>]*>/)?.[0] ?? "";
    expect(owner).toMatch(/disabled=""/);
    expect(owner).toMatch(/aria-checked="true"/);
    const manager = html.match(/<button[^>]*data-testid="role-station.maintenance_requests.create-Station Manager"[^>]*>/)?.[0] ?? "";
    expect(manager).toMatch(/aria-checked="false"/);
    expect(manager).not.toMatch(/disabled=""/);
  });
  it("asset creation is shown but edited elsewhere", async () => {
    const html = await render(policy());
    expect(has(html, "managed-elsewhere-assets.create")).toBe(true);
    expect(html).toContain("Set in Asset permissions");
    expect(has(html, "restrict-assets.create")).toBe(false);
  });
  it("modules with a restriction start open and report the count", async () => {
    const html = await render(policy());
    expect(html).toMatch(/data-testid="module-maintenance_decision"[^>]*open|open[^>]*data-testid="module-maintenance_decision"/);
    expect(html).toContain("1 of 2 restricted");
  });
  it("tells the Super Admin about people without a Job Title, without offering to assign one", async () => {
    const html = await render(policy({ usersWithoutJobTitle: 3 }));
    expect(has(html, "no-job-title-note")).toBe(true);
    expect(html).toContain("People in this company without a Job Title: 3");
    expect(html).toContain("nothing is assigned to them automatically");
    expect(has(await render(policy()), "no-job-title-note")).toBe(false);
  });
  it("saving is disabled until something changed; a failed save is shown inline", async () => {
    const html = await render(policy(), "en", { saveError: "Nothing was saved." });
    expect(isDisabled(button(html, "save"))).toBe(true);
    expect(html).toContain("No unsaved changes.");
    expect(has(html, "save-error")).toBe(true);
    expect(html).toContain('role="alert"');
  });
  it("a save in flight locks the controls", async () => {
    const html = await render(policy(), "en", { isSaving: true });
    expect(isDisabled(button(html, "restrict-maintenance_issues.decide"))).toBe(true);
    expect(isDisabled(button(await render(policy()), "restrict-maintenance_issues.decide"))).toBe(false);
  });
});

describe("Arabic RTL", () => {
  it("renders translated modules, titles and explanations with the same structure", async () => {
    const html = await render(policy({ usersWithoutJobTitle: 2 }), "ar");
    expect(html).toContain('dir="rtl"');
    expect(html).toContain("قرار الصيانة داخلي / خارجي");
    expect(html).toContain("قرار الصيانة على البلاغ");
    expect(html).toContain("قرار رسمي");
    expect(html).toContain("الإعداد الافتراضي للمنصة");
    expect(html).toContain("بلا مسمّى وظيفي");
    expect(html).not.toContain("Maintenance decision on a report");
  });
  it("English and Arabic define the same permissionPolicy keys", () => {
    const keys = (o: unknown, prefix = ""): string[] =>
      Object.entries(o as Record<string, unknown>).flatMap(([k, v]) => (v && typeof v === "object" ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`]));
    expect(keys(arOrg.permissionPolicy).sort()).toEqual(keys(enOrg.permissionPolicy).sort());
  });
});

describe("tab wiring and conventions", () => {
  it("saves only through the mutation and reports success only after it confirmed", () => {
    expect(tabSource.match(/toast\.success/g)?.length).toBe(1);
    expect(tabSource.indexOf("toast.success")).toBeGreaterThan(tabSource.indexOf("mutateAsync"));
  });
  it("the company page registers the tab for the Super Admin only, keyed by company, and guards the URL", () => {
    expect(pageSource).toContain("canShowPermissionPolicyTab(viewerOrganization?.type, organization?.type)");
    expect(pageSource).toContain("<PermissionPolicyTab key={organization.id} organization={organization} />");
    expect(pageSource).toContain('candidate === "permission-policy" && organization && !showPermissionPolicy');
  });
});
