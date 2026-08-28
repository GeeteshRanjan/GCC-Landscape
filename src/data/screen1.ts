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
  /**
   * The visitor's line of business, from `dataset.businessTypes`.
   *
   * The one OPTIONAL input with a data consumer, and the sixth overall. It earns
   * its place because industry alone cannot tell a footwear brand from a
   * home-improvement chain, and unanswered it costs nothing: peer matching falls
   * back to the revenue-band ladder and returns exactly what it returned before
   * this existed.
   */
  businessTypeId?: string;
}

/**
 * The business types on offer for one industry: those actually carried by a
 * company in it.
 *
 * Derived rather than stored, and filtered by presence rather than by the
 * catalogue, for a reason that matters to the visitor. Offering a type nobody in
 * their industry carries would let them select an option that returns no close
 * matches at all — the dropdown would be advertising precision the data cannot
 * honour. Ordered by how many companies carry each, so the largest lines of
 * business lead.
 */
export function businessTypesForIndustry(
  dataset: Dataset,
  industry: string,
): Array<{ id: string; name: string }> {
  const counts = new Map<string, number>();
  for (const company of dataset.companies) {
    if (company.industry !== industry) continue;
    for (const id of company.businessTypes) {
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }
  return dataset.businessTypes
    .filter((type) => type.industry === industry && counts.has(type.id))
    .map((type) => ({ id: type.id, name: type.name, count: counts.get(type.id) ?? 0 }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .map(({ id, name }) => ({ id, name }));
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
export function peerViewInputSchema(taxonomy: Taxonomy, businessTypeIds?: readonly string[]) {
  const oneOf = (values: readonly string[], field: string) =>
    z.string().refine((value) => values.includes(value), {
      message: `unknown ${field}`,
    });

  return z
    .object({
      // Trimmed, length-capped, and never stored or logged anywhere. There is no
      // lead capture in this codebase.
      companyName: z.string().trim().max(120).optional(),
      industry: oneOf(taxonomy.industries, "industry"),
      revenueBand: oneOf(taxonomy.revenueBands, "revenue band"),
      hqCountry: oneOf(taxonomy.hqCountries, "HQ location"),
      gccStatus: z.enum(GCC_STATUSES),
      /**
       * Optional, and validated only if a list is supplied. An id that is not on
       * the list is REJECTED rather than dropped: silently ignoring it would
       * return an industry-wide peer set while the visitor believes they narrowed
       * it, which is the one failure mode worse than an error here.
       */
      businessTypeId: z.string().trim().min(1).optional(),
    })
    .superRefine((input, ctx) => {
      if (input.businessTypeId === undefined || businessTypeIds === undefined) return;
      if (!businessTypeIds.includes(input.businessTypeId)) {
        ctx.addIssue({
          code: "custom",
          path: ["businessTypeId"],
          message: "unknown line of business",
        });
      }
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
  /** The deepest band rung reached. Kept for the untagged "matched on" line. */
  basis: PeerTier;
  /**
   * True when business similarity drove the ordering, so the copy can name what
   * the peers have in common instead of naming a revenue band the card does not
   * show.
   */
  businessMatched: boolean;
  /** Characteristics every shown peer shares, most discriminating first. */
  sharedTags: string[];
  limit: number;
  /** Non-zero means the copy must say so, in one line, and never pad. */
  shortfall: number;
  /**
   * The similarity floor cut the set short rather than the industry running out.
   *
   * A different sentence from a thin industry: this one is "we would rather show
   * you three defensible comparisons than pad the list", not "this industry is
   * early ground". Both are honest and they are not interchangeable.
   */
  floorShortened: boolean;
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
  /**
   * The visitor's own line of business, and how many other companies run one.
   *
   * Null when no business type was selected, in which case this block renders as
   * it always did. When present it makes the block strictly stronger: "29 other
   * apparel and footwear companies, and 30 others across retail" is better
   * evidence than a single industry number, and this is the block that has to
   * carry a thin peer set.
   *
   * `count` is companies in a COMPARABLE line of business — the same population
   * the peers were drawn from — and not companies carrying the visitor's exact
   * business type.
   *
   * That distinction was a bug before it was a decision. Counting the exact type
   * gave Nike "one other sportswear brand" directly above five named apparel
   * companies, which contradicts the page: the peer set is drawn from everything
   * above the similarity floor, so the count beside it has to be drawn from the
   * same place or the two disagree in front of the visitor. `exactTypeCount` is
   * kept for `data:verify`, where a precise figure is what is wanted.
   */
  businessType: { name: string; count: number; exactTypeCount: number } | null;
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

  const selectedType = input.businessTypeId
    ? dataset.businessTypes.find((type) => type.id === input.businessTypeId)
    : undefined;

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
      businessMatched: match.basis.businessMatched,
      sharedTags: match.basis.sharedTags,
      limit: match.limit,
      shortfall: match.shortfall,
      floorShortened: match.floorShortened,
    },
    industry: {
      industry: input.industry,
      total: match.industryTotal,
      others: match.industryOthers,
      exhaustive: match.industryOthers === 0,
      businessType: selectedType
        ? {
            name: selectedType.name,
            count: match.closeMatches,
            exactTypeCount: match.sameBusinessType,
          }
        : null,
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
