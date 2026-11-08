import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createInstance } from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import enExec from "@/i18n/locales/en/execution.json";
import arExec from "@/i18n/locales/ar/execution.json";
import GeoIssueAlert from "./GeoIssueAlert";
import type { GeoIssue, GeoIssueKind } from "@/lib/geoCheckin";

vi.mock("@/i18n/config", async () => {
  const { createInstance } = await import("i18next");
  const i = createInstance();
  await i.init({ lng: "en", resources: { en: {} }, interpolation: { escapeValue: false } });
  return { default: i, isRtl: () => false };
});

async function render(issue: GeoIssue, lng: "en" | "ar") {
  const i = createInstance();
  await i.use(initReactI18next).init({ lng, fallbackLng: "en", ns: ["execution"], defaultNS: "execution", resources: { en: { execution: enExec }, ar: { execution: arExec } }, interpolation: { escapeValue: false } });
  return renderToStaticMarkup(<I18nextProvider i18n={i}><div dir={lng === "ar" ? "rtl" : "ltr"}><GeoIssueAlert issue={issue} onRetry={() => undefined} /></div></I18nextProvider>);
}
const KINDS: GeoIssueKind[] = ["noGeolocation", "denied", "unavailable", "timeout", "stale", "OUTSIDE_GEOFENCE", "LOCATION_ACCURACY_TOO_LOW"];

describe.each(["en", "ar"] as const)("geofence / location message (%s)", (lng) => {
  it("outside the fence: says how far, how far is allowed, how to retry, and shows the reading's accuracy", async () => {
    const html = await render({ kind: "OUTSIDE_GEOFENCE", distance: 14282, radius: 500, accuracy: 35 }, lng);
    const f = (n: number) => new Intl.NumberFormat(lng).format(n);
    expect(html).toContain('role="alert"');
    expect(html).toContain(f(14282)); expect(html).toContain(f(500)); expect(html).toContain(f(35));
    expect(html).toContain('data-testid="geo-retry"'); expect(html).toContain('data-testid="geo-accuracy"');
    expect(html).not.toMatch(/\{\{|geo\.issue/);
  });
  it("low accuracy: says the accuracy and the accuracy required, without a duplicate accuracy line", async () => {
    const html = await render({ kind: "LOCATION_ACCURACY_TOO_LOW", accuracy: 14000, radius: 500 }, lng);
    const f = (n: number) => new Intl.NumberFormat(lng).format(n);
    expect(html).toContain(f(14000)); expect(html).toContain(f(500));
    expect(html).not.toContain('data-testid="geo-accuracy"');
  });
  it("every location failure has a real sentence (no raw key, no unfilled placeholder) and a retry button", async () => {
    for (const kind of KINDS) {
      const html = await render({ kind, distance: 900, radius: 500, accuracy: 20 }, lng);
      expect(html, kind).not.toMatch(/\{\{|geo\.issue|geo\.retry/);
      expect(html, kind).toContain('data-testid="geo-retry"');
    }
  });
});
it("the Arabic messages are Arabic (never the English fallback)", async () => {
  for (const kind of KINDS) {
    const html = await render({ kind, distance: 900, radius: 500, accuracy: 20 }, "ar");
    expect(html, kind).toMatch(/[؀-ۿ]/);
  }
});
