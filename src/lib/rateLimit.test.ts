import { afterEach, describe, expect, it } from "vitest";
import {
  formatRateLimitMessage,
  getRateLimitInfo,
  makeCooldownError,
  rateLimitCooldownRemainingSeconds,
  resetRateLimitCooldown,
  shouldRetryQuery,
  startRateLimitCooldown,
  clearRateLimitCooldown,
  sessionKeyFromToken,
} from "./rateLimit";

afterEach(() => resetRateLimitCooldown());

const err429 = (retryAfterSeconds?: number, header?: string) => ({
  response: {
    status: 429,
    data: { code: "RATE_LIMITED", errors: retryAfterSeconds ? { retryAfterSeconds } : undefined },
    headers: header ? { "retry-after": header } : {},
  },
});

describe("getRateLimitInfo", () => {
  it("reads the wait from the JSON body", () => {
    expect(getRateLimitInfo(err429(42))).toEqual({ retryAfterSeconds: 42 });
  });
  it("falls back to the Retry-After header, then a default", () => {
    expect(getRateLimitInfo(err429(undefined, "17"))).toEqual({ retryAfterSeconds: 17 });
    expect(getRateLimitInfo(err429())?.retryAfterSeconds).toBe(60);
  });
  it("recognises the stable code without a status and ignores other errors", () => {
    expect(getRateLimitInfo({ response: { status: 500, data: { code: "RATE_LIMITED" } } })).not.toBeNull();
    expect(getRateLimitInfo({ response: { status: 500, data: { code: "X" } } })).toBeNull();
    expect(getRateLimitInfo(new Error("network"))).toBeNull();
  });
});

describe("cooldown", () => {
  it("is bounded and produces a local 429-shaped error", () => {
    startRateLimitCooldown(30);
    const remaining = rateLimitCooldownRemainingSeconds();
    expect(remaining).toBeGreaterThan(0);
    expect(remaining).toBeLessThanOrEqual(30);
    const e = makeCooldownError("station/dashboard");
    expect(e.isRateLimitCooldown).toBe(true);
    expect(getRateLimitInfo(e)?.retryAfterSeconds).toBeGreaterThan(0);
    startRateLimitCooldown(999999);
    expect(rateLimitCooldownRemainingSeconds()).toBeLessThanOrEqual(15 * 60);
  });
});

describe("shouldRetryQuery", () => {
  it("never auto-retries 4xx (429 included) and retries other failures once", () => {
    expect(shouldRetryQuery(0, err429(10))).toBe(false);
    expect(shouldRetryQuery(0, { response: { status: 403 } })).toBe(false);
    expect(shouldRetryQuery(0, { response: { status: 503 } })).toBe(true);
    expect(shouldRetryQuery(1, { response: { status: 503 } })).toBe(false);
  });
});

describe("formatRateLimitMessage", () => {
  const t = (key: string, o?: Record<string, unknown>) => `${key}:${JSON.stringify(o)}`;
  it("uses seconds below two minutes and minutes above", () => {
    expect(formatRateLimitMessage(45, t)).toContain('"seconds":45');
    expect(formatRateLimitMessage(600, t)).toContain('"count":10');
  });
});

describe("session isolation of the cooldown", () => {
  const tokenFor = (userId: number) => `x.${btoa(JSON.stringify({ userId })).replace(/=+$/, "")}.y`;
  it("keys sessions by the user id inside the token", () => {
    expect(sessionKeyFromToken(tokenFor(7))).toBe("user:7");
    expect(sessionKeyFromToken(null)).toBe("anon");
  });
  it("one user's 429 does not block another user, anonymous calls, or survive clearing", () => {
    const a = sessionKeyFromToken(tokenFor(1));
    const b = sessionKeyFromToken(tokenFor(2));
    startRateLimitCooldown(60, a);
    expect(rateLimitCooldownRemainingSeconds(a)).toBeGreaterThan(0);
    expect(rateLimitCooldownRemainingSeconds(b)).toBe(0);
    expect(rateLimitCooldownRemainingSeconds("anon")).toBe(0);
    clearRateLimitCooldown();
    expect(rateLimitCooldownRemainingSeconds(a)).toBe(0);
  });
});
