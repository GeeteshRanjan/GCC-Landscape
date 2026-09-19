import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { describePeerOverride, diffDatasets } from "@/data/diff";
import {
  DEFAULT_PEER_LIMIT,
  matchPeerOverride,
  matchPeers,
  rankCandidates,
} from "@/data/peers";
import {
  DEFAULT_SITE_CONTENT,
  PEER_OVERRIDE_MAX_COMPANIES,
  datasetSchema,
  parseDataset,
  type BusinessType,
  type Company,
  type Dataset,
  type PeerOverride,
} from "@/data/schema";
import { buildPeerView } from "@/data/screen1";
import { SIMILARITY_FLOOR, buildSimilarityModel } from "@/data/similarity";
import { shortfallLine } from "@/components/screen1/copy";
import { isBusinessTag } from "@/data/business-tags";

/**
 * PINNED PEER SETS, and the tag vocabulary opening up.
 *
 * Two features, one file, because they are two halves of the same request and they share
 * every fixture: both are ways for an admin to overrule the scoring engine, one by naming
 * the companies and one by changing the signal it scores on.
 *
 * The load-bearing tests here are the two NO-OP proofs, and they are what makes either
 * change safe to ship. An override that nobody has written must leave `matchPeers`
 * byte-identical, and the custom-tag weight cap must be provably inert on the committed
 * dataset — where every tag is authored. Everything else in this file is behaviour; those
 * two are the guarantee that today's product cannot have moved.
 */

const BANDS = [
  "< $100 Mn",
  "$100 Mn – $500 Mn",
  "$500 Mn – $1 Bn",
  "$1 Bn – $5 Bn",
  "$5 Bn – $10 Bn",
  "$10 Bn – $20 Bn",
  "Above $20 Bn",
];

function company(overrides: Partial<Company> = {}): Company {
  return {
    id: "acme",
    name: "Acme",
    hqCountry: "USA",
    industry: "Retail",
    revenueBand: "Above $20 Bn",
    establishedYear: 2015,
    cities: ["Bengaluru"],
    fte: { min: 100, max: 500 },
    fortuneGlobal500: false,
    forbesGlobal2000: false,
    businessTypes: [],
    ...overrides,
  };
}

function type(overrides: Partial<BusinessType> = {}): BusinessType {
  return {
    id: "ret-apparel",
    name: "Apparel & Footwear Brand",
    industry: "Retail",
    tags: ["brand-owner", "apparel", "footwear"],
    ...overrides,
  };
}

function override(overrides: Partial<PeerOverride> = {}): PeerOverride {
  return {
    id: "retail-pin",
    industry: "Retail",
    companyIds: ["one"],
    ...overrides,
  };
}

function dataset(overrides: Partial<Dataset> = {}): Dataset {
  return {
    version: 1,
    generatedAt: "2026-09-17T00:00:00.000Z",
    source: "test",
    taxonomy: {
      industries: ["Retail", "BFSI"],
      revenueBands: BANDS,
      cities: ["Bengaluru", "Pune"],
      hqCountries: ["USA", "Germany"],
      pinnedIndustries: [],
      cityCoordinates: {},
    },
    companies: [company()],
    businessTypes: [type()],
    peerOverrides: [],
    peerNoteRules: [],
    metrics: [],
    siteContent: DEFAULT_SITE_CONTENT,
    ...overrides,
  };
}

/** Five Retail companies with distinguishable sizes, so ordering is observable. */
function fiveRetailers(): Company[] {
  return ["one", "two", "three", "four", "five"].map((id, index) =>
    company({
      id,
      name: `Company ${id}`,
      // Descending size, so the engine's own order is one, two, three, four, five —
      // which is what makes a reordered pinned set visibly different from it.
      fte: { min: 1000 - index * 100, max: 1000 - index * 100 },
    }),
  );
}

const VISITOR = {
  industry: "Retail",
  revenueBand: "Above $20 Bn",
  hqCountry: "USA",
  gccStatus: "evaluating" as const,
};

