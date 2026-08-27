import { fteDisplay, fteMidpoint, TIER1_CITIES } from "./derive";
import { MAP_HEIGHT, MAP_WIDTH, projectCity, type Point } from "./geo";
import {
  cityDensity,
  largestInIndustry,
  matchPeers,
  nationalScale,
  DEFAULT_PEER_LIMIT,
  type PeerTier,
} from "./peers";
import type { Company, Dataset, Taxonomy } from "./schema";
import { z } from "zod";

/**
 * Screen 1's view model: everything the Peer View renders, and nothing else.
 *
 * This is the seam that keeps the dataset off the wire. `buildPeerView` runs on
 * the server, takes 1834 companies plus 35 metrics, and returns five peer cards,
 * a handful of counts and a city list — a couple of kilobytes. The public screen
 * never receives a `Dataset`, and because this module is pure it is testable
 * without a browser or a filesystem.
 *
 * Peer matching itself lives in ./peers.ts and is not touched here. What this
 * file adds is the part matching cannot know: which of the results are
 * degenerate, and therefore what the copy has to say instead.
 */

/* ==========================================================================
   Inputs

   Five, and every one has a consumer. Adding a sixth needs a consumer first;
   sub-industry and global headcount were both cut for not having one. A revenue
   *figure* is never asked for — the data holds bands, so the input is a band.
   ========================================================================== */

/**
 * Where the visitor is with India today. The only input whose consumption is
 * visible in the copy rather than in the data.
 *
 * Three values rather than the brief's implied two, because "we run one and are
 * not currently expanding" is a real third posture and it wants benchmarking
 * language, not expansion language. Mapping it onto either of the others would
 * put the wrong sentence in front of a third of the audience.
 */
export const GCC_STATUSES = ["evaluating", "operating", "expanding"] as const;
export type GccStatus = (typeof GCC_STATUSES)[number];

export const GCC_STATUS_LABELS: Readonly<Record<GccStatus, string>> = {
  evaluating: "No India GCC yet",
  operating: "We run one already",
  expanding: "We run one and are expanding it",
};

export interface PeerViewInput {
  /** Personalises copy only. Optional, so the form has four required fields. */
  companyName?: string;
  industry: string;
  revenueBand: string;
  /** Country. A sort preference on the peer set, never a filter. */
  hqCountry: string;
  gccStatus: GccStatus;
}

/**
 * Server-side validation of an input that arrives from the browser.
 *
 * Built from the taxonomy rather than from a fixed enum, because the taxonomy is
 * admin-editable: a value added in admin has to validate on the next publish
 * without a code change, and a value removed has to stop validating. Anything
 * off the list is rejected rather than coerced — a mistyped industry that fell
 * through to "whatever matches" would return a peer set for a different
 * industry, which is worse than an error.
 */
export function peerViewInputSchema(taxonomy: Taxonomy) {
  const oneOf = (values: readonly string[], field: string) =>
    z.string().refine((value) => values.includes(value), {
      message: `unknown ${field}`,
    });

  return z.object({
    // Trimmed, length-capped, and never stored or logged anywhere. There is no
    // lead capture in this codebase.
    companyName: z.string().trim().max(120).optional(),
    industry: oneOf(taxonomy.industries, "industry"),
    revenueBand: oneOf(taxonomy.revenueBands, "revenue band"),
    hqCountry: oneOf(taxonomy.hqCountries, "HQ location"),
    gccStatus: z.enum(GCC_STATUSES),
  });
}

/* ==========================================================================
   Common functions

   The one thing on Screen 1 with no data source. The database has no
   per-company function column, and the brief's own note anticipates that and
   permits a hardcoded set: "Could be hardcoded as mostly all the functions are
   more or less the same."

   So this is a general pattern, presented as one — `COMMON_FUNCTIONS_BASIS` is
   exported alongside the list so the component cannot render the list without
   the sentence that says where it came from. Inventing per-company functions and
   presenting them as this visitor's peers' functions is the failure mode being
   avoided; a CIO who spots one fabricated detail discounts the whole screen.

   Ordered most to least common, and deliberately at the level a CIO recognises
   rather than at org-chart granularity. Headcount is not shown, per the brief.
   ========================================================================== */

