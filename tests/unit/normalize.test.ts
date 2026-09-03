import { describe, expect, it } from "vitest";

import { readFileSync } from "node:fs";
import path from "node:path";
import {
  CTA_URL_MAX_LENGTH,
  SEED_REVENUE_BAND_ORDER,
  canonicalCompanyName,
  canonicalIndustry,
  cleanText,
  isCtaUrl,
  parseCities,
  parseFteRange,
  parseYear,
  parseYesNo,
  slugify,
  uniqueSlug,
} from "@/data/normalize";
import { TIER1_CITIES, fteDisplay, fteMidpoint, hasTier2Presence, resolveCtaHref, sumProfessionals } from "@/data/derive";
import {
  DEFAULT_CLOSE_COPY,
  closeCopySchema,
  parseDataset,
  type Company,
} from "@/data/schema";

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

/**
 * The two alias tables, and the constraint that makes them safe.
 *
 * Both are applied in ONE place — `readRows` in the importer — so a single spelling
 * reaches the company record, the taxonomy, the slug and the business-type map's
 * `industry||name` keys. Fixing a name further downstream instead is the bug this
 * arrangement exists to prevent: the map folds case but not letters, so a corrected
 * spelling that the map still holds in its old form silently drops the company's
 * business type, and untagged is a safe state and therefore an invisible one.
 */
describe("canonicalIndustry", () => {
  it("expands the one abbreviation the sheet supplies", () => {
    expect(canonicalIndustry("CPG")).toBe("Consumer Packaged Goods");
  });

  it("is idempotent, so calling it twice is safe", () => {
    expect(canonicalIndustry(canonicalIndustry("CPG"))).toBe("Consumer Packaged Goods");
  });

  it("passes an unlisted industry through, cleaned", () => {
    expect(canonicalIndustry("  Software &  Internet ")).toBe("Software & Internet");
  });
});

describe("canonicalCompanyName", () => {
  /** Full capitals the company does not use. */
  it.each([
    ["DR. MARTENS", "Dr. Martens"],
    ["KDDI CORPORATION", "KDDI Corporation"],
    ["OIA GLOBAL", "OIA Global"],
    ["ADVANZ PHARMA", "Advanz Pharma"],
    ["GRUPO ANTOLIN", "Grupo Antolin"],
  ])("un-shouts %s", (before, after) => {
    expect(canonicalCompanyName(before)).toBe(after);
  });

  /**
   * The other eighteen all-capital names are correct and must survive untouched.
   * This is the assertion that would fail if somebody replaced the table with a
   * title-case rule, which was the obvious move and damages eighteen marks to repair
   * five.
   */
  it.each(["SABIC", "AECOM", "IQVIA", "ABBYY", "GEODIS", "MULTIVAC", "STRATACACHE", "IDEMIA"])(
    "leaves %s alone",
    (name) => {
      expect(canonicalCompanyName(name)).toBe(name);
    },
  );

  /** Lowercase openings, three wrong and the rest deliberate brand styling. */
  it.each([
    ["eurofins", "Eurofins"],
    ["ilantus", "Ilantus"],
    ["o9 solutions", "o9 Solutions"],
  ])("capitalises %s", (before, after) => {
    expect(canonicalCompanyName(before)).toBe(after);
  });

  it.each(["eBay", "iSolved", "pSemi Corporation", "smartShift Technologies", "d-Matrix", "ebm-papst Group", "lastminute.com", "blueBriX"])(
    "leaves the brand styling of %s alone",
    (name) => {
      expect(canonicalCompanyName(name)).toBe(name);
    },
  );

  it("capitalises an initialism after a hyphen", () => {
    expect(canonicalCompanyName("Sanmina-sci")).toBe("Sanmina-SCI");
    expect(canonicalCompanyName("Read-ink")).toBe("Read-Ink");
    // And not a name whose second half is a word rather than an initialism.
    expect(canonicalCompanyName("N-able")).toBe("N-able");
    expect(canonicalCompanyName("e-con Systems")).toBe("e-con Systems");
  });

  /**
   * The only spaced dash among 38 hyphenated names, moved to the parenthetical form
   * the source already uses twenty times for the same job. The slug is unchanged
   * either way, which is what makes it a display fix rather than an identity change.
   */
  it("writes a gloss in parentheses rather than after a spaced dash", () => {
    expect(canonicalCompanyName("EA - Electronic Arts")).toBe("EA (Electronic Arts)");
    expect(slugify(canonicalCompanyName("EA - Electronic Arts"))).toBe("ea-electronic-arts");
  });

  it("fixes a misspelled brand", () => {
    expect(canonicalCompanyName("Victoria Secret")).toBe("Victoria's Secret");
  });

  /**
   * Two rows carried the same company under two spellings, which hid a duplicate
   * rather than recording one. They stay two companies — merging changes the count
   * and every profile figure, and whether they are one entity is ANSR's call — but
   * `uniqueSlug` now suffixes a visible collision instead of a hidden one.
   */
  it("gives the two IQ-EQ rows one spelling and two slugs", () => {
    expect(canonicalCompanyName("Iq-eq")).toBe("IQ-EQ");
    const taken = new Set<string>();
    expect(uniqueSlug("IQ-EQ", taken)).toBe("iq-eq");
    expect(uniqueSlug("IQ-EQ", taken)).toBe("iq-eq-2");
  });

  /**
   * A legal-entity suffix is left exactly as supplied. Only 28 of 1,834 names carry
   * one, so stripping them would look like tidying and would be rewriting a legal
   * name on a judgement about house style.
   */
  it.each(["Azul Systems, Inc.", "Panamax Inc.", "PVH Corp.", "ICON Plc.", "KBR, Inc."])(
    "does not strip the suffix from %s",
    (name) => {
      expect(canonicalCompanyName(name)).toBe(name);
    },
  );

  it("is idempotent", () => {
    for (const name of ["DR. MARTENS", "eurofins", "Victoria Secret", "EA - Electronic Arts"]) {
      const once = canonicalCompanyName(name);
      expect(canonicalCompanyName(once)).toBe(once);
    }
  });
});

