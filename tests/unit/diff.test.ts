import { describe, expect, it } from "vitest";

import {
  METRIC_FIELD_LABELS,
  TAXONOMY_LABELS,
  diffDatasets,
  formatFieldValue,
  formatMetricFieldValue,
  renderDiffText,
} from "@/data/diff";
import {
  DATASET_VERSION,
  DEFAULT_COMMON_FUNCTIONS,
  DEFAULT_LOGOS,
  DEFAULT_PUBLIC_COPY,
  type BusinessType,
  type Company,
  type CustomerLogo,
  type Dataset,
  type Metric,
  type PublicCopy,
  DEFAULT_SITE_CONTENT,
} from "@/data/schema";

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
      industries: ["BFSI", "Retail"],
      revenueBands: ["< $100 Mn", "$1 Bn – $5 Bn", "Above $20 Bn"],
      cities: ["Bengaluru", "Pune"],
      hqCountries: ["USA", "Japan"],
      pinnedIndustries: [],
      cityCoordinates: {},
    },
    companies: [company()],
    businessTypes: [],
    metrics: [],
    siteContent: DEFAULT_SITE_CONTENT,
    ...overrides,
  };
}

/**
 * Site content — the hero copy and the impact figures.
 *
 * This category exists because it is the only part of a publish that changes what
 * EVERY visitor sees on arrival, and the tests below are all guarding the same
 * failure: an edit here that the diff does not report is a headline changed on the
 * live site with nothing in the review saying so.
 */
