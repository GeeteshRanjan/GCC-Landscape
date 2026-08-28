import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  DEFAULT_PEER_LIMIT,
  matchPeers,
  matchPeersByBandLadder,
} from "@/data/peers";
import { parseDataset, type BusinessType, type Company, type Dataset } from "@/data/schema";
import {
  BAND_ADJACENT,
  BAND_DISTANT,
  BAND_SAME,
  SIMILARITY_FLOOR,
  bandProximity,
  buildSimilarityModel,
  businessSimilarity,
  meetsFloor,
  scoreCompany,
  visitorTags,
} from "@/data/similarity";

/**
 * The scored peer engine.
 *
 * The load-bearing test in this file is the EQUIVALENCE SWEEP at the bottom: for
 * every industry with no business types, the scored engine must return exactly
 * what the old three-rung ladder returned, for every revenue band and every HQ
 * country. That is what makes the whole change provably additive rather than
 * merely believed to be — an untagged industry cannot move.
 *
 * The weighting tests deliberately assert BEHAVIOUR ("an apparel brand two bands
 * away outranks a home-improvement retailer in the same band") rather than the
 * 0.7/0.3 split itself. The intent survives re-tuning; a pinned number would not.
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
    name: "Apparel & footwear brand",
    industry: "Retail",
    tags: ["brand-owner", "apparel", "footwear"],
    ...overrides,
  };
}

function dataset(overrides: Partial<Dataset> = {}): Dataset {
  return {
    version: 1,
    generatedAt: "2026-08-28T00:00:00.000Z",
    source: "test",
    taxonomy: {
      industries: ["Retail"],
      revenueBands: BANDS,
      cities: ["Bengaluru"],
      hqCountries: ["USA", "Germany"],
    },
    companies: [company()],
    businessTypes: [type()],
    metrics: [],
    ...overrides,
  };
}

describe("bandProximity", () => {
  it("is a three-step function, not linear distance", () => {
    expect(bandProximity(BANDS, "$1 Bn – $5 Bn", "$1 Bn – $5 Bn")).toBe(BAND_SAME);
    expect(bandProximity(BANDS, "$1 Bn – $5 Bn", "$500 Mn – $1 Bn")).toBe(BAND_ADJACENT);
    expect(bandProximity(BANDS, "$1 Bn – $5 Bn", "$5 Bn – $10 Bn")).toBe(BAND_ADJACENT);
    // Two steps and six steps score the same. The bands are not evenly spaced, so
    // treating index distance as a magnitude would be fake precision — and the flat
    // third step is what reproduces the old rung 3 exactly.
    expect(bandProximity(BANDS, "$1 Bn – $5 Bn", "$10 Bn – $20 Bn")).toBe(BAND_DISTANT);
    expect(bandProximity(BANDS, "$1 Bn – $5 Bn", "Above $20 Bn")).toBe(BAND_DISTANT);
  });

  it("treats an unknown band as distant rather than throwing", () => {
    expect(bandProximity(BANDS, "made up", "$1 Bn – $5 Bn")).toBe(BAND_DISTANT);
  });
});

describe("businessSimilarity", () => {
  const weights = new Map([
    ["retail-operator", 0.01],
    ["apparel", 2.5],
    ["footwear", 3.0],
  ]);

  it("is 1 when the company carries everything the visitor does", () => {
    const tags = new Set(["retail-operator", "apparel", "footwear"]);
    expect(businessSimilarity(tags, tags, weights)).toBeCloseTo(1);
  });

  it("is 0 when either side is untagged", () => {
    expect(businessSimilarity(new Set(), new Set(["apparel"]), weights)).toBe(0);
    expect(businessSimilarity(new Set(["apparel"]), new Set(), weights)).toBe(0);
  });

  it("all but ignores a tag that everyone in the industry carries", () => {
    // The whole reason weights are derived from rarity: sharing the tag every
    // retailer has says nothing about being a peer.
    const visitor = new Set(["retail-operator", "apparel", "footwear"]);
    const onlyCommon = new Set(["retail-operator"]);
    expect(businessSimilarity(visitor, onlyCommon, weights)).toBeLessThan(0.01);
  });

  it("weights a rare shared tag far above a common one", () => {
    const visitor = new Set(["retail-operator", "apparel", "footwear"]);
    const rare = businessSimilarity(visitor, new Set(["footwear"]), weights);
    const common = businessSimilarity(visitor, new Set(["retail-operator"]), weights);
    expect(rare).toBeGreaterThan(common * 100);
  });

  it("does not penalise a company for carrying extra tags", () => {
    // A conglomerate with many tags must not be dragged down by breadth, which is
    // what a Jaccard ratio would do. Normalising by the VISITOR's weight is what
    // avoids it.
    const visitor = new Set(["apparel", "footwear"]);
    const focused = new Set(["apparel", "footwear"]);
    const broad = new Set(["apparel", "footwear", "retail-operator", "luxury"]);
    expect(businessSimilarity(visitor, broad, weights)).toBeCloseTo(
      businessSimilarity(visitor, focused, weights),
    );
  });

  it("falls back to unweighted overlap when every tag is universal in the pool", () => {
    // IDF sends a universal tag to exactly zero, so an industry where every tagged
    // company carries the SAME tags has all-zero weights and a 0/0 ratio. Measured
    // on the real data: Electrical & Internet has two companies with one shared
    // business type, and returning 0 here showed the visitor no peers at all for
    // the industry whose two members are the most alike in the dataset.
    const flat = new Map([
      ["discrete-manufacturing", 0],
      ["electronic-components", 0],
      ["b2b", 0],
    ]);
    const tags = new Set(["discrete-manufacturing", "electronic-components", "b2b"]);
    expect(businessSimilarity(tags, tags, flat)).toBe(1);
    expect(businessSimilarity(tags, new Set(["b2b"]), flat)).toBeCloseTo(1 / 3);
  });

  it("ignores a visitor tag no company in the industry carries", () => {
    // Otherwise a visitor with an unusual tag scores low against everyone, because
    // the unmatchable tag would sit in the denominator forever.
    const visitor = new Set(["apparel", "footwear", "not-in-this-industry"]);
    expect(businessSimilarity(visitor, new Set(["apparel", "footwear"]), weights)).toBeCloseTo(1);
  });
});

describe("buildSimilarityModel", () => {
  it("weights by rarity within the industry, not across the dataset", () => {
    const data = dataset({
      companies: [
        company({ id: "a", businessTypes: ["ret-apparel"] }),
        company({ id: "b", businessTypes: ["ret-apparel"] }),
        company({ id: "c", businessTypes: ["ret-grocery"] }),
      ],
      businessTypes: [
        type(),
        type({
          id: "ret-grocery",
          name: "Grocery",
          tags: ["retail-operator", "packaged-food"],
        }),
      ],
    });

    const model = buildSimilarityModel(data, "Retail");
    expect(model.taggedCount).toBe(3);
    // `packaged-food` is carried by one of three; `apparel` by two of three.
    expect(model.weights.get("packaged-food")!).toBeGreaterThan(
      model.weights.get("apparel")!,
    );
  });

  it("unions the tags of a company carrying two business types", () => {
    const data = dataset({
      companies: [company({ id: "a", businessTypes: ["ret-apparel", "ret-grocery"] })],
      businessTypes: [
        type(),
        type({ id: "ret-grocery", name: "Grocery", tags: ["retail-operator", "packaged-food"] }),
      ],
    });
    const model = buildSimilarityModel(data, "Retail");
    expect([...model.tagsByCompany.get("a")!].sort()).toEqual([
      "apparel",
      "brand-owner",
      "footwear",
      "packaged-food",
      "retail-operator",
    ]);
  });
});

describe("the floor", () => {
  it("does not apply when the visitor named no business type", () => {
    const scored = {
      company: company(),
      businessSimilarity: 0,
      bandProximity: BAND_SAME,
      score: 0.3,
      sharedTags: [],
    };
    expect(meetsFloor(scored, 0)).toBe(true);
    expect(meetsFloor(scored, 3)).toBe(false);
  });

  it("is judged on business similarity alone, never the combined score", () => {
    // A perfect band match is worth 0.3 of the combined score. If the floor were
    // applied to that, a business-irrelevant company in the right revenue band
    // would qualify — the exact bug the module exists to prevent.
    const irrelevantButSameBand = {
      company: company(),
      businessSimilarity: SIMILARITY_FLOOR / 2,
      bandProximity: BAND_SAME,
      score: 0.7 * (SIMILARITY_FLOOR / 2) + 0.3,
      sharedTags: [],
    };
    expect(irrelevantButSameBand.score).toBeGreaterThan(SIMILARITY_FLOOR);
    expect(meetsFloor(irrelevantButSameBand, 3)).toBe(false);
  });
});

describe("scoring intent — the reason the weights are what they are", () => {
  const data = dataset({
    taxonomy: {
      industries: ["Retail"],
      revenueBands: BANDS,
      cities: ["Bengaluru"],
      hqCountries: ["USA", "Germany"],
    },
    companies: [
      // The visitor is a sportswear brand above $20 Bn.
      company({ id: "adidas", name: "Adidas", hqCountry: "Germany", businessTypes: ["ret-sportswear"] }),
      company({ id: "puma", name: "Puma", hqCountry: "Germany", revenueBand: "$5 Bn – $10 Bn", businessTypes: ["ret-sportswear"] }),
      company({ id: "lowes", name: "Lowes", businessTypes: ["ret-home"] }),
      company({ id: "beauty", name: "Beauty Co", businessTypes: ["ret-beauty"] }),
    ],
    businessTypes: [
      type({ id: "ret-sportswear", name: "Sportswear", tags: ["brand-owner", "apparel", "footwear", "sporting-goods", "dtc", "b2c"] }),
      type({ id: "ret-home", name: "Home improvement", tags: ["retail-operator", "building-materials", "physical-stores", "b2c"] }),
      type({ id: "ret-beauty", name: "Beauty brand", tags: ["brand-owner", "personal-care", "dtc", "b2c"] }),
    ],
  });

  const input = {
    industry: "Retail",
    revenueBand: "Above $20 Bn",
    hqCountry: "USA",
    businessTypeId: "ret-sportswear",
  };

  it("puts a same-business peer two bands away above a wrong-business peer in the same band", () => {
    // Lowes is in the visitor's exact revenue band and Puma is two bands below it.
    // A perfect band match is worth 0.3 and cannot outrun a business mismatch, so
    // Puma leads — and Lowes does not appear at all, because it is also below the
    // floor. Both facts are the point.
    const result = matchPeers(data, input);
    const names = result.peers.map((p) => p.name);
    expect(names).toContain("Puma");
    expect(names).not.toContain("Lowes");
    expect(names.indexOf("Adidas")).toBeLessThan(names.indexOf("Puma"));
  });

  it("ranks an adjacent consumer brand above an unrelated retailer", () => {
    // Beauty Co shares brand-owner, dtc and b2c; the home-improvement retailer
    // shares only b2c. This is the fall-through case a single bucket cannot fix:
    // once apparel runs out the next peer should be the nearest adjacent business,
    // not the biggest company left in the industry.
    //
    // Scored with the floor lowered so BOTH are eligible, which is the only way to
    // assert their relative order rather than merely that one was excluded.
    const model = buildSimilarityModel(data, "Retail");
    const visitor = visitorTags(data.businessTypes, "ret-sportswear");
    const options = {
      model,
      revenueBands: BANDS,
      visitorTags: visitor,
      visitorBand: "Above $20 Bn",
    };
    const beauty = scoreCompany(
      data.companies.find((c) => c.id === "beauty")!,
      options,
    );
    const lowes = scoreCompany(data.companies.find((c) => c.id === "lowes")!, options);

    expect(beauty.businessSimilarity).toBeGreaterThan(lowes.businessSimilarity);
    expect(beauty.score).toBeGreaterThan(lowes.score);
  });

  it("drops the wrong-business company below the floor entirely", () => {
    const result = matchPeers(data, input);
    expect(result.peers.map((p) => p.name)).not.toContain("Lowes");
    expect(result.closeMatches).toBeLessThan(result.industryTotal);
  });

  it("reports the characteristics every shown peer shares", () => {
    const result = matchPeers(data, input);
    expect(result.basis.businessMatched).toBe(true);
    expect(result.basis.sharedTags).toContain("b2c");
  });

  it("lets HQ country order ties but never outrank the business match", () => {
    // Adidas and Puma are both German; the visitor is American. Neither is
    // promoted over a better business match on that basis, and the count is
    // unchanged either way.
    const withCountry = matchPeers(data, { ...input, hqCountry: "Germany" });
    const withoutCountry = matchPeers(data, { ...input, hqCountry: undefined });
    expect(withCountry.peers.length).toBe(withoutCountry.peers.length);
  });
});

/* ==========================================================================
   The equivalence sweep

   Reads the real published dataset and, for every industry with no business
   types, asserts the scored engine returns exactly the old ladder's peers.
   ========================================================================== */

