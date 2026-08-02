/**
 * Issue #6 — GraphQL errors returned with HTTP 200 are silently swallowed
 * https://github.com/johkirche/gb-pwa/issues/6
 *
 * EXPECTED TO FAIL until the issue is fixed.
 *
 * Directus answers a rejected query (permission change, renamed field) with
 * HTTP 200 and a body of `{ data: null, errors: [...] }`. makeGraphQLRequest
 * returns that envelope untouched and every caller coalesces the null away with
 * `|| []` / `|| null`, so a server-side rejection is indistinguishable from
 * "no results" — and because the status is 200, the `catch` blocks that
 * implement the offline fallback never run either. A non-empty `errors` array
 * must throw, so those existing catch paths engage.
 */
import axios, { type AxiosResponse } from "axios";
import { createPinia, setActivePinia } from "pinia";
import { type MockInstance, beforeEach, describe, expect, it, vi } from "vitest";

import { useGesangbuchlied } from "@/composables/useGesangbuchlied";
import { useAuthStore } from "@/stores/auth";

// ---------------------------------------------------------------------------
// Mocks. `vi.hoisted` is required because vi.mock factories are hoisted above
// the imports, so they cannot close over ordinary top-level consts.
//
// The DirectusApi client is stubbed out entirely: it is only reachable via the
// 401 branch, which a 200-with-errors response must never take. Only
// `axios.post` is spied, so no test here can open a socket.
// ---------------------------------------------------------------------------
const h = vi.hoisted(() => ({
  directus: {
    authenticatedRequest: vi.fn(),
  },
}));

vi.mock("@/composables/useDirectusApi", () => ({
  useDirectusApi: () => h.directus,
}));

/** A representative song, so a "returns the data" guard has something to check. */
const lied = {
  id: "42",
  titel: "Lobe den Herren",
  liednummer2026: 12,
};

/** Wrap a GraphQL payload the way axios hands a 200 response back. */
function gqlResponse(payload: unknown): AxiosResponse {
  return {
    data: payload,
    status: 200,
    statusText: "OK",
    headers: {},
    config: {},
  } as unknown as AxiosResponse;
}

let post: MockInstance<typeof axios.post>;

beforeEach(() => {
  setActivePinia(createPinia());
  h.directus.authenticatedRequest.mockReset();
  useAuthStore().setTokens("access-1", "refresh-1");

  post = vi.spyOn(axios, "post");
  post.mockResolvedValue(gqlResponse({ data: { gesangbuchlied: [] } }));
});

describe("issue #6: a 200 carrying GraphQL errors must fail, not read as empty", () => {
  it("throws instead of returning an empty song list", async () => {
    post.mockResolvedValue(
      gqlResponse({ data: null, errors: [{ message: "You don't have permission" }] }),
    );

    await expect(useGesangbuchlied().queryGesangbuchlied({})).rejects.toThrow();
  });

  it("throws instead of reporting the song as not found", async () => {
    post.mockResolvedValue(
      gqlResponse({ data: null, errors: [{ message: "You don't have permission" }] }),
    );

    await expect(useGesangbuchlied().queryGesangbuchliedById("42")).rejects.toThrow();
  });

  it("throws on the batch lookup that backs the favorites list", async () => {
    // fetchMissingFavorites feeds this; swallowing here empties a user's stars.
    post.mockResolvedValue(
      gqlResponse({ data: null, errors: [{ message: "Unknown field" }] }),
    );

    await expect(useGesangbuchlied().queryGesangbuchliedByIds(["42"])).rejects.toThrow();
  });

  it("throws from makeGraphQLRequest itself, not only from its callers", async () => {
    // The check belongs in the one place every query funnels through, so that a
    // future query added elsewhere inherits it.
    post.mockResolvedValue(gqlResponse({ errors: [{ message: "Unknown field" }] }));

    await expect(
      useGesangbuchlied().makeGraphQLRequest({ query: "{ ping }" }),
    ).rejects.toThrow();
  });

  it("still returns the songs for a clean 200", async () => {
    // Guards the fix against over-correction: inspecting the envelope must not
    // start rejecting healthy responses.
    post.mockResolvedValue(gqlResponse({ data: { gesangbuchlied: [lied] } }));

    await expect(useGesangbuchlied().queryGesangbuchlied({})).resolves.toEqual([lied]);
  });

  it("still treats a genuinely empty result as an empty list, not a failure", async () => {
    // "No song matched this filter" is a normal outcome and must stay one.
    post.mockResolvedValue(gqlResponse({ data: { gesangbuchlied: null } }));

    await expect(useGesangbuchlied().queryGesangbuchlied({})).resolves.toEqual([]);
  });

  it("does not treat an empty errors array as a failure", async () => {
    // GraphQL only sends `errors` when it is non-empty, but a fix written as
    // `if (response.data.errors) throw` would reject this healthy response —
    // `[]` is truthy.
    post.mockResolvedValue(
      gqlResponse({ data: { gesangbuchlied: [lied] }, errors: [] }),
    );

    await expect(useGesangbuchlied().queryGesangbuchlied({})).resolves.toEqual([lied]);
  });
});
