/**
 * Throwaway analysis: what SIMILARITY_FLOOR costs and buys at four values.
 *
 * Not a maintenance tool. Delete after reading, or keep it deliberately.
 *
 * `matchPeers` takes the floor from `meetsFloor`'s default, so this file
 * replicates its eligibility-sort-slice with the floor as a parameter. A
 * replication can drift from the original, so the first thing the script does is
 * assert that at the SHIPPED floor it reproduces `matchPeers` company-for-company
 * across all 1064 combinations. If that check fails, every number below is
 * worthless.
 *
 * The self-check reads `SIMILARITY_FLOOR` rather than naming a number. It used to
 * hardcode 0.15, which meant raising the shipped floor to 0.20 made this script
 * declare itself UNSOUND and refuse to run — the check was measuring the constant
 * instead of the replication it exists to validate.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

import { fteMidpoint } from "../src/data/derive";
import { matchPeers, companiesInIndustry, DEFAULT_PEER_LIMIT } from "../src/data/peers";
import { datasetSchema, type Company, type Dataset } from "../src/data/schema";
import { businessTypesForIndustry } from "../src/data/screen1";
import {
  buildSimilarityModel,
  scoreCompany,
  visitorTags,
  SIMILARITY_FLOOR,
  type IndustrySimilarityModel,
} from "../src/data/similarity";

const FLOORS = [0.1, 0.15, 0.2, 0.25] as const;

function loadDataset(): Dataset {
  const file = path.join(process.cwd(), "data", "dataset.json");
  return datasetSchema.parse(JSON.parse(readFileSync(file, "utf8")));
}

interface SweepResult {
  peers: Company[];
  eligibleCount: number;
  poolCount: number;
  floorShortened: boolean;
}

/** `matchPeers`, with the floor injected. Comparator copied verbatim. */
function matchAtFloor(
  dataset: Dataset,
  model: IndustrySimilarityModel,
  input: {
    industry: string;
    revenueBand: string;
    businessTypeId?: string;
    hqCountry?: string;
    companyName?: string;
  },
  floor: number,
  limit: number = DEFAULT_PEER_LIMIT,
): SweepResult {
  // `isVisitorsOwn` is private to peers.ts; replicated here. Without it a visitor
  // appears in their own peer set, which the self-check does NOT catch because
  // verify-data.ts never passes a company name.
  const ownName = input.companyName?.trim().toLowerCase();
  const pool = companiesInIndustry(dataset, input.industry).filter(
    (company) => !ownName || company.name.trim().toLowerCase() !== ownName,
  );
  const visitor = visitorTags(dataset.businessTypes, input.businessTypeId);
  const bands = dataset.taxonomy.revenueBands;

  const scored = pool.map((company) =>
    scoreCompany(company, {
      model,
      revenueBands: bands,
      visitorTags: visitor,
      visitorBand: input.revenueBand,
    }),
  );

  const eligible = scored.filter((entry) =>
    visitor.size === 0 ? true : entry.businessSimilarity >= floor,
  );

  eligible.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (input.hqCountry) {
      const aHome = a.company.hqCountry === input.hqCountry ? 0 : 1;
      const bHome = b.company.hqCountry === input.hqCountry ? 0 : 1;
      if (aHome !== bHome) return aHome - bHome;
    }
    const sizeDelta = fteMidpoint(b.company.fte) - fteMidpoint(a.company.fte);
    if (sizeDelta !== 0) return sizeDelta;
    if (a.company.establishedYear !== b.company.establishedYear) {
      return a.company.establishedYear - b.company.establishedYear;
    }
    return a.company.name.localeCompare(b.company.name);
  });

  const chosen = eligible.slice(0, limit);
  return {
    peers: chosen.map((entry) => entry.company),
    eligibleCount: eligible.length,
    poolCount: pool.length,
    floorShortened:
      chosen.length < limit && eligible.length < Math.min(limit, pool.length),
  };
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2
    : (sorted[mid] ?? 0);
}

const dataset = loadDataset();
const models = new Map<string, IndustrySimilarityModel>();
for (const industry of dataset.taxonomy.industries) {
  models.set(industry, buildSimilarityModel(dataset, industry));
}

