import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createInstance } from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import enActivity from "@/i18n/locales/en/activity.json";
import arActivity from "@/i18n/locales/ar/activity.json";
import enCommon from "@/i18n/locales/en/common.json";
import arCommon from "@/i18n/locales/ar/common.json";
import type { ActivityEvent, ActivityPage } from "@/types/activity";
import source from "./ActivityTimeline.tsx?raw";

vi.mock("@/i18n/config", async () => {
  const { createInstance } = await import("i18next");
  const i = createInstance();
  await i.init({ lng: "en", resources: { en: {} }, interpolation: { escapeValue: false } });
  return { default: i, isRtl: () => false };
});
vi.mock("@/api/config", () => ({ default: {} }));
const auth = vi.hoisted(() => ({ state: { permissions: ["internal_tasks.read"] as string[], org: { id: 1, type: "FUEL_STATION" } } }));
vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({ hasPermission: (c: string) => auth.state.permissions.includes(c), organization: auth.state.org, permissions: auth.state.permissions, user: { id: 1 } }),
}));

import { ActivityTimelineView, type ActivityViewState } from "./ActivityTimeline";

async function i18nFor(lng: "en" | "ar") {
  const i = createInstance();
  await i.use(initReactI18next).init({
    lng, fallbackLng: "en", ns: ["activity", "common"], defaultNS: "activity",
    resources: { en: { activity: enActivity, common: enCommon }, ar: { activity: arActivity, common: arCommon } }, interpolation: { escapeValue: false },
  });
  return i;
}
const ev = (over: Partial<ActivityEvent> = {}): ActivityEvent => ({
  id: "e1", kind: "TASK_COMMENT", category: "COMMENT", occurredAt: "2026-10-25T10:00:00.000Z", actor: { id: 1, name: "Sara" }, actorLabel: null, side: "STATION",
  from: null, to: null, message: null, important: false, attachments: [], related: {}, meta: {}, ...over,
});
const page = (items: ActivityEvent[], over: Partial<ActivityPage["pagination"]> = {}): ActivityPage => ({ items, order: "asc", pagination: { page: 1, limit: 30, total: items.length, totalPages: 1, ...over } });

async function render(opts: { pages?: ActivityPage[]; lng?: "en" | "ar"; order?: "asc" | "desc"; error?: unknown; permissions?: string[]; loading?: boolean } = {}) {
  auth.state.permissions = opts.permissions ?? ["internal_tasks.read"];
  const events = opts.pages?.flatMap((p) => p.items) ?? [];
  const last = opts.pages?.[opts.pages.length - 1];
  const state: ActivityViewState = {
    isLoading: opts.loading ?? (!opts.pages && !opts.error),
    isError: !!opts.error,
    error: opts.error,
    events,
    total: opts.pages?.[0]?.pagination.total ?? 0,
    hasNextPage: !!last && last.pagination.page < last.pagination.totalPages,
    isFetchingNextPage: false,
    fetchNextPage: () => undefined,
    refetch: () => undefined,
  };
  const i18n = await i18nFor(opts.lng ?? "en");
  return renderToStaticMarkup(
    <QueryClientProvider client={new QueryClient()}>
      <I18nextProvider i18n={i18n}>
        <MemoryRouter>
          <div dir={opts.lng === "ar" ? "rtl" : "ltr"}><ActivityTimelineView state={state} order={opts.order ?? "asc"} onOrderChange={() => undefined} /></div>
        </MemoryRouter>
      </I18nextProvider>
    </QueryClientProvider>,
  );
}
const has = (html: string, id: string) => html.includes(`data-testid="${id}"`);

