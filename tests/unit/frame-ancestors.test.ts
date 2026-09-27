import { describe, expect, it } from "vitest";

import {
  ANSR_FRAME_ANCESTORS,
  parseFrameAncestorsExtra,
  publicFrameAncestors,
} from "@/lib/frame-ancestors";

/**
 * `GCC_FRAME_ANCESTORS_EXTRA` lands in a security header, so the parser is tested on
 * what it REFUSES as much as on what it keeps. The emitted headers themselves — and
 * that `/admin` stays `'none'` whatever this returns — are asserted against a real
 * build in `tests/browser/1-auth.spec.ts`.
 */
describe("parseFrameAncestorsExtra", () => {
  it("adds nothing when unset or blank", () => {
    expect(parseFrameAncestorsExtra(undefined)).toEqual([]);
    expect(parseFrameAncestorsExtra("")).toEqual([]);
    expect(parseFrameAncestorsExtra("  \n\t ")).toEqual([]);
  });

  it("keeps a space-separated list of bare origins, in order and unchanged", () => {
    expect(
      parseFrameAncestorsExtra(
        "  http://localhost:5173   https://Portfolio.example.com\thttps://*.preview.example ",
      ),
    ).toEqual(["http://localhost:5173", "https://Portfolio.example.com", "https://*.preview.example"]);
  });

  it.each([
    ["a path", "https://example.com/work"],
    ["a trailing slash", "https://example.com/"],
    ["no scheme", "example.com"],
    ["a non-web scheme", "ftp://example.com"],
    ["a CSP keyword", "'self'"],
    ["a bare wildcard", "*"],
    ["a scheme wildcard", "https://*"],
    ["a wildcard over a top-level domain", "https://*.com"],
    ["a directive break", "https://example.com;"],
    ["a query", "https://example.com?x=1"],
    ["a label ending in a hyphen", "https://bad-.example.com"],
  ])("throws on %s", (_label, entry) => {
    expect(() => parseFrameAncestorsExtra(entry)).toThrow(/GCC_FRAME_ANCESTORS_EXTRA/);
  });

  it("throws on one bad entry among good ones, naming it", () => {
    expect(() => parseFrameAncestorsExtra("https://ok.example https://bad.example/path")).toThrow(
      /"https:\/\/bad\.example\/path"/,
    );
  });
});

describe("publicFrameAncestors", () => {
  it("is exactly 'self' plus ansr.com when nothing is configured", () => {
    expect(publicFrameAncestors(undefined)).toBe("'self' https://ansr.com https://*.ansr.com");
  });

  it("appends the extras after ansr.com and never drops ansr.com", () => {
    const list = publicFrameAncestors("http://localhost:5173").split(" ");
    expect(list).toEqual(["'self'", ...ANSR_FRAME_ANCESTORS, "http://localhost:5173"]);
  });
});
