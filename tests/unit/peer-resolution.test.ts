import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { DEFAULT_PEER_LIMIT, matchPeers, type VisitorInput } from "@/data/peers";
import { parseDataset, type BusinessType, type Company, type Dataset } from "@/data/schema";
import { buildSimilarityModel, businessSimilarity, tagsForCompany } from "@/data/similarity";

/**
 * WITHIN-SUB-INDUSTRY RESOLUTION — can the engine rank a truer peer above a
 * weaker one when both sit in the same corner of an industry?
 *
 * `match-quality.test.ts` proves the returned set is COHERENT. This file guards
 * the finer question behind a reported complaint: a payments visitor (think
 * Stripe) was shown card networks and money-transfer firms ahead of its true
 * merchant-acquirer peers. The cause was structural, not a bug — every payments
 * company carried an identical single tag set, so `businessSimilarity` (the share
 * of the VISITOR's IDF-weighted tag mass a company shares) was 1.0 for all of
 * them and had no power to order within the group. Ranking collapsed onto the 0.3
 * band term and the size tiebreak, and a small, new-to-India acquirer like Adyen
 * lost to the big networks every time.
 *
 * ── The fix these tests now guard ────────────────────────────────────────────
 *
 * `fin-payments` was split into four types — payment processing & gateways
 * (kept the id), card networks, money transfer & remittance, and commercial &
 * expense cards. The key move: each finer type carries ONE atom the other three
 * lack (processing→serves-retail, card-network→network-operator, money-transfer→
 * b2c, expense→finance-systems), because businessSimilarity is asymmetric — a
 * company only ranks below a peer if the VISITOR carries a tag that company does
 * not. All four keep the shared payments core, so a sibling stays above the 0.20
 * floor as a secondary peer and no set gets shorter. See docs/business-types.md
 * and scripts/business-type-map.ts for the per-company assignment.
 *
 * The general lesson is asserted at the bottom: within any single-type corner the
 * engine still cannot order (resolution is saturated by design, tags live on the
 * type). That is why a type that CONFLATES distinct businesses must be split —
 * this file is the template and the payments split is the worked example.
 */

const dataset: Dataset = parseDataset(
  JSON.parse(readFileSync(path.join(process.cwd(), "data", "dataset.json"), "utf8")),
);

const typeById = new Map<string, BusinessType>(
  dataset.businessTypes.map((type) => [type.id, type]),
);

/** Companies carrying a given business type, scoped to that type's own industry. */
function membersOf(typeId: string): Company[] {
  const type = typeById.get(typeId);
  if (!type) return [];
  return dataset.companies.filter(
    (c) => c.industry === type.industry && c.businessTypes.includes(typeId),
  );
}

/**
 * Mean pairwise symmetric businessSimilarity among the companies carrying one
 * business type, using that industry's own IDF weights. 1.0 means the engine sees
 * every member as identical — it can rank them only by band and size.
 */
function internalResolution(typeId: string): number {
  const type = typeById.get(typeId)!;
  const members = membersOf(typeId);
  if (members.length < 2) return Number.NaN;
  const { weights } = buildSimilarityModel(dataset, type.industry);
  const tagSets = members.map((m) => tagsForCompany(m, typeById));
  let total = 0;
  let pairs = 0;
  for (let i = 0; i < members.length; i += 1) {
    for (let j = i + 1; j < members.length; j += 1) {
      total +=
        (businessSimilarity(tagSets[i]!, tagSets[j]!, weights) +
          businessSimilarity(tagSets[j]!, tagSets[i]!, weights)) /
        2;
      pairs += 1;
    }
  }
  return total / pairs;
}

/* ────────────────────────────────────────────────────────────────────────────
 * The payments split exists and is shaped correctly
 * ──────────────────────────────────────────────────────────────────────────── */

describe("the payments bucket is split into four distinguishable types", () => {
  const PAYMENTS = ["fin-payments", "fin-card-network", "fin-money-transfer", "fin-expense-cards"];

  it("defines all four types in BFSI", () => {
    for (const id of PAYMENTS) {
      const type = typeById.get(id);
      expect(type, id).toBeDefined();
      expect(type!.industry).toBe("BFSI");
    }
  });

  it("gives each finer type one atom the other three lack", () => {
    const tags = new Map(PAYMENTS.map((id) => [id, new Set<string>(typeById.get(id)!.tags)]));
    const distinguisher: Record<string, string> = {
      "fin-payments": "serves-retail",
      "fin-card-network": "network-operator",
      "fin-money-transfer": "b2c",
      "fin-expense-cards": "finance-systems",
    };
    for (const [id, atom] of Object.entries(distinguisher)) {
      expect(tags.get(id)!.has(atom), `${id} must carry ${atom}`).toBe(true);
      for (const other of PAYMENTS) {
        if (other === id) continue;
        expect(tags.get(other)!.has(atom), `${other} must NOT carry ${atom}`).toBe(false);
      }
    }
  });

  it("keeps the shared payments core on all four, so siblings stay above the floor", () => {
    for (const id of PAYMENTS) {
      const tags = new Set<string>(typeById.get(id)!.tags);
      for (const core of ["payments-processing", "fintech", "regulated", "transaction-revenue"]) {
        expect(tags.has(core), `${id} must keep ${core}`).toBe(true);
      }
    }
  });
});

