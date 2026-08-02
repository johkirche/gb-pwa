import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it } from "vitest";

import {
  ACCESS_TOKEN_KEY,
  LOGGED_OUT_KEY,
  REFRESH_TOKEN_KEY,
  USER_KEY,
  type User,
  useAuthStore,
} from "@/stores/auth";

const alice: User = {
  id: "u-1",
  email: "alice@example.com",
  first_name: "Alice",
  last_name: "Anderson",
};

beforeEach(() => {
  setActivePinia(createPinia());
});

describe("setUser", () => {
  it("stores the user in state and localStorage", () => {
    const store = useAuthStore();

    store.setUser(alice);

    expect(store.user).toEqual(alice);
    expect(store.isLoggedIn).toBe(true);
    expect(JSON.parse(localStorage.getItem(USER_KEY)!)).toEqual(alice);
  });

  it("clears the user and removes the localStorage entry when passed null", () => {
    const store = useAuthStore();
    store.setUser(alice);

    store.setUser(null);

    expect(store.user).toBeNull();
    expect(store.isLoggedIn).toBe(false);
    expect(localStorage.getItem(USER_KEY)).toBeNull();
  });
});

describe("setTokens", () => {
  it("persists both tokens", () => {
    const store = useAuthStore();

    store.setTokens("access-abc", "refresh-xyz");

    expect(store.accessToken).toBe("access-abc");
    expect(store.refreshToken).toBe("refresh-xyz");
    expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBe("access-abc");
    expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBe("refresh-xyz");
  });

  it("removes both entries when passed nulls", () => {
    const store = useAuthStore();
    store.setTokens("access-abc", "refresh-xyz");

    store.setTokens(null, null);

    expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBeNull();
    expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBeNull();
  });
});

describe("clearAuth", () => {
  it("wipes session state and storage", () => {
    const store = useAuthStore();
    store.setUser(alice);
    store.setTokens("a", "r");

    store.clearAuth();

    expect(store.user).toBeNull();
    expect(store.accessToken).toBeNull();
    expect(store.refreshToken).toBeNull();
    expect(store.isLoggedIn).toBe(false);
    expect(localStorage.getItem(USER_KEY)).toBeNull();
    expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBeNull();
    expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBeNull();
  });

  it("does NOT set the logged-out flag for an implicit cleanup", () => {
    // Token-expiry cleanups must not trap an offline user behind /login —
    // only a deliberate logout should do that.
    const store = useAuthStore();
    store.setUser(alice);

    store.clearAuth();

    expect(store.isLoggedOut).toBe(false);
    expect(localStorage.getItem(LOGGED_OUT_KEY)).toBeNull();
  });

  it("sets and persists the logged-out flag for an explicit logout", () => {
    const store = useAuthStore();
    store.setUser(alice);

    store.clearAuth(true);

    expect(store.isLoggedOut).toBe(true);
    expect(localStorage.getItem(LOGGED_OUT_KEY)).toBe("1");
  });
});

describe("setLoading", () => {
  it("toggles the loading flag without touching storage", () => {
    const store = useAuthStore();

    store.setLoading(true);
    expect(store.isLoading).toBe(true);

    store.setLoading(false);
    expect(store.isLoading).toBe(false);
    expect(localStorage.length).toBe(0);
  });
});

describe("setLoggedOut", () => {
  it("removes the flag entirely when set to false", () => {
    const store = useAuthStore();
    store.setLoggedOut(true);

    store.setLoggedOut(false);

    expect(store.isLoggedOut).toBe(false);
    // Stored as an absent key rather than "0", which hydrateFromStorage
    // relies on (it compares strictly against "1").
    expect(localStorage.getItem(LOGGED_OUT_KEY)).toBeNull();
  });
});