/* ==========================================================================
   The no-op proofs
   ========================================================================== */

const published: Dataset = parseDataset(
  JSON.parse(readFileSync(path.join(process.cwd(), "data", "dataset.json"), "utf8")),
);

describe("the shipped dataset is untouched by either feature", () => {
  /**
   * **The committed dataset pins nothing, and that is the healthy state.** An override is
   * a correction to the engine; a repo carrying a pile of them is a repo whose scoring
   * should be fixed instead. Asserted rather than assumed so a stray row cannot arrive
   * unremarked in a publish about something else.
   */
  it("pins no peer sets", () => {
    expect(published.peerOverrides).toEqual([]);
  });

  /**
   * **Every tag in the published data is from the AUTHORED vocabulary, which is what makes
   * `capCustomTagWeights` provably inert today.** The cap only touches a tag
   * `isBusinessTag` rejects, so with none present it cannot fire — no weight moves, no
   * peer set moves. If this ever fails, the cap has started applying and the peer sets in
   * that industry have to be re-measured rather than assumed.
   */
  it("carries no admin-added tag, so the weight cap cannot fire", () => {
    const custom = published.businessTypes
      .flatMap((entry) => entry.tags)
      .filter((tag) => !isBusinessTag(tag));
    expect([...new Set(custom)]).toEqual([]);
  });

  it("reports no override on any real peer match", () => {
    for (const industry of published.taxonomy.industries) {
      const result = matchPeers(published, {
        industry,
        revenueBand: "Above $20 Bn",
        hqCountry: "USA",
      });
      expect(result.overriddenBy, industry).toBeNull();
    }
  });
});

/* ==========================================================================
   Matching a combination
   ========================================================================== */

describe("matchPeerOverride", () => {
  it("finds nothing when nothing is pinned", () => {
    expect(matchPeerOverride(dataset(), VISITOR)).toBeNull();
  });

  it("matches on industry alone when every other field is a wildcard", () => {
    const data = dataset({ peerOverrides: [override()] });
    expect(matchPeerOverride(data, VISITOR)?.id).toBe("retail-pin");
    // The industry is the one required field, so a different industry cannot match.
    expect(matchPeerOverride(data, { ...VISITOR, industry: "BFSI" })).toBeNull();
  });

  it("requires every field it pins to match exactly", () => {
    const data = dataset({
      peerOverrides: [override({ revenueBand: "< $100 Mn", hqCountry: "Germany" })],
    });
    expect(matchPeerOverride(data, VISITOR)).toBeNull();
    expect(
      matchPeerOverride(data, {
        ...VISITOR,
        revenueBand: "< $100 Mn",
        hqCountry: "Germany",
      })?.id,
    ).toBe("retail-pin");
  });

  /**
   * **A visitor who named NO sub-industry is a real answer, not a missing one.** So a row
   * pinning a sub-industry does not fit them, and a row leaving it on "any" does. Written
   * as an equality test rather than a truthiness one for exactly this case — the
   * distinction is what lets ANSR pin one set for the broad answer and another for a
   * narrowed one.
   */
  it("does not fire a sub-industry row for a visitor who named none", () => {
    const data = dataset({
      peerOverrides: [override({ businessTypeId: "ret-apparel" })],
    });
    expect(matchPeerOverride(data, VISITOR)).toBeNull();
    expect(
      matchPeerOverride(data, { ...VISITOR, businessTypeId: "ret-apparel" })?.id,
    ).toBe("retail-pin");
  });

  /**
   * The precedence rule, which is what lets a broad safety net and a narrow correction
   * coexist. Asserted on the three field weights in turn, because a single case would
   * pass under any ordering.
   */
  it("prefers the more specific row, sub-industry outranking band outranking HQ", () => {
    const broad = override({ id: "broad" });
    const byHq = override({ id: "by-hq", hqCountry: "USA" });
    const byBand = override({ id: "by-band", revenueBand: "Above $20 Bn" });
    const byType = override({ id: "by-type", businessTypeId: "ret-apparel" });
    const visitor = { ...VISITOR, businessTypeId: "ret-apparel" };

    expect(
      matchPeerOverride(dataset({ peerOverrides: [broad, byHq] }), visitor)?.id,
    ).toBe("by-hq");
    expect(
      matchPeerOverride(dataset({ peerOverrides: [byHq, byBand] }), visitor)?.id,
    ).toBe("by-band");
    expect(
      matchPeerOverride(dataset({ peerOverrides: [byBand, byType] }), visitor)?.id,
    ).toBe("by-type");
  });

  /** List order must not decide anything, so the same set reversed resolves the same. */
  it("does not depend on the order the rows sit in", () => {
    const rows = [
      override({ id: "broad" }),
      override({ id: "narrow", revenueBand: "Above $20 Bn" }),
    ];
    expect(matchPeerOverride(dataset({ peerOverrides: rows }), VISITOR)?.id).toBe(
      "narrow",
    );
    expect(
      matchPeerOverride(dataset({ peerOverrides: [...rows].reverse() }), VISITOR)?.id,
    ).toBe("narrow");
  });
});