/* ────────────────────────────────────────────────────────────────────────────
 * The behaviour the complaint was about: a processing visitor sees processors
 * ──────────────────────────────────────────────────────────────────────────── */

describe("a Stripe-like payment-processing visitor now sees its true peers", () => {
  const stripe = (band: string): VisitorInput => ({
    companyName: "Stripe",
    industry: "BFSI",
    revenueBand: band,
    hqCountry: "USA",
    businessTypeId: "fin-payments",
  });

  it("returns processing/gateway companies, not card networks, at Stripe's band", () => {
    const peers = matchPeers(dataset, stripe("$10 Bn – $20 Bn")).peers;
    expect(peers).toHaveLength(DEFAULT_PEER_LIMIT);
    const names = peers.map((p) => p.name);
    // The old top five were TSYS, American Express, Mastercard, PayPal, Visa.
    // The networks must now be gone from a processing visitor's set.
    expect(names).not.toContain("Visa");
    expect(names).not.toContain("Mastercard");
    expect(names).not.toContain("American Express");
    // Every returned peer is a processing/gateway company.
    for (const peer of peers) {
      expect(peer.businessTypes, `${peer.name} should be a processing peer`).toContain("fin-payments");
    }
  });

  it("puts Adyen in the top five for a same-band processing visitor", () => {
    // Before the split Adyen ranked 16th of 189 for any payments visitor. Sharing
    // Adyen's band, a processing visitor now sees it among fellow acquirers.
    const peers = matchPeers(dataset, stripe("$1 Bn – $5 Bn")).peers.map((p) => p.name);
    expect(peers).toContain("Adyen");
  });
});

/* ────────────────────────────────────────────────────────────────────────────
 * Every finer type leads with its own members at its own band
 * ──────────────────────────────────────────────────────────────────────────── */

describe("each payments type leads with its own members where they exist", () => {
  // At the band its members actually occupy, a finer-type visitor's set is
  // dominated by that finer type — the ordering signal the split created.
  const cases: Array<{ id: string; band: string; want: number }> = [
    { id: "fin-payments", band: "$1 Bn – $5 Bn", want: 3 },
    { id: "fin-card-network", band: "$1 Bn – $5 Bn", want: 3 },
    { id: "fin-money-transfer", band: "$1 Bn – $5 Bn", want: 4 },
    { id: "fin-expense-cards", band: "$1 Bn – $5 Bn", want: 4 },
  ];

  for (const { id, band, want } of cases) {
    it(`${id} leads with at least ${want} of its own at ${band}`, () => {
      const peers = matchPeers(dataset, {
        industry: "BFSI",
        revenueBand: band,
        businessTypeId: id,
        hqCountry: "USA",
      }).peers;
      const own = peers.filter((p) => p.businessTypes.includes(id)).length;
      expect(own).toBeGreaterThanOrEqual(want);
    });
  }
});

/* ────────────────────────────────────────────────────────────────────────────
 * The general design fact that makes conflation matter
 * ──────────────────────────────────────────────────────────────────────────── */

describe("within a single-type corner, ranking is band-then-size by design", () => {
  /**
   * Tags live on the business type, not the company, so any two companies carrying
   * the same single type are identical to the engine. This is correct when the
   * members are genuine peers and wrong when the type conflates distinct
   * businesses — which is why the fix is to split the type, as payments was. The
   * fact itself is asserted, not alarmed at: it is the reason the whole exercise
   * exists.
   */
  it("saturates resolution for nearly every single-type corner", () => {
    const singleType = dataset.businessTypes.filter(
      (t) =>
        membersOf(t.id).length >= 2 &&
        membersOf(t.id).every((c) => c.businessTypes.length === 1),
    );
    for (const t of singleType) {
      expect(internalResolution(t.id), t.id).toBeGreaterThan(0.999);
    }
  });
});
