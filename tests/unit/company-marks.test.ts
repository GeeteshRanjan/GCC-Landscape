import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { COMPANY_MARKS, uploadedCompanyMark } from "../../src/data/company-marks";
import { DEFAULT_LOGOS } from "../../src/data/schema";

/**
 * The committed-mark tier, and the customer strip's files.
 *
 * **`COMPANY_MARKS` is empty today and these checks are written to hold either way.** The
 * table is wired but deliberately unpopulated — see the module for why — so every
 * assertion about its entries iterates whatever is there rather than naming a company.
 * That is the point: the guards have to be live the moment an entry comes back, because
 * every way of getting one wrong is SILENT. A missing file or an unknown id does not throw
 * and does not warn; the card just falls through to the provider or to the name alone,
 * which is the routine case and reports nothing.
 */

const dataset = JSON.parse(readFileSync("data/dataset.json", "utf8")) as {
  companies: { id: string; name: string; domain?: string }[];
  siteContent: { logos: { name: string; src: string }[] };
};

describe("COMPANY_MARKS", () => {
  it("names a company that exists, for every entry", () => {
    const ids = new Set(dataset.companies.map((c) => c.id));
    const unknown = Object.keys(COMPANY_MARKS).filter((id) => !ids.has(id));
    expect(unknown).toEqual([]);
  });

  it("points at a file that is actually served, for every entry", () => {
    const missing = Object.entries(COMPANY_MARKS).filter(
      ([, src]) => !existsSync(`public${src}`),
    );
    expect(missing).toEqual([]);
  });

  /**
   * The path shape is what keeps a peer mark out of the customer strip's picker: the
   * schema's `src` pattern admits `/logos/<file>` and not a subdirectory, so a mark for a
   * company ANSR has never worked with cannot be offered to a band that would imply it had.
   */
  it("stays inside /logos/, either at the top level or under companies/", () => {
    for (const src of Object.values(COMPANY_MARKS)) {
      expect(src).toMatch(/^\/logos\/(companies\/)?[A-Za-z0-9._-]+\.(svg|png)$/);
    }
  });

  /**
   * One file per trademark. A top-level path means the strip already draws this artwork and
   * the point of reusing it is that the two placements cannot drift; a top-level path
   * matching no strip entry would mean a second copy had appeared without the strip losing
   * its own.
   */
  it("reuses the strip's own file wherever the path is top-level", () => {
    const stripFiles = new Set(DEFAULT_LOGOS.map((logo) => logo.src));
    for (const src of Object.values(COMPANY_MARKS)) {
      if (src.startsWith("/logos/companies/")) continue;
      expect(stripFiles.has(src)).toBe(true);
    }
  });

  it("gives no two companies the same mark", () => {
    const files = Object.values(COMPANY_MARKS);
    expect(new Set(files).size).toBe(files.length);
  });

  /**
   * The tier is wired and empty, so the resolver's SECOND tier is what the peer sections
   * draw. Asserted rather than assumed, because "empty" is the whole current behaviour of
   * this module and a stray entry would change both peer sections without touching them.
   */
  it("is empty today, so every company falls through to the provider tier", () => {
    expect(Object.keys(COMPANY_MARKS)).toEqual([]);
    for (const company of dataset.companies.slice(0, 50)) {
      expect(uploadedCompanyMark(company.id)).toBeNull();
    }
    expect(uploadedCompanyMark("not-a-company")).toBeNull();
  });
});

describe("the strip's own files", () => {
  it("are all served", () => {
    const missing = DEFAULT_LOGOS.filter((logo) => !existsSync(`public${logo.src}`));
    expect(missing).toEqual([]);
  });

  /**
   * The dimensions are a RATIO reserved before the file arrives, so a wrong one is a layout
   * shift on the band directly under the form. An SVG states its own box, so the two can be
   * compared; a PNG's is in its header and is left to the four that were measured by hand.
   */
  it("state each vector's real ratio, within a pixel of the file's own box", () => {
    for (const logo of DEFAULT_LOGOS) {
      if (!logo.src.endsWith(".svg")) continue;
      const file = readFileSync(`public${logo.src}`, "utf8");
      const box = file.match(/viewBox="([^"]+)"/);
      expect(box, `${logo.src} has no viewBox`).not.toBeNull();
      const parts = (box?.[1] ?? "").trim().split(/[\s,]+/).map(Number);
      expect(parts, `${logo.src} viewBox`).toHaveLength(4);
      const [, , w, h] = parts as [number, number, number, number];
      const stated = logo.width / logo.height;
      const real = w / h;
      // A whole pixel on the SHORT side is the rounding the stated integers carry.
      expect(Math.abs(stated - real), `${logo.src} ratio`).toBeLessThan(
        real / Math.min(logo.width, logo.height),
      );
    }
  });

  it("matches what the published dataset actually ships", () => {
    expect(dataset.siteContent.logos.map((l) => l.src)).toEqual(
      DEFAULT_LOGOS.map((l) => l.src),
    );
  });
});