describe("warehouse events", () => {
  const ev = (over: Partial<ActivityEvent>): ActivityEvent => ({
    id: "w1", kind: "WAREHOUSE_STATUS_CHANGED", category: "WAREHOUSE", occurredAt: "2026-10-01T10:00:00.000Z", actor: { id: 1, name: "Wafa" }, actorLabel: null, side: "STATION",
    from: "UNDER_REVIEW", to: "APPROVED", message: null, important: false, attachments: [], related: { warehouseOrderId: 4 }, meta: {}, ...over,
  });
  it("shows the part, its quantities and who did it (English)", async () => {
    const html = await render({ pages: [page([ev({ meta: { lines: [{ partName: "Oil filter", requested: 5, approved: 3 }] } })])] });
    expect(has(html, "activity-parts-w1")).toBe(true);
    expect(html).toContain("Oil filter");
    expect(html).toContain("Requested");
    expect(html).toContain("Approved");
    expect(html).toContain("Wafa");
  });
  it("Arabic labels, and a rejected return reads as a rejection with its reason", async () => {
    const html = await render({ lng: "ar", pages: [page([ev({ kind: "WAREHOUSE_RETURN_RESOLVED", from: null, to: "REJECTED", message: "عدّ مرة أخرى", meta: { part: { partName: "فلتر", quantity: 2 } } })])] });
    expect(html).toContain('data-emphasis="rejection"');
    expect(html).toContain("عدّ مرة أخرى");
    expect(html).toContain("الكمية");
  });
});

describe("states", () => {
  it("loading: skeleton, no events", async () => {
    const html = await render();
    expect(has(html, "activity-loading")).toBe(true);
    expect(html).toContain('aria-busy="true"');
  });
  it("empty: a clear message", async () => {
    const html = await render({ pages: [page([])] });
    expect(has(html, "activity-empty")).toBe(true);
    expect(html).toContain("No activity yet.");
  });
  it.each([[403, "You don&#x27;t have access to this activity.", false], [404, "This record was not found.", false], [500, "Something went wrong. Try again.", true]] as const)("error %s: translated message%s", async (status, text, retry) => {
    const html = await render({ error: { response: { status } } });
    expect(has(html, "activity-error")).toBe(true);
    expect(html).toContain(text);
    expect(has(html, "activity-retry")).toBe(retry);
  });
  it("network error offers a retry", async () => {
    const html = await render({ error: new Error("offline") });
    expect(html).toContain("Could not reach the server.");
    expect(has(html, "activity-retry")).toBe(true);
  });
});

