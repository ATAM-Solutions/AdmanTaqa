import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createInstance } from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import enOrg from "@/i18n/locales/en/adminOrganizations.json";
import arOrg from "@/i18n/locales/ar/adminOrganizations.json";
import type { AdminAssetPolicy, AssetPolicyRole } from "@/types/adminOrganization";
// sources read through Vite (`?raw`) so this file needs no Node typings and stays inside the app's tsc project
import editorSource from "./AssetPolicyEditor.tsx?raw";
import tabSource from "./AssetPermissionsTab.tsx?raw";
import pageSource from "../../AdminOrganizationDetail.tsx?raw";

// `@/lib/utils` (used by every ui primitive) pulls in the app's i18n bootstrap, which touches `document`; give it a plain instance.
vi.mock("@/i18n/config", async () => {
  const { createInstance } = await import("i18next");
  const i = createInstance();
  await i.init({ lng: "en", resources: { en: {} }, interpolation: { escapeValue: false } });
  return { default: i, isRtl: () => false };
});

import { AssetPolicyEditor } from "./AssetPolicyEditor";

async function i18nFor(lng: "en" | "ar") {
  const i = createInstance();
  await i.use(initReactI18next).init({
    lng, fallbackLng: "en", ns: ["adminOrganizations"], defaultNS: "adminOrganizations",
    resources: { en: { adminOrganizations: enOrg }, ar: { adminOrganizations: arOrg } },
    interpolation: { escapeValue: false },
  });
  return i;
}

const role = (id: number, name: string, extra: Partial<AssetPolicyRole> = {}): AssetPolicyRole => ({
  id, name, isSystem: false, isCompanyAdmin: false, holdsAssetCreate: false, eligible: true, ...extra,
});
const base = (over: Partial<AdminAssetPolicy> = {}): AdminAssetPolicy => ({
  organizationId: 7, organizationType: "FUEL_STATION", restricted: false, allowedRoleNames: [], staleRoleNames: [], staleRoleIds: [],
  hasPolicy: false, updatedAt: null, updatedByUserId: null,
  roles: [
    role(1, "Station Owner", { isCompanyAdmin: true, holdsAssetCreate: true }),
    role(2, "Station Manager", { holdsAssetCreate: true }),
    role(3, "Technician"),
    role(4, "Warehouse Manager", { holdsAssetCreate: true, isSystem: true }),
  ],
  ...over,
});
const restricted = (allowed: string[], over: Partial<AdminAssetPolicy> = {}): AdminAssetPolicy => {
  const b = base();
  return { ...b, restricted: true, hasPolicy: true, allowedRoleNames: allowed, updatedAt: "2026-10-01T10:00:00.000Z", roles: b.roles.map((r) => ({ ...r, eligible: allowed.includes(r.name) })), ...over };
};

async function render(policy: AdminAssetPolicy, lng: "en" | "ar" = "en", props: Partial<Parameters<typeof AssetPolicyEditor>[0]> = {}) {
  const i18n = await i18nFor(lng);
  return renderToStaticMarkup(
    <I18nextProvider i18n={i18n}>
      <div dir={lng === "ar" ? "rtl" : "ltr"}>
        <AssetPolicyEditor policy={policy} onSave={async () => undefined} isSaving={false} {...props} />
      </div>
    </I18nextProvider>,
  );
}
const isDisabled = (tag: string) => /\sdisabled=""/.test(tag); // the attribute, not Tailwind's `disabled:` classes
const has = (html: string, testId: string) => html.includes(`data-testid="${testId}"`);
const checkboxFor = (html: string, roleId: number) => {
  const m = html.match(new RegExp(`<button[^>]*id="asset-policy-role-${roleId}"[^>]*>`));
  expect(m, `checkbox for role ${roleId}`).not.toBeNull();
  return m![0];
};

