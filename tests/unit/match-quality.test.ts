import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { companiesInIndustry, matchPeers, DEFAULT_PEER_LIMIT } from "@/data/peers";
import { parseDataset, type BusinessType, type Company, type Dataset } from "@/data/schema";
import {
  buildSimilarityModel,
  businessSimilarity,
  tagsForCompany,
} from "@/data/similarity";

/**
 * PEER-SET QUALITY — how good the five companies on the card actually are.
 *
 * `similarity.test.ts` proves the engine computes what it says it computes.
 * This file asks the different question a visitor asks: do these five companies
 * belong together? It exists because a reported bad peer set was neither a crash nor
 * a failing assertion — every existing test passed while a payments platform was
 * shown a telecom billing vendor and two healthcare BPOs.
 *
 * ── COHERENCE is the measurement ────────────────────────────────────────────
 *
 * Mean pairwise business similarity across the returned set, symmetrised. High means
 * the five companies are in the same line of business as each other; low means they
 * are five companies that happen to share a revenue band. It is computed with the
 * SAME weights the engine ranks by, so it cannot flatter the engine — it is the
 * engine's own opinion of its own output.
 *
 * Measured on the shipped dataset, the split is stark and it is the whole finding:
 *
 *   industry               with a sub-industry   without one   companies
 *   Software & Internet    0.93                  0.23          656
 *   Manufacturing          0.94                  0.13          207
 *   BFSI                   0.96                  0.31          189
 *
 * So the engine is not the defect. The defect is that its primary input is optional
 * and, until the search terms landed, hard to find — see `search-terms.test.ts`. What
 * this file guards is that the good path stays good, that the degraded path is
 * measured rather than assumed, and that the population of companies which can never
 * be a peer does not quietly grow.
 *
 * ── Why the thresholds are floors and not equalities ────────────────────────
 *
 * Every number asserted below is a bound with slack, because admin edits move these
 * legitimately — a new company changes tag rarity across its whole industry. The
 * bounds are set to catch a structural regression (a scoring change, a business type
 * losing its tags, a whole industry going untagged), not to pin today's data. Where a
 * count really has to be exact it is asserted as a named list, so a change reads as a
 * change rather than as a number needing an update.
 */

const dataset: Dataset = parseDataset(
  JSON.parse(readFileSync(path.join(process.cwd(), "data", "dataset.json"), "utf8")),
);

const typeById = new Map<string, BusinessType>(
  dataset.businessTypes.map((type) => [type.id, type]),
);
const industries = dataset.taxonomy.industries;
const bands = dataset.taxonomy.revenueBands;

/** Companies carrying each business type, which is what makes a row worth offering. */
const membersByType = new Map<string, number>();
for (const company of dataset.companies) {
  for (const id of company.businessTypes) {
    membersByType.set(id, (membersByType.get(id) ?? 0) + 1);
  }
}

/**
 * Mean pairwise business similarity over a returned peer set.
 *
 * Symmetrised because `businessSimilarity` is deliberately asymmetric — it answers
 * "how much of the VISITOR does this company share" — and there is no visitor in a
 * pair of peers. Averaging both directions is the honest reading of "how alike are
 * these two" given a measure built for a different question.
 */
function coherence(peers: readonly Company[], industry: string): number {
  if (peers.length < 2) return Number.NaN;
  const { weights } = buildSimilarityModel(dataset, industry);
  const tagSets = peers.map((peer) => tagsForCompany(peer, typeById));
  let total = 0;
  let pairs = 0;
  for (let i = 0; i < peers.length; i += 1) {
    for (let j = i + 1; j < peers.length; j += 1) {
      total +=
        (businessSimilarity(tagSets[i]!, tagSets[j]!, weights) +
          businessSimilarity(tagSets[j]!, tagSets[i]!, weights)) /
        2;
      pairs += 1;
    }
  }
  return total / pairs;
}

const mean = (values: readonly number[]) =>
  values.reduce((a, b) => a + b, 0) / values.length;

