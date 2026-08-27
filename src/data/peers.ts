import { fteMidpoint, sumProfessionals } from "./derive";
import type { Company, Dataset } from "./schema";

/**
 * Peer matching and the counts that sit beside it. Pure functions over an
 * already-loaded dataset — no I/O, so this is directly testable and callable
 * from a server component or an admin preview alike.
 *
 * The ladder is fixed in .kiro/steering/project.md and its coverage is measured
 * in docs/data-audit.md:
 *
 *   1. same industry, same revenue band          91.8% of companies
 *   2. same industry, revenue band +/- 1 step    97.9%
 *   3. same industry, any band                   state the shortfall
 *
 * Two rules that look like details and are not:
 *
 *   - HQ country is a SORT PREFERENCE, never a filter. As a filter it costs 33
 *     points of coverage. Same-country peers fill the slots first because a
 *     visitor recognises companies from their own market.
 *   - The ladder never leaves the industry. Padding a thin set with a visibly
 *     wrong peer discredits the whole card, so a short set stays short and the
 *     shortfall is stated. Education (6 companies) and Electrical & Electronics
 *     (2) take this path every time.
 */

export const DEFAULT_PEER_LIMIT = 5;

export interface VisitorInput {
  /** Used only to keep the visitor's own company out of its own peer set. */
  companyName?: string;
  industry: string;
  revenueBand: string;
  /** Country. Sort preference only. */
  hqCountry?: string;
}

export type PeerTier = "same-band" | "adjacent-band" | "industry";

export interface PeerResult {
  peers: Company[];
  /** The deepest rung the ladder had to reach to fill the slots. */
  tier: PeerTier;
  limit: number;
  /** limit - peers.length. Non-zero means the copy must say so. */
  shortfall: number;
  /** Companies in the visitor's industry, excluding the visitor. */
  industryTotal: number;
  /** industryTotal minus the peers shown — the "and N others" number. */
  industryOthers: number;
}

function normalizeName(value: string): string {
  return value.trim().toLowerCase();
}

function isVisitorsOwn(company: Company, input: VisitorInput): boolean {
  if (!input.companyName) return false;
  return normalizeName(company.name) === normalizeName(input.companyName);
}

/**
 * Recognisability first, then scale. Same-country peers lead; within a country
 * group the larger GCC leads, because a bigger commitment is stronger evidence.
 * Name is the final tiebreak so the output is deterministic.
 */
function comparePeers(input: VisitorInput) {
  return (a: Company, b: Company): number => {
    if (input.hqCountry) {
      const aHome = a.hqCountry === input.hqCountry ? 0 : 1;
      const bHome = b.hqCountry === input.hqCountry ? 0 : 1;
      if (aHome !== bHome) return aHome - bHome;
    }
    const sizeDelta = fteMidpoint(b.fte) - fteMidpoint(a.fte);
    if (sizeDelta !== 0) return sizeDelta;
    if (a.establishedYear !== b.establishedYear) {
      return a.establishedYear - b.establishedYear;
    }
    return a.name.localeCompare(b.name);
  };
}

/** Bands adjacent to the visitor's, by position in the ordered taxonomy. */
export function adjacentBands(dataset: Dataset, revenueBand: string): string[] {
  const bands = dataset.taxonomy.revenueBands;
  const index = bands.indexOf(revenueBand);
  if (index === -1) return [];
  return [bands[index - 1], bands[index + 1]].filter(
    (band): band is string => typeof band === "string",
  );
}

export function companiesInIndustry(
  dataset: Dataset,
  industry: string,
): Company[] {
  return dataset.companies.filter((company) => company.industry === industry);
}

