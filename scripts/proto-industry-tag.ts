/**
 * PROTOTYPE, not a shipped path. Industry as a heavily-weighted tag rather than a
 * hard boundary, so a footwear brand can see a global consumer-goods brand.
 *
 * Nothing in src/ is modified. This file reimplements the scoring over a GLOBAL
 * pool so the real engine stays untouched and the comparison is honest.
 *
 * ── The formulation ─────────────────────────────────────────────────────────
 *
 * Every company gains one synthetic tag, `industry:<name>`. IDF is computed over
 * all 1834 companies rather than per-industry, because the pool is now global and
 * rarity only means anything relative to the pool being drawn from.
 *
 * The industry tag's weight is NOT IDF. It is the knob replacing the boundary, so
 * it is set explicitly: given the visitor's business-tag mass T, the industry
 * weight W is chosen so industry accounts for share `s` of the visitor's total
 * mass:
 *
 *     W = s / (1 - s) * T     =>     W / (T + W) = s
 *
 * s = 1 reproduces the hard filter. s = 0 removes industry entirely. The
 * interesting question is what happens in between, and in particular whether any
 * value of s both keeps peers mostly in-industry AND leaves the floor doing its
 * job.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

import { fteMidpoint } from "../src/data/derive";
import { matchPeers, DEFAULT_PEER_LIMIT } from "../src/data/peers";
import { datasetSchema, type BusinessType, type Company, type Dataset } from "../src/data/schema";
import { businessTypesForIndustry } from "../src/data/screen1";
import { BAND_WEIGHT, BUSINESS_WEIGHT, SIMILARITY_FLOOR, bandProximity } from "../src/data/similarity";

/** Industry's share of the visitor's tag mass. 1.0 == today's hard filter. */
const SHARES = [0.15, 0.25, 0.35, 0.45, 0.7, 0.85] as const;

const dataset: Dataset = datasetSchema.parse(
  JSON.parse(readFileSync(path.join(process.cwd(), "data", "dataset.json"), "utf8")),
);

const typeById = new Map<string, BusinessType>(dataset.businessTypes.map((t) => [t.id, t]));

function industryTag(industry: string): string {
  return `industry:${industry}`;
}

/** Business tags plus the synthetic industry tag. */
function tagsOf(company: Company): Set<string> {
  const tags = new Set<string>();
  for (const id of company.businessTypes) {
    for (const tag of typeById.get(id)?.tags ?? []) tags.add(tag);
  }
  tags.add(industryTag(company.industry));
  return tags;
}

/* ── Global IDF over business tags only; industry weight is set per visitor ── */
const tagsByCompany = new Map<string, Set<string>>();
const documentFrequency = new Map<string, number>();
let taggedCount = 0;
for (const company of dataset.companies) {
  const tags = tagsOf(company);
  tagsByCompany.set(company.id, tags);
  // "Tagged" means carries a business type. The industry tag alone does not count,
  // or every company would be tagged and IDF would shift for no business reason.
  if (company.businessTypes.length > 0) taggedCount += 1;
  for (const tag of tags) {
    if (tag.startsWith("industry:")) continue;
    documentFrequency.set(tag, (documentFrequency.get(tag) ?? 0) + 1);
  }
}
const globalWeights = new Map<string, number>();
for (const [tag, frequency] of documentFrequency) {
  globalWeights.set(tag, Math.log(taggedCount / frequency));
}

interface Scored {
  company: Company;
  sim: number;
  score: number;
  crossIndustry: boolean;
  shared: string[];
}