export const COMMON_FUNCTIONS = [
  "Technology and engineering",
  "Data and analytics",
  "Finance and accounting",
  "Business operations and shared services",
  "Human resources",
  "Customer and partner support",
  "Procurement and supply chain",
  "Legal, risk and compliance",
] as const;

export const COMMON_FUNCTIONS_BASIS =
  "The general pattern across India GCCs, most to least common. Not a per-company breakdown of the companies above.";

/* ==========================================================================
   Blocks
   ========================================================================== */

/**
 * A company as the visitor sees it. Deliberately narrower than `Company`:
 * revenue band is dropped because it is a matching input, not a fact about the
 * peer worth publishing beside its name, and `forbesGlobal2000` is dropped
 * because two index badges on one card is noise.
 */
export interface PeerCard {
  id: string;
  name: string;
  cities: string[];
  /** Always a band. The exact-headcount column is dropped; see derive.ts. */
  headcount: string;
  establishedYear: number;
  fortuneGlobal500: boolean;
}

function toCard(company: Company): PeerCard {
  return {
    id: company.id,
    name: company.name,
    cities: [...company.cities],
    headcount: fteDisplay(company.fte),
    establishedYear: company.establishedYear,
    fortuneGlobal500: company.fortuneGlobal500,
  };
}

export interface PeerBlock {
  peers: PeerCard[];
  /** The deepest rung the ladder reached. Drives the "matched on" line. */
  basis: PeerTier;
  limit: number;
  /** Non-zero means the copy must say so, in one line, and never pad. */
  shortfall: number;
}

export interface IndustryBlock {
  industry: string;
  /**
   * Every company in the industry bar the visitor's own. The headline number,
   * rather than `others`, because `others` is 0 for the two smallest industries
   * and a headline that can read "and 0 others" is not a headline.
   */
  total: number;
  /** `total` minus the peers shown. The "and N others" clause. */
  others: number;
  /** `others === 0`: the peers shown are the whole industry. */
  exhaustive: boolean;
}

/**
 * One company in the largest-in-industry ranking.
 *
 * `sizeShare` is a ratio against the largest GCC in the set, not a headcount —
 * it exists so the panel can draw a magnitude, which is the whole claim the block
 * makes and the one thing a grid of cards cannot show. It is deliberately not a
 * number on the screen: the visible figure stays the band, because a share
 * derived from band midpoints is fine for a bar's length and not fine as a
 * published statistic.
 */
export interface LargestEntry {
  company: PeerCard;
  /** Already shown in the peer set above, so the panel can avoid repeating it. */
  alsoPeer: boolean;
  /** 0 to 1, against the largest in this set. */
  sizeShare: number;
}

export interface LargestBlock {
  entries: LargestEntry[];
  /** Highest band with a member in this industry, or null if none. */
  topBand: string | null;
  /**
   * True when the industry has nobody in the taxonomy's highest band, so the
   * panel walked down. Three industries do this; the copy names the band it
   * actually reached rather than implying it found the top.
   */
  belowTopBand: boolean;
  /**
   * Every company here is already shown as a peer. Happens whenever the peer set
   * exhausted the industry, and means the panel must collapse to a line rather
   * than repeat the same set under a new heading.
   */
  repeatsPeers: boolean;
  shortfall: number;
}

export interface MapCity {
  city: string;
  /** Company appearances in this industry. */
  companies: number;
  /** Null when the city has no recorded coordinate; it is listed, not plotted. */
  point: Point | null;
  tier1: boolean;
}

export interface MapBlock {
  industry: string;
  cities: MapCity[];
  /** Largest `companies` in the set, so a caller can scale without re-scanning. */
  peak: number;
  width: number;
  height: number;
  /** Cities present in the industry but absent from the coordinate table. */
  unplotted: string[];
}

