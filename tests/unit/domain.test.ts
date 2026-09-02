import { describe, expect, it } from "vitest";

import { canonicalDomain, DOMAIN_PATTERN } from "../../src/data/normalize";
import { companySchema } from "../../src/data/schema";

/**
 * The domain field's two halves, tested separately because they fail differently.
 *
 * `canonicalDomain` reduces what a human pasted. `DOMAIN_PATTERN` decides whether
 * the result is a domain at all. Keeping them apart is what lets the bulk import
 * report "this row was cleaned" as distinct from "this row is wrong", so these
 * assert that separation rather than only the combined outcome.
 */

const VALID_COMPANY = {
  id: "nike",
  name: "Nike",
  hqCountry: "United States",
  industry: "Retail",
  revenueBand: "> $50 Bn",
  establishedYear: 2019,
  cities: ["Bengaluru"],
  fte: { min: 100, max: 500 },
  fortuneGlobal500: true,
  forbesGlobal2000: true,
};

describe("canonicalDomain", () => {
  it("passes a bare domain through untouched", () => {
    expect(canonicalDomain("nike.com")).toBe("nike.com");
    expect(canonicalDomain("tcs.co.in")).toBe("tcs.co.in");
  });

  it("strips the scheme, www., path, query and fragment", () => {
    for (const input of [
      "https://www.nike.com",
      "http://nike.com/",
      "https://nike.com/en-gb/help",
      "https://www.nike.com/?utm_source=x",
      "https://nike.com#top",
      "//www.nike.com",
    ]) {
      expect(canonicalDomain(input), input).toBe("nike.com");
    }
  });

  it("lowercases, trims and collapses whitespace", () => {
    expect(canonicalDomain("  WWW.Nike.COM  ")).toBe("nike.com");
    expect(canonicalDomain("NIKE .com".replace(" ", ""))).toBe("nike.com");
  });

  it("strips a port, credentials and a trailing root dot", () => {
    expect(canonicalDomain("https://user:pw@nike.com:8443/x")).toBe("nike.com");
    expect(canonicalDomain("nike.com.")).toBe("nike.com");
  });

  it("is idempotent, which is what lets the import re-run over a cleaned file", () => {
    for (const input of [
      "https://www.nike.com/en-gb",
      "nike.com",
      "TCS.co.in.",
      "",
      "not a domain",
    ]) {
      const once = canonicalDomain(input);
      expect(canonicalDomain(once), input).toBe(once);
    }
  });

  it("returns empty for nothing at all", () => {
    expect(canonicalDomain("")).toBe("");
    expect(canonicalDomain("   ")).toBe("");
    expect(canonicalDomain(null)).toBe("");
    expect(canonicalDomain(undefined)).toBe("");
  });

  it("does NOT validate — an unusable input comes back for the pattern to reject", () => {
    // This is the contract the import script's two-way reporting depends on.
    const cleaned = canonicalDomain("Wells Fargo");
    expect(cleaned).toBe("wells fargo");
    expect(DOMAIN_PATTERN.test(cleaned)).toBe(false);
  });
});

describe("DOMAIN_PATTERN", () => {
  it("accepts real registrable domains, including multi-label and punycode", () => {
    for (const value of [
      "nike.com",
      "tcs.co.in",
      "e-bay.com",
      "a1.io",
      "sub.domain.example.org",
      "xn--80ak6aa92e.com",
    ]) {
      expect(DOMAIN_PATTERN.test(value), value).toBe(true);
    }
  });

  it("refuses a single label, a numeric TLD, and a leading or trailing hyphen", () => {
    for (const value of [
      "nike",
      "nike.",
      ".com",
      "nike.c",
      "nike.123",
      "-nike.com",
      "nike-.com",
      "nike..com",
      "wells fargo",
      "someone@nike.com",
      "https://nike.com",
      "NIKE.COM",
    ]) {
      expect(DOMAIN_PATTERN.test(value), value).toBe(false);
    }
  });
});

describe("companySchema.domain", () => {
  it("is optional, and a company without one stays without the key", () => {
    const parsed = companySchema.parse(VALID_COMPANY);
    expect("domain" in parsed && parsed.domain !== undefined).toBe(false);
  });

  it("accepts a valid domain and the empty string", () => {
    expect(companySchema.parse({ ...VALID_COMPANY, domain: "nike.com" }).domain).toBe(
      "nike.com",
    );
    expect(companySchema.safeParse({ ...VALID_COMPANY, domain: "" }).success).toBe(true);
  });

  it("refuses anything the pattern refuses, so the form and the import agree", () => {
    for (const domain of [
      "https://nike.com",
      "www.nike.com/x",
      "nike",
      "NIKE.com",
      "wells fargo",
    ]) {
      expect(
        companySchema.safeParse({ ...VALID_COMPANY, domain }).success,
        domain,
      ).toBe(false);
    }
  });

  /**
   * The reason the field is `.optional()` rather than `.default("")`: a defaulted
   * string would be written back onto all 1,834 companies, and `diff.ts` compares
   * through `JSON.stringify`, where `undefined` and `""` are not equal.
   */
  it("does not manufacture a key on parse", () => {
    const parsed = companySchema.parse(VALID_COMPANY);
    expect(JSON.stringify(parsed)).not.toContain('"domain"');
  });
});
