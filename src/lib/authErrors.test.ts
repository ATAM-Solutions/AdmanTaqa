import { describe, it, expect } from "vitest";
import { classifyAuthError, retryAfterMinutes } from "./authErrors";

const http = (status: number, data?: unknown, headers?: Record<string, unknown>) => ({
  response: { status, data, headers },
});

describe("classifyAuthError", () => {
  it("treats a missing response (network/CORS/offline) as network, not as bad credentials", () => {
    expect(classifyAuthError({ code: "ERR_NETWORK" }).kind).toBe("network");
    expect(classifyAuthError(new Error("boom")).kind).toBe("network");
  });

  it("maps the backend's stable codes", () => {
    expect(classifyAuthError(http(401, { code: "INVALID_CREDENTIALS" })).kind).toBe("invalid_credentials");
    expect(classifyAuthError(http(401, { code: "ACCOUNT_INACTIVE" })).kind).toBe("account_inactive");
    expect(classifyAuthError(http(401, { code: "ORGANIZATION_INACTIVE" })).kind).toBe("organization_inactive");
  });

  it("does not depend on English message text", () => {
    expect(classifyAuthError(http(401, { message: "Account is inactive" })).kind).toBe("invalid_credentials");
    expect(classifyAuthError(http(401, { message: "Invalid email or password", code: "ACCOUNT_INACTIVE" })).kind).toBe(
      "account_inactive"
    );
  });

  it("recognises throttling from JSON, from a plain-text 429, and reads Retry-After", () => {
    const json = classifyAuthError(http(429, { code: "RATE_LIMITED", errors: { retryAfterSeconds: 900 } }));
    expect(json).toEqual({ kind: "rate_limited", retryAfterSeconds: 900 });
    const plain = classifyAuthError(http(429, "Too many requests from this IP, please try again later.", { "retry-after": "120" }));
    expect(plain).toEqual({ kind: "rate_limited", retryAfterSeconds: 120 });
    expect(classifyAuthError(http(429, undefined)).retryAfterSeconds).toBeUndefined();
  });

  it("classifies server errors and leaves the rest unknown", () => {
    expect(classifyAuthError(http(500, "<html>Bad gateway</html>")).kind).toBe("server");
    expect(classifyAuthError(http(502)).kind).toBe("server");
    expect(classifyAuthError(http(404)).kind).toBe("unknown");
  });
});

describe("retryAfterMinutes", () => {
  it("rounds up to whole minutes", () => {
    expect(retryAfterMinutes(900)).toBe(15);
    expect(retryAfterMinutes(61)).toBe(2);
    expect(retryAfterMinutes(5)).toBe(1);
    expect(retryAfterMinutes(undefined)).toBeUndefined();
  });
});
