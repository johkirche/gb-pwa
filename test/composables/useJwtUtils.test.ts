import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  decodeJwtPayload,
  getTimeUntilExpiry,
  getTokenExpiry,
  isTokenExpired,
  useJwtUtils,
} from "@/composables/useJwtUtils";

import { base64url, makeJwt, makeTokenExpiringIn } from "../helpers/jwt";

// A fixed "now" so expiry maths is never flaky.
const NOW = new Date("2026-03-15T12:00:00.000Z");

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

describe("decodeJwtPayload", () => {
  it("returns the payload of a well-formed token", () => {
    const token = makeJwt({ exp: 1893456000, iat: 1710500000, sub: "user-42" });

    expect(decodeJwtPayload(token)).toEqual({
      exp: 1893456000,
      iat: 1710500000,
      sub: "user-42",
    });
  });

  it("decodes base64url payloads containing '-' and '_' and needing padding", () => {
    // This exact payload is chosen because its *standard* base64 contains both
    // characters base64url substitutes, and its length is not a multiple of 4.
    // That makes one fixture exercise every branch of base64urlDecode: the two
    // character replacements and the padding loop.
    const payload = { exp: 1893456000, iat: 1, sub: "AA>AA?AA" };
    const standardBase64 = btoa(JSON.stringify(payload));

    // Guard the fixture's premise — if this ever stops holding, the test below
    // would silently stop covering the replacement logic.
    expect(standardBase64).toContain("+");
    expect(standardBase64).toContain("/");

    const urlSafe = standardBase64
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    expect(urlSafe).toContain("-");
    expect(urlSafe).toContain("_");
    expect(urlSafe.length % 4).not.toBe(0);

    const token = `${base64url({ alg: "HS256" })}.${urlSafe}.signature`;

    expect(decodeJwtPayload(token)).toEqual(payload);
  });

  it.each([
    ["an empty string", ""],
    ["only a header", "header"],
    ["a two-part token", "header.payload"],
    ["a four-part token", "a.b.c.d"],
  ])("throws for %s", (_label, token) => {
    expect(() => decodeJwtPayload(token)).toThrow();
  });

  it("rejects non-string input", () => {
    // The runtime guard exists precisely because callers pass values read back
    // out of localStorage, which is typed `string | null`.
    expect(() => decodeJwtPayload(null as unknown as string)).toThrow(
      /non-empty string/,
    );
  });

  it("throws a wrapped error when the payload is not valid base64", () => {
    expect(() => decodeJwtPayload("header.!!!not-base64!!!.sig")).toThrow(
      /Failed to decode JWT payload/,
    );
  });

  it("throws a wrapped error when the payload is not valid JSON", () => {
    const notJson = btoa("this is not json").replace(/=+$/, "");

    expect(() => decodeJwtPayload(`header.${notJson}.sig`)).toThrow(
      /Failed to decode JWT payload/,
    );
  });
});

describe("getTokenExpiry", () => {
  it("converts the `exp` claim from seconds to milliseconds", () => {
    const token = makeJwt({ exp: 1893456000, iat: 1 });

    expect(getTokenExpiry(token)).toBe(1893456000 * 1000);
  });

  it("returns 0 for an undecodable token instead of throwing", () => {
    // Callers treat 0 as "already expired"; throwing here would break the
    // offline-first paths that call this on every navigation.
    expect(getTokenExpiry("garbage")).toBe(0);
    expect(console.error).toHaveBeenCalled();
  });

  it("returns 0 rather than NaN for a missing exp, matching the decode-failure path", () => {
    // Regression guard for issue #11: `undefined * 1000` is NaN, and every
    // comparison against NaN is false, so the token read as valid forever.
    expect(getTokenExpiry(makeJwt({ iat: 1710500000 }))).toBe(0);
  });
});

describe("isTokenExpired", () => {
  it("is false for a token that is still valid", () => {
    expect(isTokenExpired(makeTokenExpiringIn(3600))).toBe(false);
  });

  it("is true for a token that has already expired", () => {
    expect(isTokenExpired(makeTokenExpiringIn(-1))).toBe(true);
  });

  it("is true exactly at the expiry instant (boundary is inclusive)", () => {
    expect(isTokenExpired(makeTokenExpiringIn(0))).toBe(true);
  });

  it("treats a token inside the buffer window as expired", () => {
    const twoMinutes = 2 * 60 * 1000;
    // 90s of life left, but the caller wants 2 minutes of headroom.
    expect(isTokenExpired(makeTokenExpiringIn(90), twoMinutes)).toBe(true);
  });

  it("treats a token outside the buffer window as valid", () => {
    const twoMinutes = 2 * 60 * 1000;
    expect(isTokenExpired(makeTokenExpiringIn(150), twoMinutes)).toBe(false);
  });

  it("treats an undecodable token as expired", () => {
    // Fail closed: an unreadable token must never be trusted.
    expect(isTokenExpired("not-a-jwt")).toBe(true);
  });

  // Regression guard for issue #11 — https://github.com/johkirche/gb-pwa/issues/11
  //
  // getTokenExpiry used to compute `payload.exp * 1000`, which is NaN when the
  // claim is missing, and every comparison against NaN is false — so a
  // structurally valid token with no expiry information at all read as never
  // expiring. This path must fail closed like the undecodable one above.
  it("treats a token with no exp claim as expired", () => {
    expect(isTokenExpired(makeJwt({ iat: 1710500000, sub: "test-user" }))).toBe(true);
  });

  it("treats a token with a non-numeric exp as expired", () => {
    expect(isTokenExpired(makeJwt({ exp: "soon", iat: 1710500000 }))).toBe(true);
  });
});

describe("getTimeUntilExpiry", () => {
  it("returns the remaining lifetime in milliseconds", () => {
    expect(getTimeUntilExpiry(makeTokenExpiringIn(600))).toBe(600 * 1000);
  });

  it("clamps to 0 for an expired token rather than returning a negative", () => {
    // A negative value would be passed to setTimeout by scheduleTokenRefresh
    // and fire immediately in a loop.
    expect(getTimeUntilExpiry(makeTokenExpiringIn(-600))).toBe(0);
  });

  it("returns 0 for an undecodable token", () => {
    expect(getTimeUntilExpiry("garbage")).toBe(0);
  });
});

describe("useJwtUtils", () => {
  it("exposes the four helpers", () => {
    const utils = useJwtUtils();

    expect(utils.decodeJwtPayload).toBe(decodeJwtPayload);
    expect(utils.getTokenExpiry).toBe(getTokenExpiry);
    expect(utils.isTokenExpired).toBe(isTokenExpired);
    expect(utils.getTimeUntilExpiry).toBe(getTimeUntilExpiry);
  });
});
