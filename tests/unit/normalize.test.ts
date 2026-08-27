import { describe, expect, it } from "vitest";

import {
  SEED_REVENUE_BAND_ORDER,
  cleanText,
  parseCities,
  parseFteRange,
  parseYear,
  parseYesNo,
  slugify,
  uniqueSlug,
} from "@/data/normalize";
import { TIER1_CITIES, fteDisplay, fteMidpoint, hasTier2Presence, sumProfessionals } from "@/data/derive";
import type { Company } from "@/data/schema";

/**
 * Every function here exists because of a measured defect in the source
 * spreadsheet, listed in docs/data-audit.md. The tests are written against those
 * specific defects rather than against generic input, because these primitives
 * are shared by the seed importer and the future admin bulk-append: a change that
 * quietly alters parsing would move 1834 rows at once.
 */

describe("cleanText", () => {
  it("collapses the stray double spaces the source carries", () => {
    expect(cleanText("Acme  Corp")).toBe("Acme Corp");
    expect(cleanText("  Acme \n Corp  ")).toBe("Acme Corp");
    expect(cleanText("\tAcme\t\tCorp\t")).toBe("Acme Corp");
  });

  it("survives null and undefined without producing the string 'null'", () => {
    expect(cleanText(null)).toBe("");
    expect(cleanText(undefined)).toBe("");
    expect(cleanText("")).toBe("");
  });
});

describe("parseYear", () => {
  it("normalises the float form, which the source stores alongside the integer", () => {
    // `2022` and `2022.0` are distinct values in the spreadsheet, which breaks
    // any grouping by year.
    expect(parseYear("2022.0")).toBe(2022);
    expect(parseYear(2022.0)).toBe(2022);
    expect(parseYear("2022")).toBe(2022);
    expect(parseYear(2022)).toBe(2022);
  });

  it("rejects out-of-range and unparseable values rather than guessing", () => {
    for (const bad of ["", "  ", "nineteen ninety", 1899, 2101, null, undefined, "20x2"]) {
      expect(parseYear(bad), String(bad)).toBeNull();
    }
  });
});

describe("parseYesNo", () => {
  it("accepts the forms the index-flag columns actually use", () => {
    for (const yes of ["Yes", "yes", "YES", "Y", "true", " yes "]) {
      expect(parseYesNo(yes), yes).toBe(true);
    }
    for (const no of ["No", "no", "N", "false", " no "]) {
      expect(parseYesNo(no), no).toBe(false);
    }
  });

  it("returns null on anything else, so the importer can report the row", () => {
    for (const bad of ["", "maybe", "1", "0", null, undefined]) {
      expect(parseYesNo(bad), String(bad)).toBeNull();
    }
  });
});

describe("parseCities", () => {
  it("splits the comma-joined cell and preserves source order", () => {
    expect(parseCities("Bengaluru, Hyderabad, Pune")).toEqual([
      "Bengaluru",
      "Hyderabad",
      "Pune",
    ]);
  });

  it("drops the within-row duplicate two source rows contain", () => {
    // Two rows list NCR twice in one cell, which is why the audit's raw NCR
    // count of 334 becomes 332 after de-duplication.
    expect(parseCities("NCR, Bengaluru, NCR")).toEqual(["NCR", "Bengaluru"]);
  });

  it("tolerates ragged separators and empty segments", () => {
    expect(parseCities("Bengaluru,,Pune,")).toEqual(["Bengaluru", "Pune"]);
    expect(parseCities(" Bengaluru ,  Pune ")).toEqual(["Bengaluru", "Pune"]);
    expect(parseCities("")).toEqual([]);
    expect(parseCities(null)).toEqual([]);
  });
});

