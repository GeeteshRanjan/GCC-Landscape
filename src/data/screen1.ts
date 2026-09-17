import { resolveCompanyMark } from "./company-mark";
import { uploadedCompanyMark } from "./company-marks";
import { HQ_COUNTRIES } from "./countries";
import {
  fteDisplay,
  fteMidpoint,
  orderCitiesByProminence,
  TIER1_CITIES,
} from "./derive";
import { MAP_HEIGHT, MAP_WIDTH, projectCity, type Point } from "./geo";
import {
  cityDensity,
  companiesInIndustry,
  largestInIndustry,
  matchPeers,
  nationalScale,
  DEFAULT_PEER_LIMIT,
  type PeerTier,
} from "./peers";
import {
  DEFAULT_COMMON_FUNCTIONS,
  type Company,
  type Dataset,
  type Taxonomy,
} from "./schema";
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

/**
 * The five fields the visitor's answers arrive as, four of them asked.
 *
 * **`companyName` WAS THE SIXTH AND IS DELETED, not kept as an unasked field.** It
 * personalised two strings — the peer grid's heading and one answer pill — and was read
 * by nothing else: no figure, no count, no ordering. It is not the `gccStatus` case, and
 * the difference is worth stating because the two look alike from the form. `gccStatus`
 * stays because it is still RENDERED, supplied as a constant and branching five strings on
 * Screen 2; a name had no consumer left once both sentences were reworded to say what they
 * needed without it. So the field went with the control rather than becoming an optional
 * property nothing could ever set.
 *
 * **One consequence is real and is not a defect being hidden.** `isVisitorsOwn` in
 * `peers.ts` used the name to keep the visitor's own company out of its own peer set, and
 * nothing supplies a name now, so that exclusion no longer fires for a visitor. The guard
 * stays — `VisitorInput.companyName` is a separate optional field, still exercised by the
 * unit suite and by the analysis scripts, which is where the behaviour is asserted — and
 * restoring it for visitors means asking for a name again, which is a product decision
 * rather than a bug fix.
 */