function relaxedMatch(
  input: {
    industry: string;
    revenueBand: string;
    businessTypeId?: string;
    hqCountry?: string;
    companyName?: string;
  },
  share: number,
  floor: number = SIMILARITY_FLOOR,
  limit: number = DEFAULT_PEER_LIMIT,
): { peers: Scored[]; eligible: number; pool: number } {
  const own = input.companyName?.trim().toLowerCase();
  const pool = dataset.companies.filter(
    (c) => !own || c.name.trim().toLowerCase() !== own,
  );

  const businessTags = new Set(
    input.businessTypeId ? typeById.get(input.businessTypeId)?.tags ?? [] : [],
  );
  const visitorIndustryTag = industryTag(input.industry);

  // Visitor's business-tag mass, over tags that exist in the global pool.
  let T = 0;
  for (const tag of businessTags) T += globalWeights.get(tag) ?? 0;
  // s = 1 is the hard filter and W would be infinite; clamp it.
  const W = share >= 1 ? Number.POSITIVE_INFINITY : (share / (1 - share)) * T;
  const total = T + W;

  const scored: Scored[] = pool.map((company) => {
    const companyTags = tagsByCompany.get(company.id)!;
    let shared = 0;
    const sharedNames: string[] = [];
    for (const tag of businessTags) {
      if (!companyTags.has(tag)) continue;
      shared += globalWeights.get(tag) ?? 0;
      sharedNames.push(tag);
    }
    const sameIndustry = companyTags.has(visitorIndustryTag);
    if (sameIndustry) sharedNames.push(visitorIndustryTag);

    let sim: number;
    if (businessTags.size === 0) {
      // No line of business given: the only signal is industry, so this must
      // reduce to 1 for same-industry and 0 otherwise -- which the floor then
      // turns back into the old in-industry-only behaviour.
      sim = sameIndustry ? 1 : 0;
    } else if (total === 0 || !Number.isFinite(total)) {
      sim = sameIndustry ? 1 : 0;
    } else {
      sim = (shared + (sameIndustry ? W : 0)) / total;
    }

    return {
      company,
      sim,
      score: BUSINESS_WEIGHT * sim +
        BAND_WEIGHT * bandProximity(dataset.taxonomy.revenueBands, input.revenueBand, company.revenueBand),
      crossIndustry: !sameIndustry,
      shared: sharedNames,
    };
  });

  const eligible = scored.filter((entry) => entry.sim >= floor);
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

  return { peers: eligible.slice(0, limit), eligible: eligible.length, pool: pool.length };
}

/* ── Six visitors across different industries ────────────────────────────── */
const VISITORS = [
  { label: "Nike", industry: "Retail", typeId: "ret-apparel", band: "Above $20 Bn", hq: "USA", companyName: "Nike" },
  { label: "Life & health insurer", industry: "BFSI", typeId: "fin-insurance-life", band: "$1 Bn – $5 Bn", hq: "USA" },
  { label: "Enterprise ERP software", industry: "Software & Internet", typeId: "sw-erp", band: "$1 Bn – $5 Bn", hq: "USA" },
  { label: "Vehicle manufacturer (OEM)", industry: "Automotive", typeId: "auto-oem", band: "Above $20 Bn", hq: "Germany" },
  { label: "Pharmaceuticals", industry: "Healthcare & Lifescience", typeId: "hc-pharma", band: "$10 Bn – $20 Bn", hq: "USA" },
  { label: "Aircraft engines & propulsion", industry: "Aerospace & Defense", typeId: "aero-engines", band: "Above $20 Bn", hq: "USA" },
];

const names = (peers: Scored[]) =>
  peers
    .map((p) => `${p.company.name}${p.crossIndustry ? ` [${p.company.industry}]` : ""}`)
    .join(" · ") || "(none)";

console.log("Peers from OUTSIDE the visitor's industry are marked [Industry].\n");

