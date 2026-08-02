/**
 * Issue #11 — isTokenExpired treats a JWT with no `exp` claim as valid forever
 * https://github.com/johkirche/gb-pwa/issues/11
 *
 * EXPECTED TO FAIL until the issue is fixed.
 *
 * getTokenExpiry() computes `payload.exp * 1000`, which is NaN when the claim
 * is missing, and every comparison against NaN is false — so the token reads as
 * never expiring. The undecodable-token path correctly fails closed; this one
 * fails open.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getTokenExpiry, isTokenExpired } from "@/composables/useJwtUtils";

import { makeJwt, makeTokenExpiringIn } from "../helpers/jwt";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-03-15T12:00:00.000Z"));
});

describe("issue #11: a token with no exp claim must fail closed", () => {
  it("reports a token with no exp as expired", () => {
    const noExp = makeJwt({ iat: 1710500000, sub: "test-user" });

    expect(isTokenExpired(noExp)).toBe(true);
  });

  it("reports a token with a non-numeric exp as expired", () => {
    const badExp = makeJwt({ exp: "soon", iat: 1710500000 });

    expect(isTokenExpired(badExp)).toBe(true);
  });

  it("returns 0 rather than NaN for a missing exp, matching the decode-failure path", () => {
    const noExp = makeJwt({ iat: 1710500000 });

    // getTokenExpiry("garbage") already returns 0; this should be consistent.
    expect(getTokenExpiry(noExp)).toBe(0);
  });

  it("still reports a normal unexpired token as valid", () => {
    // Guards the fix against over-correction: tightening the exp check must not
    // start reporting healthy Directus tokens as expired.
    expect(isTokenExpired(makeTokenExpiringIn(3600))).toBe(false);
  });
});