describe("initial unrestricted state", () => {
  it("explains that nothing is restricted, shows every role as eligible-but-locked, and offers no save", async () => {
    const html = await render(base());
    expect(has(html, "unrestricted-note")).toBe(true);
    expect(html).toContain("No restriction is applied");
    expect(html).toContain("Not restricted");
    expect(html).toContain("No policy has been saved for this company yet.");
    expect(has(html, "owner-warning")).toBe(false);
    expect(has(html, "stale-references")).toBe(false);
    for (const id of [1, 2, 3, 4]) {
      const cb = checkboxFor(html, id);
      expect(cb).toContain('aria-checked="true"'); // everyone keeps what they have
      expect(isDisabled(cb)).toBe(true);
    }
    // Save and Discard are disabled: nothing to save
    expect(html).toMatch(/<button[^>]*\sdisabled=""[^>]*>(?:(?!<\/button>).)*Save changes/s);
    expect(html).toMatch(/<button[^>]*\sdisabled=""[^>]*>(?:(?!<\/button>).)*Discard changes/s);
  });

  it("the restriction switch is an accessible labelled control and is off", async () => {
    const html = await render(base());
    const sw = html.match(/<button[^>]*id="asset-policy-restricted"[^>]*>/)![0];
    expect(sw).toContain('role="switch"');
    expect(sw).toContain('aria-checked="false"');
    expect(sw).toContain('aria-describedby="asset-policy-restricted-hint"');
    expect(html).toContain('for="asset-policy-restricted"');
  });
});

describe("existing restricted state", () => {
  it("shows the API's eligibility per role, the count, the last update, and no owner warning when the owner is eligible", async () => {
    const html = await render(restricted(["Station Owner", "Station Manager"]));
    expect(html).toContain("Restricted");
    expect(html).not.toContain("No restriction is applied");
    expect(has(html, "unrestricted-note")).toBe(false);
    expect(checkboxFor(html, 1)).toContain('aria-checked="true"');
    expect(checkboxFor(html, 2)).toContain('aria-checked="true"');
    expect(checkboxFor(html, 3)).toContain('aria-checked="false"');
    expect(checkboxFor(html, 4)).toContain('aria-checked="false"');
    expect(isDisabled(checkboxFor(html, 3))).toBe(false);
    expect(isDisabled(checkboxFor(html, 1))).toBe(false);
    expect(html).toContain("2 of 4 roles selected");
    expect(html).toContain("Last updated");
    expect(has(html, "owner-warning")).toBe(false);
    expect(html).toContain('role="switch"');
    expect(html.match(/<button[^>]*id="asset-policy-restricted"[^>]*>/)![0]).toContain('aria-checked="true"');
  });

  it("warns when the company administrator is left out of the saved policy", async () => {
    const html = await render(restricted(["Station Manager"]));
    expect(has(html, "owner-warning")).toBe(true);
    expect(html).toContain("The company administrator is not selected");
    expect(html).toContain("Station Owner would no longer be able to create assets");
  });

  it("marks the administrator and shared roles, and whether each role itself grants Create Assets", async () => {
    const html = await render(restricted(["Station Owner", "Technician"]));
    expect(html).toContain("Company administrator");
    expect(html).toContain("Shared role");
    expect(html).toContain("Has Create Assets");
    expect(html).toContain("Does not grant Create Assets");
    // Technician is eligible but its role does not grant the permission → explained on the row
    expect(html).toContain("Eligible, but this role does not grant Create Assets itself.");
  });

  it("every role checkbox has a real <label for> and a description", async () => {
    const html = await render(restricted(["Station Owner"]));
    for (const id of [1, 2, 3, 4]) expect(html).toContain(`for="asset-policy-role-${id}"`);
    // Station Owner (1) is eligible AND grants the permission → no hint, so no dangling aria-describedby
    expect(checkboxFor(html, 1)).not.toContain("aria-describedby");
    // an eligible role that does NOT grant Create Assets gets a hint and a matching description id
    const withNote = await render(restricted(["Station Owner", "Technician"]));
    expect(checkboxFor(withNote, 3)).toContain('aria-describedby="asset-policy-role-3-hint"');
    expect(withNote).toContain('id="asset-policy-role-3-hint"');
  });
});

describe("stale references", () => {
  it("lists removed-role references and says a save removes them", async () => {
    const html = await render(restricted(["Station Owner"], { staleRoleNames: ["Old Shared Role"], staleRoleIds: [41, 42] }));
    expect(has(html, "stale-references")).toBe(true);
    expect(html).toContain("Outdated role references");
    expect(html).toContain("Old Shared Role");
    expect(html).toContain("2 removed role(s) referenced by id");
    expect(html).toContain("will be removed the next time you save");
  });
});