describe("events", () => {
  const events = [
    ev({ id: "r1", kind: "REPORT_SUBMITTED", category: "REPORT", actor: { id: 2, name: "Omar" } }),
    ev({ id: "r2", kind: "REPORT_REJECTED", category: "DECISION", actor: { id: 3, name: "Layla" }, important: true, to: "REJECTED", from: "SUBMITTED", message: "Photos are unclear", meta: { stage: "SUPERVISOR" } }),
    ev({ id: "r3", kind: "REPORT_DECIDED_INTERNAL", category: "DECISION", important: true, message: "Handle in-house" }),
    ev({ id: "t1", kind: "TASK_REASSIGNED", category: "ASSIGNMENT", important: true, meta: { from: { id: 1, name: "Ali" }, to: { id: 2, name: "Yusuf" } }, related: { taskId: 8 } }),
    ev({ id: "t2", kind: "TASK_CLOSED", category: "CLOSURE", actor: null, actorLabel: "UNRECORDED", meta: { historical: true } }),
    ev({ id: "w1", kind: "WORK_ORDER_REVIEW_REJECTED", category: "APPROVAL", message: "Redo the seal", related: { taskIds: [8, 9] } }),
    ev({ id: "x1", kind: "EXTERNAL_QUOTE_SELECTED", category: "DECISION", important: true, meta: { provider: { id: 4, name: "Gulf Repairs" } } }),
    ev({ id: "x2", kind: "EXTERNAL_JOB_EVENT", category: "PROVIDER", side: "PROVIDER", meta: { eventType: "VISIT_COMPLETED" }, message: "All done" }),
  ];
  it("shows readable titles with the people named, actor and time, the transition and the comment", async () => {
    const html = await render({ pages: [page(events)] });
    expect(html).toContain("Report submitted");
    expect(html).toContain("Report rejected by the supervisor");
    expect(html).toContain("Decision: handle in-house");
    expect(html).toContain("Task reassigned from Ali to Yusuf");
    expect(html).toContain("Quote from Gulf Repairs selected");
    expect(html).toContain("Visit completed");
    expect(html).toMatch(/by Layla/);
    expect(html).toContain("Not recorded (older record)");
    expect(has(html, "activity-transition-r2")).toBe(true);
    expect(html).toContain("Submitted");
    expect(html).toContain("Rejected");
    expect(html).toContain('dateTime="2026-10-25T10:00:00.000Z"');
  });
  it("a rejection labels its text as the Reason; other text is a Comment", async () => {
    const html = await render({ pages: [page(events)] });
    const rejected = html.slice(html.indexOf('data-testid="activity-event-r2"'), html.indexOf('data-testid="activity-event-r3"'));
    expect(rejected).toContain("Reason");
    expect(rejected).toContain("Photos are unclear");
    const decided = html.slice(html.indexOf('data-testid="activity-event-r3"'), html.indexOf('data-testid="activity-event-t1"'));
    expect(decided).toContain("Comment");
    expect(decided).toContain("Handle in-house");
  });
  it("decisions and rejections are highlighted differently from plain entries", async () => {
    const html = await render({ pages: [page(events)] });
    expect(html).toMatch(/data-testid="activity-event-r2"[^>]*data-emphasis="rejection"/);
    expect(html).toMatch(/data-testid="activity-event-r3"[^>]*data-emphasis="decision"/);
    expect(html).toMatch(/data-testid="activity-event-r1"[^>]*data-emphasis="normal"/);
    const r3 = html.slice(html.indexOf('data-testid="activity-event-r3"'), html.indexOf('data-testid="activity-event-t1"'));
    expect(r3).toMatch(/>Decision</);
  });
  it("related tasks are links only when the viewer may open them; a collapsed rejection lists every task", async () => {
    const allowed = await render({ pages: [page(events)] });
    expect(allowed).toContain('href="/internal-tasks/8"');
    expect(allowed).toContain('href="/internal-tasks/9"');
    const denied = await render({ pages: [page(events)], permissions: [] });
    expect(denied).not.toContain('href="/internal-tasks/8"');
    expect(denied).toContain("Task #8");
  });
  it("attachments: authenticated downloads and stored files both appear", async () => {
    const withFiles = ev({ id: "f1", kind: "REPORT_ATTACHMENT_ADDED", category: "ATTACHMENT", attachments: [{ id: 3, fileType: "IMAGE", caption: "leak", downloadUrl: "https://x/api/maintenance-issues/5/attachments/3/file" }] });
    const stored = ev({ id: "f2", kind: "TASK_ATTACHMENT_ADDED", category: "ATTACHMENT", attachments: [{ id: 4, fileType: "IMAGE", caption: "after", url: "https://x/uploads/a.png" }] });
    const html = await render({ pages: [page([withFiles, stored])] });
    expect(has(html, "activity-files-f1") && has(html, "activity-files-f2")).toBe(true);
    expect(html).toContain('data-testid="source-report-file"');
    expect(html).toContain('href="https://x/uploads/a.png"');
  });
  it("groups under day headings and offers both orders", async () => {
    const html = await render({ pages: [page(events)] });
    expect(html).toMatch(/data-testid="activity-day-\d{4}-\d{2}-\d{2}"/);
    expect(has(html, "activity-order-asc") && has(html, "activity-order-desc")).toBe(true);
    expect(html).toMatch(/data-testid="activity-order-asc"[^>]*aria-pressed="true"|aria-pressed="true"[^>]*data-testid="activity-order-asc"/);
  });
});

describe("bounded loading", () => {
  it("shows how many of the total are loaded and a Load more button while pages remain", async () => {
    const html = await render({ pages: [page([ev({ id: "a" }), ev({ id: "b" })], { total: 75, totalPages: 3 })] });
    expect(html).toContain("Showing 2 of 75");
    expect(has(html, "activity-load-more")).toBe(true);
  });
  it("no Load more once the last page is loaded", async () => {
    const html = await render({ pages: [page([ev({ id: "a" })], { total: 1 })] });
    expect(has(html, "activity-load-more")).toBe(false);
  });
});

