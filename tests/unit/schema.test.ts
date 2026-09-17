import { describe, expect, it } from "vitest";

import {
  DATASET_VERSION,
  companySchema,
  datasetSchema,
  formatIssues,
  type Company,
  type Dataset,
  DEFAULT_SITE_CONTENT,
} from "@/data/schema";

/**
 * The schema is the publish gate. Every case here is something admin can produce
 * through the UI and must be stopped before it reaches a commit — most
 * importantly the referential-integrity ones, where a company points at a
 * taxonomy value the public dropdowns will not offer. That row would be
 * unreachable by any visitor, so it is an error rather than a warning.
 */

function company(overrides: Partial<Company> = {}): Company {
  return {
    id: "acme",
    name: "Acme",
    hqCountry: "USA",
    industry: "BFSI",
    revenueBand: "$1 Bn – $5 Bn",
    establishedYear: 2015,
    cities: ["Bengaluru"],
    fte: { min: 100, max: 500 },
    fortuneGlobal500: false,
    forbesGlobal2000: false,
    businessTypes: [],
    ...overrides,
  };
}

function dataset(overrides: Partial<Dataset> = {}): Dataset {
  return {
    version: DATASET_VERSION,
    generatedAt: "2026-08-01T00:00:00.000Z",
    source: "seed.xlsx",
    taxonomy: {
      industries: ["BFSI"],
      revenueBands: ["$1 Bn – $5 Bn"],
      cities: ["Bengaluru", "Pune"],
      hqCountries: ["USA"],
      pinnedIndustries: [],
      cityCoordinates: {},
    },
    companies: [company()],
    businessTypes: [],
    peerOverrides: [],
    metrics: [],
    siteContent: DEFAULT_SITE_CONTENT,
    ...overrides,
  };
}

/** Collects the dotted paths zod complained about. */
function issuePaths(input: unknown): string[] {
  const result = datasetSchema.safeParse(input);
  if (result.success) return [];
  return result.error.issues.map((issue) => issue.path.join("."));
}

describe("companySchema", () => {
  it("accepts a well-formed row", () => {
    expect(companySchema.safeParse(company()).success).toBe(true);
  });

  it("requires the id to be a lowercase slug", () => {
    for (const id of ["Acme", "acme_corp", "acme corp", "-acme", "acme-", "acme--corp", ""]) {
      expect(companySchema.safeParse(company({ id })).success, id).toBe(false);
    }
    for (const id of ["acme", "acme-corp", "3m", "acme-corp-2"]) {
      expect(companySchema.safeParse(company({ id })).success, id).toBe(true);
    }
  });

  it("rejects blank or whitespace-only text", () => {
    expect(companySchema.safeParse(company({ name: "" })).success).toBe(false);
    expect(companySchema.safeParse(company({ name: "   " })).success).toBe(false);
    expect(companySchema.safeParse(company({ industry: "" })).success).toBe(false);
  });

  it("bounds the establishment year and requires an integer", () => {
    for (const year of [1899, 2101, 2015.5, Number.NaN]) {
      expect(companySchema.safeParse(company({ establishedYear: year })).success, String(year)).toBe(
        false,
      );
    }
    expect(companySchema.safeParse(company({ establishedYear: 1900 })).success).toBe(true);
    expect(companySchema.safeParse(company({ establishedYear: 2100 })).success).toBe(true);
  });

  it("requires at least one city", () => {
    expect(companySchema.safeParse(company({ cities: [] })).success).toBe(false);
    expect(companySchema.safeParse(company({ cities: [""] })).success).toBe(false);
  });

  it("requires the FTE range to be a closed, non-negative pair", () => {
    expect(companySchema.safeParse(company({ fte: { min: 500, max: 100 } })).success).toBe(false);
    expect(companySchema.safeParse(company({ fte: { min: -1, max: 100 } })).success).toBe(false);
    expect(companySchema.safeParse(company({ fte: { min: 1.5, max: 100 } })).success).toBe(false);
    // A single-point band is legal: the source carries `100+` style values.
    expect(companySchema.safeParse(company({ fte: { min: 100, max: 100 } })).success).toBe(true);
  });

  it("rejects a stored field that should be derived", () => {
    const withDerived = { ...company(), locationCount: 1 };
    const parsed = companySchema.safeParse(withDerived);
    // zod strips unknown keys rather than failing, which is what we want — but
    // the stripped result must not carry the derived field onward.
    expect(parsed.success).toBe(true);
    expect(parsed.success && "locationCount" in parsed.data).toBe(false);
  });
});