/* ── Self-check: the replication must equal `matchPeers` at 0.15 ─────────── */
let drift = 0;
let combos = 0;
for (const industry of dataset.taxonomy.industries) {
  const model = models.get(industry)!;
  for (const type of businessTypesForIndustry(dataset, industry)) {
    for (const revenueBand of dataset.taxonomy.revenueBands) {
      const input = { industry, revenueBand, businessTypeId: type.id };
      combos += 1;
      const mine = matchAtFloor(dataset, model, input, SIMILARITY_FLOOR)
        .peers.map((p) => p.id)
        .join(",");
      const real = matchPeers(dataset, input).peers.map((p) => p.id).join(",");
      if (mine !== real) drift += 1;
    }
  }
}
console.log(
  `self-check: ${combos} combinations, ${drift} divergence from matchPeers at the ` +
    `shipped floor of ${SIMILARITY_FLOOR} -> ${drift === 0 ? "SOUND" : "UNSOUND, stop reading"}`,
);
if (drift !== 0) process.exit(1);

/* ── Sweep ───────────────────────────────────────────────────────────────── */
console.log("\n=== aggregate over all industry x business-type x band combinations ===");
console.log("floor  shortened  %shortened  median  mean  emptied  full5");
for (const floor of FLOORS) {
  const counts: number[] = [];
  let shortened = 0;
  let emptied = 0;
  let full = 0;
  for (const industry of dataset.taxonomy.industries) {
    const model = models.get(industry)!;
    for (const type of businessTypesForIndustry(dataset, industry)) {
      for (const revenueBand of dataset.taxonomy.revenueBands) {
        const r = matchAtFloor(dataset, model, { industry, revenueBand, businessTypeId: type.id }, floor);
        counts.push(r.peers.length);
        if (r.floorShortened) shortened += 1;
        if (r.peers.length === 0 && r.poolCount > 0) emptied += 1;
        if (r.peers.length === 5) full += 1;
      }
    }
  }
  const mean = counts.reduce((a, b) => a + b, 0) / counts.length;
  console.log(
    `${floor.toFixed(2)}   ${String(shortened).padStart(4)}       ` +
      `${((shortened / counts.length) * 100).toFixed(1).padStart(5)}%   ` +
      `${median(counts).toFixed(1).padStart(4)}   ${mean.toFixed(2)}   ` +
      `${String(emptied).padStart(4)}   ${String(full).padStart(4)}`,
  );
}

/* ── Named visitors ──────────────────────────────────────────────────────── */
function findType(industry: string, needle: string) {
  const types = businessTypesForIndustry(dataset, industry);
  const hit = types.find((t) => t.name.toLowerCase().includes(needle.toLowerCase()));
  if (!hit) {
    console.log(`\n!! no business type in ${industry} matching "${needle}". Available:`);
    console.log(types.map((t) => `   ${t.id}  ${t.name}`).join("\n"));
  }
  return hit;
}

const VISITORS = [
  // Nike's real row: Retail / Above $20 Bn / USA / ret-apparel.
  { label: 'Nike — Retail / "Apparel & Footwear Brand"', industry: "Retail", needle: "apparel", band: "Above $20 Bn", hq: "USA", companyName: "Nike" },
  { label: "Mid-size BFSI insurer — $1–5 Bn", industry: "BFSI", needle: "Life & Health Insurance", band: "$1 Bn – $5 Bn", hq: "USA" },
  // There is no "SaaS" type: the vocabulary is by domain, not delivery model.
  // ERP & Core Business Systems is the closest thing to enterprise SaaS.
  { label: "Enterprise SaaS — ERP & Core Business Systems, $1–5 Bn", industry: "Software & Internet", needle: "ERP", band: "$1 Bn – $5 Bn", hq: "USA" },
];