/* ==========================================================================
   What matchPeers does with one
   ========================================================================== */

describe("matchPeers with a pinned set", () => {
  const companies = fiveRetailers();

  it("returns the pinned companies in the pinned order", () => {
    const data = dataset({
      companies,
      peerOverrides: [override({ companyIds: ["four", "two", "five"] })],
    });
    const result = matchPeers(data, VISITOR);
    expect(result.peers.map((c) => c.id)).toEqual(["four", "two", "five"]);
    expect(result.overriddenBy).toBe("retail-pin");
  });

  /** The engine's own answer, for contrast: size order, not the pinned one. */
  it("differs from what the engine would have returned", () => {
    const data = dataset({ companies });
    expect(matchPeers(data, VISITOR).peers.map((c) => c.id)).toEqual([
      "one",
      "two",
      "three",
      "four",
      "five",
    ]);
  });

  /**
   * **A short pinned set reports NO shortfall, and this is the assertion that keeps the
   * copy honest.** Every branch of `shortfallLine` is a claim about the DATA — "this
   * industry is thin", "only so many are close enough to your sub-industry". A curated set
   * of three is three because somebody chose three, so all of them would be false.
   */
  it("reports no shortfall and no floor effect, however short", () => {
    const data = dataset({
      companies,
      peerOverrides: [override({ companyIds: ["one", "two"] })],
    });
    const result = matchPeers(data, VISITOR);
    expect(result.peers).toHaveLength(2);
    expect(result.shortfall).toBe(0);
    expect(result.floorShortened).toBe(false);
  });

  /** And the sentence really does not render, which is the consequence that matters. */
  it("draws no thin-set sentence for a short pinned set", () => {
    const data = dataset({
      companies,
      peerOverrides: [override({ companyIds: ["one", "two"] })],
    });
    expect(shortfallLine(buildPeerView(data, VISITOR))).toBeNull();
  });

  /**
   * **No shared tags and no business match, because naming what the peers have in common
   * would be inventing a rationale for a decision made by hand.**
   */
  it("claims no shared characteristic", () => {
    const tagged = companies.map((c) => ({ ...c, businessTypes: ["ret-apparel"] }));
    const data = dataset({
      companies: tagged,
      peerOverrides: [
        override({ businessTypeId: "ret-apparel", companyIds: ["one", "two"] }),
      ],
    });
    const result = matchPeers(data, { ...VISITOR, businessTypeId: "ret-apparel" });
    expect(result.basis.sharedTags).toEqual([]);
    expect(result.basis.businessMatched).toBe(false);
  });

  /**
   * The population counts are facts about the INDUSTRY, so an admin choosing which five
   * to name cannot move them — which is what keeps the containment chart and the count
   * line under the grid true.
   */
  it("leaves the population counts alone", () => {
    const plain = matchPeers(dataset({ companies }), VISITOR);
    const pinned = matchPeers(
      dataset({ companies, peerOverrides: [override({ companyIds: ["five"] })] }),
      VISITOR,
    );
    expect(pinned.industryTotal).toBe(plain.industryTotal);
    expect(pinned.industryOthers).toBe(plain.industryTotal - 1);
  });

  /**
   * **The reason most people will come here: a company the similarity floor keeps out.**
   * It cannot appear on the public screen at all under scoring, and pinning is the only
   * way to show it — so this is the feature's whole point, asserted.
   */
  it("can surface a company the similarity floor excludes", () => {
    const other = type({
      id: "ret-grocery",
      name: "Grocery Chain",
      tags: ["retail-operator", "grocery"],
    });
    const companiesWithTags = [
      company({ id: "apparel-a", name: "Apparel A", businessTypes: ["ret-apparel"] }),
      company({ id: "grocer", name: "Grocer", businessTypes: ["ret-grocery"] }),
    ];
    const base = dataset({
      companies: companiesWithTags,
      businessTypes: [type(), other],
    });
    const visitor = { ...VISITOR, businessTypeId: "ret-apparel" };

    // Confirm the grocer really is excluded, so the pin below is doing the work.
    const scored = matchPeers(base, visitor);
    expect(scored.peers.map((c) => c.id)).not.toContain("grocer");

    const pinnedData = dataset({
      companies: companiesWithTags,
      businessTypes: [type(), other],
      peerOverrides: [
        override({ businessTypeId: "ret-apparel", companyIds: ["grocer"] }),
      ],
    });
    expect(matchPeers(pinnedData, visitor).peers.map((c) => c.id)).toEqual(["grocer"]);
  });

  /** A company that has left the industry is dropped rather than shown across it. */
  it("drops a pinned company no longer in the industry", () => {
    const data = dataset({
      companies: [
        company({ id: "one" }),
        company({ id: "moved", industry: "BFSI" }),
      ],
      // Built past the schema deliberately: this is the state a company edit LEAVES, and
      // the engine has to be safe in it even though a publish would refuse it.
      peerOverrides: [override({ companyIds: ["one", "moved"] })],
    });
    expect(matchPeers(data, VISITOR).peers.map((c) => c.id)).toEqual(["one"]);
  });

  it("never returns more than the limit", () => {
    const data = dataset({
      companies,
      peerOverrides: [
        override({ companyIds: ["one", "two", "three", "four", "five"] }),
      ],
    });
    expect(matchPeers(data, VISITOR, 3).peers).toHaveLength(3);
    expect(matchPeers(data, VISITOR).peers).toHaveLength(DEFAULT_PEER_LIMIT);
  });

  /** The view model draws the pinned set, in the pinned order, with bars scaled to it. */
  it("reaches the view model in order, with the bars scaled to the pinned set", () => {
    const data = dataset({
      companies,
      peerOverrides: [override({ companyIds: ["four", "one"] })],
    });
    const view = buildPeerView(data, VISITOR);
    expect(view.peers.peers.map((p) => p.id)).toEqual(["four", "one"]);
    // `one` is the larger, so it is the one at 1 — the bar is scaled against the set the
    // card came back in, not against the industry.
    expect(view.peers.largest?.id).toBe("one");
  });
});

