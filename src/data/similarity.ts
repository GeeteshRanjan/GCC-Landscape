import { isBusinessTag } from "./business-tags";
import type { BusinessType, Company, Dataset } from "./schema";

/**
 * Business similarity between companies, and the score peer matching orders by.
 *
 * Pure functions over an already-loaded dataset, like `peers.ts`.
 *
 * ── The shape of the problem ─────────────────────────────────────────────────
 *
 * Industry alone is too coarse for the large industries: Retail lumps footwear
 * brands with home-improvement chains, and Software & Internet (656 companies)
 * puts a fintech platform beside a hyperscaler. The source spreadsheet's 620
 * sub-industry values were dropped for covering only 35.8% as a match key — but
 * that measurement was of sub-industry as a FILTER competing with industry, and a
 * single bucket per company was never the only option.
 *
 * The failure a bucket cannot fix is the fall-through. Retail has 60 companies
 * and five slots, so once apparel is exhausted the next peer is whoever is
 * biggest in Retail. Continuous similarity has nothing to exhaust.
 *
 * ── Weighting: rarity, not opinion ───────────────────────────────────────────
 *
 * Each tag is weighted by how rare it is INSIDE THE INDUSTRY being matched —
 * inverse document frequency. Sharing `retail-operator` inside Retail says
 * nothing, because most of Retail carries it; sharing `footwear` says a great
 * deal, because four companies do. So the weighting is derived from the data and
 * re-derives itself as companies are added, rather than being a hand-maintained
 * table of tag importances that silently rots.
 *
 * IDF also removes the need to prune "obvious" tags. A tag carried by every
 * company in an industry scores exactly zero there and can still be the
 * discriminating signal in another industry, so the vocabulary does not have to
 * be tuned per industry.
 *
 * ── The combined score ───────────────────────────────────────────────────────
 *
 *   score = BUSINESS_WEIGHT * businessSimilarity + BAND_WEIGHT * bandProximity
 *
 * Business similarity dominates deliberately, and the reason is in
 * `screen1.ts`: `toCard` drops `revenueBand`, so the peer card never shows it. A
 * band mismatch is invisible to the visitor; a business mismatch is the first
 * thing they see. Same reasoning demotes HQ country from the comparator's first
 * key to a tiebreak — a CIO at a footwear brand would rather see a German
 * sportswear company than a domestic hardware chain.
 *
 * `bandProximity` is a THREE-STEP function rather than linear index distance, for
 * two reasons. The bands are not evenly spaced ($5–10 Bn against Above $20 Bn),
 * so linear distance would be fake precision. And more importantly it makes the
 * untagged case reduce to `BAND_WEIGHT * {1, 0.66, 0}`, whose ordering is exactly
 * the old three-rung ladder — which is what lets `peers.test.ts` prove the new
 * engine returns byte-identical peers wherever no business types exist.
 */

/** Relative weights. Behavioural tests pin the intent; see `similarity.test.ts`. */
export const BUSINESS_WEIGHT = 0.7;
export const BAND_WEIGHT = 0.3;

