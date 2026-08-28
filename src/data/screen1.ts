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
  /**
   * 0 to 1 against the largest centre in the set this card came back in.
   *
   * It exists so a set of cards can carry a magnitude, which a grid of equal boxes
   * cannot. "Companies like yours are already here" invites "and how big did they
   * get" immediately, and five headcount BANDS in five separate boxes make the
   * reader compare "300–400" against "900–1,000" against "under 50" by reading
   * rather than by looking.
   *
   * Deliberately not a number on the screen, in either block that uses it: a ratio
   * derived from band midpoints is honest as a bar's length and would not be honest
   * as a published statistic. The visible figure stays the band.
   *
   * One definition, one meaning. `LargestEntry` used to carry its own copy of this
   * against the same peak, which is exactly how two fields holding one number start
   * disagreeing.
   */
  sizeShare: number;
}

function toCard(company: Company, peak: number): PeerCard {
  return {
    id: company.id,
    name: company.name,
    cities: [...company.cities],
    headcount: fteDisplay(company.fte),
    establishedYear: company.establishedYear,
    fortuneGlobal500: company.fortuneGlobal500,
    sizeShare: peak > 0 ? fteMidpoint(company.fte) / peak : 0,
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
  /**
   * The industry, divided into the named peers and what surrounds them.
   *
   * The reason this exists rather than being three subtractions in a component:
   * the block it draws is the one that has to carry a thin peer set, and it can
   * only do that if the five named companies are visibly the LEADING SLICE of a
   * much larger number rather than a number on their own. Five is small until it
   * is drawn as a selection out of fifty-nine, at which point a reader can see
   * that the five were chosen rather than scraped together.
   *
   * The segments always sum to `total`, and there are one, two or three of them
   * depending on what the data supports — which is also the degenerate-case
   * handling. An exhaustive industry produces a single segment, and the copy
   * beside it already says the peers are the whole industry.
   */
  split: IndustrySegment[];
}

export interface IndustrySegment {
  label: string;
  count: number;
  /** 0 to 1 of `total`. */
  share: number;
  /** The named peers. Drawn first and deepest. */
  lead: boolean;
}

/**
 * The industry split, as three nested populations.
 *
 * Peers shown, then the rest of the population they were drawn from, then the
 * rest of the industry. Ordered widest-out, so the bar reads from the most
 * comparable to the least — the same order the whole screen's bands run in.
 *
 * `closeMatches` is the population above the similarity floor, NOT companies
 * carrying the visitor's exact business type. That has to be the case or the bar
 * disagrees with the cards above it: the peers were drawn from the close matches,
 * so a segment labelled "in your line of business" that counted something narrower
 * could come out smaller than the number of peers sitting on top of it.
 */
export function industrySplit(
  total: number,
  peersShown: number,
  closeMatches: number | null,
): IndustrySegment[] {
  const share = (count: number) => (total > 0 ? count / total : 0);
  const segments: IndustrySegment[] = [];

  const named = Math.min(peersShown, total);
  if (named > 0) {
    segments.push({
      label: "Named above",
      count: named,
      share: share(named),
      lead: true,
    });
  }

  // Clamped, not trusted: `closeMatches` and `total` are counted over the same
  // population, but a floor-shortened set means the peers shown can be fewer than
  // the close matches while the arithmetic still has to land on `total`.
  if (closeMatches !== null) {
    const rest = Math.max(Math.min(closeMatches, total) - named, 0);
    if (rest > 0) {
      segments.push({
        label: "More in a comparable line of business",
        count: rest,
        share: share(rest),
        lead: false,
      });
    }
    const beyond = Math.max(total - Math.max(named, Math.min(closeMatches, total)), 0);
    if (beyond > 0) {
      segments.push({
        label: "Elsewhere in your industry",
        count: beyond,
        share: share(beyond),
        lead: false,
      });
    }
    return segments;
  }

  const beyond = Math.max(total - named, 0);
  if (beyond > 0) {
    segments.push({
      label: "Elsewhere in your industry",
      count: beyond,
      share: share(beyond),
      lead: false,
    });
  }
  return segments;
}

/**
 * One company in the largest-in-industry ranking.
 *
 * The magnitude the panel draws lives on `company.sizeShare` rather than here.
 * It used to be duplicated at both levels against the same peak — two fields
 * holding one number, which is the shape of a bug rather than a convenience.
 */
export interface LargestEntry {
  company: PeerCard;
  /** Already shown in the peer set above, so the panel can avoid repeating it. */
  alsoPeer: boolean;
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

/**
 * The size of the Fortune Global 500. In the name, and it does not move.
 *
 * Here rather than in a component because it is the denominator of a real claim:
 * "181" is a number, "181 of the 500" is evidence, and the second is what the
 * block is for. Sitting in the view model means the share is computed and tested
 * in one place instead of being a division inside a style attribute.
 */
export const FORTUNE_GLOBAL_500_SIZE = 500;

/** Likewise, and for the same reason. */
export const FORBES_GLOBAL_2000_SIZE = 2000;

export interface ScaleBlock {
  /** Every GCC in the dataset, not the peer set. That is the point of the block. */
  companyCount: number;
  fortuneGlobal500Count: number;
  /** 0 to 1 of the Fortune Global 500. */
  fortuneGlobal500Share: number;
  forbesGlobal2000Count: number;
  /** 0 to 1 of the Forbes Global 2000. */
  forbesGlobal2000Share: number;
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
  /**
   * Each set is scaled against its own largest member, not against the other set's.
   *
   * The two blocks make different claims. The peer cards say "these are comparable
   * to you, and here is how they compare with each other"; the largest panel says
   * "this is the upper end of the industry". Sharing one peak would flatten every
   * peer bar to a sliver whenever the industry happened to contain an Amazon, which
   * is most industries — and the peer block's comparison would be lost to a company
   * it does not even show.
   */
  const peerPeak = match.peers.reduce(
    (most, company) => Math.max(most, fteMidpoint(company.fte)),
    0,
  );
  const peers = match.peers.map((company) => toCard(company, peerPeak));
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
    company: toCard(company, largestPeak),
    alsoPeer: peerIds.has(company.id),
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
      split: industrySplit(
        match.industryTotal,
        peers.length,
        selectedType ? match.closeMatches : null,
      ),
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
      fortuneGlobal500Share: Math.min(
        scale.fortuneGlobal500Count / FORTUNE_GLOBAL_500_SIZE,
        1,
      ),
      forbesGlobal2000Count: scale.forbesGlobal2000Count,
      forbesGlobal2000Share: Math.min(
        scale.forbesGlobal2000Count / FORBES_GLOBAL_2000_SIZE,
        1,
      ),
      professionals: roundProfessionals(scale.professionals),
      fortuneGlobal500Professionals: roundProfessionals(
        scale.fortuneGlobal500Professionals,
      ),
    },
  };
}