/* ==========================================================================
   The candidate list the admin picks from
   ========================================================================== */

describe("rankCandidates", () => {
  it("ranks the whole industry and marks what the floor removed", () => {
    const other = type({
      id: "ret-grocery",
      name: "Grocery Chain",
      tags: ["retail-operator", "grocery"],
    });
    const data = dataset({
      companies: [
        company({ id: "apparel-a", businessTypes: ["ret-apparel"] }),
        company({ id: "grocer", businessTypes: ["ret-grocery"] }),
      ],
      businessTypes: [type(), other],
    });
    const ranking = rankCandidates(data, { ...VISITOR, businessTypeId: "ret-apparel" });

    expect(ranking.pool).toHaveLength(2);
    expect(ranking.ranked).toHaveLength(2);
    expect(ranking.eligible.map((e) => e.company.id)).toEqual(["apparel-a"]);
    expect(ranking.visitorTagCount).toBeGreaterThan(0);
  });

  /**
   * **`eligible` must be `ranked` filtered, in the same order** — that is what lets the
   * admin's candidate list and the visitor's peer set be read as one ordering. Filtering
   * before the sort would have been equivalent only by accident of the comparator.
   */
  it("keeps eligible in the same order as ranked", () => {
    const ranking = rankCandidates(published, {
      industry: "Retail",
      revenueBand: "Above $20 Bn",
      hqCountry: "USA",
      businessTypeId: "ret-apparel",
    });
    const rankedOrder = ranking.ranked.map((e) => e.company.id);
    const eligibleOrder = ranking.eligible.map((e) => e.company.id);
    expect(eligibleOrder).toEqual(rankedOrder.filter((id) => eligibleOrder.includes(id)));
  });

  /** And its top slice is exactly what the engine shows, which is the claim the admin UI makes. */
  it("agrees with matchPeers on the top of the list", () => {
    const visitor = {
      industry: "Retail",
      revenueBand: "Above $20 Bn",
      hqCountry: "USA",
      businessTypeId: "ret-apparel",
    };
    const engine = matchPeers(published, visitor).peers.map((c) => c.id);
    const admin = rankCandidates(published, visitor)
      .eligible.slice(0, DEFAULT_PEER_LIMIT)
      .map((e) => e.company.id);
    expect(admin).toEqual(engine);
  });

  it("has no floor to apply when no sub-industry was named", () => {
    const ranking = rankCandidates(published, {
      industry: "Retail",
      revenueBand: "Above $20 Bn",
      hqCountry: "USA",
    });
    expect(ranking.visitorTagCount).toBe(0);
    expect(ranking.eligible).toHaveLength(ranking.ranked.length);
  });
});

