import { useAuthStore } from "@/stores/auth";
import axios, { AxiosError, type AxiosResponse } from "axios";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { fetchFreieMusikstuecke, fetchSoundfontId } from "@/composables/directusQueries";
import { NoSessionError, makeGraphQLRequest } from "@/composables/useGraphQL";

// ---------------------------------------------------------------------------
// Mocks. `vi.hoisted` is required because vi.mock factories are hoisted above
// the imports, so they cannot close over ordinary top-level consts.
//
// axios itself is NOT module-mocked: the transport branches on
// `axios.isAxiosError(...)`. Only `axios.post` is spied, which is enough to
// guarantee that no test ever opens a socket.
// ---------------------------------------------------------------------------
const h = vi.hoisted(() => ({
  authenticatedRequest: vi.fn(),
}));

vi.mock("@/composables/useDirectusApi", () => ({
  useDirectusApi: () => ({ authenticatedRequest: h.authenticatedRequest }),
}));

const ENDPOINT = "https://directus.test/graphql";

function ok<T>(data: T): AxiosResponse<T> {
  return {
    data,
    status: 200,
    statusText: "OK",
    headers: {},
    config: {},
  } as unknown as AxiosResponse<T>;
}

function httpError(status: number): AxiosError {
  const response = {
    status,
    data: {},
    statusText: "",
    headers: {},
    config: {},
  } as unknown as AxiosResponse;
  return new AxiosError("request failed", "ERR_BAD_RESPONSE", undefined, {}, response);
}

function spyOnPost() {
  return vi.spyOn(axios, "post");
}
let post: ReturnType<typeof spyOnPost>;

beforeEach(() => {
  setActivePinia(createPinia());
  post = spyOnPost();
  h.authenticatedRequest.mockReset();
});

function signIn(token = "access-1") {
  useAuthStore().setTokens(token, "refresh-1");
}

// ---------------------------------------------------------------------------
// The session option. The default contract (throws NoSessionError, retries a
// 401, rejects a 200 carrying errors) is covered through useGesangbuchlied's
// spec; what is asserted here is the anonymous mode the folded-in callers use.
// ---------------------------------------------------------------------------
describe("makeGraphQLRequest — session: optional", () => {
  it("still refuses to send without a session by default", async () => {
    await expect(makeGraphQLRequest({ query: "{ ping }" })).rejects.toBeInstanceOf(NoSessionError);
    expect(post).not.toHaveBeenCalled();
  });

  it("sends anonymously, without a bearer header, when there is no session", async () => {
    post.mockResolvedValue(ok({ data: { ping: true } }));

    const result = await makeGraphQLRequest({ query: "{ ping }" }, { session: "optional" });

    expect(result).toEqual({ data: { ping: true } });
    expect(post).toHaveBeenCalledWith(
      ENDPOINT,
      { query: "{ ping }" },
      { headers: { "Content-Type": "application/json" } },
    );
  });

  it("still sends the bearer header when there is a session", async () => {
    signIn("access-9");
    post.mockResolvedValue(ok({ data: {} }));

    await makeGraphQLRequest({ query: "{ ping }" }, { session: "optional" });

    expect(post.mock.calls[0][2]).toEqual({
      headers: { "Content-Type": "application/json", Authorization: "Bearer access-9" },
    });
  });

  it("does not retry a 401 through the refreshing client when there is no session", async () => {
    // Without a token there is nothing to refresh; the retry would only throw
    // "No access token available" from deeper down.
    post.mockRejectedValue(httpError(401));

    await expect(
      makeGraphQLRequest({ query: "{ ping }" }, { session: "optional" }),
    ).rejects.toMatchObject({ response: { status: 401 } });
    expect(h.authenticatedRequest).not.toHaveBeenCalled();
  });

  it("retries a 401 through the refreshing client when there is a session", async () => {
    signIn();
    post.mockRejectedValue(httpError(401));
    h.authenticatedRequest.mockResolvedValue({ data: { ping: "refreshed" } });

    const result = await makeGraphQLRequest({ query: "{ ping }" }, { session: "optional" });

    expect(result).toEqual({ data: { ping: "refreshed" } });
    expect(h.authenticatedRequest).toHaveBeenCalledTimes(1);
  });

  it("fails the missing-configuration check before building a request", async () => {
    vi.stubEnv("VITE_PUBLIC_DIRECTUS_URL", "");
    signIn();

    await expect(makeGraphQLRequest({ query: "{ ping }" })).rejects.toThrow(
      "VITE_PUBLIC_DIRECTUS_URL is not configured",
    );
    expect(post).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// The two shared reads.
// ---------------------------------------------------------------------------
describe("directusQueries", () => {
  it("fetchFreieMusikstuecke asks for the sorted list and unwraps it", async () => {
    const piece = { id: "p-1", name: "Ave Verum" };
    post.mockResolvedValue(ok({ data: { freie_musikstuecke: [piece] } }));

    await expect(fetchFreieMusikstuecke()).resolves.toEqual([piece]);

    const body = post.mock.calls[0][1] as { query: string };
    expect(body.query).toContain('freie_musikstuecke(sort: ["name"])');
    expect(body.query).toContain("midi_file");
  });

  it("fetchFreieMusikstuecke returns an empty list for an empty envelope", async () => {
    post.mockResolvedValue(ok({ data: {} }));

    await expect(fetchFreieMusikstuecke()).resolves.toEqual([]);
  });

  it("fetchSoundfontId reads the settings singleton", async () => {
    post.mockResolvedValue(ok({ data: { settings: { soundfont: { id: "sf-1" } } } }));

    await expect(fetchSoundfontId()).resolves.toBe("sf-1");

    const body = post.mock.calls[0][1] as { query: string };
    expect(body.query).toBe("query { settings { soundfont { id } } }");
  });

  it("fetchSoundfontId reports null when no soundfont is configured", async () => {
    post.mockResolvedValue(ok({ data: { settings: { soundfont: null } } }));

    await expect(fetchSoundfontId()).resolves.toBeNull();
  });

  it("neither read requires a session", async () => {
    post.mockResolvedValue(ok({ data: {} }));

    await fetchFreieMusikstuecke();
    await fetchSoundfontId();

    expect(post).toHaveBeenCalledTimes(2);
  });
});