export interface PeerViewInput {
  industry: string;
  revenueBand: string;
  /** Country. A sort preference on the peer set, never a filter. */
  hqCountry: string;
  gccStatus: GccStatus;
  /**
   * The visitor's sub-industry, from `dataset.businessTypes`.
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
/**
 * A dropdown's contents split into a leading tier and the rest.
 *
 * Used for industry and HQ country. Deliberately NOT for revenue band: that list's
 * order is the peer-matching contract — the "adjacent band" step is index
 * arithmetic on `taxonomy.revenueBands` — so it is rendered in its stored order and
 * nothing in this file may sort it.
 */
export interface TieredOptions {
  common: string[];
  others: string[];
}

/**
 * How many entries lead the list before it turns alphabetical.
 *
 * Six for 24 industries. The four largest cover 1,187 of 1,834 companies, and by
 * the seventh the counts have flattened enough that frequency stops being a better
 * guess than the alphabet — past that point a frequency order is just an order the
 * visitor cannot predict.
 */
const COMMON_INDUSTRIES = 6;

/**
 * The same, for HQ country: twelve.
 *
 * **The tier is capped rather than being "every country in the data", which is what
 * it was first.** That put 47 entries under a heading claiming they were the common
 * ones, with Jamaica and Slovenia — one company each — among them. A label the list
 * contradicts is worse than no label.
 *
 * Twelve covers 91.4% of the companies (1,677 of 1,834), and the twelfth is Sweden
 * at 16. Past there the counts are in single figures and indistinguishable from the
 * long tail, so frequency has stopped being informative. The other 35 countries with
 * companies drop into the alphabetical group, where they are equally selectable and
 * equally useful — the tier is a shortcut, not a permission.
 */
const COMMON_HQ_COUNTRIES = 12;

/**
 * The industry dropdown, most-represented industries first.
 *
 * Two tiers rather than a flat frequency sort of all 24. A pure frequency list puts
 * the four big ones where they belong and then makes everything else unfindable,
 * because nobody knows whether Retail outranks Telecom. Frequency for the head,
 * alphabetical for the tail, is scannable at both ends.
 *
 * Unlike revenue bands, industry order carries no matching meaning — it is a filter
 * key, matched by equality — so reordering it for display is safe.
 *
 * **Membership of the leading tier is count plus `taxonomy.pinnedIndustries`, and the
 * pinned list is the one part of this that is a business input rather than a
 * derivation.** Everything else is computed from company counts precisely so nobody
 * has to maintain a list of "important" values; pinning exists because anticipated
 * demand and dataset composition are genuinely different things and only ANSR knows
 * the first. Retail is eighth by count and Consumer Packaged Goods sixteenth, so
 * neither would surface on frequency alone, and both are where ANSR expects enquiries
 * from.
 *
 * **It is read from the dataset rather than from a constant here for the same reason
 * the taxonomy itself is:** the judgement is ANSR's, it moves with their pipeline
 * rather than with ours, and a deploy is the wrong unit of change for it. What is
 * still ours is the shape of the list — pinning decides MEMBERSHIP and never position,
 * so the tier is re-sorted by count below and Consumer Packaged Goods cannot appear
 * above Software & Internet.
 *
 * Nothing enforces a maximum, and that is a judgement to keep making rather than a
 * check to add: every pinned entry is a claim that the data is wrong about what
 * visitors will pick, and the more of them there are the less the "most common" label
 * means. Past four or five the honest move is to relabel the group.
 */
export function industryOptions(dataset: Dataset): TieredOptions {
  const counts = new Map<string, number>();
  for (const company of dataset.companies) {
    counts.set(company.industry, (counts.get(company.industry) ?? 0) + 1);
  }
  const byFrequency = [...new Set(dataset.taxonomy.industries)].sort((a, b) => {
    const byCount = (counts.get(b) ?? 0) - (counts.get(a) ?? 0);
    return byCount !== 0 ? byCount : a.localeCompare(b, "en");
  });

  /**
   * The top slice by count, plus the pinned ones, then re-sorted by count so the
   * tier still reads largest-first.
   *
   * A `Set` rather than a concat: a pinned industry that is ALSO in the top slice
   * must not appear twice, and it will be the moment one of them grows — which is
   * the kind of thing that shows up as a duplicated option in a dropdown long
   * after the person who pinned it has forgotten.
   *
   * Filtered against the taxonomy even though `datasetSchema` already refuses a
   * pinned industry that is not in `industries`. The check is not redundant work so
   * much as a statement of what happens to a stale name: it is ignored rather than
   * invented, so this function cannot put a dead option in the dropdown even if it is
   * ever handed a taxonomy the gate did not see.
   */
  const inTier = new Set([
    ...byFrequency.slice(0, COMMON_INDUSTRIES),
    ...dataset.taxonomy.pinnedIndustries.filter((industry) =>
      byFrequency.includes(industry),
    ),
  ]);
  const common = byFrequency.filter((industry) => inTier.has(industry));
  const others = byFrequency
    .filter((industry) => !inTier.has(industry))
    .sort((a, b) => a.localeCompare(b, "en"));
  return { common, others };
}

/**
 * The HQ dropdown's contents, in two tiers.
 *
 * **Order is computed from the data, not hand-ranked.** The countries with the most
 * companies rise to the top on their own, so the tier reflects what the dataset
 * actually contains and re-derives itself as companies are added. A hardcoded list
 * of "important" countries would be a second thing to maintain and would be wrong
 * the first time nobody remembered to.
 *
 * `common` is the countries our data has evidence about, most-represented first;
 * `others` is the rest of the world, alphabetical. The split is rendered as two
 * `optgroup`s, which is what makes it legible rather than looking like a list that
 * forgot to sort itself.
 *
 * The tiers are disjoint and together cover `HQ_COUNTRIES` plus anything in the
 * taxonomy that somehow is not in it — a country in the data must be selectable
 * even if this file's world list has not caught up with a new spelling.
 */
export function hqCountryOptions(dataset: Dataset): TieredOptions {
  const counts = new Map<string, number>();
  for (const company of dataset.companies) {
    counts.set(company.hqCountry, (counts.get(company.hqCountry) ?? 0) + 1);
  }

  const byFrequency = [...new Set(dataset.taxonomy.hqCountries)].sort((a, b) => {
    const byCount = (counts.get(b) ?? 0) - (counts.get(a) ?? 0);
    // Name as the tiebreak, so two countries with equal counts do not swap
    // position between requests on Map iteration order.
    return byCount !== 0 ? byCount : a.localeCompare(b, "en");
  });

  const common = byFrequency.slice(0, COMMON_HQ_COUNTRIES);
  const inCommon = new Set(common);

  /**
   * The tail of the data's own countries, unioned with the rest of the world.
   *
   * The union is what guarantees a country in the taxonomy is always selectable,
   * even one this file's world list has not caught up with — a company can only be
   * in the data if someone typed its country, and the form must not then refuse it.
   */
  const others = [
    ...new Set([...byFrequency.slice(COMMON_HQ_COUNTRIES), ...HQ_COUNTRIES]),
  ]
    .filter((country) => !inCommon.has(country))
    .sort((a, b) => a.localeCompare(b, "en"));

  return { common, others };
}

export function peerViewInputSchema(taxonomy: Taxonomy, businessTypeIds?: readonly string[]) {
  const oneOf = (values: readonly string[], field: string) =>
    z.string().refine((value) => values.includes(value), {
      message: `unknown ${field}`,
    });

  /**
   * HQ is validated against the taxonomy UNION the world list, unlike every other
   * field, which is validated against the taxonomy alone.
   *
   * The asymmetry is the point: industry, revenue band and sub-industry are
   * keys the matching reads, so a value outside the data is meaningless and must be
   * rejected. HQ is only a sort preference, so a country with no companies is a
   * perfectly coherent answer that contributes no ordering signal. Rejecting it
   * would mean the form offers an option the server refuses.
   */
  const hqAllowed = new Set<string>([...taxonomy.hqCountries, ...HQ_COUNTRIES]);

  return z
    .object({
      // **No `companyName`, and the omission is the strictest thing here.** zod objects
      // strip an unrecognised key by default, so a name posted at this action is dropped
      // rather than accepted — which is the state to keep. There is no lead capture in
      // this codebase and now no field a name could arrive in.
      industry: oneOf(taxonomy.industries, "industry"),
      revenueBand: oneOf(taxonomy.revenueBands, "revenue band"),
      hqCountry: oneOf([...hqAllowed], "HQ location"),
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
          message: "unknown sub-industry",
        });
      }
    });
}