/* ==========================================================================
   The publish gate
   ========================================================================== */

describe("the schema refuses an override that could mislead", () => {
  const parse = (rows: PeerOverride[], extra: Partial<Dataset> = {}) =>
    datasetSchema.safeParse(
      dataset({
        companies: [
          company({ id: "one" }),
          company({ id: "bank", industry: "BFSI" }),
        ],
        peerOverrides: rows,
        ...extra,
      }),
    );

  it("accepts a well-formed row", () => {
    expect(parse([override()]).success).toBe(true);
  });

  it("refuses a company from another industry", () => {
    // Peer matching may never leave the industry; an override that could would put a
    // bank in front of a retailer.
    expect(parse([override({ companyIds: ["bank"] })]).success).toBe(false);
  });

  it("refuses a company that does not exist", () => {
    expect(parse([override({ companyIds: ["ghost"] })]).success).toBe(false);
  });

  it("refuses an empty pinned set", () => {
    expect(parse([override({ companyIds: [] })]).success).toBe(false);
  });

  it("refuses the same company twice", () => {
    expect(parse([override({ companyIds: ["one", "one"] })]).success).toBe(false);
  });

  it("refuses more than the grid can draw", () => {
    const many = Array.from({ length: PEER_OVERRIDE_MAX_COMPANIES + 1 }, (_, i) =>
      company({ id: `c${i}` }),
    );
    expect(
      parse([override({ companyIds: many.map((c) => c.id) })], { companies: many })
        .success,
    ).toBe(false);
  });

  it("refuses an industry, band or country the taxonomy does not hold", () => {
    expect(parse([override({ industry: "Nowhere" })]).success).toBe(false);
    expect(parse([override({ revenueBand: "$3" })]).success).toBe(false);
    expect(parse([override({ hqCountry: "Atlantis" })]).success).toBe(false);
  });

  /** HQ is validated against the world list too, since a visitor may answer any country. */
  it("accepts an HQ country a visitor can pick but no company has", () => {
    expect(parse([override({ hqCountry: "Iceland" })]).success).toBe(true);
  });

  it("refuses a sub-industry from another industry", () => {
    const bankType = type({ id: "bfsi-retail", name: "Retail Bank", industry: "BFSI" });
    expect(
      parse([override({ businessTypeId: "bfsi-retail" })], {
        businessTypes: [type(), bankType],
      }).success,
    ).toBe(false);
  });

  /**
   * **Two rows on one combination are refused rather than resolved**, because the tiebreak
   * would be list position — which the editor does not show, so which set a visitor saw
   * would depend on something invisible.
   */
  it("refuses two rows covering the same combination", () => {
    expect(
      parse([override({ id: "a" }), override({ id: "b" })]).success,
    ).toBe(false);
    // The same two rows distinguished by one field are fine: precedence is defined.
    expect(
      parse([
        override({ id: "a" }),
        override({ id: "b", revenueBand: "Above $20 Bn" }),
      ]).success,
    ).toBe(true);
  });

  it("refuses a duplicate id", () => {
    expect(
      parse([override({ id: "same" }), override({ id: "same", hqCountry: "USA" })])
        .success,
    ).toBe(false);
  });
});

