import { fteMidpoint, sumProfessionals } from "./derive";
import type { Company, Dataset } from "./schema";
import {
  BAND_ADJACENT,
  BAND_SAME,
  buildSimilarityModel,
  meetsFloor,
  scoreCompany,
  visitorTags,
} from "./similarity";

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
  /**
   * The visitor's own business type, from `dataset.businessTypes`. Optional: left
   * unset — or set to a type nobody in the industry carries — the score collapses
   * to band proximity and the result is identical to the old three-rung ladder.
   */
  businessTypeId?: string;
}

export type PeerTier = "same-band" | "adjacent-band" | "industry";

/**
 * What the peer set was matched on, for the "matched on" line.
 *
 * `basis` still reports a band tier so the existing copy keeps working untouched
 * for an untagged industry. `sharedTags` and `businessMatched` are additive: when
 * the visitor named a business type, the copy can say what the peers actually
 * have in common instead of naming a revenue band the card does not even show.
 */
export interface MatchBasis {
  /** The deepest band rung represented in the returned set. */
  tier: PeerTier;
  /** True when business similarity, not just revenue band, drove the ordering. */
  businessMatched: boolean;
  /** Characteristics shared across the returned peers, most discriminating first. */
  sharedTags: string[];
}

export interface PeerResult {
  peers: Company[];
  /** The deepest rung the ladder had to reach to fill the slots. */
  tier: PeerTier;
  /** What drove the match, for the copy. */
  basis: MatchBasis;
  limit: number;
  /** limit - peers.length. Non-zero means the copy must say so. */
  shortfall: number;
  /** Companies in the visitor's industry, excluding the visitor. */
  industryTotal: number;
  /** industryTotal minus the peers shown — the "and N others" number. */
  industryOthers: number;
  /**
   * Companies in the industry that clear the similarity floor, excluding the
   * visitor. Zero when no business type was given.
   *
   * This is what makes the industry-count block stronger rather than merely
   * different: "12 other apparel and footwear companies, and 47 others across
   * retail" is better evidence than one number, and it is the block that has to
   * carry a thin peer set.
   */
  closeMatches: number;
  /**
   * Companies carrying the visitor's EXACT business type, excluding the visitor.
   *
   * Separate from `closeMatches` because the two answer different questions and
   * only one of them is safe to print. `closeMatches` is a threshold on a
   * continuous score — useful for diagnostics and for `data:verify`, but "410
   * close matches" is not a sentence anyone should have to defend. This is a
   * countable fact: "29 other apparel and footwear companies run an India GCC".
   */
  sameBusinessType: number;
  /**
   * The floor removed companies that would otherwise have filled a slot.
   *
   * Tracked rather than hidden, because it is the one way this change can return
   * FEWER peers than before. That is deliberate — invariant 3 prefers three
   * defensible comparisons to five padded ones — but it must be visible, both to
   * the copy and to `data:verify`.
   */
  floorShortened: boolean;
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

/**
 * The old three-rung ladder, kept as the ORACLE for the scored engine.
 *
 * `similarity.test.ts` asserts that `matchPeers` reproduces this function's output
 * company-for-company across every industry that has no business types, for every
 * band and HQ country. That equivalence is what makes the change provably
 * additive: an industry nobody has tagged yet cannot move.
 *
 * Not exported to the app. Delete it only together with that test.
 */
export function matchPeersByBandLadder(
  dataset: Dataset,
  input: VisitorInput,
  limit: number = DEFAULT_PEER_LIMIT,
): { peers: Company[]; tier: PeerTier } {
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

  return { peers, tier };
}

/** Which band rung a proximity value corresponds to, for the copy. */
function tierOf(proximity: number): PeerTier {
  if (proximity === BAND_SAME) return "same-band";
  if (proximity === BAND_ADJACENT) return "adjacent-band";
  return "industry";
}

/**
 * The peer set: every company in the industry, scored and ordered.
 *
 * One engine, not two code paths. An industry with no business types is the
 * DEGENERATE CASE of the same computation — business similarity is zero for
 * everyone, so the score reduces to `BAND_WEIGHT * {1, 0.66, 0}` and the ordering
 * is the old ladder's, tiebreak for tiebreak. That is asserted, not assumed.
 *
 * The industry remains a HARD boundary. Nothing here can return a company from
 * another industry, which keeps the `data:verify` invariant intact. Relaxing it —
 * making industry a heavily weighted tag rather than a filter, so a footwear brand
 * could see a global personal-care brand — is a real option the tag architecture
 * makes cheap, and a separate decision.
 */
export function matchPeers(
  dataset: Dataset,
  input: VisitorInput,
  limit: number = DEFAULT_PEER_LIMIT,
): PeerResult {
  const pool = companiesInIndustry(dataset, input.industry).filter(
    (company) => !isVisitorsOwn(company, input),
  );

  const model = buildSimilarityModel(dataset, input.industry);
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

  const eligible = scored.filter((entry) => meetsFloor(entry, visitor.size));

  /**
   * Score first, then HQ country, then size, then age, then name.
   *
   * Country sits BELOW the score rather than above it, which is a change from the
   * old comparator. Recognisability used to outrank everything; it now outranks
   * only ties, because a peer from the visitor's own market that is in the wrong
   * business is still the wrong peer. It remains a preference and never a filter,
   * so it still cannot change how many peers come back.
   */
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
  const peers = chosen.map((entry) => entry.company);

  // The deepest band rung actually represented, so the existing copy still reads
  // true. Taken from the chosen set rather than from the fill order, because with
  // a continuous score there is no fill order to read it from.
  const tier = chosen.reduce<PeerTier>((deepest, entry) => {
    const rung = tierOf(entry.bandProximity);
    if (deepest === "industry" || rung === "industry") return "industry";
    if (deepest === "adjacent-band" || rung === "adjacent-band") return "adjacent-band";
    return "same-band";
  }, "same-band");

  // Tags shared by EVERY peer shown, so the "matched on" line cannot claim a
  // characteristic one of the named companies does not have.
  const sharedTags =
    chosen.length > 0
      ? chosen
          .map((entry) => entry.sharedTags)
          .reduce((common, tags) => common.filter((tag) => tags.includes(tag)))
          .slice()
      : [];

  const closeMatches = visitor.size === 0 ? 0 : eligible.length;
  const sameBusinessType = input.businessTypeId
    ? pool.filter((c) => c.businessTypes.includes(input.businessTypeId!)).length
    : 0;

  return {
    peers,
    tier,
    basis: {
      tier,
      businessMatched: visitor.size > 0 && sharedTags.length > 0,
      sharedTags,
    },
    limit,
    shortfall: Math.max(0, limit - peers.length),
    industryTotal: pool.length,
    industryOthers: Math.max(0, pool.length - peers.length),
    closeMatches,
    sameBusinessType,
    // Only a floor effect if there WERE companies left over that the floor removed.
    floorShortened:
      peers.length < limit && eligible.length < Math.min(limit, pool.length),
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
