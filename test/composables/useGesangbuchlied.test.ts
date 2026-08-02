import axios, { AxiosError, type AxiosResponse } from "axios";
import { createPinia, setActivePinia } from "pinia";
import { type MockInstance, beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";

import { useGesangbuchlied } from "@/composables/useGesangbuchlied";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth";

// ---------------------------------------------------------------------------
// Mocks. `vi.hoisted` is required because vi.mock factories are hoisted above
// the imports, so they cannot close over ordinary top-level consts.
//
// axios itself is NOT module-mocked: the composable branches on
// `axios.isAxiosError(...)`, and the real implementation is what production
// runs. Only `axios.post` is spied, which is enough to guarantee that no test
// ever opens a socket.
// ---------------------------------------------------------------------------
const h = vi.hoisted(() => ({
  directus: {
    authenticatedRequest: vi.fn(),
  },
}));

vi.mock("@/composables/useDirectusApi", () => ({
  useDirectusApi: () => h.directus,
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const ENDPOINT = "https://directus.test/graphql";

/**
 * The exact selection set the composable builds. Pinned as a literal so that
 * dropping or renaming a field — which silently produces songs with missing
 * sheet music or authors — fails loudly instead of degrading at runtime.
 */
const FIELD_SELECTION =
  "id, status, titel, date_updated, einreicherName, externerLink, " +
  "liedHatAenderung, liednummer2000, liednummer2026, linkCloud, " +
  "melodieGeaendert, textGeaendert, rueckfrageAutor, " +
  "midi_intro { id, title, type, filename_download, filesize }, " +
  "midi_main { id, title, type, filename_download, filesize }, " +
  "midi_outro { id, title, type, filename_download, filesize }, " +
  "kategorieId { id, kategorie_id { id, name, typ } }, " +
  "melodieId { id, noten { id, directus_files_id { id, title, type, filename_download, filesize } }, " +
  "autorId { id, autor_id { geburtsjahr, id, nachname, status, sterbejahr, vorname } } }, " +
  "textId { id, strophenEinzeln, autorId { id, autor_id { geburtsjahr, id, nachname, status, sterbejahr, vorname } } }";

/** A representative song, nested deeply enough to catch a lossy mapper. */
const lied = {
  id: "42",
  status: "published",
  titel: "Lobe den Herren",
  liednummer2026: 12,
  midi_main: { id: "f-1", title: "main", type: "audio/midi" },
  kategorieId: [{ id: "k-1", kategorie_id: { id: "c-1", name: "Lob", typ: "thema" } }],
  melodieId: {
    id: "m-1",
    noten: [{ id: "n-1", directus_files_id: { id: "f-2", title: "noten.pdf" } }],
    autorId: [{ id: "a-1", autor_id: { id: "p-1", nachname: "Neander", vorname: "Joachim" } }],
  },
  textId: { id: "t-1", strophenEinzeln: ["Strophe 1", "Strophe 2"] },
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

/** An axios error carrying an HTTP response — i.e. the server answered. */
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

/** An axios error with no response — offline, DNS failure, timeout. */
function networkError(): AxiosError {
  return new AxiosError("Network Error", "ERR_NETWORK", undefined, {});
}

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------
let post: MockInstance<typeof axios.post>;

type GraphQLBody = { query: string; variables: Record<string, unknown> };

/** The (url, body, config) of the most recent axios.post the source made. */
function lastPost() {
  const calls = post.mock.calls;
  const call = calls[calls.length - 1];
  if (!call) throw new Error("axios.post was never called");
  return {
    url: call[0] as string,
    body: call[1] as GraphQLBody,
    config: call[2] as { headers: Record<string, string> },
  };
}

/** Give the store a session so `makeGraphQLRequest` gets past its token guard. */
function signIn(accessToken = "access-token-1") {
  useAuthStore().setTokens(accessToken, "refresh-1");
  return accessToken;
}

beforeEach(() => {
  setActivePinia(createPinia());
  h.directus.authenticatedRequest.mockReset();

  post = vi.spyOn(axios, "post");
  // Default: a well-formed but empty response, so construction-focused tests do
  // not have to restate a payload they never look at.
  post.mockResolvedValue(gqlResponse({ data: { gesangbuchlied: [] } }));
});

// ---------------------------------------------------------------------------
describe("GraphQL endpoint URL", () => {
  it("posts to <VITE_PUBLIC_DIRECTUS_URL>/graphql", async () => {
    signIn();

    await useGesangbuchlied().queryGesangbuchlied({});

    expect(lastPost().url).toBe(ENDPOINT);
  });

  it("targets /graphql on the configured host even if the env var ends in a slash", async () => {
    // Deliberately does NOT pin the exact "https://directus.test//graphql" the
    // composable builds today: unlike DirectusApiClient it never strips the
    // trailing slash, and a green test asserting the double slash would read as
    // coverage while blessing it. What is genuinely required — same origin, the
    // /graphql path — is asserted instead, so this stays correct if the
    // concatenation is ever normalised.
    vi.stubEnv("VITE_PUBLIC_DIRECTUS_URL", "https://directus.test/");
    signIn();

    await useGesangbuchlied().queryGesangbuchlied({});

    const { origin, pathname } = new URL(lastPost().url);
    expect(origin).toBe("https://directus.test");
    expect(pathname.replace(/\/{2,}/g, "/")).toBe("/graphql");
  });
});

// ---------------------------------------------------------------------------
describe("createAuthHeaders", () => {
  it("attaches the store's access token as a bearer token", () => {
    signIn("access-abc");

    expect(useGesangbuchlied().createAuthHeaders()).toEqual({
      "Content-Type": "application/json",
      Authorization: "Bearer access-abc",
    });
  });

  it("omits Authorization entirely when there is no access token", () => {
    const headers = useGesangbuchlied().createAuthHeaders();

    expect(headers).toEqual({ "Content-Type": "application/json" });
    expect(headers).not.toHaveProperty("Authorization");
  });

  it("lets callers override Content-Type", () => {
    signIn();

    const headers = useGesangbuchlied().createAuthHeaders({
      "Content-Type": "application/graphql",
    });

    expect(headers["Content-Type"]).toBe("application/graphql");
  });

  it("keeps the store token authoritative over a caller-supplied Authorization", () => {
    // Authorization is written after the caller's headers are spread in, so a
    // stale token passed by a caller can never shadow the live session.
    signIn("access-live");

    const headers = useGesangbuchlied().createAuthHeaders({
      Authorization: "Bearer stale",
    });

    expect(headers.Authorization).toBe("Bearer access-live");
  });

  it("sends the bearer token on the actual request", async () => {
    signIn("access-xyz");

    await useGesangbuchlied().queryGesangbuchlied({});

    expect(lastPost().config.headers).toEqual({
      "Content-Type": "application/json",
      Authorization: "Bearer access-xyz",
    });
  });
});

// ---------------------------------------------------------------------------
describe("queryGesangbuchlied — query construction", () => {
  it("requests the complete nested field selection", async () => {
    signIn();

    await useGesangbuchlied().queryGesangbuchlied({});

    expect(lastPost().body.query).toBe(
      "query ($limit: Int, $offset: Int) { gesangbuchlied (limit: $limit, offset: $offset) { " +
        FIELD_SELECTION +
        " } }",
    );
  });

  it("defaults to limit 100 and offset 0", async () => {
    signIn();

    await useGesangbuchlied().queryGesangbuchlied({});

    expect(lastPost().body.variables).toEqual({ limit: 100, offset: 0 });
  });

  it("passes explicit limit and offset through", async () => {
    signIn();

    await useGesangbuchlied().queryGesangbuchlied({ limit: 25, offset: 50 });

    expect(lastPost().body.variables).toEqual({ limit: 25, offset: 50 });
  });

  it("turns limit 0 into 100", async () => {
    // `variables.limit || 100` cannot distinguish 0 from "not given", so asking
    // for nothing asks for a full page instead. Recorded as current behaviour.
    signIn();

    await useGesangbuchlied().queryGesangbuchlied({ limit: 0 });

    expect(lastPost().body.variables).toEqual({ limit: 100, offset: 0 });
  });

  it("declares filter and sort with the types Directus expects", async () => {
    signIn();
    const filter = { status: { _eq: "published" } };

    await useGesangbuchlied().queryGesangbuchlied({ filter, sort: ["-date_updated"] });

    const { body } = lastPost();
    expect(body.query).toContain("$filter: gesangbuchlied_filter");
    expect(body.query).toContain("$sort: [String]");
    expect(body.query).toContain("gesangbuchlied (limit: $limit, offset: $offset, filter: $filter, sort: $sort)");
    expect(body.variables).toEqual({
      limit: 100,
      offset: 0,
      filter,
      sort: ["-date_updated"],
    });
  });

  it("omits filter and sort completely when they are null", async () => {
    // Sending `filter: null` would be a validation error on the Directus side,
    // so the absence of the variable — not just a null value — is the contract.
    signIn();

    await useGesangbuchlied().queryGesangbuchlied({ filter: null, sort: null });

    const { body } = lastPost();
    expect(body.query).not.toContain("filter");
    expect(body.query).not.toContain("sort");
    expect(body.variables).toEqual({ limit: 100, offset: 0 });
  });
});

// ---------------------------------------------------------------------------
describe("queryGesangbuchliedById — query construction", () => {
  it("builds a gesangbuchlied_by_id query with a non-null ID variable", async () => {
    signIn();
    post.mockResolvedValue(gqlResponse({ data: { gesangbuchlied_by_id: lied } }));

    await useGesangbuchlied().queryGesangbuchliedById("42");

    const { body, url } = lastPost();
    expect(url).toBe(ENDPOINT);
    expect(body.query).toBe(
      "query ($id: ID!) { gesangbuchlied_by_id (id: $id) { " + FIELD_SELECTION + " } }",
    );
    expect(body.variables).toEqual({ id: "42" });
  });

  it("passes a numeric id through without stringifying it", async () => {
    signIn();
    post.mockResolvedValue(gqlResponse({ data: { gesangbuchlied_by_id: lied } }));

    await useGesangbuchlied().queryGesangbuchliedById(42);

    expect(lastPost().body.variables).toEqual({ id: 42 });
  });
});

// ---------------------------------------------------------------------------
describe("queryGesangbuchliedByIds", () => {
  it("filters on _in and sizes the limit to the id list", async () => {
    // Without limit === ids.length the server's default page size would silently
    // truncate a large playlist.
    signIn();

    await useGesangbuchlied().queryGesangbuchliedByIds(["a", "b", "c"]);

    const { body } = lastPost();
    expect(body.query).toContain("$filter: gesangbuchlied_filter");
    expect(body.variables).toEqual({ limit: 3, filter: { id: { _in: ["a", "b", "c"] } } });
  });

  it("does not send an offset variable", async () => {
    signIn();

    await useGesangbuchlied().queryGesangbuchliedByIds(["a"]);

    expect(lastPost().body.query).not.toContain("offset");
    expect(lastPost().body.variables).not.toHaveProperty("offset");
  });

  it("short-circuits on an empty id list without touching the network", async () => {
    signIn();

    await expect(useGesangbuchlied().queryGesangbuchliedByIds([])).resolves.toEqual([]);

    expect(post).not.toHaveBeenCalled();
  });

  it("short-circuits even when no one is logged in", async () => {
    // An empty playlist must render offline rather than throw "please log in".
    await expect(useGesangbuchlied().queryGesangbuchliedByIds([])).resolves.toEqual([]);
  });

  it("returns the songs the server matched", async () => {
    signIn();
    post.mockResolvedValue(gqlResponse({ data: { gesangbuchlied: [lied] } }));

    const result = await useGesangbuchlied().queryGesangbuchliedByIds(["42"]);

    expect(result).toEqual([lied]);
  });
});

// ---------------------------------------------------------------------------
describe("response mapping", () => {
  it("returns the nested song payload unchanged", async () => {
    signIn();
    post.mockResolvedValue(gqlResponse({ data: { gesangbuchlied: [lied] } }));

    const result = await useGesangbuchlied().queryGesangbuchlied({});

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(lied);
    // Spot-check the deep branches: a mapper that flattened these would still
    // pass a shallow length assertion.
    const [first] = result as unknown as Array<typeof lied>;
    expect(first.melodieId.noten[0].directus_files_id.title).toBe("noten.pdf");
    expect(first.textId.strophenEinzeln).toEqual(["Strophe 1", "Strophe 2"]);
  });

  it("falls back to an empty list when the envelope has no data", async () => {
    signIn();
    post.mockResolvedValue(gqlResponse({}));

    await expect(useGesangbuchlied().queryGesangbuchlied({})).resolves.toEqual([]);
  });

  it("falls back to an empty list when the collection itself is null", async () => {
    signIn();
    post.mockResolvedValue(gqlResponse({ data: { gesangbuchlied: null } }));

    await expect(useGesangbuchlied().queryGesangbuchlied({})).resolves.toEqual([]);
  });

  // A 200 whose body carries a non-empty `errors` array is a filed defect
  // (issue #6) rather than intended behaviour, so it is asserted in
  // test/known-issues/issue-6-graphql-errors-200.test.ts where it fails visibly.
  // Deliberately not pinned here: a green test asserting the empty list would
  // read as coverage while blessing it.

  it("returns the single song for a by-id lookup", async () => {
    signIn();
    post.mockResolvedValue(gqlResponse({ data: { gesangbuchlied_by_id: lied } }));

    await expect(useGesangbuchlied().queryGesangbuchliedById("42")).resolves.toEqual(lied);
  });

  it("returns null when a by-id lookup finds nothing", async () => {
    signIn();
    post.mockResolvedValue(gqlResponse({ data: { gesangbuchlied_by_id: null } }));

    await expect(useGesangbuchlied().queryGesangbuchliedById("nope")).resolves.toBeNull();
  });

  it("returns null when a by-id envelope has no data at all", async () => {
    signIn();
    post.mockResolvedValue(gqlResponse({}));

    await expect(useGesangbuchlied().queryGesangbuchliedById("42")).resolves.toBeNull();
  });
});

// ---------------------------------------------------------------------------
describe("makeGraphQLRequest — authentication guard", () => {
  it("refuses to fire a request when there is no access token", async () => {
    await expect(useGesangbuchlied().queryGesangbuchlied({})).rejects.toThrow(
      "No access token available. Please log in.",
    );

    expect(post).not.toHaveBeenCalled();
  });

  it("also guards the by-id path", async () => {
    await expect(useGesangbuchlied().queryGesangbuchliedById("42")).rejects.toThrow(
      "No access token available. Please log in.",
    );

    expect(post).not.toHaveBeenCalled();
  });

  it("returns the raw envelope when called directly", async () => {
    signIn();
    const envelope = { data: { anything: 1 } };
    post.mockResolvedValue(gqlResponse(envelope));

    const result = await useGesangbuchlied().makeGraphQLRequest({ query: "{ ping }" });

    expect(result).toEqual(envelope);
    expect(lastPost().body).toEqual({ query: "{ ping }" });
  });
});

// ---------------------------------------------------------------------------
describe("401 fallback through DirectusApi", () => {
  it("retries the identical request through the token-refreshing client", async () => {
    // The direct axios call carries whatever token was in the store; only
    // DirectusApi knows how to refresh it. The retry must resend the same query
    // or the user gets a blank list after every token expiry.
    signIn();
    post.mockRejectedValue(httpError(401));
    h.directus.authenticatedRequest.mockResolvedValue({
      data: { gesangbuchlied: [lied] },
    });

    const result = await useGesangbuchlied().queryGesangbuchlied({ limit: 5 });

    expect(result).toEqual([lied]);
    const [url, config] = h.directus.authenticatedRequest.mock.calls[0];
    expect(url).toBe(ENDPOINT);
    expect(config.method).toBe("POST");
    expect(config.headers).toEqual({ "Content-Type": "application/json" });
    expect(config.data.variables).toEqual({ limit: 5, offset: 0 });
    expect(config.data.query).toBe(lastPost().body.query);
  });

  it("uses the fallback for a by-id lookup too", async () => {
    signIn();
    post.mockRejectedValue(httpError(401));
    h.directus.authenticatedRequest.mockResolvedValue({
      data: { gesangbuchlied_by_id: lied },
    });

    await expect(useGesangbuchlied().queryGesangbuchliedById("42")).resolves.toEqual(lied);
  });

  it("propagates and logs the failure when the refreshed retry also fails", async () => {
    signIn();
    post.mockRejectedValue(httpError(401));
    h.directus.authenticatedRequest.mockRejectedValue(httpError(401));

    await expect(useGesangbuchlied().queryGesangbuchlied({})).rejects.toThrow();

    expect(console.error).toHaveBeenCalled();
  });

  it("does not retry a 500 — that is a server fault, not a stale token", async () => {
    signIn();
    post.mockRejectedValue(httpError(500));

    await expect(useGesangbuchlied().queryGesangbuchlied({})).rejects.toThrow();

    expect(h.directus.authenticatedRequest).not.toHaveBeenCalled();
  });

  it("does not retry a 403", async () => {
    signIn();
    post.mockRejectedValue(httpError(403));

    await expect(useGesangbuchlied().queryGesangbuchlied({})).rejects.toThrow();

    expect(h.directus.authenticatedRequest).not.toHaveBeenCalled();
  });

  it("rethrows a plain network error instead of burning a refresh token", async () => {
    // Offline is the app's normal state mid-service. Treating a connection
    // failure as an auth failure would spend the single-use refresh token for
    // nothing and could end the session.
    signIn();
    post.mockRejectedValue(networkError());

    await expect(useGesangbuchlied().queryGesangbuchlied({})).rejects.toThrow("Network Error");

    expect(h.directus.authenticatedRequest).not.toHaveBeenCalled();
  });

  it("rethrows a non-axios error untouched", async () => {
    signIn();
    post.mockRejectedValue(new TypeError("something odd"));

    await expect(useGesangbuchlied().queryGesangbuchlied({})).rejects.toThrow("something odd");

    expect(h.directus.authenticatedRequest).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
describe("fetch wrappers", () => {
  it("fetchGesangbuchlied applies the same defaults as the direct query", async () => {
    signIn();
    post.mockResolvedValue(gqlResponse({ data: { gesangbuchlied: [lied] } }));

    const result = await useGesangbuchlied().fetchGesangbuchlied();

    expect(result).toEqual([lied]);
    expect(lastPost().body.variables).toEqual({ limit: 100, offset: 0 });
  });

  it("fetchGesangbuchlied forwards filter, sort and paging", async () => {
    signIn();
    const filter = { titel: { _contains: "Lobe" } };

    await useGesangbuchlied().fetchGesangbuchlied({
      limit: 10,
      offset: 20,
      filter,
      sort: ["titel"],
    });

    expect(lastPost().body.variables).toEqual({
      limit: 10,
      offset: 20,
      filter,
      sort: ["titel"],
    });
  });

  it("fetchGesangbuchliedById returns the song", async () => {
    signIn();
    post.mockResolvedValue(gqlResponse({ data: { gesangbuchlied_by_id: lied } }));

    await expect(useGesangbuchlied().fetchGesangbuchliedById("42")).resolves.toEqual(lied);
  });
});

// ---------------------------------------------------------------------------
describe("useGesangbuchliedByIdQuery", () => {
  it("reads the ref at call time, not at composable creation time", async () => {
    // The song detail view keeps one query object alive while the route param
    // changes; binding the id eagerly would keep refetching the first song.
    signIn();
    const id = ref<string>("1");
    const { queryGesangbuchliedById } = useGesangbuchlied().useGesangbuchliedByIdQuery(id);

    await queryGesangbuchliedById();
    expect(lastPost().body.variables).toEqual({ id: "1" });

    id.value = "2";
    await queryGesangbuchliedById();
    expect(lastPost().body.variables).toEqual({ id: "2" });
  });

  it("accepts a plain value as well as a ref", async () => {
    signIn();
    const { queryGesangbuchliedById } = useGesangbuchlied().useGesangbuchliedByIdQuery(7);

    await queryGesangbuchliedById();

    expect(lastPost().body.variables).toEqual({ id: 7 });
  });
});

describe("useGesangbuchliedQuery", () => {
  it("forwards the options it was created with", async () => {
    signIn();
    const filter = { status: { _eq: "published" } };
    const { queryGesangbuchlied } = useGesangbuchlied().useGesangbuchliedQuery({
      limit: 5,
      offset: 15,
      filter,
    });

    await queryGesangbuchlied();

    expect(lastPost().body.variables).toEqual({ limit: 5, offset: 15, filter });
  });

  it("falls back to the default page when created without options", async () => {
    signIn();
    const { queryGesangbuchlied } = useGesangbuchlied().useGesangbuchliedQuery();

    await queryGesangbuchlied();

    expect(lastPost().body.variables).toEqual({ limit: 100, offset: 0 });
  });
});

// ---------------------------------------------------------------------------
describe("cn", () => {
  it("joins plain class strings", () => {
    expect(cn("flex", "items-center")).toBe("flex items-center");
  });

  it("drops falsy conditional classes", () => {
    const isActive = false;
    expect(cn("btn", isActive && "btn-active", undefined, null, "")).toBe("btn");
  });

  it("supports object syntax", () => {
    expect(cn("btn", { "btn-active": true, "btn-disabled": false })).toBe("btn btn-active");
  });

  it("flattens nested arrays", () => {
    expect(cn(["flex", ["gap-2", { hidden: false }]], "p-4")).toBe("flex gap-2 p-4");
  });

  it("lets the last of two conflicting utilities win", () => {
    // This is the whole point of twMerge over plain string concatenation: a
    // component's own padding must override the default it was given.
    expect(cn("px-2", "px-4")).toBe("px-4");
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });

  it("keeps utilities that do not conflict", () => {
    expect(cn("p-2 text-sm", "font-bold")).toBe("p-2 text-sm font-bold");
  });

  it("resolves conflicts per variant prefix", () => {
    // hover:px-4 must not cancel the unprefixed px-1, and vice versa.
    expect(cn("hover:px-2", "hover:px-4", "px-1")).toBe("hover:px-4 px-1");
  });

  it("resolves a conflict introduced by a conditional class", () => {
    const isActive = true;
    expect(cn("bg-red-500", isActive && "bg-green-500")).toBe("bg-green-500");
  });

  it("returns an empty string for no meaningful input", () => {
    expect(cn()).toBe("");
    expect(cn(false, null, undefined)).toBe("");
  });
});
