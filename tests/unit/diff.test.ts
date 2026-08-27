import { describe, expect, it } from "vitest";

import {
  TAXONOMY_LABELS,
  diffDatasets,
  formatFieldValue,
  renderDiffText,
} from "@/data/diff";
import { DATASET_VERSION, type Company, type Dataset } from "@/data/schema";

/**
 * The diff is the last thing standing between an admin and a bad commit, so what
 * matters is that it never reports "no changes" for a change that is real.
 *
 * The revenue-band reorder case is the one worth reading. Reordering that array
 * adds and removes nothing, so a set-difference diff calls it empty — but it
 * changes which band counts as adjacent, and therefore who shows up as a peer.
 * Publishing that as a no-op would silently alter the product.
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
    ...overrides,
  };
}

function dataset(overrides: Partial<Dataset> = {}): Dataset {
  return {
    version: DATASET_VERSION,
    generatedAt: "2026-08-01T00:00:00.000Z",
    source: "seed.xlsx",
    taxonomy: {
      industries: ["BFSI", "Retail"],
      revenueBands: ["< $100 Mn", "$1 Bn – $5 Bn", "Above $20 Bn"],
      cities: ["Bengaluru", "Pune"],
      hqCountries: ["USA", "Japan"],
    },
    companies: [company()],
    ...overrides,
  };
}

describe("diffDatasets — no change", () => {
  it("reports an empty diff when nothing moved", () => {
    const diff = diffDatasets(dataset(), dataset());

    expect(diff.isEmpty).toBe(true);
    expect(diff.counts).toEqual({ added: 0, removed: 0, changed: 0, taxonomy: 0 });
  });

  it("does not treat a new publish timestamp as a change", () => {
    const diff = diffDatasets(
      dataset({ generatedAt: "2026-09-01T00:00:00.000Z" }),
      dataset(),
    );

    // The server stamps `generatedAt` on every publish, so counting it as a
    // change would make every diff non-empty and the no-op guard useless.
    expect(diff.generatedAtChanged).toBe(true);
    expect(diff.isEmpty).toBe(true);
  });

  it("is insensitive to the order companies happen to sit in", () => {
    const a = company({ id: "a", name: "A" });
    const b = company({ id: "b", name: "B" });
    const diff = diffDatasets(
      dataset({ companies: [b, a] }),
      dataset({ companies: [a, b] }),
    );
    expect(diff.isEmpty).toBe(true);
  });
});

describe("diffDatasets — companies", () => {
  it("reports an addition", () => {
    const diff = diffDatasets(
      dataset({ companies: [company(), company({ id: "globex", name: "Globex" })] }),
      dataset(),
    );

    expect(diff.counts.added).toBe(1);
    expect(diff.added).toEqual([{ id: "globex", name: "Globex" }]);
    expect(diff.isEmpty).toBe(false);
  });

  it("reports a removal", () => {
    const diff = diffDatasets(dataset({ companies: [] as unknown as Company[] }), dataset());
    expect(diff.counts.removed).toBe(1);
    expect(diff.removed).toEqual([{ id: "acme", name: "Acme" }]);
  });

  it("reports a field change with both values", () => {
    const diff = diffDatasets(
      dataset({ companies: [company({ establishedYear: 2013 })] }),
      dataset(),
    );

    expect(diff.counts.changed).toBe(1);
    expect(diff.changed[0]).toMatchObject({
      id: "acme",
      changes: [{ field: "establishedYear", before: 2015, after: 2013 }],
    });
  });

  it("catches a change in every editable field", () => {
    const edits: ReadonlyArray<Partial<Company>> = [
      { name: "Acme Renamed" },
      { hqCountry: "Japan" },
      { industry: "Retail" },
      { revenueBand: "Above $20 Bn" },
      { establishedYear: 2000 },
      { cities: ["Pune"] },
      { fte: { min: 100, max: 900 } },
      { fortuneGlobal500: true },
      { forbesGlobal2000: true },
    ];

    for (const edit of edits) {
      const diff = diffDatasets(
        dataset({ companies: [company(edit)] }),
        dataset(),
      );
      const field = Object.keys(edit)[0];
      expect(diff.counts.changed, `${field} should register as changed`).toBe(1);
      expect(diff.changed[0]?.changes.map((c) => c.field)).toContain(field);
    }
  });

  it("notices a reordered city list, since order is as supplied", () => {
    const diff = diffDatasets(
      dataset({ companies: [company({ cities: ["Pune", "Bengaluru"] })] }),
      dataset({ companies: [company({ cities: ["Bengaluru", "Pune"] })] }),
    );
    expect(diff.counts.changed).toBe(1);
  });

  it("treats a changed id as a removal plus an addition, not an edit", () => {
    // Ids are stable by contract. If one moves, something renamed a row's
    // identity, and calling that an edit would hide it.
    const diff = diffDatasets(
      dataset({ companies: [company({ id: "acme-2" })] }),
      dataset(),
    );
    expect(diff.counts.added).toBe(1);
    expect(diff.counts.removed).toBe(1);
    expect(diff.counts.changed).toBe(0);
  });
});

describe("diffDatasets — taxonomy", () => {
  it("reports an added value", () => {
    const next = dataset();
    next.taxonomy = { ...next.taxonomy, cities: ["Bengaluru", "Pune", "Kochi"] };
    const diff = diffDatasets(next, dataset());

    expect(diff.taxonomy).toHaveLength(1);
    expect(diff.taxonomy[0]).toMatchObject({
      key: "cities",
      added: ["Kochi"],
      removed: [],
      reordered: false,
    });
  });

  it("reports a removed value", () => {
    const next = dataset();
    next.taxonomy = { ...next.taxonomy, hqCountries: ["USA"] };
    const diff = diffDatasets(next, dataset());
    expect(diff.taxonomy[0]).toMatchObject({ key: "hqCountries", removed: ["Japan"] });
  });

  /**
   * The case a set-difference diff gets wrong. Nothing was added or removed, but
   * adjacent-band peer matching is index arithmetic on this array, so the
   * meaning of the data changed.
   */
  it("reports a revenue band reorder as a real change", () => {
    const before = dataset();
    const next = dataset();
    next.taxonomy = {
      ...next.taxonomy,
      revenueBands: ["$1 Bn – $5 Bn", "< $100 Mn", "Above $20 Bn"],
    };

    const diff = diffDatasets(next, before);

    expect(diff.isEmpty).toBe(false);
    expect(diff.counts.taxonomy).toBe(1);
    expect(diff.taxonomy[0]).toMatchObject({
      key: "revenueBands",
      added: [],
      removed: [],
      reordered: true,
    });
  });

  it("does not double-report a rename as a reorder", () => {
    const next = dataset();
    next.taxonomy = { ...next.taxonomy, industries: ["Banking", "Retail"] };
    const diff = diffDatasets(next, dataset());

    expect(diff.taxonomy[0]).toMatchObject({
      key: "industries",
      added: ["Banking"],
      removed: ["BFSI"],
      reordered: false,
    });
  });

  it("covers all four lists", () => {
    expect(Object.keys(TAXONOMY_LABELS).sort()).toEqual(
      ["cities", "hqCountries", "industries", "revenueBands"].sort(),
    );
  });
});

