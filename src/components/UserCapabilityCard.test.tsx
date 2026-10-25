import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createInstance } from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import enUsers from "@/i18n/locales/en/users.json";
import arUsers from "@/i18n/locales/ar/users.json";
import type { CapabilityState } from "@/api/services/warehouseService";
import { capabilityQueryKey } from "@/lib/userCapabilities";
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
    expect(html).toContain("The platform administrator has restricted asset creation for this person&#x27;s role");
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
    ["roleNotEligible", "has not allowed this person&#x27;s role to create assets"],
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
    expect(html).toContain("قام مسؤول المنصة بتقييد إنشاء الأصول");
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
  it("a non-Fuel-Station organization sees nothing (assets are Fuel Station only)", async () => {
    for (const type of ["SERVICE_PROVIDER", "AUTHORITY", "SUPER_ADMIN"]) expect(await renderCard({ org: { id: 1, type } }), type).toBe("");
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