/**
 * Below this business similarity a company is not a peer at all.
 *
 * Applied to `businessSimilarity` ALONE and never to the combined score. If the
 * floor were on the combined score, a perfect revenue-band match would be worth
 * 0.3 and could drag a business-irrelevant company over the line — which is the
 * exact bug this whole module exists to fix.
 *
 * The consequence is deliberate: selecting a business type can SHORTEN a peer
 * set. That is invariant 3 working as intended — "we would rather show you three
 * defensible comparisons than pad the list" — and `shortfallLine` in
 * `screen1/copy.ts` already says so. `data:verify` tracks how often the floor
 * bites, so the trade between quality and length is a number ANSR can see.
 *
 * ── Why 0.20 and not 0.15 ───────────────────────────────────────────────────
 *
 * 0.15 was the first value shipped. Swept against the real dataset at 0.10, 0.15,
 * 0.20 and 0.25, with the median peer count staying at 5 throughout and no value
 * ever emptying a set, 0.20 was measurably better for one reason that is not
 * obvious: raising the floor does not merely truncate.
 *
 * Because the combined score gives a perfect band match 0.3 while similarity
 * carries 0.7, a company BELOW the floor can outrank one above it —
 * 0.7 × 0.13 + 0.3 × 1 = 0.39 beats 0.7 × 0.5 + 0.3 × 0 = 0.35. Raising the floor
 * evicts that interloper and promotes a more similar company into view. Measured
 * at 0.20 against 0.15: seven peer sets changed membership, and in all seven the
 * company that appeared was MORE similar than the one it replaced. A utilities and
 * grid-operations visitor stopped being shown Shell, BP, ExxonMobil and Chevron
 * (similarity 0.190) and started being shown Nextracker, LM Wind Power and Aggreko
 * (0.291). An aircraft-engines visitor stopped being shown Boeing (0.156) and
 * started being shown Moog (0.325).
 *
 * The price is 35 more short sets out of 1064, three percentage points, all in
 * thin low-band combinations where the shortfall copy is already honest.
 *
 * 0.10 was rejected because it admits Caterpillar, Holcim and WillScot to a
 * SHIPBUILDING visitor on `discrete-manufacturing, engineering-construction, b2b`
 * alone — generic tags, similarity 0.126, and Holcim makes cement. That is
 * invariant 3's failure in one line. 0.25 was rejected because it costs seven more
 * sets than 0.20 while removing no new class of bad peer: its three- and four-peer
 * counts are identical to 0.20's, so it only pushes three-peer sets down to two.
 */
export const SIMILARITY_FLOOR = 0.2;

/** Same band, adjacent band, anything else. See the note above on why three steps. */
export const BAND_SAME = 1;
export const BAND_ADJACENT = 0.66;
export const BAND_DISTANT = 0;

export interface IndustrySimilarityModel {
  industry: string;
  /** Tag -> IDF weight within this industry. */
  weights: ReadonlyMap<string, number>;
  /** Company id -> its union of tags, from every business type it carries. */
  tagsByCompany: ReadonlyMap<string, ReadonlySet<string>>;
  /** How many companies in this industry carry at least one business type. */
  taggedCount: number;
  companyCount: number;
}

function typeIndex(businessTypes: readonly BusinessType[]): Map<string, BusinessType> {
  return new Map(businessTypes.map((type) => [type.id, type]));
}

/**
 * The union of tags a company carries, across all its business types.
 *
 * Union rather than intersection because a company with two types genuinely runs
 * two businesses: a marketplace that is also a cloud provider should be a
 * credible peer for both sides of itself, not a diluted match for neither.
 */
export function tagsForCompany(
  company: Company,
  types: ReadonlyMap<string, BusinessType>,
): Set<string> {
  const tags = new Set<string>();
  for (const id of company.businessTypes) {
    const type = types.get(id);
    if (!type) continue;
    for (const tag of type.tags) tags.add(tag);
  }
  return tags;
}

/**
 * Builds the per-industry model: tag rarity, and every company's tag set.
 *
 * Scoped to one industry because that is the pool peers are drawn from, and
 * because rarity only means anything relative to a pool. `security` is
 * unremarkable among software companies and extraordinary among retailers.
 */
export function buildSimilarityModel(
  dataset: Dataset,
  industry: string,
): IndustrySimilarityModel {
  const types = typeIndex(dataset.businessTypes);
  const companies = dataset.companies.filter((c) => c.industry === industry);

  const tagsByCompany = new Map<string, ReadonlySet<string>>();
  const documentFrequency = new Map<string, number>();
  let taggedCount = 0;

  for (const company of companies) {
    const tags = tagsForCompany(company, types);
    tagsByCompany.set(company.id, tags);
    if (tags.size > 0) taggedCount += 1;
    for (const tag of tags) {
      documentFrequency.set(tag, (documentFrequency.get(tag) ?? 0) + 1);
    }
  }

  // Weights are computed against the TAGGED population, not the whole industry.
  //
  // Read `rawWeight` below with the cap that follows it: the two together are one
  // decision, and the cap is what made an admin-editable vocabulary shippable.
  // Untagged companies carry no tags and so cannot make a tag look rare; dividing
  // by the full count would inflate every weight in a thinly-tagged industry and
  // make the floor behave differently there for no reason connected to business.
  const weights = new Map<string, number>();
  for (const [tag, frequency] of documentFrequency) {
    // Textbook IDF, and the absence of a smoothing term is deliberate.
    //
    // `log(1 + N/f)` was tried first, on the reasoning that a company sharing only
    // universal tags should still outrank one sharing nothing. Measured against the
    // real dataset that broke the floor outright: a tag carried by all 59 Retail
    // companies still scored 0.69, so a grocery chain sharing `physical-stores`,
    // `supply-chain-heavy` and `b2c` with a footwear brand cleared a 0.15 floor and
    // every company in the industry stayed eligible.
    //
    // `log(N/f)` sends a universal tag to exactly zero, which is the honest
    // weight — a characteristic every company in the pool has cannot be evidence
    // of being a peer. The "shares only common tags" case is then handled where it
    // belongs, by the tiebreak chain in `matchPeers`, not by inflating a weight.
    weights.set(tag, Math.log(taggedCount / frequency));
  }

  capCustomTagWeights(weights);

  return {
    industry,
    weights,
    tagsByCompany,
    taggedCount,
    companyCount: companies.length,
  };
}