describe("diffDatasets — site content", () => {
  const content = (
    overrides: Partial<Dataset["siteContent"]> = {},
  ): Dataset["siteContent"] => ({
    hero: { title: "ANSR GCC Intelligence", lead: "Evaluate your opportunity." },
    impactStats: [
      { id: "hired", value: "225K+", label: "Professionals hired" },
      { id: "centers", value: "210+", label: "Centres established" },
    ],
    // The close's copy. Defaulted in the schema so an older dataset still reads, but
    // REQUIRED on the parsed type — so a fixture that omits it is a compile error rather
    // than a silent `undefined` reaching the diff.
    // The two links are blank here for the same reason they ship blank: blank is the
    // legal "use the configured default" value, so it is the state a fixture that is not
    // exercising them should be in.
    close: {
      body: "Access the complete dataset.",
      ctaLabel: "Unlock full intelligence",
      ctaHrefPeers: "",
      ctaHrefFunctions: "",
    },
    // The three collections that moved out of code, on the same terms as `close`:
    // defaulted in the schema, required on the parsed type. The shipped values are
    // reused rather than restated so a copy change does not have to be typed twice.
    commonFunctions: [...DEFAULT_COMMON_FUNCTIONS],
    logos: [...DEFAULT_LOGOS],
    copy: DEFAULT_PUBLIC_COPY,
    ...overrides,
  });

  it("reports a hero edit with both sides of it", () => {
    const diff = diffDatasets(
      dataset({ siteContent: content({ hero: { title: "New title", lead: "Same." } }) }),
      dataset({ siteContent: content({ hero: { title: "Old title", lead: "Same." } }) }),
    );
    expect(diff.counts.siteContent).toBe(1);
    expect(diff.isEmpty).toBe(false);
    // Both sides, because a reviewer approving a headline has to read it rather
    // than be told a field moved.
    expect(diff.siteContent.hero).toEqual([
      { field: "title", before: "Old title", after: "New title" },
    ]);
  });

  it("counts the entry point separately from companies and metrics", () => {
    const diff = diffDatasets(
      dataset({ siteContent: content({ hero: { title: "A", lead: "B" } }) }),
      dataset({ siteContent: content() }),
    );
    // Separate for the same reason metrics are, one step sharper: folded into
    // "changed" a two-field copy edit would vanish behind any company batch.
    expect(diff.counts).toEqual({
      added: 0,
      removed: 0,
      changed: 0,
      taxonomy: 0,
      businessTypes: 0,
      metrics: 0,
      siteContent: 2,
    });
  });

  it("reports an added, a removed and an edited figure by id", () => {
    const diff = diffDatasets(
      dataset({
        siteContent: content({
          impactStats: [
            { id: "hired", value: "250K+", label: "Professionals hired" },
            { id: "sqft", value: "14M+", label: "Sq ft managed" },
          ],
        }),
      }),
      dataset({ siteContent: content() }),
    );
    expect(diff.siteContent.impactStats.added.map((s) => s.id)).toEqual(["sqft"]);
    expect(diff.siteContent.impactStats.removed.map((s) => s.id)).toEqual(["centers"]);
    expect(diff.siteContent.impactStats.changed).toEqual([
      {
        id: "hired",
        label: "Professionals hired",
        changes: [{ field: "value", before: "225K+", after: "250K+" }],
      },
    ]);
  });

  it("reports a reorder as a change, because order is what the visitor reads", () => {
    const original = content();
    const diff = diffDatasets(
      dataset({
        siteContent: content({ impactStats: [...original.impactStats].reverse() }),
      }),
      dataset({ siteContent: original }),
    );
    expect(diff.siteContent.impactStats.reordered).toBe(true);
    expect(diff.counts.siteContent).toBe(1);
    expect(diff.isEmpty).toBe(false);
  });

  it("does not call an addition a reorder as well", () => {
    // A row added at the front moves every id after it, so a naive id-sequence
    // comparison reports a reorder on top of the addition and double-counts it —
    // the same trap `taxonomy` already guards against.
    const original = content();
    const diff = diffDatasets(
      dataset({
        siteContent: content({
          impactStats: [
            { id: "years", value: "20+", label: "Years" },
            ...original.impactStats,
          ],
        }),
      }),
      dataset({ siteContent: original }),
    );
    expect(diff.siteContent.impactStats.added).toHaveLength(1);
    expect(diff.siteContent.impactStats.reordered).toBe(false);
    expect(diff.counts.siteContent).toBe(1);
  });

  /**
   * Every static string, in a loop, because the list of fields the diff walks is the
   * thing being tested here rather than the walking of it. A hand-maintained list of
   * twenty-eight keys loses one eventually, and the key it loses is a heading that then
   * publishes silently — the `businessTypes`-missing-from-`COMPANY_FIELDS` defect,
   * with twenty-eight chances to happen instead of one.
   *
   * 28 since `peersTitle` left the schema; the count is asserted here as well as in
   * `public-copy.test.ts` because this is the walk that would silently stop covering a
   * key.
   */
  it("catches a change in every one of the seventy copy strings", () => {
    const keys = Object.keys(DEFAULT_PUBLIC_COPY) as Array<keyof PublicCopy>;
    expect(keys).toHaveLength(70);

    for (const field of keys) {
      const copy: PublicCopy = { ...DEFAULT_PUBLIC_COPY, [field]: "Edited" };
      const diff = diffDatasets(
        dataset({ siteContent: content({ copy }) }),
        dataset({ siteContent: content() }),
      );
      expect(diff.counts.siteContent, field).toBe(1);
      expect(diff.siteContent.copy, field).toEqual([
        { field, before: DEFAULT_PUBLIC_COPY[field], after: "Edited" },
      ]);
    }
  });

  it("reports a copy edit as a site-content change and nothing else", () => {
    const diff = diffDatasets(
      dataset({
        siteContent: content({
          copy: { ...DEFAULT_PUBLIC_COPY, viewPeers: "Peers" },
        }),
      }),
      dataset({ siteContent: content() }),
    );
    // The category exists so a one-word edit to a tab label cannot hide inside a
    // company batch's "changed" count.
    expect(diff.counts.changed).toBe(0);
    expect(diff.counts.siteContent).toBe(1);
    expect(diff.isEmpty).toBe(false);
  });

  it("reports an added and a removed function tag", () => {
    const diff = diffDatasets(
      dataset({
        siteContent: content({
          commonFunctions: [
            ...DEFAULT_COMMON_FUNCTIONS.slice(1),
            "Engineering & R&D",
          ],
        }),
      }),
      dataset({ siteContent: content() }),
    );
    expect(diff.siteContent.commonFunctions.added).toEqual(["Engineering & R&D"]);
    expect(diff.siteContent.commonFunctions.removed).toEqual([
      DEFAULT_COMMON_FUNCTIONS[0],
    ]);
    expect(diff.counts.siteContent).toBe(2);
  });

  it("reports a reordered function list, and does not call an addition one", () => {
    // The tags render in this order, so a reorder is a real change — and an added
    // tag shifts everything after it, which is why membership is checked first.
    const reordered = diffDatasets(
      dataset({
        siteContent: content({ commonFunctions: [...DEFAULT_COMMON_FUNCTIONS].reverse() }),
      }),
      dataset({ siteContent: content() }),
    );
    expect(reordered.siteContent.commonFunctions.reordered).toBe(true);
    expect(reordered.counts.siteContent).toBe(1);

    const added = diffDatasets(
      dataset({
        siteContent: content({
          commonFunctions: ["Engineering & R&D", ...DEFAULT_COMMON_FUNCTIONS],
        }),
      }),
      dataset({ siteContent: content() }),
    );
    expect(added.siteContent.commonFunctions.reordered).toBe(false);
    expect(added.counts.siteContent).toBe(1);
  });

  it("reports a renamed, resized and repointed logo", () => {
    const logos = [...DEFAULT_LOGOS] as CustomerLogo[];
    const first = logos[0] as CustomerLogo;

    const renamed = diffDatasets(
      dataset({
        siteContent: content({
          logos: [{ ...first, name: "Best Buy Co.", width: 120 }, ...logos.slice(1)],
        }),
      }),
      dataset({ siteContent: content() }),
    );
    expect(renamed.siteContent.logos.changed).toEqual([
      {
        src: first.src,
        name: "Best Buy Co.",
        changes: [
          { field: "name", before: first.name, after: "Best Buy Co." },
          { field: "width", before: String(first.width), after: "120" },
        ],
      },
    ]);
    expect(renamed.counts.siteContent).toBe(1);

    // A different file is a different mark, not an edit: the file IS the identity,
    // for the reason recorded on `SiteContentDiff.logos`.
    const repointed = diffDatasets(
      dataset({
        siteContent: content({
          logos: [{ ...first, src: "/logos/newmark.svg" }, ...logos.slice(1)],
        }),
      }),
      dataset({ siteContent: content() }),
    );
    expect(repointed.siteContent.logos.added.map((l) => l.src)).toEqual([
      "/logos/newmark.svg",
    ]);
    expect(repointed.siteContent.logos.removed.map((l) => l.src)).toEqual([first.src]);
    expect(repointed.siteContent.logos.changed).toEqual([]);
  });

  it("reports a reordered logo strip, since the strip scrolls in that order", () => {
    const diff = diffDatasets(
      dataset({ siteContent: content({ logos: [...DEFAULT_LOGOS].reverse() }) }),
      dataset({ siteContent: content() }),
    );
    expect(diff.siteContent.logos.reordered).toBe(true);
    expect(diff.counts.siteContent).toBe(1);
    expect(diff.isEmpty).toBe(false);
  });

  it("names the new collections in the console output", () => {
    const text = renderDiffText(
      diffDatasets(
        dataset({
          siteContent: content({
            copy: { ...DEFAULT_PUBLIC_COPY, sourceLine: "Source: ANSR" },
            commonFunctions: [...DEFAULT_COMMON_FUNCTIONS, "Engineering & R&D"],
            logos: [...DEFAULT_LOGOS].slice(1),
          }),
        }),
        dataset({ siteContent: content() }),
      ),
    );
    expect(text).toContain("copy sourceLine");
    expect(text).toContain("Source: ANSR");
    expect(text).toContain("functions added");
    expect(text).toContain("logos removed");
  });

  it("reports no hero change on a first import, having nothing to compare against", () => {
    // The shared fixture defaults to the real seeded content, so the two-figure
    // one is passed explicitly rather than asserting against whatever the seed
    // happens to hold today.
    const diff = diffDatasets(dataset({ siteContent: content() }), null);
    expect(diff.firstImport).toBe(true);
    // The rows are genuinely new; the hero is not "changed from" anything, and
    // listing both fields would be a diff against nothing.
    expect(diff.siteContent.hero).toEqual([]);
    expect(diff.siteContent.impactStats.added).toHaveLength(2);
  });
});