/**
 * The published dataset carries the corrections, and every corrected company still
 * carries its business type.
 *
 * This is the assertion that catches the failure mode the table is designed around: a
 * name changed here but not in `scripts/business-type-map.ts`, where the key is
 * `industry||name`. The result would be an untagged company — a safe state, invisible
 * in the UI, and a peer set quietly missing a member.
 */
describe("the corrections in the published dataset", () => {
  const dataset = parseDataset(
    JSON.parse(
      readFileSync(path.join(process.cwd(), "data", "dataset.json"), "utf8"),
    ),
  );
  const byName = new Map(dataset.companies.map((c) => [c.name, c]));

  it.each([
    "Dr. Martens",
    "Grupo Antolin",
    "KDDI Corporation",
    "OIA Global",
    "Advanz Pharma",
    "Eurofins",
    "Ilantus",
    "o9 Solutions",
    "Sanmina-SCI",
    "Read-Ink",
    "IQ-EQ",
    "EA (Electronic Arts)",
    "Victoria's Secret",
  ])("%s is present and still tagged", (name) => {
    const company = byName.get(name);
    expect(company, name).toBeDefined();
    expect(company!.businessTypes.length, name).toBeGreaterThan(0);
  });

  it("holds none of the old spellings", () => {
    for (const stale of [
      "DR. MARTENS",
      "eurofins",
      "Sanmina-sci",
      "Iq-eq",
      "EA - Electronic Arts",
      "Victoria Secret",
    ]) {
      expect(byName.has(stale), stale).toBe(false);
    }
  });

  /**
   * No name arrives with the whitespace defects the audit found — a non-breaking space
   * inside a value, or a double space. `cleanText` handles both, and this asserts it
   * ran on every row rather than on the ones somebody remembered.
   */
  it("has no name carrying stray whitespace", () => {
    for (const company of dataset.companies) {
      expect(company.name, company.id).toBe(company.name.replace(/\s+/g, " ").trim());
    }
  });
});

/* ==========================================================================
   The close's outbound link.

   Three things are pinned here and each has a different failure mode. `isCtaUrl` guards
   an `href` on a page served from ansr.com, so its scheme rule is a security boundary
   rather than validation. The schema decides whether blank is legal, and blank is the
   value every deployment starts on — so if it stopped being legal, the shipped default
   would be an unpublishable dataset. And `resolveCtaHref` is the precedence between the
   three sources; getting it backwards would make an admin's tagging silently unreachable
   on any deployment that has the environment variable set.
   ========================================================================== */