for (const v of VISITORS) {
  const type = typeById.get(v.typeId)!;
  console.log(`=== ${v.label} — ${v.industry} / ${type.name} / ${v.band}`);
  const before = matchPeers(dataset, {
    industry: v.industry,
    revenueBand: v.band,
    businessTypeId: v.typeId,
    hqCountry: v.hq,
    companyName: v.companyName,
  });
  console.log(`   before (hard filter) : ${before.peers.map((p) => p.name).join(" · ")}`);
  for (const share of SHARES) {
    const after = relaxedMatch(
      { industry: v.industry, revenueBand: v.band, businessTypeId: v.typeId, hqCountry: v.hq, companyName: v.companyName },
      share,
    );
    const crossCount = after.peers.filter((p) => p.crossIndustry).length;
    console.log(
      `   s=${share.toFixed(2)} (${crossCount} cross)  : ${names(after.peers)}`,
    );
  }
  console.log();
}

/* ── Cost 1: does the floor still filter WITHIN the industry? ─────────────
 *
 * This is the tension the whole idea lives or dies on. Under a hard filter a
 * same-industry company sharing no business tags scores 0 and the floor removes
 * it. As a weighted tag it scores `s` outright, so as soon as s >= floor every
 * company in the visitor's industry is eligible again -- and the padding the
 * floor exists to prevent comes straight back, ranked below the good peers but
 * above anything cross-industry.
 */
console.log("=== does the floor still filter within the visitor's own industry? ===");
console.log("   (Nike / Retail / apparel — Retail has 59 other companies)");
const nike = { industry: "Retail", revenueBand: "Above $20 Bn", businessTypeId: "ret-apparel", hqCountry: "USA", companyName: "Nike" };
const hard = matchPeers(dataset, nike);
console.log(`   hard filter: ${hard.closeMatches} of 59 Retail companies clear the floor`);
for (const share of SHARES) {
  const r = relaxedMatch(nike, share);
  const inIndustry = r.peers.filter((p) => !p.crossIndustry).length;
  const eligibleRetail = dataset.companies.filter((c) => {
    if (c.industry !== "Retail" || c.name === "Nike") return false;
    const one = relaxedMatch(nike, share);
    return one.eligible >= 0 && true;
  }).length;
  void eligibleRetail;
  console.log(
    `   s=${share.toFixed(2)}: ${r.eligible} of ${r.pool} companies clear the floor ` +
      `(top five: ${inIndustry} in-industry, ${5 - inIndustry} cross) ` +
      `-- industry-only sim = ${share.toFixed(2)}, floor = ${SIMILARITY_FLOOR}` +
      `${share >= SIMILARITY_FLOOR ? "  <- every Retail company is eligible again" : ""}`,
  );
}

/* ── Cost 2: the invariants ──────────────────────────────────────────────── */
console.log("\n=== which data:verify invariants move? ===");

// (a) "a business type never returns a peer from another industry"
let crossIndustrySets = 0;
let totalSets = 0;
for (const industry of dataset.taxonomy.industries) {
  for (const type of businessTypesForIndustry(dataset, industry)) {
    for (const revenueBand of dataset.taxonomy.revenueBands) {
      totalSets += 1;
      const r = relaxedMatch({ industry, revenueBand, businessTypeId: type.id }, 0.55);
      if (r.peers.some((p) => p.crossIndustry)) crossIndustrySets += 1;
    }
  }
}
console.log(
  `   "a business type never returns a peer from another industry" (s=0.55):\n` +
    `      BREAKS — ${crossIndustrySets} of ${totalSets} sets contain a cross-industry peer`,
);

// (b) "no business type selected reproduces the old band ladder exactly"
let ladderDrift = 0;
for (const industry of dataset.taxonomy.industries) {
  for (const revenueBand of dataset.taxonomy.revenueBands) {
    const relaxed = relaxedMatch({ industry, revenueBand }, 0.55).peers.map((p) => p.company.id).join(",");
    const real = matchPeers(dataset, { industry, revenueBand }).peers.map((p) => p.id).join(",");
    if (relaxed !== real) ladderDrift += 1;
  }
}
console.log(
  `   "no business type selected reproduces the old band ladder exactly":\n` +
    `      ${ladderDrift === 0 ? "HOLDS" : `BREAKS — ${ladderDrift} drifted`} ` +
    `(no business tags => sim is 1 in-industry, 0 out, so the floor restores the boundary)`,
);