describe("hydrateFromStorage", () => {
  it("restores tokens, user and the logged-out flag", () => {
    localStorage.setItem(ACCESS_TOKEN_KEY, "access-abc");
    localStorage.setItem(REFRESH_TOKEN_KEY, "refresh-xyz");
    localStorage.setItem(USER_KEY, JSON.stringify(alice));
    localStorage.setItem(LOGGED_OUT_KEY, "1");
    const store = useAuthStore();

    store.hydrateFromStorage();

    expect(store.accessToken).toBe("access-abc");
    expect(store.refreshToken).toBe("refresh-xyz");
    expect(store.user).toEqual(alice);
    expect(store.isLoggedIn).toBe(true);
    expect(store.isLoggedOut).toBe(true);
  });

  it("leaves the logged-out flag false for any value other than '1'", () => {
    localStorage.setItem(LOGGED_OUT_KEY, "true");
    const store = useAuthStore();

    store.hydrateFromStorage();

    expect(store.isLoggedOut).toBe(false);
  });

  it("clears the in-memory user when storage has none (cross-tab logout)", () => {
    const store = useAuthStore();
    store.setUser(alice);
    localStorage.removeItem(USER_KEY);

    store.hydrateFromStorage();

    expect(store.user).toBeNull();
    expect(store.isLoggedIn).toBe(false);
  });

  it("discards a corrupt user entry instead of throwing", () => {
    localStorage.setItem(USER_KEY, "{not valid json");
    localStorage.setItem(ACCESS_TOKEN_KEY, "access-abc");
    const store = useAuthStore();

    expect(() => store.hydrateFromStorage()).not.toThrow();

    expect(store.user).toBeNull();
    expect(localStorage.getItem(USER_KEY)).toBeNull();
    // Tokens are untouched: a corrupt profile blob is not a reason to destroy a
    // session that can still be refreshed.
    expect(store.accessToken).toBe("access-abc");
    expect(console.error).toHaveBeenCalled();
  });

  it("survives a localStorage read that throws", () => {
    // Safari in private mode and locked-down enterprise profiles make
    // localStorage access throw outright. The app must still boot.
    localStorage.setItem(ACCESS_TOKEN_KEY, "access-abc");
    const store = useAuthStore();
    vi.spyOn(localStorage, "getItem").mockImplementation(() => {
      throw new Error("SecurityError: storage disabled");
    });

    expect(() => store.hydrateFromStorage()).not.toThrow();

    expect(store.user).toBeNull();
    expect(store.accessToken).toBeNull();
    expect(console.error).toHaveBeenCalled();
  });

  it("falls back to clearing auth when a write fails mid-hydration", () => {
    // Corrupt user JSON sends hydrate into its cleanup path; if that cleanup
    // write also fails, the outer guard must clear the session rather than
    // let the exception escape into the router guard that called it.
    localStorage.setItem(USER_KEY, "{not valid json");
    localStorage.setItem(ACCESS_TOKEN_KEY, "access-abc");
    const store = useAuthStore();
    vi.spyOn(localStorage, "removeItem").mockImplementationOnce(() => {
      throw new Error("QuotaExceededError");
    });

    expect(() => store.hydrateFromStorage()).not.toThrow();

    expect(store.user).toBeNull();
    expect(store.accessToken).toBeNull();
    expect(store.isLoggedIn).toBe(false);
  });
});

describe("userName", () => {
  it("is an empty string with no user, so callers can hide user-specific UI", () => {
    const store = useAuthStore();

    // Deliberately not "User" — an offline session with no cached profile
    // should render nothing rather than a meaningless placeholder.
    expect(store.userName).toBe("");
  });

  it("prefers the first name", () => {
    const store = useAuthStore();
    store.setUser(alice);

    expect(store.userName).toBe("Alice");
  });

  it("falls back to the email when there is no first name", () => {
    const store = useAuthStore();
    store.setUser({ id: "u-2", email: "bob@example.com" });

    expect(store.userName).toBe("bob@example.com");
  });

  it("falls back to 'User' when neither is present", () => {
    const store = useAuthStore();
    store.setUser({ id: "u-3", email: "" });

    expect(store.userName).toBe("User");
  });
});

describe("isAuthenticated", () => {
  it("requires both a user and an access token", () => {
    const store = useAuthStore();

    store.setUser(alice);
    expect(store.isAuthenticated).toBe(false);

    store.setTokens("access-abc", "refresh-xyz");
    expect(store.isAuthenticated).toBe(true);

    store.setTokens(null, "refresh-xyz");
    expect(store.isAuthenticated).toBe(false);
  });
});

describe("markAsHydrated", () => {
  it("flips isHydrated, which the router guard uses to hydrate exactly once", () => {
    const store = useAuthStore();

    expect(store.isHydrated).toBe(false);
    store.markAsHydrated();
    expect(store.isHydrated).toBe(true);
  });
});