for (const v of VISITORS) {
  console.log(`\n=== ${v.label} ===`);
  const model = models.get(v.industry);
  if (!model) {
    console.log(`   !! no such industry "${v.industry}". Available: ${dataset.taxonomy.industries.join(", ")}`);
    continue;
  }
  const type = findType(v.industry, v.needle);
  if (!type) continue;
  console.log(`   industry=${v.industry}  band=${v.band}  type=${type.name} (${type.id})`);
  const full = dataset.businessTypes.find((t) => t.id === type.id)!;
  console.log(`   tags: ${full.tags.join(", ")}`);
  // Baseline: what this visitor got before business types existed, i.e. no type
  // selected. Same engine, empty visitor tag set, so the floor cannot apply.
  const base = matchAtFloor(dataset, model, {
    industry: v.industry,
    revenueBand: v.band,
    hqCountry: v.hq,
    companyName: v.companyName,
  }, 0.15);
  console.log(`   ladder  [${base.peers.length}/5]  ${base.peers.map((p) => p.name).join(" · ")}`);

  for (const floor of FLOORS) {
    const r = matchAtFloor(dataset, model, {
      industry: v.industry,
      revenueBand: v.band,
      businessTypeId: type.id,
      hqCountry: v.hq,
      companyName: v.companyName,
    }, floor);
    const names = r.peers.map((p) => p.name).join(" · ") || "(none)";
    console.log(
      `   ${floor.toFixed(2)}    [${r.peers.length}/5, eligible ${r.eligibleCount}/${r.poolCount}]  ${names}`,
    );
  }
}

/* ── Where the floor actually bites ──────────────────────────────────────────
 *
 * The named visitors above return the SAME five peers at every floor, which is
 * structural rather than luck: the floor only ever removes low-similarity
 * companies, and those sort below high-similarity ones anyway. So the floor can
 * never change WHICH peers lead — it can only truncate a set that had fewer than
 * five above it. The whole decision is therefore about the marginal sets.
 */
console.log("\n=== peer-count distribution (1064 combinations) ===");
console.log("floor    5     4     3     2     1     0");
for (const floor of FLOORS) {
  const hist = [0, 0, 0, 0, 0, 0];
  for (const industry of dataset.taxonomy.industries) {
    const model = models.get(industry)!;
    for (const type of businessTypesForIndustry(dataset, industry)) {
      for (const revenueBand of dataset.taxonomy.revenueBands) {
        const r = matchAtFloor(dataset, model, { industry, revenueBand, businessTypeId: type.id }, floor);
        const slot = 5 - Math.min(5, r.peers.length);
        hist[slot] = (hist[slot] ?? 0) + 1;
      }
    }
  }
  console.log(
    `${floor.toFixed(2)}  ` +
      [hist[0], hist[1], hist[2], hist[3], hist[4], hist[5]]
        .map((n) => String(n).padStart(4))
        .join("  "),
  );
}

/**
 * The marginal peers: companies shown at 0.10 that 0.15 refuses, and shown at
 * 0.15 that 0.20 refuses. This is the judgement call made concrete — if the
 * rejected company reads as a defensible peer the floor is too high, and if it
 * reads as obviously wrong the floor is doing its job.
 */
function marginalExamples(lower: number, upper: number, want: number): string[] {
  const out: string[] = [];
  for (const industry of dataset.taxonomy.industries) {
    const model = models.get(industry)!;
    for (const type of businessTypesForIndustry(dataset, industry)) {
      for (const revenueBand of dataset.taxonomy.revenueBands) {
        if (out.length >= want) return out;
        const input = { industry, revenueBand, businessTypeId: type.id };
        const lo = matchAtFloor(dataset, model, input, lower);
        const hi = matchAtFloor(dataset, model, input, upper);
        if (lo.peers.length <= hi.peers.length) continue;
        const dropped = lo.peers.filter((p) => !hi.peers.some((q) => q.id === p.id));
        if (dropped.length === 0) continue;
        const visitor = visitorTags(dataset.businessTypes, type.id);
        for (const company of dropped) {
          const s = scoreCompany(company, {
            model,
            revenueBands: dataset.taxonomy.revenueBands,
            visitorTags: visitor,
            visitorBand: revenueBand,
          });
          out.push(
            `   ${type.name} (${industry}, ${revenueBand})\n` +
              `      would show: ${company.name}  [sim ${s.businessSimilarity.toFixed(3)}]\n` +
              `      shares: ${s.sharedTags.join(", ") || "(nothing weighted)"}`,
          );
        }
      }
    }
  }
  return out;
}