describe("diffDatasets — first import", () => {
  it("treats a missing previous dataset as everything being new", () => {
    const diff = diffDatasets(dataset(), null);

    expect(diff.firstImport).toBe(true);
    expect(diff.isEmpty).toBe(false);
    expect(diff.counts.added).toBe(1);
    expect(diff.counts.removed).toBe(0);
  });
});

describe("renderDiffText", () => {
  it("renders the same computation the admin view shows", () => {
    const next = dataset({
      companies: [company({ establishedYear: 2013 }), company({ id: "globex", name: "Globex" })],
    });
    next.taxonomy = { ...next.taxonomy, cities: ["Bengaluru", "Pune", "Kochi"] };

    const text = renderDiffText(diffDatasets(next, dataset()));

    expect(text).toContain("1 added");
    expect(text).toContain("~ 1 changed");
    expect(text).toContain("taxonomy.cities");
    expect(text).toContain("Kochi");
  });

  it("says so plainly when there is nothing to report", () => {
    expect(renderDiffText(diffDatasets(dataset(), dataset()))).toContain(
      "no company or taxonomy changes",
    );
  });

  it("labels a reorder in the console output too", () => {
    const next = dataset();
    next.taxonomy = {
      ...next.taxonomy,
      revenueBands: ["Above $20 Bn", "< $100 Mn", "$1 Bn – $5 Bn"],
    };
    expect(renderDiffText(diffDatasets(next, dataset()))).toContain("reordered");
  });

  it("names the first import rather than reporting a huge addition list", () => {
    expect(renderDiffText(diffDatasets(dataset(), null))).toContain("first import");
  });
});

describe("formatFieldValue", () => {
  it("renders each field type the way the diff table needs it", () => {
    expect(formatFieldValue(true)).toBe("Yes");
    expect(formatFieldValue(false)).toBe("No");
    expect(formatFieldValue(["Bengaluru", "Pune"])).toBe("Bengaluru, Pune");
    expect(formatFieldValue({ min: 100, max: 500 })).toBe("100–500");
    expect(formatFieldValue(2015)).toBe("2015");
    expect(formatFieldValue(null)).toBe("—");
    expect(formatFieldValue(undefined)).toBe("—");
  });

  it("does not collapse false into the empty marker", () => {
    // `false` is a real Forbes/Fortune value; rendering it as "—" would make a
    // flag being switched off look like missing data.
    expect(formatFieldValue(false)).not.toBe("—");
  });
});