describe("parseFteRange", () => {
  it("treats both dash variants identically", () => {
    // The one real defect in this column: `0-50` and `0–50` are stored as
    // distinct strings. Collapsing them is why 130 distinct strings become 128
    // distinct ranges — that is the fix working, not data loss.
    const hyphen = parseFteRange("0-50");
    const enDash = parseFteRange("0–50");
    const emDash = parseFteRange("0—50");

    expect(hyphen).toEqual({ min: 0, max: 50 });
    expect(enDash).toEqual(hyphen);
    expect(emDash).toEqual(hyphen);
  });

  it("strips thousands separators", () => {
    expect(parseFteRange("1,000-5,000")).toEqual({ min: 1000, max: 5000 });
  });

  it("clamps open-ended forms to the stated bound rather than inventing a ceiling", () => {
    expect(parseFteRange("100+")).toEqual({ min: 100, max: 100 });
    expect(parseFteRange("<50")).toEqual({ min: 0, max: 50 });
    expect(parseFteRange("≤50")).toEqual({ min: 0, max: 50 });
    expect(parseFteRange(">500")).toEqual({ min: 500, max: 500 });
  });

  it("accepts a bare number as a single-point band", () => {
    expect(parseFteRange("250")).toEqual({ min: 250, max: 250 });
  });

  it("refuses an inverted range and unparseable junk", () => {
    expect(parseFteRange("500-100")).toBeNull();
    for (const bad of ["", "  ", "many", "10-20-30", "a-b", null, undefined]) {
      expect(parseFteRange(bad), String(bad)).toBeNull();
    }
  });
});

describe("slugify and uniqueSlug", () => {
  it("produces ids that satisfy the schema's slug rule", () => {
    expect(slugify("3M")).toBe("3m");
    expect(slugify("Procter & Gamble")).toBe("procter-and-gamble");
    expect(slugify("  Spaced   Out  ")).toBe("spaced-out");
    expect(slugify("Nestlé")).toBe("nestle");
    expect(slugify("A.B.C. Corp.")).toBe("a-b-c-corp");
    expect(slugify("!!!")).toBe("company");
  });

  it("keeps genuinely duplicate names as separate rows", () => {
    // The source has duplicate company names, so the name cannot be the key —
    // and two rows may be two real entities, so they must not be merged.
    const taken = new Set<string>();
    expect(uniqueSlug("Astera Labs", taken)).toBe("astera-labs");
    expect(uniqueSlug("Astera Labs", taken)).toBe("astera-labs-2");
    expect(uniqueSlug("Astera Labs", taken)).toBe("astera-labs-3");
  });
});

describe("SEED_REVENUE_BAND_ORDER", () => {
  it("is ascending, which alphabetical sorting would not be", () => {
    const bands = [...SEED_REVENUE_BAND_ORDER];
    expect(bands[0]).toBe("< $100 Mn");
    expect(bands.at(-1)).toBe("Above $20 Bn");
    // The concrete reason the order cannot be computed from the labels.
    expect([...bands].sort()).not.toEqual(bands);
    expect([...bands].sort().indexOf("$10 Bn – $20 Bn")).toBe(1);
  });

  it("has the seven bands the data actually contains", () => {
    expect(SEED_REVENUE_BAND_ORDER).toHaveLength(7);
    expect(new Set(SEED_REVENUE_BAND_ORDER).size).toBe(7);
  });
});

describe("derived fields", () => {
  const withCities = (cities: string[]) => ({ cities }) as Pick<Company, "cities">;

  it("derives tier-2 presence from the city list", () => {
    expect(hasTier2Presence(withCities(["Bengaluru"]))).toBe(false);
    expect(hasTier2Presence(withCities(["Bengaluru", "Mangaluru"]))).toBe(true);
    expect(hasTier2Presence(withCities(["Mangaluru"]))).toBe(true);
  });

  it("counts Kolkata as tier-1 and Ahmedabad as tier-2, per the measurement", () => {
    // Chosen by testing candidate sets against the source's own flag, not by
    // convention: six majors plus Kolkata agreed on 1822 of 1834 rows.
    expect(TIER1_CITIES.has("Kolkata")).toBe(true);
    expect(TIER1_CITIES.has("Ahmedabad")).toBe(false);
  });

  it("renders headcount as a band, never a point figure", () => {
    expect(fteDisplay({ min: 100, max: 500 })).toBe("100\u2013500");
    expect(fteDisplay({ min: 100, max: 100 })).toBe("100+");
    expect(fteDisplay({ min: 0, max: 50 })).toBe("under 50");
  });

  it("sums band midpoints for aggregates", () => {
    expect(fteMidpoint({ min: 100, max: 500 })).toBe(300);
    const companies = [
      { fte: { min: 0, max: 100 } },
      { fte: { min: 100, max: 300 } },
    ] as Company[];
    expect(sumProfessionals(companies)).toBe(250);
  });
});