/* ==========================================================================
   Common functions

   The one block on Screen 1 with no company data under it. The database has no
   per-company function column, and the brief's own note anticipates that and
   permits a fixed set: "Could be hardcoded as mostly all the functions are more
   or less the same."

   So this is a general pattern and the SECTION HEADING says so — "Functions most
   GCCs run from India", which is a claim about GCCs in general and cannot be read as
   one about the five companies above it. `COMMON_FUNCTIONS_BASIS` used to travel on
   the view model to guarantee the component could not render the list without the
   sentence that says where it came from; both that sentence and the one beside it
   were removed at ANSR's request, so the guarantee moved into the heading and the
   field is gone. Inventing per-company functions and presenting them as this
   visitor's peers' functions is still the failure mode being avoided; a CIO who
   spots one fabricated detail discounts the whole screen.

   **The labels themselves are now `siteContent.commonFunctions`, and they could
   become data precisely BECAUSE the block claims nothing.** Every other string on
   this screen is an argument about the company data and lives in `copy.ts` beside
   the logic making the argument — hold one of those as free text and it drifts into
   a falsehood nothing catches. These assert no count, no share and no order, so
   there is nothing for an edit to contradict. What must stay in code is the heading
   above them, which is the sentence carrying the basis.

   Deliberately at the level a CIO recognises rather than at org-chart granularity.
   Headcount is not shown, per the brief.
   ========================================================================== */

/**
 * The eight shipped labels: the SEED and the schema's default, not what the screen
 * renders.
 *
 * `buildPeerView` reads `siteContent.commonFunctions`, so an admin edit reaches the
 * visitor on the next publish and this constant does not move. It is re-exported
 * under the old name rather than dropped because it is still the thing to diff a
 * live dataset against, and because a fixture asserting "the shipped eight" wants a
 * name for them — but a caller reaching for this to RENDER is reading last month's
 * copy.
 *
 * The wording is held here for the same reason the caps are held in the schema: both
 * are the layout's constraints rather than editorial taste. **Ampersands, not "and",
 * and it is a fit decision.** Seven of the eight items are compound, so with "and"
 * the list read as eight sentences and the longest wrapped to two lines in a
 * four-column grid while its neighbours took one. "Legal, risk & compliance" keeps
 * its serial comma because it is a list of three, where the ampersand replaces only
 * the final conjunction. And "Shared services & operations" was "Business operations
 * & shared services" at 37 characters — half again the next longest, which left the
 * set ragged whatever the column count, while "business" did no work, since a GCC's
 * operations function is business operations by definition. Reversed, the whole set
 * sits inside a 16-to-28 character range, so no item is the one that decides the
 * layout. An admin editing this list is editing against that range.
 */