console.log("\n=== admitted at 0.10, refused at 0.15 ===");
console.log(marginalExamples(0.1, 0.15, 6).join("\n") || "   (none)");
console.log("\n=== admitted at 0.15, refused at 0.20 ===");
console.log(marginalExamples(0.15, 0.2, 6).join("\n") || "   (none)");

/**
 * Claim under test: raising the floor can only ever TRUNCATE a peer set, never
 * reorder or substitute. If true, the floor is purely a length/quality dial and
 * cannot make a peer set worse at the top — which is the single most important
 * property for deciding its value.
 */
console.log("\n=== is a higher floor always a prefix of a lower one? ===");
for (let i = 1; i < FLOORS.length; i += 1) {
  const lower = FLOORS[i - 1]!;
  const upper = FLOORS[i]!;
  let violations = 0;
  let truncations = 0;
  for (const industry of dataset.taxonomy.industries) {
    const model = models.get(industry)!;
    for (const type of businessTypesForIndustry(dataset, industry)) {
      for (const revenueBand of dataset.taxonomy.revenueBands) {
        const input = { industry, revenueBand, businessTypeId: type.id };
        const lo = matchAtFloor(dataset, model, input, lower).peers.map((p) => p.id);
        const hi = matchAtFloor(dataset, model, input, upper).peers.map((p) => p.id);
        if (hi.length < lo.length) truncations += 1;
        const isPrefix = hi.every((id, index) => lo[index] === id);
        if (!isPrefix) violations += 1;
      }
    }
  }
  console.log(
    `   ${upper.toFixed(2)} vs ${lower.toFixed(2)}: ${truncations} truncated, ` +
      `${violations} reordered/substituted -> ${violations === 0 ? "pure truncation" : "NOT pure"}`,
  );
}

/**
 * The substitutions found above are the interesting case: a company BELOW the
 * floor can still outrank one above it, because the combined score gives a
 * perfect band match 0.3 while similarity is only weighted 0.7. Raising the floor
 * evicts that interloper and promotes a more similar company into view.
 *
 * So the question is directional: when the set changes, is the newcomer MORE
 * similar than the company it replaced? If yes, a higher floor improves the set
 * rather than merely shortening it.
 */
console.log("\n=== direction of substitutions, 0.20 vs 0.15 ===");
let better = 0;
let worse = 0;
const samples: string[] = [];
for (const industry of dataset.taxonomy.industries) {
  const model = models.get(industry)!;
  for (const type of businessTypesForIndustry(dataset, industry)) {
    for (const revenueBand of dataset.taxonomy.revenueBands) {
      const input = { industry, revenueBand, businessTypeId: type.id };
      const lo = matchAtFloor(dataset, model, input, 0.15).peers;
      const hi = matchAtFloor(dataset, model, input, 0.2).peers;
      const gained = hi.filter((p) => !lo.some((q) => q.id === p.id));
      const lost = lo.filter((p) => !hi.some((q) => q.id === p.id));
      if (gained.length === 0) continue;
      const visitor = visitorTags(dataset.businessTypes, type.id);
      const sim = (c: (typeof lo)[number]) =>
        scoreCompany(c, {
          model,
          revenueBands: dataset.taxonomy.revenueBands,
          visitorTags: visitor,
          visitorBand: revenueBand,
        }).businessSimilarity;
      const gainedAvg = gained.reduce((a, c) => a + sim(c), 0) / gained.length;
      const lostAvg = lost.length ? lost.reduce((a, c) => a + sim(c), 0) / lost.length : 0;
      if (gainedAvg > lostAvg) better += 1;
      else worse += 1;
      if (samples.length < 4) {
        samples.push(
          `   ${type.name} (${industry}, ${revenueBand})\n` +
            `      gained: ${gained.map((c) => `${c.name} [${sim(c).toFixed(3)}]`).join(", ")}\n` +
            `      lost:   ${lost.map((c) => `${c.name} [${sim(c).toFixed(3)}]`).join(", ") || "(nothing, set grew)"}`,
        );
      }
    }
  }
}
console.log(`   sets where the newcomer is MORE similar than the company it replaced: ${better}`);
console.log(`   sets where it is LESS similar: ${worse}`);
console.log(samples.join("\n"));