describe("diffDatasets — no change", () => {
  it("reports an empty diff when nothing moved", () => {
    const diff = diffDatasets(dataset(), dataset());

    expect(diff.isEmpty).toBe(true);
    expect(diff.counts).toEqual({
      added: 0,
      removed: 0,
      changed: 0,
      taxonomy: 0,
      businessTypes: 0,
      metrics: 0,
      siteContent: 0,
    });
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

  it("covers all four lists, and the two parallel keys beside them", () => {
    // A label is what makes an entry render on both surfaces: each walks
    // `diff.taxonomy` and names the entry from this record, so a key diffed without
    // a label here is a change reported into an empty heading.
    expect(Object.keys(TAXONOMY_LABELS).sort()).toEqual(
      [
        "cities",
        "cityCoordinates",
        "hqCountries",
        "industries",
        "pinnedIndustries",
        "revenueBands",
      ].sort(),
    );
  });

  /**
   * The two parallel keys — the pinned tier and the map coordinates.
   *
   * Both hold copies of strings from the four lists, and both change what a visitor
   * is shown without any of those lists moving: pinning reorders the industry
   * dropdown's leading tier, and a coordinate puts a dot on the density map. An edit
   * to either that the diff did not report would publish as a no-op, which is the
   * same failure `businessTypes` had.
   */
  it("reports a pinned industry added and removed", () => {
    const before = dataset();
    before.taxonomy = { ...before.taxonomy, pinnedIndustries: ["BFSI"] };
    const next = dataset();
    next.taxonomy = { ...next.taxonomy, pinnedIndustries: ["Retail"] };

    const diff = diffDatasets(next, before);

    expect(diff.isEmpty).toBe(false);
    expect(diff.counts.taxonomy).toBe(1);
    expect(diff.taxonomy[0]).toEqual({
      key: "pinnedIndustries",
      added: ["Retail"],
      removed: ["BFSI"],
      reordered: false,
    });
  });

  it("does not report a reordered pin list, because the tier is ordered by count", () => {
    // The opposite call to `revenueBands` and the same one as a tag reorder: this
    // list decides membership only, so a different order draws an identical
    // dropdown. Reporting it would train an admin to skip the section.
    const before = dataset();
    before.taxonomy = {
      ...before.taxonomy,
      pinnedIndustries: ["BFSI", "Retail"],
    };
    const next = dataset();
    next.taxonomy = { ...next.taxonomy, pinnedIndustries: ["Retail", "BFSI"] };

    expect(diffDatasets(next, before).isEmpty).toBe(true);
  });

  it("reports a coordinate added, and a moved one as the old removed plus the new added", () => {
    const added = dataset();
    added.taxonomy = {
      ...added.taxonomy,
      cityCoordinates: { Pune: { lat: 18.52, lon: 73.86 } },
    };
    const first = diffDatasets(added, dataset());
    expect(first.counts.taxonomy).toBe(1);
    expect(first.taxonomy[0]).toEqual({
      key: "cityCoordinates",
      added: ["Pune (18.52, 73.86)"],
      removed: [],
      reordered: false,
    });

    const moved = dataset();
    moved.taxonomy = {
      ...moved.taxonomy,
      cityCoordinates: { Pune: { lat: 18.6, lon: 73.86 } },
    };
    // Both numbers, because a coordinate moving is the one change here a reviewer
    // cannot check by eye — and a record has no third shape to report it in.
    expect(diffDatasets(moved, added).taxonomy[0]).toEqual({
      key: "cityCoordinates",
      added: ["Pune (18.6, 73.86)"],
      removed: ["Pune (18.52, 73.86)"],
      reordered: false,
    });

    expect(diffDatasets(dataset(), added).taxonomy[0]).toMatchObject({
      key: "cityCoordinates",
      added: [],
      removed: ["Pune (18.52, 73.86)"],
    });
  });

  it("names both parallel keys in the console output", () => {
    const next = dataset();
    next.taxonomy = {
      ...next.taxonomy,
      pinnedIndustries: ["Retail"],
      cityCoordinates: { Pune: { lat: 18.52, lon: 73.86 } },
    };
    const text = renderDiffText(diffDatasets(next, dataset()));

    expect(text).toContain("taxonomy.pinnedIndustries");
    expect(text).toContain("Retail");
    expect(text).toContain("taxonomy.cityCoordinates");
    expect(text).toContain("Pune (18.52, 73.86)");
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
      "no company, taxonomy, business type, metric or site content changes",
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

describe("diffDatasets — function metrics", () => {
  function metric(overrides: Partial<Metric> = {}): Metric {
    return {
      id: "tech-bench-strength",
      functionArea: "tech",
      lens: "supply",
      title: "Technology bench strength",
      question: "How many people are available?",
      unit: "FTEs",
      format: "number",
      structure: { kind: "scalar" },
      value: null,
      gated: false,
      ...overrides,
    };
  }

  it("counts metric changes separately from company changes", () => {
    // Separate because they are separate decisions being approved. Folding both
    // into one "changed" count would hide whichever batch was smaller.
    const diff = diffDatasets(
      dataset({ metrics: [metric({ value: { kind: "scalar", value: 900_000 } })] }),
      dataset({ metrics: [metric()] }),
    );
    expect(diff.counts).toEqual({
      added: 0,
      removed: 0,
      changed: 0,
      taxonomy: 0,
      businessTypes: 0,
      metrics: 1,
      siteContent: 0,
    });
    expect(diff.isEmpty).toBe(false);
  });

  it("treats entering a figure as a change worth publishing", () => {
    const diff = diffDatasets(
      dataset({ metrics: [metric({ value: { kind: "scalar", value: 5 } })] }),
      dataset({ metrics: [metric()] }),
    );
    expect(diff.metrics.changed[0]?.changes.map((c) => c.field)).toEqual(["value"]);
  });

  it("reports an added and a removed metric", () => {
    const diff = diffDatasets(
      dataset({ metrics: [metric({ id: "new-one" })] }),
      dataset({ metrics: [metric({ id: "old-one" })] }),
    );
    expect(diff.metrics.added.map((m) => m.id)).toEqual(["new-one"]);
    expect(diff.metrics.removed.map((m) => m.id)).toEqual(["old-one"]);
    expect(diff.counts.metrics).toBe(2);
  });

  it("catches a change in every editable metric field", () => {
    const before = metric({
      structure: { kind: "breakdown", entries: ["A", "B"] },
      value: { kind: "breakdown", values: [1, 2] },
    });
    const after: Metric = {
      ...before,
      functionArea: "hr",
      lens: "cost",
      title: "Renamed",
      question: "A different question?",
      unit: "days",
      format: "duration",
      asOf: "2026 Q2",
      note: "A note",
      structure: { kind: "breakdown", entries: ["A", "C"] },
      value: { kind: "breakdown", values: [1, 3] },
      gated: true,
    };
    const fields = diffDatasets(
      dataset({ metrics: [after] }),
      dataset({ metrics: [before] }),
    ).metrics.changed[0]?.changes.map((c) => c.field);
    expect(fields).toEqual([
      "functionArea",
      "lens",
      "title",
      "question",
      "unit",
      "format",
      "asOf",
      "note",
      "structure",
      "value",
      "gated",
    ]);
  });

  it("does not report a metric that was rewritten to the same content", () => {
    const diff = diffDatasets(
      dataset({ metrics: [metric()] }),
      dataset({ metrics: [metric()] }),
    );
    expect(diff.counts.metrics).toBe(0);
    expect(diff.isEmpty).toBe(true);
  });

  it("counts the catalogue on a first import", () => {
    const diff = diffDatasets(dataset({ metrics: [metric()] }), null);
    expect(diff.counts.metrics).toBe(1);
    expect(renderDiffText(diff)).toContain("+ 1 metrics");
  });

  it("names metric changes in the console output", () => {
    const text = renderDiffText(
      diffDatasets(
        dataset({ metrics: [metric({ value: { kind: "scalar", value: 5 } })] }),
        dataset({ metrics: [metric()] }),
      ),
    );
    expect(text).toContain("metrics changed");
    expect(text).toContain("tech-bench-strength (value)");
  });
});

describe("formatMetricFieldValue", () => {
  it("describes a shape rather than dumping it", () => {
    expect(
      formatMetricFieldValue("structure", { kind: "breakdown", entries: ["A", "B"] }),
    ).toBe("2 parts: A, B");
    expect(
      formatMetricFieldValue("structure", {
        kind: "matrix",
        rows: ["R"],
        columns: ["X", "Y"],
      }),
    ).toBe("1 × 2 grid: R by X, Y");
    expect(formatMetricFieldValue("structure", { kind: "scalar" })).toBe("one number");
  });

  it("marks an empty slot rather than printing a zero for it", () => {
    // A reviewer has to be able to tell "nobody filled this in" from "the
    // answer is zero".
    expect(
      formatMetricFieldValue("value", { kind: "breakdown", values: [0, null] }),
    ).toBe("0, —");
  });

  it("renders a grid a reviewer can read", () => {
    expect(
      formatMetricFieldValue("value", {
        kind: "matrix",
        cells: [
          [1, null],
          ["Strong", 2],
        ],
      }),
    ).toBe("1 | — / Strong | 2");
  });

  it("says so when a metric has no figures at all", () => {
    expect(formatMetricFieldValue("value", null)).toBe("not entered");
  });

  it("has a label for every metric field the diff can report", () => {
    for (const field of Object.keys(METRIC_FIELD_LABELS) as Array<keyof Metric>) {
      expect(METRIC_FIELD_LABELS[field]).toBeTruthy();
    }
  });
});

describe("diffDatasets — business types", () => {
  const apparel: BusinessType = {
    id: "ret-apparel",
    name: "Apparel & Footwear Brand",
    industry: "Retail",
    tags: ["brand-owner", "apparel", "footwear"],
  };

  it("reports a tag edit even though no company row moved", () => {
    // The reason this section exists. Adding a tag to a business type re-scores
    // every peer set in that industry — Nike sees a different five companies —
    // while every company row is byte-identical. Reporting "no changes" here
    // would let an admin publish a reshaping of the product believing they had
    // published nothing.
    const diff = diffDatasets(
      dataset({
        businessTypes: [{ ...apparel, tags: [...apparel.tags, "luxury"] as BusinessType["tags"] }],
      }),
      dataset({ businessTypes: [apparel] }),
    );

    expect(diff.isEmpty).toBe(false);
    expect(diff.counts.changed).toBe(0);
    expect(diff.counts.businessTypes).toBe(1);
    expect(diff.businessTypes.changed[0]?.changes[0]?.field).toBe("tags");
  });

  it("does not report a tag reorder, because nothing reads tag order", () => {
    // The opposite of `taxonomy.revenueBands`, where order IS the contract and a
    // reorder is a real change. Here every weight is derived from the data, so
    // flagging a reorder would train an admin to ignore this section.
    const diff = diffDatasets(
      dataset({
        businessTypes: [
          { ...apparel, tags: ["footwear", "brand-owner", "apparel"] as BusinessType["tags"] },
        ],
      }),
      dataset({ businessTypes: [apparel] }),
    );
    expect(diff.isEmpty).toBe(true);
  });

  it("reports an added and a removed type", () => {
    const grocery: BusinessType = {
      id: "ret-grocery",
      name: "Grocery",
      industry: "Retail",
      tags: ["retail-operator", "packaged-food"],
    };
    const diff = diffDatasets(
      dataset({ businessTypes: [grocery] }),
      dataset({ businessTypes: [apparel] }),
    );
    expect(diff.businessTypes.added.map((b) => b.id)).toEqual(["ret-grocery"]);
    expect(diff.businessTypes.removed.map((b) => b.id)).toEqual(["ret-apparel"]);
  });

  it("names the change in the console renderer", () => {
    const text = renderDiffText(
      diffDatasets(
        dataset({ businessTypes: [{ ...apparel, name: "Apparel brand" }] }),
        dataset({ businessTypes: [apparel] }),
      ),
    );
    expect(text).toContain("business types changed");
    expect(text).toContain("ret-apparel");
  });
});
