import { useAuthStore } from "@/stores/auth";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { assetUrl, fetchAsset, withAccessToken } from "@/composables/directusAssets";

// ---------------------------------------------------------------------------
// Mocks. `vi.hoisted` is required because vi.mock factories are hoisted above
// the imports, so they cannot close over ordinary top-level consts.
// ---------------------------------------------------------------------------
const h = vi.hoisted(() => ({
  refreshSession: vi.fn(),
  fetch: vi.fn(),
}));

vi.mock("@/composables/useDirectusApi", () => ({
  useDirectusApi: () => ({ refreshSession: h.refreshSession }),
}));

const DIRECTUS = "https://directus.test";
const URL_F1 = `${DIRECTUS}/assets/f-1`;

function response(status: number): Response {
  return { status, ok: status >= 200 && status < 300 } as Response;
}

/** The `init.headers.Authorization` of the nth fetch call. */
function authHeader(n: number): string | undefined {
  const init = h.fetch.mock.calls[n]?.[1] as { headers?: Record<string, string> } | undefined;
  return init?.headers?.Authorization;
}

beforeEach(() => {
  setActivePinia(createPinia());
  h.refreshSession.mockReset();
  h.fetch.mockReset().mockResolvedValue(response(200));
  vi.stubGlobal("fetch", h.fetch);
});

function signIn(token = "access-1") {
  useAuthStore().setTokens(token, "refresh-1");
}

describe("assetUrl", () => {
  it("builds the canonical asset URL, with optional transform params", () => {
    expect(assetUrl("f-1")).toBe(URL_F1);
    expect(assetUrl("f-1", "?width=300")).toBe(`${URL_F1}?width=300`);
  });
});

describe("withAccessToken", () => {
  it("leaves the URL alone when there is no session", () => {
    expect(withAccessToken(URL_F1)).toBe(URL_F1);
  });

  it("appends the token as a query parameter for elements that cannot send headers", () => {
    signIn("access-1");

    expect(withAccessToken(URL_F1)).toBe(`${URL_F1}?access_token=access-1`);
  });

  it("joins onto an existing query string", () => {
    signIn("access-1");

    expect(withAccessToken(`${URL_F1}?width=300`)).toBe(
      `${URL_F1}?width=300&access_token=access-1`,
    );
  });

  it("URL-encodes the token", () => {
    signIn("a+b/c=");

    expect(withAccessToken(URL_F1)).toBe(`${URL_F1}?access_token=a%2Bb%2Fc%3D`);
  });

  it("never touches a blob URL served from IndexedDB", () => {
    signIn();

    expect(withAccessToken("blob:https://app/123")).toBe("blob:https://app/123");
  });
});

describe("fetchAsset", () => {
  it("fetches anonymously when there is no session", async () => {
    const res = await fetchAsset(URL_F1);

    expect(res.status).toBe(200);
    expect(h.fetch).toHaveBeenCalledTimes(1);
    expect(h.fetch.mock.calls[0][0]).toBe(URL_F1);
    expect(authHeader(0)).toBeUndefined();
  });

  it("sends the bearer header when there is a session", async () => {
    signIn("access-1");

    await fetchAsset(URL_F1);

    expect(authHeader(0)).toBe("Bearer access-1");
  });

  it("keeps the caller's init and headers", async () => {
    signIn("access-1");

    await fetchAsset(URL_F1, { cache: "no-store", headers: { Accept: "audio/*" } });

    const init = h.fetch.mock.calls[0][1] as RequestInit;
    expect(init.cache).toBe("no-store");
    expect(init.headers).toEqual({ Accept: "audio/*", Authorization: "Bearer access-1" });
  });

  it("refreshes the session once and retries with the new token on a 401", async () => {
    signIn("access-old");
    h.fetch.mockResolvedValueOnce(response(401)).mockResolvedValueOnce(response(200));
    h.refreshSession.mockResolvedValue("access-new");

    const res = await fetchAsset(URL_F1);

    expect(res.status).toBe(200);
    expect(h.refreshSession).toHaveBeenCalledTimes(1);
    expect(authHeader(0)).toBe("Bearer access-old");
    expect(authHeader(1)).toBe("Bearer access-new");
  });

  it("hands back the 401 without refreshing when there is no session", async () => {
    // A public file that has become private: nothing to refresh, the caller
    // reports it.
    h.fetch.mockResolvedValue(response(401));

    const res = await fetchAsset(URL_F1);

    expect(res.status).toBe(401);
    expect(h.refreshSession).not.toHaveBeenCalled();
    expect(h.fetch).toHaveBeenCalledTimes(1);
  });

  it("hands back the 401 when there is no refresh token to rotate with", async () => {
    signIn();
    h.fetch.mockResolvedValue(response(401));
    h.refreshSession.mockResolvedValue(null);

    const res = await fetchAsset(URL_F1);

    expect(res.status).toBe(401);
    expect(h.fetch).toHaveBeenCalledTimes(1);
  });

  it("hands back the 401, and warns, when the refresh itself is rejected", async () => {
    // Offline-first: a failed refresh must not throw past the caller's own
    // fallback, and must not tear the session down.
    signIn();
    h.fetch.mockResolvedValue(response(401));
    h.refreshSession.mockRejectedValue(new Error("refresh rejected"));

    const res = await fetchAsset(URL_F1);

    expect(res.status).toBe(401);
    expect(h.fetch).toHaveBeenCalledTimes(1);
    expect(useAuthStore().accessToken).toBe("access-1");
    expect(console.warn).toHaveBeenCalledWith(
      "Asset request refresh failed; falling back:",
      expect.any(Error),
    );
  });

  it("does not refresh on a non-401 failure", async () => {
    signIn();
    h.fetch.mockResolvedValue(response(404));

    const res = await fetchAsset(URL_F1);

    expect(res.status).toBe(404);
    expect(h.refreshSession).not.toHaveBeenCalled();
  });
});