/** Every (industry, sub-industry, band) a visitor can actually submit. */
function everyTypedVisitor() {
  return dataset.businessTypes.flatMap((type) =>
    bands.map((band) => ({
      industry: type.industry,
      revenueBand: band,
      businessTypeId: type.id,
      label: `${type.industry} / ${type.name} / ${band}`,
    })),
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * The good path
 * ──────────────────────────────────────────────────────────────────────────── */

describe("a visitor who names their sub-industry", () => {
  /**
   * The load-bearing assertion in this file. Per-combination rather than an average,
   * so one broken sub-industry cannot hide behind 157 working ones.
   *
   * TWO floors, split on how many companies carry the sub-industry, because the two
   * populations are separated by a clean gap in the data and conflating them makes the
   * test useless in both directions. Sub-industries with three or more members bottom
   * out at 0.58; those with one or two bottom out at 0.41, and no amount of correct
   * mapping will lift a two-member line of business, because four of the five peers
   * have to come from somewhere else in the industry.
   *
   * A single flat floor at 0.5 was the first version and it failed on the thin types
   * while still passing the real defect this file was written for — the mis-mapped
   * ones scored 0.14 to 0.43 with the SAME shape as an honestly thin one. Splitting on
   * member count separates "the mapping is wrong" from "the industry is small", which
   * is the distinction the assertion has to make.
   */
  const THIN_MEMBER_COUNT = 3;
  const COHERENCE_FLOOR = 0.5;
  const THIN_COHERENCE_FLOOR = 0.35;

  it("gets a coherent set for every sub-industry and band", () => {
    const weak: string[] = [];
    for (const visitor of everyTypedVisitor()) {
      const result = matchPeers(dataset, visitor);
      const value = coherence(result.peers, visitor.industry);
      if (Number.isNaN(value)) continue;
      const members = membersByType.get(visitor.businessTypeId) ?? 0;
      const floor =
        members >= THIN_MEMBER_COUNT ? COHERENCE_FLOOR : THIN_COHERENCE_FLOOR;
      if (value < floor) {
        weak.push(`${visitor.label}: ${value.toFixed(3)} (${members} members)`);
      }
    }
    expect(weak).toEqual([]);
  });

  /**
   * The regression, stated at the value that would have caught it.
   *
   * `prof-staffing` and `prof-bpo` were selectable rows with no companies mapped to
   * them, because the source files Korn Ferry under "Research and Consulting" and
   * Indecomm under "Information Services" — both of which collapsed into market
   * research. A visitor who picked Staffing got a set scoring 0.14 to 0.33: worse than
   * the coherence of picking nothing at all in the same industry. Fixed in
   * `scripts/business-type-map.ts`; pinned here so a future mapping pass cannot undo
   * it quietly.
   */
  it("does not offer a sub-industry that scores worse than choosing none", () => {
    for (const industry of industries) {
      const untyped = mean(
        bands
          .map((band) =>
            coherence(matchPeers(dataset, { industry, revenueBand: band }).peers, industry),
          )
          .filter((value) => !Number.isNaN(value)),
      );
      for (const type of dataset.businessTypes.filter((t) => t.industry === industry)) {
        const typed = mean(
          bands
            .map((band) =>
              coherence(
                matchPeers(dataset, {
                  industry,
                  revenueBand: band,
                  businessTypeId: type.id,
                }).peers,
                industry,
              ),
            )
            .filter((value) => !Number.isNaN(value)),
        );
        if (Number.isNaN(typed) || Number.isNaN(untyped)) continue;
        // Not strictly greater: where an industry holds ONE line of business — all
        // seven Aviation companies are airlines — naming it cannot add information and
        // both paths score exactly 1. Equal is the correct answer there; worse is not.
        expect(typed, `${industry} / ${type.name}`).toBeGreaterThanOrEqual(untyped);
      }
    }
  });

  /**
   * The comparison, stated as the thing this whole investigation established. Naming a
   * sub-industry has to be worth a large multiple, or the field is not carrying the
   * weight the architecture gives it.
   */
  it("does far better than the same visitor who names none", () => {
    for (const industry of ["Software & Internet", "Manufacturing", "BFSI"]) {
      const typed = mean(
        dataset.businessTypes
          .filter((type) => type.industry === industry)
          .flatMap((type) =>
            bands
              .map((band) =>
                coherence(
                  matchPeers(dataset, {
                    industry,
                    revenueBand: band,
                    businessTypeId: type.id,
                  }).peers,
                  industry,
                ),
              )
              .filter((value) => !Number.isNaN(value)),
          ),
      );
      const untyped = mean(
        bands
          .map((band) =>
            coherence(matchPeers(dataset, { industry, revenueBand: band }).peers, industry),
          )
          .filter((value) => !Number.isNaN(value)),
      );
      expect(typed, industry).toBeGreaterThan(0.8);
      expect(typed / untyped, industry).toBeGreaterThan(2);
    }
  });

  /**
   * Invariant 3, as a property rather than a claim: the floor is allowed to shorten a
   * set, and it is never allowed to empty one. An empty comparison block is the one
   * outcome worse than a short one, because the block that has to carry a thin set is
   * the industry count beside it — and that reads as evidence only if something was
   * shown.
   */
  it("never returns an empty set for an answer the form can produce", () => {
    const empty = everyTypedVisitor()
      .filter((visitor) => matchPeers(dataset, visitor).peers.length === 0)
      .map((visitor) => visitor.label);
    expect(empty).toEqual([]);
  });

  /**
   * The peers a visitor gets must be in the visitor's own industry, always. Restated
   * here rather than left to `similarity.test.ts` because every relaxation proposal
   * starts by weakening it, and this is the file where the cost of doing so would show
   * up as a coherence number.
   */
  it("never crosses the industry boundary", () => {
    for (const visitor of everyTypedVisitor()) {
      for (const peer of matchPeers(dataset, visitor).peers) {
        expect(peer.industry, visitor.label).toBe(visitor.industry);
      }
    }
  });
});

/* ────────────────────────────────────────────────────────────────────────────
 * The degraded path — measured, not assumed
 * ──────────────────────────────────────────────────────────────────────────── */

describe("a visitor who takes `All of {industry}`", () => {
  /**
   * This is the reported failure, kept as a measurement rather than fixed, because
   * there is nothing to fix inside the engine: with no sub-industry there is no
   * business signal, so the score collapses to band proximity and the ordering is the
   * old three-rung ladder's. `similarity.test.ts` proves that equivalence.
   *
   * The assertion is therefore an UPPER bound with a comment attached, not a target.
   * If it ever fails by being too HIGH, something has started inferring a business
   * signal that the visitor did not give — which would be a change worth noticing
   * even though it looks like an improvement.
   */
  it("gets a set held together only by revenue band, in the two largest industries", () => {
    for (const industry of ["Software & Internet", "Manufacturing"]) {
      const value = mean(
        bands
          .map((band) =>
            coherence(matchPeers(dataset, { industry, revenueBand: band }).peers, industry),
          )
          .filter((v) => !Number.isNaN(v)),
      );
      expect(value, industry).toBeLessThan(0.45);
    }
  });

  /**
   * The consolation the copy leans on. A visitor with no sub-industry still gets the
   * industry count, so the block beside the thin evidence has to hold a real number.
   */
  it("still reports the industry population", () => {
    for (const industry of industries) {
      const result = matchPeers(dataset, { industry, revenueBand: bands[3]! });
      expect(result.industryTotal, industry).toBe(
        companiesInIndustry(dataset, industry).length,
      );
      expect(result.closeMatches, industry).toBe(0);
    }
  });
});

/* ────────────────────────────────────────────────────────────────────────────
 * The taxonomy itself
 * ──────────────────────────────────────────────────────────────────────────── */

describe("the sub-industries a visitor can choose", () => {
  /**
   * A sub-industry with no members is a visitor answering the primary ordering
   * question and getting nothing back for it. `sameBusinessType` comes back 0, so any
   * copy printing "N other X companies run an India GCC" would print a zero, and the
   * peer set is held together only by whatever tags the neighbouring types share.
   *
   * There were SIX. Five were mapping errors and are fixed in
   * `scripts/business-type-map.ts`: staffing and BPO had their two companies filed as
   * market research, home care had Reckitt and Henkel filed as "diversified", consumer
   * products brand had Mattel filed as a retailer, and building materials distribution
   * had Ferguson and Winsupply filed as industrial supplies.
   *
   * ONE is honest and stays. There is no aircraft MRO or ground-handling company in
   * this dataset — all seven Aviation entries are airlines — so `avi-services` is an
   * offer the data cannot fill, and the right answer is to remove the row or to get
   * companies for it, both of which are ANSR's call.
   *
   * Named rather than counted so a seventh reads as a decision.
   */
  const EMPTY_SUB_INDUSTRIES = ["avi-services"] as const;

  it("has exactly one with no companies mapped to it", () => {
    const empty = dataset.businessTypes
      .filter((type) => (membersByType.get(type.id) ?? 0) === 0)
      .map((type) => type.id)
      .sort();
    expect(empty).toEqual([...EMPTY_SUB_INDUSTRIES].sort());
  });

  it("still fills the card for a sub-industry with no members of its own", () => {
    for (const id of EMPTY_SUB_INDUSTRIES) {
      const type = typeById.get(id)!;
      const result = matchPeers(dataset, {
        industry: type.industry,
        revenueBand: bands[3]!,
        businessTypeId: id,
      });
      expect(result.peers.length, id).toBeGreaterThan(0);
      expect(result.sameBusinessType, id).toBe(0);
    }
  });

  /**
   * The five that were fixed, asserted by name so a re-import cannot revert them
   * without a failure. Each one is a company the source spreadsheet mis-filed, and each
   * correction is recorded beside the entry in `scripts/business-type-map.ts`.
   */
  it.each([
    ["prof-staffing", "Korn Ferry"],
    ["prof-bpo", "Indecomm"],
    ["cpg-home-care", "Reckitt Benckiser"],
    ["ret-consumer-brand", "Mattel"],
    ["whl-building-materials", "Ferguson"],
    ["ret-sportswear", "Nike"],
  ])("has %s carrying %s", (id, name) => {
    const company = dataset.companies.find((c) => c.name === name);
    expect(company, name).toBeDefined();
    expect(company!.businessTypes).toContain(id);
  });

  /**
   * Every sub-industry belongs to the industry it is offered under. Enforced by the
   * schema for companies; asserted here for the OPTION LIST, because that is the list a
   * visitor reads and a mismatch would offer them a row that can never match anything.
   */
  it("is offered only under its own industry", () => {
    const known = new Set(industries);
    for (const type of dataset.businessTypes) {
      expect(known.has(type.industry), `${type.id} -> ${type.industry}`).toBe(true);
    }
  });
});

describe("untagged companies", () => {
  /**
   * A company with no business type scores 0 against any visitor who named a
   * sub-industry, so the floor removes it: it can only ever appear on the degraded
   * path. 66 of 1,834 is a deliberate safe state — `docs/data-audit.md` records why —
   * and the point of this bound is that it must not drift upward, because every
   * addition is a company that becomes invisible to the good path.
   */
  it("stay a small, bounded share of the dataset", () => {
    const untagged = dataset.companies.filter((c) => c.businessTypes.length === 0);
    expect(untagged.length).toBeLessThanOrEqual(80);
    expect(untagged.length / dataset.companies.length).toBeLessThan(0.05);
  });

  it("never appear in a set matched on a sub-industry", () => {
    for (const visitor of everyTypedVisitor()) {
      for (const peer of matchPeers(dataset, visitor).peers) {
        expect(peer.businessTypes.length, `${visitor.label} -> ${peer.name}`).toBeGreaterThan(0);
      }
    }
  });

  /**
   * No single industry may be mostly untagged. An industry over the line would look
   * like it works — every sub-industry present, every query findable — while most of
   * its companies could never be shown.
   */
  it("are never most of an industry", () => {
    for (const industry of industries) {
      const pool = companiesInIndustry(dataset, industry);
      const untagged = pool.filter((c) => c.businessTypes.length === 0).length;
      expect(untagged / pool.length, industry).toBeLessThan(0.25);
    }
  });
});

/* ────────────────────────────────────────────────────────────────────────────
 * The boundary, and the businesses it cuts in two
 * ──────────────────────────────────────────────────────────────────────────── */

describe("one business held in two industries", () => {
  /**
   * The structural edge case behind the reported complaint, recorded as a census.
   *
   * Matching never leaves the industry, so where the taxonomy files substantially the
   * same business under two industries, the industry a visitor picks decides which half
   * of their real peer set they can see — and nothing in the form tells them a choice
   * was being made. Payments is the clearest instance: `sw-payments` (Software &
   * Internet) and `fin-payments` (BFSI) share five of their tags.
   *
   * The remedy available without relaxing the boundary is discovery, not scoring: one
   * query has to surface both rows so the choice is visible. `search-terms.test.ts`
   * asserts that it does. `scripts/proto-industry-tag.ts` records why relaxing the
   * boundary does NOT help — a company in the visitor's own industry AND line of
   * business outscores anything outside it, so cross-industry peers only ever reach the
   * top five where the industry was already short.
   *
   * The bound here is on how MANY such pairs exist. It is not zero and should not be:
   * a payments platform genuinely is both a software company and a financial services
   * company. What must not happen is the count growing unnoticed as business types are
   * added in admin.
   */
  function jaccard(a: BusinessType, b: BusinessType): number {
    const left = new Set(a.tags);
    const right = new Set(b.tags);
    const shared = [...left].filter((tag) => right.has(tag)).length;
    return shared / new Set([...left, ...right]).size;
  }

  const ambiguous = dataset.businessTypes.flatMap((a, i) =>
    dataset.businessTypes.slice(i + 1).flatMap((b) => {
      if (a.industry === b.industry) return [];
      const value = jaccard(a, b);
      return value >= 0.4 ? [{ a, b, value }] : [];
    }),
  );

  it("holds the payments pair, and it is a near-duplicate", () => {
    const pair = ambiguous.find(
      ({ a, b }) =>
        [a.id, b.id].includes("sw-payments") && [a.id, b.id].includes("fin-payments"),
    );
    expect(pair, "sw-payments and fin-payments must still read as one business").toBeDefined();
    expect(pair!.value).toBeGreaterThan(0.4);
  });

  /**
   * 186 pairs today, out of 12,403 cross-industry combinations. High, and mostly
   * benign: the tag vocabulary is 137 words shared across 158 types, so `b2b`,
   * `regulated` and `subscription-revenue` put a lot of unrelated pairs over 0.4. The
   * bound is a tripwire on the trend, not a target.
   */
  it("does not grow the ambiguous population unnoticed", () => {
    expect(ambiguous.length).toBeLessThanOrEqual(200);
  });

  /**
   * A pair identical in every tag is a different thing from an overlapping one: the two
   * rows describe the same business with no distinguishing characteristic at all, so
   * only the industry column separates them. Named rather than counted for the same
   * reason as the empty sub-industries.
   */
  it("has exactly these three pairs with identical tag sets", () => {
    const identical = ambiguous
      .filter(({ value }) => value === 1)
      .map(({ a, b }) => [a.id, b.id].sort().join(" / "))
      .sort();
    expect(identical).toEqual([
      "chem-packaging / mfg-packaging",
      "med-advertising / prof-marketing-services",
      "med-gaming / sw-gaming",
    ]);
  });
});

/* ────────────────────────────────────────────────────────────────────────────
 * Short sets
 * ──────────────────────────────────────────────────────────────────────────── */

describe("short peer sets", () => {
  /**
   * The floor is allowed to shorten a set and the copy says so. What is asserted is
   * that shortness is confined to the thin combinations it is supposed to come from —
   * a sub-industry with one or two members, in a band nobody occupies — rather than
   * appearing in a well-populated one, which would mean the floor had started biting
   * companies it should be admitting.
   */
  it("only ever come from a thin sub-industry", () => {
    const surprising: string[] = [];
    for (const visitor of everyTypedVisitor()) {
      const result = matchPeers(dataset, visitor);
      if (result.peers.length >= DEFAULT_PEER_LIMIT) continue;
      // Fewer than five peers is defensible when the whole line of business has few
      // members. Ten members and a short set is not.
      if ((membersByType.get(visitor.businessTypeId) ?? 0) >= 10) {
        surprising.push(`${visitor.label}: ${result.peers.length} peers`);
      }
    }
    expect(surprising).toEqual([]);
  });

  it("always report the shortfall so the copy can state it", () => {
    for (const visitor of everyTypedVisitor()) {
      const result = matchPeers(dataset, visitor);
      expect(result.shortfall, visitor.label).toBe(
        DEFAULT_PEER_LIMIT - result.peers.length,
      );
    }
  });
});
