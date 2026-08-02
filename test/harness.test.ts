/**
 * Verifies the test harness itself, so that a broken environment fails here
 * with an obvious message instead of surfacing as confusing failures elsewhere.
 */
import { describe, expect, it } from "vitest";

import { cn } from "@/lib/utils";

describe("test harness", () => {
  it("runs in a DOM environment", () => {
    expect(typeof window).toBe("object");
    expect(typeof document).toBe("object");
    expect(typeof localStorage).toBe("object");
  });

  it("resolves the @ alias to src/", () => {
    expect(typeof cn).toBe("function");
  });

  it("exposes a fake IndexedDB", () => {
    expect(typeof indexedDB).toBe("object");
    expect(typeof indexedDB.open).toBe("function");
  });

  it("pins VITE_PUBLIC_DIRECTUS_URL so tests never read the real .env", () => {
    expect(import.meta.env.VITE_PUBLIC_DIRECTUS_URL).toBe(
      "https://directus.test",
    );
  });

  it("provides base64 helpers used to build test JWTs", () => {
    expect(atob(btoa("hello"))).toBe("hello");
  });
});

describe("localStorage isolation between tests", () => {
  it("writes a value", () => {
    localStorage.setItem("leak-check", "written");
    expect(localStorage.getItem("leak-check")).toBe("written");
  });

  it("does not see the previous test's value", () => {
    expect(localStorage.getItem("leak-check")).toBeNull();
  });
});