export const COMMON_FUNCTIONS = DEFAULT_COMMON_FUNCTIONS;

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
  /*
   * **Headquarters country is gone again, and the field went with the column.**
   * It was shown for one pass, at ANSR's request, on the argument that a CIO
   * reading a comparison set asks where each company is headquartered. ANSR then
   * asked for it back off the comparison block, and the field is dropped rather
   * than left in place — a card that carries a value nothing renders is how the
   * next reader concludes the omission was an oversight and puts the column back.
   *
   * Nothing about matching moved either time. HQ is a SORT PREFERENCE on the peer
   * set and never a filter, so its presence or absence on the card cannot change
   * which companies come back or how many. It is still read from the dataset in
   * `peers.ts`, and `input.hqCountry` is still one of the answers echoed on the
   * result band.
   *
   * A test that reads `card.hqCountry` now gets `undefined`, so a comparison over
   * it passes silently. Assert the guard, or read the field from the dataset —
   * `tests/unit/screen1.test.ts` already does the latter.
   */
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
  /**
   * A finished URL for the company's mark, or null to draw the name alone.
   *
   * **Resolved here rather than in the component, and `domain` itself is NOT carried.**
   * The card gets a URL or nothing, so the component holds no knowledge of which
   * provider is in use, no client ID, and no branch to get wrong — the same division
   * that keeps `metric-card.tsx` from choosing its own chart. Swapping providers or
   * adding the uploaded tier is a change in `company-mark.ts` and nowhere else.
   *
   * **Null is ROUTINE, not exceptional.** The uploaded tier covers eleven companies,
   * the provider resolves 86–95% of brands, six companies carry no domain, and the
   * provider tier is off entirely when the client ID is unset. So the name-alone card
   * has to be a complete card at every size, which is why the mark is an addition to a
   * layout that already worked without it.
   */
  markUrl: string | null;
}