/* ==========================================================================
   The publish diff
   ========================================================================== */

describe("the publish diff reports a pinned set", () => {
  const base = dataset({ companies: fiveRetailers() });

  it("names the combination with its wildcards spelled out", () => {
    expect(describePeerOverride(override())).toBe(
      "Retail · any sub-industry · any revenue band · any HQ",
    );
    expect(
      describePeerOverride(override({ revenueBand: "Above $20 Bn" })),
    ).toContain("Above $20 Bn");
  });

  it("reports an addition and a removal", () => {
    const withRow = { ...base, peerOverrides: [override()] };
    expect(diffDatasets(withRow, base).counts.peerOverrides).toBe(1);
    expect(diffDatasets(withRow, base).peerOverrides.added[0]?.id).toBe("retail-pin");
    expect(diffDatasets(base, withRow).peerOverrides.removed[0]?.id).toBe("retail-pin");
  });

  /**
   * **A REORDER is a change, unlike a tag reorder.** Position on the comparison grid is
   * the ranking — there is no ordinal on a peer card — so swapping two pinned companies
   * changes which one a visitor reads first, and it is the ten-second edit most likely to
   * be forgotten.
   */
  it("reports a reordered pinned set as a change", () => {
    const before = { ...base, peerOverrides: [override({ companyIds: ["one", "two"] })] };
    const after = { ...base, peerOverrides: [override({ companyIds: ["two", "one"] })] };
    const diff = diffDatasets(after, before);
    expect(diff.counts.peerOverrides).toBe(1);
    expect(diff.peerOverrides.changed[0]?.changes.map((c) => c.field)).toEqual([
      "companyIds",
    ]);
    expect(diff.isEmpty).toBe(false);
  });

  it("reports a retargeted combination", () => {
    const before = { ...base, peerOverrides: [override()] };
    const after = {
      ...base,
      peerOverrides: [override({ revenueBand: "Above $20 Bn" })],
    };
    expect(diffDatasets(after, before).peerOverrides.changed[0]?.changes).toHaveLength(1);
  });

  /** A note is admin-only and still a change: it is the row's only explanation. */
  it("reports a note edit", () => {
    const before = { ...base, peerOverrides: [override()] };
    const after = { ...base, peerOverrides: [override({ note: "Thin sub-industry." })] };
    expect(diffDatasets(after, before).counts.peerOverrides).toBe(1);
  });

  it("reports nothing for an identical row", () => {
    const same = { ...base, peerOverrides: [override()] };
    expect(diffDatasets(same, { ...same }).counts.peerOverrides).toBe(0);
  });
});

/* ==========================================================================
   The custom-tag weight cap
   ========================================================================== */