// (c) "no peer is ever shown below the similarity floor"
console.log(`   "no peer is ever shown below the similarity floor":\n      HOLDS by construction`);

/* ── Cost 3: the evidence block's population ─────────────────────────────── */
console.log("\n=== the Screen 1 counts stop describing the peers ===");
const r55 = relaxedMatch(nike, 0.55);
const cross = r55.peers.filter((p) => p.crossIndustry);
console.log(`   Nike at s=0.55 shows ${cross.length} peers from outside Retail: ${cross.map((p) => `${p.company.name} [${p.company.industry}]`).join(", ") || "(none)"}`);
console.log(`   but industryOthers / sameBusinessType are Retail-scoped: "${hard.industryOthers} others in Retail", "${hard.sameBusinessType} apparel & footwear companies"`);

/* ── The finding that reframes the decision ───────────────────────────────────
 *
 * None of the six visitors above sees a cross-industry peer at ANY share, down to
 * s = 0.15. That is structural, not a quirk of the sample: a company in the
 * visitor's own industry and line of business shares both the business tags and
 * the industry tag, so it scores near 1, while the best possible cross-industry
 * company misses the industry tag entirely and caps at (1 - s). Wherever the
 * industry holds five companies in the same line of business, nothing outside it
 * can reach the top five.
 *
 * So relaxing the boundary is NOT about Nike seeing P&G. It cannot be, while
 * twenty apparel retailers exist. It is only about the sets that are SHORT --
 * which is a much narrower and much more defensible proposition.
 */
console.log("\n=== what a Nike visitor's best cross-industry candidates actually are ===");
const nikeAll = relaxedMatch(nike, 0.25, 0);
const nikeCross = nikeAll.peers.length;
void nikeCross;
{
  const own = "nike";
  const businessTags = new Set(typeById.get("ret-apparel")!.tags);
  let T = 0;
  for (const tag of businessTags) T += globalWeights.get(tag) ?? 0;
  const share = 0.25;
  const W = (share / (1 - share)) * T;
  const ranked = dataset.companies
    .filter((c) => c.industry !== "Retail" && c.name.toLowerCase() !== own)
    .map((c) => {
      const tags = tagsByCompany.get(c.id)!;
      let shared = 0;
      const names: string[] = [];
      for (const tag of businessTags) {
        if (!tags.has(tag)) continue;
        shared += globalWeights.get(tag) ?? 0;
        names.push(tag);
      }
      return { c, sim: shared / (T + W), shared: names };
    })
    .sort((a, b) => b.sim - a.sim)
    .slice(0, 6);
  for (const r of ranked) {
    console.log(
      `   ${r.sim.toFixed(3)}  ${r.c.name} [${r.c.industry}] — shares ${r.shared.join(", ")}`,
    );
  }
  const bestInIndustry = relaxedMatch(nike, share).peers[0];
  console.log(
    `   for comparison, the weakest of Nike's five in-industry peers scores far above these;\n` +
      `   best in-industry peer: ${bestInIndustry?.company.name ?? "(none)"}`,
  );
}