function toCard(company: Company, peak: number): PeerCard {
  return {
    id: company.id,
    name: company.name,
    // Prominence order, so a card that shows only its first two cities spends them on
    // the largest hubs and the rest fall into the "+N" overflow. See `CityCells`.
    cities: orderCitiesByProminence(company.cities),
    headcount: fteDisplay(company.fte),
    establishedYear: company.establishedYear,
    fortuneGlobal500: company.fortuneGlobal500,
    sizeShare: peak > 0 ? fteMidpoint(company.fte) / peak : 0,
    /**
     * `domain` is read here and dropped from the card, which is the same discipline
     * `hqCountry` documents above: the field travels only as far as the thing that
     * uses it. A card carrying a raw domain would invite a second component to build
     * its own URL from it.
     *
     * **Both tiers are passed in one call, so the ORDER is the resolver's and not this
     * function's.** `uploadedCompanyMark` reads a committed table and never touches the
     * network; the resolver is what decides it beats the provider. This is also the one
     * call site, so `LargestEntry.company` being a `PeerCard` means the ranking rows
     * pick the marks up without a second lookup that could disagree.
     */
    markUrl: resolveCompanyMark(company.domain, uploadedCompanyMark(company.id)),
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
  /**
   * The largest centre in the set, or null when the set is empty.
   *
   * Two consumers, and neither could compute it honestly for itself. The bars are
   * scaled against this company, so it is what "full width" means and an axis note
   * has to be able to name it. And the signal strip reports the largest peer centre,
   * which is a different question from the closest one — peers are ordered by
   * similarity, so the first card is routinely not the biggest.
   *
   * It is the same `PeerCard` object as the one in `peers`, not a copy: two fields
   * holding one company is how two fields holding one number start disagreeing.
   */
  largest: PeerCard | null;
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
   * The industry's share of every GCC in India, as a fraction.
   *
   * **It is derived here rather than as `total / scale.companyCount`, and that was a
   * real arithmetic defect rather than a tidy-up.** `total` is the peer POOL's size,
   * which excludes the visitor's own company where the dataset holds it;
   * `scale.companyCount` is every company in the dataset, which does not. So the
   * snapshot's opening figure was a ratio of two populations that differ by one, and
   * the direction of the error depended on whether the visitor's own company happened
   * to be in our data.
   *
   * Both sides are counted over the same population here: the industry INCLUDING the
   * visitor's own company, over the whole base. The exclusion is right for a peer
   * count — you are not your own peer — and wrong for a share of a national total,
   * where the visitor's own centre is part of what is being measured.
   *
   * Null only when the base is empty, which is a division by zero rather than a
   * finding. Formatted by the snapshot; never re-derived anywhere else.
   */
  shareOfIndia: number | null;
  /**
   * The visitor's own sub-industry, and how many other companies run one.
   *
   * Null when no business type was selected, in which case this block renders as
   * it always did. When present it makes the block strictly stronger: "29 other
   * apparel and footwear companies, and 30 others across retail" is better
   * evidence than a single industry number, and this is the block that has to
   * carry a thin peer set.
   *
   * `count` is companies in a COMPARABLE sub-industry — the same population
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
   * The mean India headcount across every company in this industry with a centre
   * here, or null when the industry holds none.
   *
   * **It is a mean of FTE BAND MIDPOINTS, and that is the whole reason this field
   * needs a comment.** The dataset holds ranges, never exact headcounts, so there
   * is no arithmetic available that produces a true average — and this project's
   * standing rule is that a ratio derived from band midpoints is honest as a bar's
   * LENGTH and not as a published figure.
   *
   * This is published anyway, and it is the same class of claim the scale band
   * already makes: `professionals` is a sum of the same midpoints, rendered on the
   * page, with a provenance line naming the method. A mean is that sum over a
   * count. So the two things that make it defensible are carried here rather than
   * left to a component:
   *
   *   - **It is rounded**, hard, by `roundHeadcount`. An unrounded mean lands on
   *     something like 2,317, which invites a CIO to ask where the 17 came from;
   *     the honest answer is the banding.
   *   - **It is INDUSTRY-level, not peer-set-level.** An average over five
   *     similarity-ranked companies is a statistic about our matching rather than
   *     about India, and the snapshot cell that shows it says "across GCCs in
   *     {industry}" for that reason.
   *
   * Anything reading this must render the provenance beside it. There is no branch
   * of the code where the figure is allowed to appear bare.
   */
  averageHeadcount: number | null;
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
 * so a segment labelled "in your sub-industry" that counted something narrower
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
        // Shortened from "More in a comparable sub-industry", which wrapped to two
      // lines under a figure in every one of the three columns it can appear in.
      // "Comparable" is the load-bearing word — this counts the population the peers
      // were drawn from, not companies carrying the visitor's exact business type —
      // so it is the word that stayed.
      label: "In a comparable sub-industry",
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
  /**
   * Rounded. Professionals inside companies on EITHER index, counted once each.
   *
   * It was the Fortune Global 500 subset alone. The two memberships overlap heavily,
   * so the union is self-deduplicating only because it is computed by filtering the
   * company list on an OR rather than by adding two sums — see `indexedProfessionals`
   * in `peers.ts`, which is where that property lives.
   */
  indexedProfessionals: number;
  /**
   * When the published dataset was generated, as the ISO string the schema holds.
   *
   * The terminating evidence strip has to say when its figures were counted, and
   * this is the only date in the dataset that is a MACHINE fact — it is stamped by
   * the publish pipeline rather than typed, so it cannot be stale in the way an
   * admin-entered "as of" can. Formatted for display in `copy.ts`; passed through
   * raw here so the view model states a time rather than a rendering of one.
   *
   * `dataset.source` is deliberately NOT carried across. It is documented as free
   * text for the admin's benefit and currently holds the seed spreadsheet's
   * filename, which is not a source a visitor should be shown.
   */
  asOf: string;
}

export interface PeerView {
  /** The input as validated, echoed back so the copy can personalise. */
  input: PeerViewInput;
  peers: PeerBlock;
  industry: IndustryBlock;
  largest: LargestBlock;
  functions: readonly string[];
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
/**
 * `companyName()` WAS HERE and is deleted with the field it read.
 *
 * It was the single definition of "did the visitor type one", shared by both screens'
 * context rows and by `peersTitle`, so that a blank-but-not-empty name could not
 * personalise one screen and not the other. All three callers now render a string that
 * names no company, so the helper had nothing left to answer. See `PeerViewInput`.
 */

export function roundProfessionals(total: number): number {
  return Math.round(total / 10_000) * 10_000;
}

/**
 * A mean headcount, rounded to the precision the banding actually supports.
 *
 * Ten thousand is right for a national total of a million and absurd for an
 * industry mean of a few hundred, so the step scales with the figure: the nearest
 * hundred above a thousand, the nearest ten below it. Both are coarser than the
 * narrowest FTE band in the data, which is the property that matters — a rounding
 * step finer than the bands would be claiming precision the bands cannot carry.
 *
 * Never rounds to zero for a non-zero mean: an industry whose only centre is under
 * ten people has a real average and "0" would read as missing data.
 */
export function roundHeadcount(mean: number): number {
  if (mean <= 0) return 0;
  if (mean >= 1_000) return Math.round(mean / 100) * 100;
  return Math.max(Math.round(mean / 10) * 10, 10);
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
  /**
   * Found by `sizeShare`, not by re-reading the companies, and that is deliberate:
   * `sizeShare` is midpoint over peak, so the largest member is the one at 1 by
   * definition. Deriving it from the same field the bars are drawn from means the
   * axis note cannot name a company other than the one the full-width bar belongs to.
   *
   * `reduce` rather than a `find(share === 1)`: floating-point division of a midpoint
   * by itself is exact here, but a lookup that depends on that is a lookup that
   * returns null the first time it stops being true.
   */
  const largestPeer =
    peers.length > 0
      ? peers.reduce((most, peer) =>
          peer.sizeShare > most.sizeShare ? peer : most,
        )
      : null;

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

  /**
   * The industry's own companies, for the snapshot's mean headcount.
   *
   * Counted over the WHOLE industry rather than over `match.peers`, and the
   * visitor's own company is not excluded here the way it is from `industryTotal`
   * — an average is a property of the population, and removing one member of it
   * because that member is the reader would make the figure depend on who is
   * looking. `industryTotal` excludes them because it is a count of OTHERS, which
   * is a different question.
   */
  const industryCompanies = companiesInIndustry(dataset, input.industry);
  const averageHeadcount =
    industryCompanies.length > 0
      ? roundHeadcount(
          industryCompanies.reduce(
            (total, company) => total + fteMidpoint(company.fte),
            0,
          ) / industryCompanies.length,
        )
      : null;

  const density = cityDensity(dataset, input.industry);
  /**
   * The taxonomy's coordinates are passed in so a city added after the seed plots.
   *
   * Without the overlay a new city is counted, ranked and listed and simply carries
   * no dot — survivable, and how this behaved before the field existed, but the gap
   * is only fixable by a deploy. With it, the fix is a taxonomy edit. A city with no
   * coordinate on either side still lands in `unplotted` below and still says nothing
   * to the visitor about it.
   */
  const cities: MapCity[] = density.map((entry) => ({
    city: entry.city,
    companies: entry.companies,
    point: projectCity(entry.city, dataset.taxonomy.cityCoordinates),
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
      largest: largestPeer,
      shortfall: match.shortfall,
      floorShortened: match.floorShortened,
    },
    industry: {
      industry: input.industry,
      total: match.industryTotal,
      others: match.industryOthers,
      exhaustive: match.industryOthers === 0,
      // Counted over the same population as the denominator — see `shareOfIndia`. The
      // peer pool cannot supply the numerator, because it drops the visitor's own
      // company and the base does not.
      shareOfIndia:
        scale.companyCount > 0
          ? companiesInIndustry(dataset, input.industry).length /
            scale.companyCount
          : null,
      businessType: selectedType
        ? {
            name: selectedType.name,
            count: match.closeMatches,
            exactTypeCount: match.sameBusinessType,
          }
        : null,
      averageHeadcount,
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
    // The published labels, not the constant above — see the "Common functions"
    // block. Passed through rather than copied: the field is `readonly string[]` on
    // the view model, and this crosses a serialization boundary on its way to the
    // client, so nothing downstream can hold a reference to the dataset's array.
    functions: dataset.siteContent.commonFunctions,
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
      indexedProfessionals: roundProfessionals(scale.indexedProfessionals),
      asOf: dataset.generatedAt,
    },
  };
}