describe("a tag added in admin is weight-capped", () => {
  /**
   * The fixture that makes the cap observable: an industry with a spread of authored tag
   * rarities, plus one company carrying a tag nobody else has.
   */
  function tagged(): Dataset {
    const common = type({ id: "ret-a", name: "A", tags: ["retail-operator", "b2c"] });
    const rare = type({
      id: "ret-b",
      name: "B",
      tags: ["retail-operator", "b2c", "apparel"],
    });
    const custom = type({
      id: "ret-c",
      name: "C",
      tags: ["retail-operator", "quick-commerce"],
    });
    return dataset({
      businessTypes: [common, rare, custom],
      companies: [
        company({ id: "a1", businessTypes: ["ret-a"] }),
        company({ id: "a2", businessTypes: ["ret-a"] }),
        company({ id: "a3", businessTypes: ["ret-a"] }),
        company({ id: "b1", businessTypes: ["ret-b"] }),
        company({ id: "c1", businessTypes: ["ret-c"] }),
      ],
    });
  }

  it("holds the custom tag no higher than the sharpest authored tag in the industry", () => {
    const model = buildSimilarityModel(tagged(), "Retail");
    const authored = [...model.weights.entries()]
      .filter(([tag]) => isBusinessTag(tag))
      .map(([, weight]) => weight);
    const ceiling = Math.max(...authored);
    const custom = model.weights.get("quick-commerce");

    expect(custom).toBeDefined();
    // Pinned to the ceiling exactly rather than merely under it, which is what proves the
    // clamp fired: `quick-commerce` is on one of five tagged companies, so its uncapped
    // weight is the maximum the pool can produce and the cap is the only thing that could
    // have brought it down to the sharpest authored value.
    expect(custom).toBe(ceiling);
  });

  it("leaves every authored weight exactly where it was", () => {
    const withCustom = buildSimilarityModel(tagged(), "Retail");
    // The same fixture with the custom tag renamed to an authored one, so the only
    // difference is provenance.
    const authoredOnly = buildSimilarityModel(
      dataset({
        businessTypes: [
          type({ id: "ret-a", name: "A", tags: ["retail-operator", "b2c"] }),
          type({ id: "ret-b", name: "B", tags: ["retail-operator", "b2c", "apparel"] }),
          type({ id: "ret-c", name: "C", tags: ["retail-operator", "grocery"] }),
        ],
        companies: [
          company({ id: "a1", businessTypes: ["ret-a"] }),
          company({ id: "a2", businessTypes: ["ret-a"] }),
          company({ id: "a3", businessTypes: ["ret-a"] }),
          company({ id: "b1", businessTypes: ["ret-b"] }),
          company({ id: "c1", businessTypes: ["ret-c"] }),
        ],
      }),
      "Retail",
    );
    for (const tag of ["retail-operator", "b2c", "apparel"]) {
      expect(withCustom.weights.get(tag), tag).toBe(authoredOnly.weights.get(tag));
    }
  });

  /**
   * The measured failure the cap exists to prevent, stated as a property: a visitor whose
   * sub-industry carries a custom tag must still see peers. Uncapped, the tag became
   * almost the whole denominator and everything else fell under the floor.
   */
  it("still returns peers for a visitor whose sub-industry carries one", () => {
    const data = tagged();
    const result = matchPeers(data, { ...VISITOR, businessTypeId: "ret-c" });
    expect(result.peers.length).toBeGreaterThan(0);
    expect(result.closeMatches).toBeGreaterThan(0);
  });

  it("accepts a slug-shaped tag and refuses anything else", () => {
    const ok = (tags: string[]) =>
      datasetSchema.safeParse(
        dataset({
          businessTypes: [type({ tags })],
          companies: [company({ businessTypes: [] })],
        }),
      ).success;
    expect(ok(["quick-commerce", "b2c"])).toBe(true);
    expect(ok(["Quick Commerce", "b2c"])).toBe(false);
    expect(ok(["quick commerce", "b2c"])).toBe(false);
    expect(ok(["quick_commerce", "b2c"])).toBe(false);
    expect(ok(["-leading", "b2c"])).toBe(false);
    // Still at least two, because similarity needs something to share.
    expect(ok(["quick-commerce"])).toBe(false);
  });

  /** The floor is unchanged; the cap is a weight bound and never a threshold change. */
  it("does not move the similarity floor", () => {
    expect(SIMILARITY_FLOOR).toBe(0.2);
  });
});
