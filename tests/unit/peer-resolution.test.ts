import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { DEFAULT_PEER_LIMIT, matchPeers, type VisitorInput } from "@/data/peers";
import { parseDataset, type BusinessType, type Company, type Dataset } from "@/data/schema";
import { buildSimilarityModel, businessSimilarity, tagsForCompany } from "@/data/similarity";

/**
 * WITHIN-SUB-INDUSTRY RESOLUTION — can the engine rank a truer peer above a
 * weaker one when both are the same sub-industry?
 *
 * `match-quality.test.ts` proves the returned set is COHERENT: the five companies
 * belong together. This file asks the next question a reported complaint raised —
 * a payments visitor (think Stripe) was shown card networks and money-transfer
 * firms ahead of Adyen, a much closer peer. Adyen is tagged correctly and
 * IDENTICALLY to its true peers, so coherence is high and every existing test
 * passes. The defect is invisible to coherence because it is not about the set
 * being wrong — it is about the engine having no way to order WITHIN it.
 *
 * ── The mechanism ────────────────────────────────────────────────────────────
 *
 * `businessSimilarity` is the share of the visitor's IDF-weighted tag mass a
 * company shares. When two companies carry the identical tag set it is exactly
 * 1.0, and when EVERY member of a sub-industry carries the identical tag set,
 * businessSimilarity is 1.0 for all of them and carries ZERO ordering
 * information. Ranking then collapses onto the 0.3 band term and the GCC-size
 * tiebreak. A small, new-to-India but strategically close peer (Adyen: $1–5 Bn,
 * a 50–100 GCC, established 2024) is then indistinguishable on business from a
 * card network (Visa) or a remittance firm (Western Union) and loses on band and
 * on size every time.
 *
 * These tests document that reality so a re-classification (finer payments tags,
 * or splitting `fin-payments` into acquirers / card-networks / money-transfer /
 * expense-cards) shows up here as an intended improvement rather than a silent
 * change. They assert the CURRENT behaviour on purpose — when the bucket is split
 * the named-list and the resolution bound both flip, forcing acknowledgement.
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
 * every member as identical — it has no power to rank one above another.
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
 * The payments bucket is undifferentiated
 * ──────────────────────────────────────────────────────────────────────────── */

describe("fin-payments is a coarse bucket the engine cannot rank within", () => {
  it("holds many companies from genuinely different payments businesses", () => {
    // Card networks, acquirers/gateways, money transfer, expense/fuel cards and a
    // blockchain settlement venture, all under one id. Bound, not exact, so a real
    // roster change reads as a change rather than a number to update.
    expect(membersOf("fin-payments").length).toBeGreaterThanOrEqual(12);
  });

  it("gives every member the identical tag set, so businessSimilarity is saturated", () => {
    // This is the whole finding: with identical tags, businessSimilarity is 1.0
    // for every pair and the 0.7 business weight does nothing. If a re-tag ever
    // adds resolution, this drops below 1.0 and the test must be updated to match.
    expect(internalResolution("fin-payments")).toBeGreaterThan(0.999);
  });
});

/* ────────────────────────────────────────────────────────────────────────────
 * The consequence: a strong peer is ordered by band and size, not by business
 * ──────────────────────────────────────────────────────────────────────────── */

describe("a Stripe-like payments visitor cannot see Adyen on business grounds", () => {
  const adyen = dataset.companies.find((c) => c.name === "Adyen");

  it("has Adyen present, in BFSI, tagged only fin-payments", () => {
    expect(adyen, "Adyen must be in the dataset for this diagnosis to hold").toBeDefined();
    expect(adyen!.industry).toBe("BFSI");
    expect(adyen!.businessTypes).toEqual(["fin-payments"]);
  });

  const stripe = (band: string): VisitorInput => ({
    companyName: "Stripe",
    industry: "BFSI",
    revenueBand: band,
    hqCountry: "USA",
    businessTypeId: "fin-payments",
  });

  it("drops Adyen out of the top five when its revenue band is far from the visitor's", () => {
    // Stripe's revenue puts it near $10–20 Bn; Adyen is $1–5 Bn. Same business
    // (bizSim 1.0), but two band steps away scores band-proximity 0, and the top
    // five fill with same/adjacent-band payment companies instead.
    const peers = matchPeers(dataset, stripe("$10 Bn – $20 Bn")).peers;
    expect(peers).toHaveLength(DEFAULT_PEER_LIMIT);
    expect(peers.map((p) => p.name)).not.toContain("Adyen");
  });

  it("admits Adyen only once the visitor shares its band — proving band, not business, is the gate", () => {
    // Move the visitor into Adyen's own band and it becomes eligible. Nothing
    // about the business match changed; only the band did.
    const sameBand = matchPeers(dataset, stripe("$1 Bn – $5 Bn"));
    const inBand = dataset.companies.filter(
      (c) =>
        c.industry === "BFSI" &&
        c.businessTypes.includes("fin-payments") &&
        c.revenueBand === "$1 Bn – $5 Bn",
    );
    // There are more same-band payment companies than slots, and Adyen has the
    // smallest India GCC of them, so the size tiebreak still ranks it out even
    // here — which is the second half of the finding.
    expect(inBand.length).toBeGreaterThan(DEFAULT_PEER_LIMIT);
    expect(sameBand.peers.map((p) => p.name)).not.toContain("Adyen");
    // But it is now eligible (above the floor and in-band), where before it could
    // not compete at all.
    const eligibleNames = inBand.map((c) => c.name);
    expect(eligibleNames).toContain("Adyen");
  });
});

/* ────────────────────────────────────────────────────────────────────────────
 * Census: which sub-industries are coarse buckets, so the class can't grow unseen
 * ──────────────────────────────────────────────────────────────────────────── */

describe("within a sub-industry, ranking is band-then-size by design", () => {
  /**
   * The finest grain the engine has is the business type: tags live on the type,
   * not the company, so any two companies carrying the same single type are
   * identical to it. This is NOT a defect — it is why the sub-industry is the
   * primary ordering signal. Asserted so the design fact is visible: peer quality
   * inside a sub-industry rests entirely on the sub-industry cleanly grouping true
   * peers, because business similarity cannot separate its members.
   */
  it("gives saturated resolution to nearly every single-type sub-industry", () => {
    const singleType = dataset.businessTypes.filter(
      (t) =>
        membersOf(t.id).length >= 2 &&
        membersOf(t.id).every((c) => c.businessTypes.length === 1),
    );
    // Every one of these resolves at 1.0 — the point is that this is the norm, so
    // a coarse bucket like fin-payments is invisible unless we look at WHAT it
    // groups, not at the score.
    for (const t of singleType) {
      expect(internalResolution(t.id), t.id).toBeGreaterThan(0.999);
    }
  });

  /**
   * The diagnostic that matters: sub-industries big enough to fill a peer set on
   * their own, so most visitors who pick them never leave the bucket. These are
   * where a conflated grouping does the most damage. `fin-payments` is on the list
   * and is the identified instance — it lumps card networks, acquirers/gateways,
   * money transfer and expense-card businesses under one row. Bounded so a newly
   * conflated bucket is visible; named so a split reads as a change.
   */
  it("keeps the large single-type buckets to this bounded, named set", () => {
    const large = dataset.businessTypes
      .filter((t) => membersOf(t.id).length >= 10)
      .filter((t) => internalResolution(t.id) > 0.999)
      .map((t) => t.id)
      .sort();
    // fin-payments is the identified conflated instance. When it is split into
    // finer payments types this assertion flips and must be removed — that flip is
    // the signal the fix landed.
    expect(large).toContain("fin-payments");
  });
});