export interface ScaleBlock {
  /** Every GCC in the dataset, not the peer set. That is the point of the block. */
  companyCount: number;
  fortuneGlobal500Count: number;
  forbesGlobal2000Count: number;
  /** Rounded. See `roundProfessionals`. */
  professionals: number;
  /** Rounded. Professionals inside Fortune Global 500 companies only. */
  fortuneGlobal500Professionals: number;
}

export interface PeerView {
  /** The input as validated, echoed back so the copy can personalise. */
  input: PeerViewInput;
  peers: PeerBlock;
  industry: IndustryBlock;
  largest: LargestBlock;
  functions: readonly string[];
  functionsBasis: string;
  map: MapBlock;
  scale: ScaleBlock;
}

/**
 * Professionals are a sum of FTE band midpoints, so the last four digits are an
 * artefact of the banding rather than a measurement. Rounding to the nearest ten
 * thousand is what stops the screen claiming a precision the data does not have —
 * "1,059,175" invites a CIO to ask where the 175 came from, and the honest answer
 * is nowhere.
 */
export function roundProfessionals(total: number): number {
  return Math.round(total / 10_000) * 10_000;
}

export function buildPeerView(
  dataset: Dataset,
  input: PeerViewInput,
  limit: number = DEFAULT_PEER_LIMIT,
): PeerView {
  const match = matchPeers(dataset, input, limit);
  const peers = match.peers.map(toCard);
  const peerIds = new Set(peers.map((peer) => peer.id));

  const largest = largestInIndustry(dataset, input.industry, limit, input);
  // The set is already ordered by GCC size, so the first is the largest and every
  // share is against it.
  const largestPeak = largest.companies.reduce(
    (most, company) => Math.max(most, fteMidpoint(company.fte)),
    0,
  );
  const largestEntries: LargestEntry[] = largest.companies.map((company) => ({
    company: toCard(company),
    alsoPeer: peerIds.has(company.id),
    sizeShare: largestPeak > 0 ? fteMidpoint(company.fte) / largestPeak : 0,
  }));

  const bands = dataset.taxonomy.revenueBands;
  const highestBand = bands.at(-1) ?? null;

  const density = cityDensity(dataset, input.industry);
  const cities: MapCity[] = density.map((entry) => ({
    city: entry.city,
    companies: entry.companies,
    point: projectCity(entry.city),
    tier1: TIER1_CITIES.has(entry.city),
  }));

  const scale = nationalScale(dataset);

  return {
    input,
    peers: {
      peers,
      basis: match.tier,
      limit: match.limit,
      shortfall: match.shortfall,
    },
    industry: {
      industry: input.industry,
      total: match.industryTotal,
      others: match.industryOthers,
      exhaustive: match.industryOthers === 0,
    },
    largest: {
      entries: largestEntries,
      topBand: largest.topBand,
      belowTopBand: largest.topBand !== null && largest.topBand !== highestBand,
      // Only a collapse when there is something to collapse. An empty panel is
      // not a repeat of the peer set, and treating it as one would hide the
      // fact that the industry is empty.
      repeatsPeers:
        largestEntries.length > 0 &&
        largestEntries.every((entry) => entry.alsoPeer),
      shortfall: largest.shortfall,
    },
    functions: COMMON_FUNCTIONS,
    functionsBasis: COMMON_FUNCTIONS_BASIS,
    map: {
      industry: input.industry,
      cities,
      peak: cities.reduce((most, entry) => Math.max(most, entry.companies), 0),
      width: MAP_WIDTH,
      height: MAP_HEIGHT,
      unplotted: cities
        .filter((entry) => entry.point === null)
        .map((entry) => entry.city),
    },
    scale: {
      companyCount: scale.companyCount,
      fortuneGlobal500Count: scale.fortuneGlobal500Count,
      forbesGlobal2000Count: scale.forbesGlobal2000Count,
      professionals: roundProfessionals(scale.professionals),
      fortuneGlobal500Professionals: roundProfessionals(
        scale.fortuneGlobal500Professionals,
      ),
    },
  };
}
