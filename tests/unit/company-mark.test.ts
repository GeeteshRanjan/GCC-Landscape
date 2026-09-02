import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The mark resolver, in both tier states.
 *
 * `company-mark.ts` reads the client ID at MODULE LOAD, so each state needs a fresh
 * import rather than a mutated variable — `vi.resetModules()` plus a dynamic import is
 * what makes the off state genuinely testable. Without that, whichever state the test
 * runner happened to start in would be the only one ever asserted, and the off state is
 * the one production ships in.
 */

const KEY = "NEXT_PUBLIC_GCC_BRANDFETCH_CLIENT_ID";
const original = process.env[KEY];

async function load(clientId: string | undefined) {
  vi.resetModules();
  if (clientId === undefined) delete process.env[KEY];
  else process.env[KEY] = clientId;
  return import("../../src/data/company-mark");
}

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  if (original === undefined) delete process.env[KEY];
  else process.env[KEY] = original;
});

describe("with no client ID — the state production ships in", () => {
  it("reports itself unconfigured", async () => {
    const { brandfetchConfigured } = await load(undefined);
    expect(brandfetchConfigured()).toBe(false);
  });

  it("resolves NOTHING even for a company with a good domain", async () => {
    const { resolveCompanyMark } = await load(undefined);
    expect(resolveCompanyMark("nike.com")).toBeNull();
  });

  it("treats blank and whitespace as unset, so a stray value cannot half-enable it", async () => {
    for (const value of ["", "   "]) {
      const { brandfetchConfigured, resolveCompanyMark } = await load(value);
      expect(brandfetchConfigured()).toBe(false);
      expect(resolveCompanyMark("nike.com")).toBeNull();
    }
  });

  it("still prefers an uploaded mark, which does not depend on the provider", async () => {
    const { resolveCompanyMark } = await load(undefined);
    expect(resolveCompanyMark("nike.com", "/logos/companies/nike.png")).toBe(
      "/logos/companies/nike.png",
    );
  });
});

describe("with a client ID", () => {
  it("reports itself configured", async () => {
    const { brandfetchConfigured } = await load("test-client-id");
    expect(brandfetchConfigured()).toBe(true);
  });

  it("builds a URL carrying the domain, both dimensions and the id", async () => {
    const { resolveCompanyMark } = await load("test-client-id");
    const url = resolveCompanyMark("nike.com");
    expect(url).toContain("https://cdn.brandfetch.io/nike.com");
    expect(url).toContain("/w/256");
    expect(url).toContain("/h/80");
    expect(url).toContain("c=test-client-id");
  });

  /**
   * A provider's generic letter tile is exactly the monogram this product refuses to
   * draw, so a brand they do not hold must FAIL rather than substitute one.
   */
  it("asks for a 404 as a PATH segment, which is the form that actually works", async () => {
    const { resolveCompanyMark } = await load("test-client-id");
    const url = resolveCompanyMark("nike.com");
    // Verified against the live CDN: `/fallback/404` returns a real 404 for an unknown
    // brand, while `?fallback=404` is ignored and returns 200 with a placeholder.
    expect(url).toContain("/fallback/404");
    expect(url).not.toContain("fallback=404");
  });

  it("never asks for a lettermark, which is the banned monogram", async () => {
    const { resolveCompanyMark } = await load("test-client-id");
    expect(resolveCompanyMark("nike.com")).not.toContain("lettermark");
  });

  it("returns null with no domain, which is six companies today", async () => {
    const { resolveCompanyMark } = await load("test-client-id");
    expect(resolveCompanyMark(undefined)).toBeNull();
    expect(resolveCompanyMark("")).toBeNull();
  });

  it("an UPLOADED mark wins over the provider", async () => {
    const { resolveCompanyMark } = await load("test-client-id");
    expect(resolveCompanyMark("nike.com", "/logos/companies/nike.png")).toBe(
      "/logos/companies/nike.png",
    );
  });

  /**
   * The pattern already refuses a slash or a query character, but validation lives in a
   * different module — so this asserts the resolver does not depend on that to avoid
   * emitting a second query parameter.
   */
  it("encodes the identifier so it cannot inject a query parameter", async () => {
    const { resolveCompanyMark } = await load("test-client-id");
    const url = resolveCompanyMark("evil.com&c=stolen");
    expect(url).not.toContain("&c=stolen");
    expect(url).toContain("evil.com%26c%3Dstolen");
  });
});