/**
 * Holds a tag added in admin to the most discriminating AUTHORED weight in its own
 * industry, in place.
 *
 * **This is the guard that made the tag vocabulary admin-editable, and its ceiling is
 * READ FROM THE POOL rather than chosen.** The problem it solves is measured: IDF is
 * unbounded, so a tag one business type carries arrives at `log(N/1)` — 6.44 in
 * Software & Internet against 0.05 for `b2b` — and since `businessSimilarity`
 * normalises by the VISITOR's own total weight, one such tag on the visitor's type
 * becomes almost the whole denominator. Every company that does not also carry it
 * falls below the floor. One invented tag cut the eligible population 20% on average
 * and 95% at worst, and took the named five to two in five sub-industries.
 *
 * **A flat clamp at the two-carrier weight was the first attempt and it is wrong,
 * because eleven AUTHORED tag-and-industry pairs already sit at company frequency 1** —
 * `agrochemicals` in Agribusiness, `defense` in Architecture, Engineering &
 * Construction, `services-firm` in Restaurant & Food Service and eight more. Those
 * weights were swept, measured and baselined; clamping them would silently re-score
 * eleven industries as the side effect of an unrelated feature. So the cap is scoped by
 * PROVENANCE, not by frequency: a reviewed tag keeps whatever weight the data gives it,
 * and an admin's addition may be as discriminating as the sharpest reviewed tag in the
 * same pool and no more.
 *
 * Two consequences worth stating. It is provably a NO-OP on the shipped dataset, since
 * every tag in it is authored — asserted in `similarity.test.ts`, which is what keeps
 * this from being a claim. And an industry whose tags are ALL custom has a ceiling of
 * zero, so they carry no weight and `businessSimilarity` falls through to its unweighted
 * overlap branch: the safe direction, and the same answer that branch already gives when
 * rarity cannot discriminate.
 */
function capCustomTagWeights(weights: Map<string, number>): void {
  let ceiling = 0;
  let hasCustom = false;
  for (const [tag, weight] of weights) {
    if (isBusinessTag(tag)) {
      if (weight > ceiling) ceiling = weight;
    } else {
      hasCustom = true;
    }
  }
  if (!hasCustom) return;
  for (const [tag, weight] of weights) {
    if (!isBusinessTag(tag) && weight > ceiling) weights.set(tag, ceiling);
  }
}

/**
 * 0 to 1. The share of the VISITOR's tag weight that the company also carries.
 *
 * Asymmetric on purpose, and this is the one place the asymmetry matters. The
 * question a peer set answers is "how much of what defines the visitor does this
 * company share", not "how alike are these two". Normalising by the visitor's
 * total weight means a conglomerate carrying many tags is not penalised for
 * breadth the way a Jaccard ratio would penalise it — an eight-tag company would
 * otherwise score poorly against everyone, including its real peers.
 */