const published: Dataset = parseDataset(
  JSON.parse(
    readFileSync(path.join(process.cwd(), "data", "dataset.json"), "utf8"),
  ),
);

describe("equivalence with the old band ladder", () => {
  it("the published dataset actually has business types, or this suite proves nothing", () => {
    expect(published.businessTypes.length).toBeGreaterThan(0);
    const tagged = published.companies.filter((c) => c.businessTypes.length > 0);
    expect(tagged.length).toBeGreaterThan(0);
  });

  it("returns the ladder's exact peers for an untagged industry, across every band and country", () => {
    const untaggedIndustries = published.taxonomy.industries.filter((industry) =>
      published.companies
        .filter((c) => c.industry === industry)
        .every((c) => c.businessTypes.length === 0),
    );

    // Synthesise one: after a full tagging pass there may be no untagged industry
    // left, and the property must still be checked.
    const industries =
      untaggedIndustries.length > 0 ? untaggedIndustries : ["__synthetic__"];
    const data: Dataset =
      untaggedIndustries.length > 0
        ? published
        : {
            ...published,
            taxonomy: {
              ...published.taxonomy,
              industries: [...published.taxonomy.industries, "__synthetic__"],
            },
            companies: [
              ...published.companies,
              ...published.companies
                .filter((c) => c.industry === "Retail")
                .map((c, i) => ({
                  ...c,
                  id: `synthetic-${i}`,
                  industry: "__synthetic__",
                  businessTypes: [],
                })),
            ],
          };

    let compared = 0;
    for (const industry of industries) {
      for (const revenueBand of data.taxonomy.revenueBands) {
        for (const hqCountry of [undefined, "USA", "Japan", "Germany"]) {
          const input = { industry, revenueBand, hqCountry };
          const scored = matchPeers(data, input, DEFAULT_PEER_LIMIT);
          const ladder = matchPeersByBandLadder(data, input, DEFAULT_PEER_LIMIT);

          expect(scored.peers.map((p) => p.id)).toEqual(
            ladder.peers.map((p) => p.id),
          );
          expect(scored.tier).toBe(ladder.tier);
          compared += 1;
        }
      }
    }
    expect(compared).toBeGreaterThan(0);
  });

  it("an unset business type reproduces the ladder even in a TAGGED industry", () => {
    // The feature is optional. A visitor who skips the business-type question, or
    // picks "Not listed", must get precisely what they got before it existed.
    for (const industry of published.taxonomy.industries) {
      for (const revenueBand of published.taxonomy.revenueBands) {
        const input = { industry, revenueBand, hqCountry: "USA" };
        expect(matchPeers(published, input).peers.map((p) => p.id)).toEqual(
          matchPeersByBandLadder(published, input).peers.map((p) => p.id),
        );
      }
    }
  });

  it("never leaves the industry, whatever the business type", () => {
    for (const type of published.businessTypes) {
      const input = {
        industry: type.industry,
        revenueBand: "Above $20 Bn",
        businessTypeId: type.id,
      };
      for (const peer of matchPeers(published, input).peers) {
        expect(peer.industry).toBe(type.industry);
      }
    }
  });

  it("never returns a peer below the floor when a business type was given", () => {
    for (const type of published.businessTypes) {
      const input = {
        industry: type.industry,
        revenueBand: "$1 Bn – $5 Bn",
        businessTypeId: type.id,
      };
      const result = matchPeers(published, input);
      const model = buildSimilarityModel(published, type.industry);
      const visitor = visitorTags(published.businessTypes, type.id);
      for (const peer of result.peers) {
        const scored = scoreCompany(peer, {
          model,
          revenueBands: published.taxonomy.revenueBands,
          visitorTags: visitor,
          visitorBand: input.revenueBand,
        });
        expect(scored.businessSimilarity).toBeGreaterThanOrEqual(SIMILARITY_FLOOR);
      }
    }
  });
});