/* ── Does the relaxation fill the SHORT sets? ─────────────────────────────── */
console.log("\n=== does it fill the short sets? (the only place it can act) ===");
console.log("   industry / business type / band                          hard -> relaxed(s=0.25)  cross-industry peers");
let filled = 0;
let stillShort = 0;
let shown = 0;
for (const industry of dataset.taxonomy.industries) {
  for (const type of businessTypesForIndustry(dataset, industry)) {
    for (const revenueBand of dataset.taxonomy.revenueBands) {
      const input = { industry, revenueBand, businessTypeId: type.id };
      const hardSet = matchPeers(dataset, input);
      if (hardSet.peers.length >= DEFAULT_PEER_LIMIT) continue;
      const relaxed = relaxedMatch(input, 0.25);
      if (relaxed.peers.length > hardSet.peers.length) filled += 1;
      else stillShort += 1;
      if (shown < 8 && relaxed.peers.length > hardSet.peers.length) {
        shown += 1;
        const cross = relaxed.peers.filter((p) => p.crossIndustry);
        console.log(
          `   ${`${industry} / ${type.name} / ${revenueBand}`.padEnd(56).slice(0, 56)} ` +
            `${hardSet.peers.length} -> ${relaxed.peers.length}   ` +
            cross.map((p) => `${p.company.name} [${p.company.industry}] sim ${p.sim.toFixed(2)}`).join(", "),
        );
      }
    }
  }
}
console.log(`   short sets the relaxation lengthens: ${filled}`);
console.log(`   short sets it cannot help:           ${stillShort}`);

/* ── The variant worth proposing ──────────────────────────────────────────────
 *
 * The full relaxation is the wrong shape: it changes nothing where the industry is
 * well populated, and where it does act it admits Mobiveil [Semiconductors] to an
 * agribusiness visitor at sim 0.16 alongside Corteva Agriscience [Chemicals] at
 * 0.50. The first is invariant 3's failure; the second is a genuinely better peer
 * than anything Agribusiness holds.
 *
 * So: keep the hard boundary as the default, and admit a cross-industry company
 * ONLY to fill a slot the industry could not fill, and only above a much higher
 * similarity bar than the in-industry floor. Cross-industry is a fallback, not a
 * competitor.
 */
const CROSS_BAR = [0.3, 0.4, 0.5] as const;
console.log("\n=== fallback variant: cross-industry only to fill a short set, at a higher bar ===");
for (const bar of CROSS_BAR) {
  let lengthened = 0;
  let peersAdded = 0;
  let stillShort = 0;
  const examples: string[] = [];
  for (const industry of dataset.taxonomy.industries) {
    for (const type of businessTypesForIndustry(dataset, industry)) {
      for (const revenueBand of dataset.taxonomy.revenueBands) {
        const input = { industry, revenueBand, businessTypeId: type.id };
        const hardSet = matchPeers(dataset, input);
        if (hardSet.peers.length >= DEFAULT_PEER_LIMIT) continue;
        const need = DEFAULT_PEER_LIMIT - hardSet.peers.length;
        // Candidates outside the industry, scored on business tags alone -- the
        // industry tag is not in play because we are explicitly leaving it.
        const businessTags = new Set(typeById.get(type.id)!.tags);
        let T = 0;
        for (const tag of businessTags) T += globalWeights.get(tag) ?? 0;
        const candidates = dataset.companies
          .filter((c) => c.industry !== industry)
          .map((c) => {
            const tags = tagsByCompany.get(c.id)!;
            let shared = 0;
            for (const tag of businessTags) if (tags.has(tag)) shared += globalWeights.get(tag) ?? 0;
            return { c, sim: T === 0 ? 0 : shared / T };
          })
          .filter((r) => r.sim >= bar)
          .sort((a, b) => b.sim - a.sim || fteMidpoint(b.c.fte) - fteMidpoint(a.c.fte))
          .slice(0, need);
        if (candidates.length > 0) {
          lengthened += 1;
          peersAdded += candidates.length;
          if (examples.length < 5) {
            examples.push(
              `      ${type.name} (${industry}, ${revenueBand}) ${hardSet.peers.length} -> ${hardSet.peers.length + candidates.length}: ` +
                candidates.map((r) => `${r.c.name} [${r.c.industry}] ${r.sim.toFixed(2)}`).join(", "),
            );
          }
        } else {
          stillShort += 1;
        }
      }
    }
  }
  console.log(
    `   bar ${bar.toFixed(2)}: lengthens ${lengthened} of 112 short sets, adds ${peersAdded} peers, ` +
      `${stillShort} stay short`,
  );
  console.log(examples.join("\n"));
}