export function businessSimilarity(
  visitorTags: ReadonlySet<string>,
  companyTags: ReadonlySet<string>,
  weights: ReadonlyMap<string, number>,
): number {
  if (visitorTags.size === 0 || companyTags.size === 0) return 0;

  let shared = 0;
  let total = 0;
  let present = 0;
  let sharedPresent = 0;

  for (const tag of visitorTags) {
    // A tag the visitor holds that nobody in this industry carries has no weight
    // in this pool. It cannot be shared, so it must not inflate the denominator
    // either, or a visitor with unusual tags would score low against everyone.
    const weight = weights.get(tag);
    if (weight === undefined) continue;
    present += 1;
    total += weight;
    if (companyTags.has(tag)) {
      sharedPresent += 1;
      shared += weight;
    }
  }

  /**
   * Every one of the visitor's tags is universal in this pool, so IDF carries no
   * information at all and the weighted ratio is 0/0.
   *
   * Not a hypothetical: Electrical & Electronics has two companies, both carrying
   * the same business type, so every tag has frequency == population and weight
   * exactly zero. Returning 0 here put both companies below the floor and the
   * screen showed NO peers for an industry where the two companies are as alike as
   * two companies can be — the worst possible answer.
   *
   * Falling back to unweighted overlap is the honest reading: when rarity cannot
   * discriminate, how much of the visitor's profile is shared is all there is to
   * go on.
   */
  if (total === 0) return present === 0 ? 0 : sharedPresent / present;

  return shared / total;
}

/** Same band, +/- one step, or further. Index arithmetic on the ordered taxonomy. */
export function bandProximity(
  revenueBands: readonly string[],
  visitorBand: string,
  companyBand: string,
): number {
  if (visitorBand === companyBand) return BAND_SAME;
  const visitorIndex = revenueBands.indexOf(visitorBand);
  const companyIndex = revenueBands.indexOf(companyBand);
  if (visitorIndex === -1 || companyIndex === -1) return BAND_DISTANT;
  return Math.abs(visitorIndex - companyIndex) === 1 ? BAND_ADJACENT : BAND_DISTANT;
}

/**
 * The tag set a visitor is matched on, from the business type they selected.
 *
 * Returns an empty set when they selected nothing or picked "Not listed", which
 * is what makes the whole feature optional: an empty visitor tag set drives
 * `businessSimilarity` to 0 for every company, the floor stops applying, and the
 * score collapses to band proximity — reproducing the previous behaviour exactly.
 */
export function visitorTags(
  businessTypes: readonly BusinessType[],
  businessTypeId: string | undefined,
): Set<string> {
  if (!businessTypeId) return new Set();
  const type = businessTypes.find((candidate) => candidate.id === businessTypeId);
  return new Set(type?.tags ?? []);
}

export interface ScoredCompany {
  company: Company;
  /** 0 to 1. Zero whenever either side is untagged. */
  businessSimilarity: number;
  bandProximity: number;
  /** The weighted combination the peer set is ordered by. */
  score: number;
  /** Tags the visitor and this company share, most discriminating first. */
  sharedTags: string[];
}

export function scoreCompany(
  company: Company,
  options: {
    model: IndustrySimilarityModel;
    revenueBands: readonly string[];
    visitorTags: ReadonlySet<string>;
    visitorBand: string;
  },
): ScoredCompany {
  const { model, revenueBands, visitorTags: visitor, visitorBand } = options;
  const companyTags = model.tagsByCompany.get(company.id) ?? new Set<string>();

  const business = businessSimilarity(visitor, companyTags, model.weights);
  const band = bandProximity(revenueBands, visitorBand, company.revenueBand);

  const shared = [...visitor]
    .filter((tag) => companyTags.has(tag))
    .sort((a, b) => (model.weights.get(b) ?? 0) - (model.weights.get(a) ?? 0));

  return {
    company,
    businessSimilarity: business,
    bandProximity: band,
    score: BUSINESS_WEIGHT * business + BAND_WEIGHT * band,
    sharedTags: shared,
  };
}

/**
 * True when this company may be shown as a peer.
 *
 * When the visitor gave no business type there is no similarity to judge, so the
 * floor cannot apply and everything in the industry remains eligible — which is
 * exactly the old behaviour.
 */
export function meetsFloor(
  scored: ScoredCompany,
  visitorTagCount: number,
  floor: number = SIMILARITY_FLOOR,
): boolean {
  if (visitorTagCount === 0) return true;
  return scored.businessSimilarity >= floor;
}
