/**
 * Peer-quality measurement — the before/after harness for taxonomy splits.
 *
 *   npx tsx scripts/measure-peers.ts                 # global guardrails
 *   npx tsx scripts/measure-peers.ts <typeId> [band] # top-5 for one visitor
 *
 * Global guardrails (must not regress across a split):
 *   - total short sets over every typed visitor (industry x business-type x band)
 *   - mean coherence of the returned set for the "good path" visitors
 *   - untagged fraction per industry
 * Per-visitor detail shows the actual top-5 and that set's coherence, which is how
 * an improvement is demonstrated concretely.
 *
 * Read-only. Run against the current data before a change and again after
 * re-import; diff the two outputs.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

import { DEFAULT_PEER_LIMIT, matchPeers } from "../src/data/peers";
import { parseDataset, type BusinessType, type Company, type Dataset } from "../src/data/schema";
import { buildSimilarityModel, businessSimilarity, tagsForCompany } from "../src/data/similarity";

const dataset: Dataset = parseDataset(
  JSON.parse(readFileSync(path.join(process.cwd(), "data", "dataset.json"), "utf8")),
);
const typeById = new Map<string, BusinessType>(dataset.businessTypes.map((t) => [t.id, t]));
const bands = dataset.taxonomy.revenueBands;

function coherence(peers: readonly Company[], industry: string): number {
  if (peers.length < 2) return Number.NaN;
  const { weights } = buildSimilarityModel(dataset, industry);
  const sets = peers.map((p) => tagsForCompany(p, typeById));
  let total = 0;
  let pairs = 0;
  for (let i = 0; i < peers.length; i += 1) {
    for (let j = i + 1; j < peers.length; j += 1) {
      total += (businessSimilarity(sets[i]!, sets[j]!, weights) + businessSimilarity(sets[j]!, sets[i]!, weights)) / 2;
      pairs += 1;
    }
  }
  return total / pairs;
}

function everyTypedVisitor() {
  return dataset.businessTypes.flatMap((t) =>
    bands.map((band) => ({ industry: t.industry, revenueBand: band, businessTypeId: t.id, label: `${t.id} / ${band}` })),
  );
}

const detailType = process.argv[2];
if (detailType) {
  const type = typeById.get(detailType);
  if (!type) {
    console.log(`No such business type "${detailType}".`);
    process.exit(0);
  }
  const chosenBands = process.argv[3] ? [process.argv[3]] : bands;
  for (const band of chosenBands) {
    const result = matchPeers(dataset, {
      industry: type.industry,
      revenueBand: band,
      businessTypeId: detailType,
      hqCountry: "USA",
    });
    const c = coherence(result.peers, type.industry);
    console.log(`\n${detailType} · ${type.name} · ${band}`);
    console.log(`  peers (${result.peers.length}, coherence ${Number.isNaN(c) ? "n/a" : c.toFixed(3)}):`);
    for (const p of result.peers) {
      console.log(`    ${p.name.padEnd(28)} ${p.revenueBand.padEnd(16)} fte ${p.fte.min}-${p.fte.max}  [${p.businessTypes.join(", ")}]`);
    }
  }
  process.exit(0);
}

// Global guardrails.
let shortSets = 0;
const coherences: number[] = [];
for (const v of everyTypedVisitor()) {
  const result = matchPeers(dataset, v);
  if (result.peers.length < DEFAULT_PEER_LIMIT) shortSets += 1;
  const c = coherence(result.peers, v.industry);
  if (!Number.isNaN(c)) coherences.push(c);
}
const meanCoherence = coherences.reduce((a, b) => a + b, 0) / coherences.length;

console.log("GLOBAL GUARDRAILS");
console.log(`  typed visitors            ${everyTypedVisitor().length}`);
console.log(`  short sets (<5 peers)     ${shortSets}`);
console.log(`  mean set coherence        ${meanCoherence.toFixed(4)}`);
console.log(`  business types            ${dataset.businessTypes.length}`);
console.log(`  distinct tags in use      ${new Set(dataset.businessTypes.flatMap((t) => t.tags)).size}`);

console.log("\n  untagged fraction by industry (want < 0.25):");
for (const industry of dataset.taxonomy.industries) {
  const pool = dataset.companies.filter((c) => c.industry === industry);
  const untagged = pool.filter((c) => c.businessTypes.length === 0).length;
  const frac = untagged / pool.length;
  if (frac > 0.15) console.log(`    ${industry.padEnd(40)} ${(frac * 100).toFixed(1)}%  (${untagged}/${pool.length})`);
}