describe("Arabic RTL", () => {
  it("translates titles, labels and states and mirrors the transition arrow", async () => {
    const events = [ev({ id: "r2", kind: "REPORT_REJECTED", category: "DECISION", important: true, from: "SUBMITTED", to: "REJECTED", message: "الصور غير واضحة", meta: { stage: "OPERATIONS" } }), ev({ id: "t2", kind: "TASK_CLOSED", category: "CLOSURE", actor: null, actorLabel: "UNRECORDED" })];
    const html = await render({ pages: [page(events, { total: 40, totalPages: 2 })], lng: "ar" });
    expect(html).toContain('dir="rtl"');
    expect(html).toContain("رفضت إدارة التشغيل البلاغ");
    expect(html).toContain("السبب");
    expect(html).toContain("الصور غير واضحة");
    expect(html).toContain("غير مسجَّل (سجل أقدم)");
    expect(html).toContain("عرض 2 من 40");
    expect(html).toContain("rtl:rotate-180");
    expect(html).not.toContain("Report rejected");
    expect(html).toMatch(/start-0|ps-8/);
  });
  it("English and Arabic define exactly the same activity keys", () => {
    const keys = (o: unknown, prefix = ""): string[] =>
      Object.entries(o as Record<string, unknown>).flatMap(([k, v]) => (v && typeof v === "object" ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`]));
    expect(keys(arActivity).sort()).toEqual(keys(enActivity).sort());
  });
  it("every event kind the backend can emit has a title in both languages", () => {
    const BACKEND_KINDS = ["REPORT_SUBMITTED", "REPORT_ATTACHMENT_ADDED", "REPORT_SUPERVISOR_APPROVED", "REPORT_OPS_APPROVED", "REPORT_DECIDED_INTERNAL", "REPORT_DECIDED_EXTERNAL", "REPORT_REJECTED",
      "WORK_ORDER_CREATED", "WORK_ORDER_REVIEWED", "WORK_ORDER_REVIEW_REJECTED", "WORK_ORDER_WAREHOUSE_RETURN", "WORK_ORDER_OPS_CONFIRMED", "TASK_ASSIGNED", "TASK_REASSIGNED", "TASK_STATUS_CHANGED", "TASK_COMMENT",
      "TASK_CLOSED", "TASK_ATTACHMENT_ADDED", "WAREHOUSE_REQUEST_CREATED", "WAREHOUSE_STATUS_CHANGED", "WAREHOUSE_COMMENT", "WAREHOUSE_RETURN_PROPOSED", "WAREHOUSE_RETURN_RESOLVED", "EXTERNAL_REQUEST_CREATED", "EXTERNAL_SENT_TO_PROVIDER", "EXTERNAL_QUOTE_SUBMITTED",
      "EXTERNAL_QUOTE_REJECTED", "EXTERNAL_QUOTE_SELECTED", "EXTERNAL_JOB_CREATED", "EXTERNAL_JOB_EVENT", "EXTERNAL_REPORT_SUBMITTED", "EXTERNAL_REPORT_REVIEWED", "EXTERNAL_REPORT_REJECTED"];
    for (const k of BACKEND_KINDS) {
      expect((enActivity.kinds as Record<string, unknown>)[k], `en ${k}`).toBeTruthy();
      expect((arActivity.kinds as Record<string, unknown>)[k], `ar ${k}`).toBeTruthy();
    }
    for (const stage of ["SUPERVISOR", "OPERATIONS", "DECISION"]) expect((enActivity.kinds as Record<string, unknown>)[`REPORT_REJECTED_${stage}`]).toBeTruthy();
  });
});

describe("conventions", () => {
  it("uses logical (RTL-safe) classes only and never reads the security audit log", () => {
    expect(source).not.toMatch(/\b(?:pl|pr|ml|mr)-\d|\btext-(?:left|right)\b|\b(?:left|right)-\d/);
    expect(source).not.toMatch(/audit-log|AuditLog/i);
  });
});