describe("saving feedback", () => {
  it("shows an in-flight save: spinner label, controls locked", async () => {
    const html = await render(restricted(["Station Owner"]), "en", { isSaving: true });
    expect(html).toContain("animate-spin");
    expect(isDisabled(checkboxFor(html, 3))).toBe(true);
    expect(isDisabled(html.match(/<button[^>]*id="asset-policy-restricted"[^>]*>/)![0])).toBe(true);
  });

  it("shows the translated failure next to the unsaved changes, never a success", async () => {
    const html = await render(restricted(["Station Owner"]), "en", { saveError: "Could not reach the server." });
    expect(has(html, "save-error")).toBe(true);
    expect(html).toContain("The changes were not saved.");
    expect(html).toContain("Could not reach the server.");
  });

  it("nothing is marked unsaved on a pristine form", async () => {
    const html = await render(restricted(["Station Owner"]));
    expect(html).not.toContain("You have unsaved changes");
  });
});

describe("languages", () => {
  it("English: LTR strings", async () => {
    const html = await render(restricted(["Station Owner"]), "en");
    expect(html).toContain("Asset permissions");
    expect(html).toContain("Restrict asset creation");
    expect(html).toContain('dir="ltr"');
  });

  it("Arabic: RTL strings, with the backend's role names shown verbatim (no invented mapping)", async () => {
    const html = await render(restricted(["Station Owner"]), "ar");
    expect(html).toContain('dir="rtl"');
    expect(html).toContain("صلاحيات الأصول");
    expect(html).toContain("تقييد إنشاء الأصول");
    expect(html).toContain("الأدوار المسموح لها بإنشاء الأصول");
    expect(html).toContain("Station Owner"); // untranslated: it is the backend's name
    expect(html).toContain("Technician");
    expect(html).not.toContain("Restrict asset creation");
    // names stay readable inside the RTL page
    expect(html).toMatch(/<label[^>]*dir="auto"[^>]*>Station Owner<\/label>/);
  });

  it("Arabic warnings and stale notes render in Arabic", async () => {
    const html = await render(restricted(["Station Manager"], { staleRoleNames: ["Ghost"], staleRoleIds: [1] }), "ar");
    expect(html).toContain("مدير الشركة غير محدد");
    expect(html).toContain("إشارات قديمة إلى أدوار");
    expect(html).toContain("Ghost");
  });

  it("English and Arabic define exactly the same assetPolicy keys, and the tab label in both", () => {
    const keys = (o: unknown, prefix = ""): string[] =>
      Object.entries(o as Record<string, unknown>).flatMap(([k, v]) => (v && typeof v === "object" ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`]));
    expect(keys(arOrg.assetPolicy).sort()).toEqual(keys(enOrg.assetPolicy).sort());
    expect(enOrg.detail.tabs.assetPermissions).toBe("Asset permissions");
    expect(arOrg.detail.tabs.assetPermissions).toBe("صلاحيات الأصول");
    // placeholders must survive translation
    const placeholders = (s: string) => (s.match(/\{\{\w+\}\}/g) ?? []).sort().join();
    const flat = (o: unknown): Record<string, string> =>
      Object.fromEntries(keys(o).map((k) => [k, k.split(".").reduce<unknown>((acc, part) => (acc as Record<string, unknown>)[part], o) as string]));
    const e = flat(enOrg.assetPolicy); const a = flat(arOrg.assetPolicy);
    for (const k of Object.keys(e)) expect(placeholders(a[k]), k).toBe(placeholders(e[k]));
  });
});

describe("source conventions", () => {
  const files = [editorSource, tabSource];
  it("uses logical (RTL-safe) utilities only — no physical left/right classes", () => {
    for (const src of files) expect(src).not.toMatch(/\b(?:ml|mr|pl|pr|left|right)-\d|\btext-(?:left|right)\b|\b(?:left|right)-0\b/);
  });
  it("does not recompute eligibility in the UI (no name-based matching against the saved lists)", () => {
    for (const src of files) {
      expect(src).not.toContain("allowedRoleIds");
      expect(src).not.toMatch(/allowedRoleNames\.includes\(/);
    }
  });
  it("the detail page shows the tab only through the Super Admin + Fuel Station check and keeps the company key", () => {
    const page = pageSource;
    expect(page).toContain("canShowAssetPolicyTab(viewerOrganization?.type, organization?.type)");
    expect(page).toMatch(/\{showAssetPermissions \? \(\s*<TabsTrigger value="asset-permissions">/);
    expect(page).toMatch(/\{showAssetPermissions \? \(\s*<TabsContent value="asset-permissions">/);
    expect(page).toContain("<AssetPermissionsTab key={organization.id}");
    expect(page).toContain('candidate === "asset-permissions" && organization && !showAssetPermissions');
  });
});