describe("datasetSchema — referential integrity", () => {
  it("accepts a dataset whose companies all reference known taxonomy values", () => {
    expect(datasetSchema.safeParse(dataset()).success).toBe(true);
  });

  it("rejects an industry that is not in the taxonomy", () => {
    const paths = issuePaths(dataset({ companies: [company({ industry: "Mining" })] }));
    expect(paths).toContain("companies.0.industry");
  });

  it("rejects a revenue band that is not in the taxonomy", () => {
    const paths = issuePaths(dataset({ companies: [company({ revenueBand: "$7 Bn" })] }));
    expect(paths).toContain("companies.0.revenueBand");
  });

  it("rejects an HQ country that is not in the taxonomy", () => {
    const paths = issuePaths(dataset({ companies: [company({ hqCountry: "Narnia" })] }));
    expect(paths).toContain("companies.0.hqCountry");
  });

  it("rejects a city that is not in the taxonomy, naming which one", () => {
    const paths = issuePaths(
      dataset({ companies: [company({ cities: ["Bengaluru", "Atlantis"] })] }),
    );
    expect(paths).toContain("companies.0.cities.1");
  });

  /**
   * The exact failure the taxonomy editor's delete guard exists to prevent: a
   * value removed from a list while rows still point at it.
   */
  it("rejects removing a taxonomy value that is still in use", () => {
    const broken = dataset();
    broken.taxonomy = { ...broken.taxonomy, industries: ["Retail"] };
    expect(issuePaths(broken)).toContain("companies.0.industry");
  });

  it("allows a taxonomy value that no company uses yet", () => {
    const spare = dataset();
    spare.taxonomy = { ...spare.taxonomy, cities: ["Bengaluru", "Pune", "Kochi"] };
    // Additive is the whole point: a value added in admin reaches the public
    // dropdowns on the next publish before any row uses it.
    expect(datasetSchema.safeParse(spare).success).toBe(true);
  });
});

describe("datasetSchema — structure", () => {
  it("rejects duplicate company ids", () => {
    const paths = issuePaths(
      dataset({ companies: [company(), company({ name: "Acme Two" })] }),
    );
    expect(paths).toContain("companies.1.id");
  });

  it("rejects duplicates inside a taxonomy list", () => {
    const dupes = dataset();
    dupes.taxonomy = { ...dupes.taxonomy, cities: ["Bengaluru", "Bengaluru", "Pune"] };
    expect(issuePaths(dupes)).toContain("taxonomy.cities");
  });

  it("rejects an empty company list or an empty taxonomy list", () => {
    expect(datasetSchema.safeParse(dataset({ companies: [] })).success).toBe(false);
    const empty = dataset();
    empty.taxonomy = { ...empty.taxonomy, industries: [] };
    expect(datasetSchema.safeParse(empty).success).toBe(false);
  });

  it("requires generatedAt to be a real ISO datetime", () => {
    expect(datasetSchema.safeParse(dataset({ generatedAt: "2026-08-01" })).success).toBe(false);
    expect(datasetSchema.safeParse(dataset({ generatedAt: "not a date" })).success).toBe(false);
  });

  it("requires a positive integer version and a non-empty source", () => {
    expect(datasetSchema.safeParse(dataset({ version: 0 })).success).toBe(false);
    expect(datasetSchema.safeParse(dataset({ source: "" })).success).toBe(false);
  });
});

describe("formatIssues", () => {
  it("names the offending row so an admin can act on it", () => {
    const result = datasetSchema.safeParse(
      dataset({ companies: [company({ establishedYear: 1200 })] }),
    );
    expect(result.success).toBe(false);
    if (result.success) return;

    const text = formatIssues(result.error);
    expect(text).toContain("companies.0.establishedYear");
  });

  it("truncates a long list rather than printing thousands of lines", () => {
    const many = dataset({
      companies: Array.from({ length: 60 }, (_, i) =>
        company({ id: `row-${i}`, industry: "Unknown Industry" }),
      ),
    });
    const result = datasetSchema.safeParse(many);
    expect(result.success).toBe(false);
    if (result.success) return;

    const text = formatIssues(result.error, 10);
    expect(text.split("\n")).toHaveLength(11);
    expect(text).toContain("and 50 more");
  });
});