describe("a CTA link as a validator", () => {
  it("accepts a tagged link exactly as pasted, query string and all", () => {
    // The whole reason the field exists. If anything reduced this, the attribution the
    // two fields were added to carry would be destroyed on the way in.
    const tagged =
      "https://www.ansr.com/gcc-report?utm_source=atlas&utm_medium=embed&utm_campaign=peer-landscape";
    expect(isCtaUrl(tagged)).toBe(true);
    expect(closeCopySchema.parse({
      ...DEFAULT_CLOSE_COPY,
      ctaHrefPeers: tagged,
    }).ctaHrefPeers).toBe(tagged);
  });

  it("refuses every scheme but http and https", () => {
    /* The boundary, not a preference. This value lands in an `href` on ANSR's own
       domain, so an arbitrary scheme here would make the field a way to put script in
       the one outbound link on both result screens. */
    for (const bad of [
      "javascript:alert(1)",
      "JavaScript:alert(1)",
      "data:text/html,<script>alert(1)</script>",
      "vbscript:msgbox(1)",
      "file:///etc/passwd",
    ]) {
      expect(isCtaUrl(bad), bad).toBe(false);
      expect(closeCopySchema.safeParse({
        ...DEFAULT_CLOSE_COPY,
        ctaHrefPeers: bad,
      }).success, bad).toBe(false);
    }
    expect(isCtaUrl("http://ansr.com/x")).toBe(true);
  });

  it("refuses a value that is not an absolute link at all", () => {
    // A scheme-less paste is refused rather than repaired: prepending `https://` would be
    // a transform, and the field's whole contract is that what is typed is what is stored.
    for (const bad of ["ansr.com", "/gcc-report", "see the website", "www.ansr.com"]) {
      expect(isCtaUrl(bad), bad).toBe(false);
    }
  });

  it("caps the length, and the cap leaves room for full UTM tagging", () => {
    expect(isCtaUrl(`https://a.com/${"x".repeat(CTA_URL_MAX_LENGTH)}`)).toBe(false);
    // A realistic worst case: five spelled-out UTM parameters plus a click id.
    const heavy =
      "https://www.ansr.com/global-capability-centre-benchmark-report" +
      "?utm_source=ansr-atlas&utm_medium=embedded-tool&utm_campaign=india-gcc-landscape-2026" +
      "&utm_content=function-metrics-closing-band&utm_term=cio-coo-benchmark&gclid=abc123def456";
    expect(heavy.length).toBeLessThan(CTA_URL_MAX_LENGTH);
    expect(isCtaUrl(heavy)).toBe(true);
  });

  it("treats blank as legal in the schema and as not a link in the predicate", () => {
    /* The split that lets the field mean "use whatever is configured". `isCtaUrl` answers
       only whether a non-empty value is a link; legality of an empty one is the schema's
       call, and it has to stay legal because the shipped default is empty. */
    expect(isCtaUrl("")).toBe(false);
    expect(isCtaUrl("   ")).toBe(false);
    expect(DEFAULT_CLOSE_COPY.ctaHrefPeers).toBe("");
    expect(DEFAULT_CLOSE_COPY.ctaHrefFunctions).toBe("");
    expect(closeCopySchema.safeParse(DEFAULT_CLOSE_COPY).success).toBe(true);
  });

  it("fills both links when a dataset written before them is read", () => {
    // The `metrics` precedent: a required key would have made every older dataset a
    // broken read. Parsing without them must produce the blank default, not an error.
    const parsed = closeCopySchema.parse({
      body: DEFAULT_CLOSE_COPY.body,
      ctaLabel: DEFAULT_CLOSE_COPY.ctaLabel,
    });
    expect(parsed.ctaHrefPeers).toBe("");
    expect(parsed.ctaHrefFunctions).toBe("");
  });
});

describe("resolving which link the close points at", () => {
  const close = (peers: string, functions: string) => ({
    ctaHrefPeers: peers,
    ctaHrefFunctions: functions,
  });

  it("gives each screen its own link, so the two presses are distinguishable", () => {
    // The reason there are two fields rather than one. A shared link makes a conversion
    // off the peer landscape and one off the function metrics the same analytics event.
    const set = close("https://a.com/?utm_content=peers", "https://a.com/?utm_content=fn");
    expect(resolveCtaHref(set, "peers", "https://fallback.test/")).toBe(
      "https://a.com/?utm_content=peers",
    );
    expect(resolveCtaHref(set, "functions", "https://fallback.test/")).toBe(
      "https://a.com/?utm_content=fn",
    );
  });

  it("falls back per screen, so tagging one screen does not untag the other", () => {
    /* The case an all-or-nothing rule would get wrong: an admin tags the peer landscape
       first and leaves the other for later. The untagged screen keeps the configured
       link rather than losing its link entirely. */
    const half = close("https://a.com/?utm_content=peers", "");
    expect(resolveCtaHref(half, "functions", "https://fallback.test/")).toBe(
      "https://fallback.test/",
    );
    expect(resolveCtaHref(half, "peers", "https://fallback.test/")).toBe(
      "https://a.com/?utm_content=peers",
    );
  });

  it("reads the shipped default as no override at all", () => {
    // Today's behaviour has to survive the addition unchanged: with the default dataset,
    // both screens resolve to whatever the deployment configured.
    for (const screen of ["peers", "functions"] as const) {
      expect(resolveCtaHref(DEFAULT_CLOSE_COPY, screen, "https://www.ansr.com/")).toBe(
        "https://www.ansr.com/",
      );
    }
  });

  it("never hands the band an empty href", () => {
    /* A blank `href` resolves to the current page, which inside the iframe means the
       button reloads the tool — a dead primary action that looks like it worked. */
    for (const screen of ["peers", "functions"] as const) {
      expect(resolveCtaHref(close("", ""), screen, "https://www.ansr.com/")).not.toBe("");
      expect(resolveCtaHref(close("   ", "   "), screen, "https://www.ansr.com/")).toBe(
        "https://www.ansr.com/",
      );
    }
  });
});