export function matchPeers(
  dataset: Dataset,
  input: VisitorInput,
  limit: number = DEFAULT_PEER_LIMIT,
): PeerResult {
  const pool = companiesInIndustry(dataset, input.industry).filter(
    (company) => !isVisitorsOwn(company, input),
  );

  const adjacent = new Set(adjacentBands(dataset, input.revenueBand));
  const compare = comparePeers(input);

  const rungs: Array<{ tier: PeerTier; candidates: Company[] }> = [
    {
      tier: "same-band",
      candidates: pool.filter((c) => c.revenueBand === input.revenueBand),
    },
    {
      tier: "adjacent-band",
      candidates: pool.filter((c) => adjacent.has(c.revenueBand)),
    },
    {
      tier: "industry",
      candidates: pool.filter(
        (c) => c.revenueBand !== input.revenueBand && !adjacent.has(c.revenueBand),
      ),
    },
  ];

  const peers: Company[] = [];
  let tier: PeerTier = "same-band";

  for (const rung of rungs) {
    if (peers.length >= limit) break;
    tier = rung.tier;
    const sorted = [...rung.candidates].sort(compare);
    peers.push(...sorted.slice(0, limit - peers.length));
  }

  return {
    peers,
    tier,
    limit,
    shortfall: Math.max(0, limit - peers.length),
    industryTotal: pool.length,
    industryOthers: Math.max(0, pool.length - peers.length),
  };
}

export interface LargestInIndustryResult {
  companies: Company[];
  /** Highest band with any member in this industry, or null if the industry is empty. */
  topBand: string | null;
  /** Every band the fill walked through, highest first. */
  bandsUsed: string[];
  shortfall: number;
}

/**
 * The aspirational anchor: the largest companies in an industry that run an
 * India GCC.
 *
 * Nothing can be ranked by revenue — the data holds bands, not figures. So the
 * rule is to take the highest band that actually has members in this industry
 * and fill downward from there, ordered by GCC size. Professional Services,
 * Education and Electrical & Electronics have nobody in the top band, and the
 * last two have nobody above $10 Bn, so walking down is mandatory rather than
 * defensive.
 */
export function largestInIndustry(
  dataset: Dataset,
  industry: string,
  limit: number = DEFAULT_PEER_LIMIT,
  exclude?: VisitorInput,
): LargestInIndustryResult {
  const pool = companiesInIndustry(dataset, industry).filter(
    (company) => !(exclude && isVisitorsOwn(company, exclude)),
  );

  const companies: Company[] = [];
  const bandsUsed: string[] = [];
  let topBand: string | null = null;

  const descending = [...dataset.taxonomy.revenueBands].reverse();
  for (const band of descending) {
    if (companies.length >= limit) break;
    const inBand = pool.filter((company) => company.revenueBand === band);
    if (inBand.length === 0) continue;

    topBand ??= band;
    bandsUsed.push(band);
    inBand.sort(
      (a, b) =>
        fteMidpoint(b.fte) - fteMidpoint(a.fte) || a.name.localeCompare(b.name),
    );
    companies.push(...inBand.slice(0, limit - companies.length));
  }

  return {
    companies,
    topBand,
    bandsUsed,
    shortfall: Math.max(0, limit - companies.length),
  };
}

export interface NationalScale {
  companyCount: number;
  fortuneGlobal500Count: number;
  forbesGlobal2000Count: number;
  /** Sum of FTE band midpoints. Round before display. */
  professionals: number;
  /** Professionals inside Fortune Global 500 companies only. */
  fortuneGlobal500Professionals: number;
}

/**
 * Scale proof for Screen 1 block 4. Across all of India, not the peer set —
 * that is the point of the block.
 */
export function nationalScale(dataset: Dataset): NationalScale {
  const fortune = dataset.companies.filter((c) => c.fortuneGlobal500);
  return {
    companyCount: dataset.companies.length,
    fortuneGlobal500Count: fortune.length,
    forbesGlobal2000Count: dataset.companies.filter((c) => c.forbesGlobal2000)
      .length,
    professionals: sumProfessionals(dataset.companies),
    fortuneGlobal500Professionals: sumProfessionals(fortune),
  };
}

export interface CityDensity {
  city: string;
  /** Company appearances, so the column sums past the company count. */
  companies: number;
}

/**
 * Source for the India heatmap: GCC density per city, optionally narrowed to
 * one industry. Built from the city lists in the company data — there is no
 * separate geography dataset.
 */
export function cityDensity(dataset: Dataset, industry?: string): CityDensity[] {
  const counts = new Map<string, number>();
  for (const company of dataset.companies) {
    if (industry && company.industry !== industry) continue;
    for (const city of company.cities) {
      counts.set(city, (counts.get(city) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([city, companies]) => ({ city, companies }))
    .sort((a, b) => b.companies - a.companies || a.city.localeCompare(b.city));
}
