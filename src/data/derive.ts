import type { CloseCopy, Company, FteRange } from "./schema";

/**
 * Everything derived from a stored field. Nothing here is persisted: the source
 * spreadsheet shipped "Location Presence", "Estimated GCC FTEs" and "Tier-2
 * Presence" as stored columns, and all three are recomputable from the city
 * list and the FTE range. See docs/data-audit.md.
 */

/**
 * Tier-1 cities, chosen by measurement rather than convention.
 *
 * The source carries a "Tier-2 Presence" flag (166 Yes). Tested against the
 * city lists, three candidate tier-1 sets agree with it as follows:
 *
 *   six majors                     1798 / 1834
 *   six majors + Kolkata           1822 / 1834   <- this one
 *   six majors + Kolkata + Ahmedabad  1796 / 1834
 *
 * So Kolkata is tier-1 in the source's own terms and Ahmedabad is not. The 12
 * remaining disagreements are reported as import warnings, not reconciled — a
 * mismatch means the source row is stale.
 *
 * NCR is a region standing in for Gurgaon / Noida / Delhi. Fine as a tier-1
 * label; it needs a deliberate decision before any city-level map ranks it.
 */
/**
 * The tier-1 cities in descending GCC prominence, most-established hub first.
 *
 * The ORDER is the source of the prominence ranking `orderCitiesByProminence` reads —
 * Bengaluru is the largest GCC hub, Kolkata the smallest of the seven — so a single
 * list decides both membership (the `Set` below) and the display precedence a peer
 * card's city list is sorted by. Keeping the two derived from one array is what stops a
 * city being tier-1 for the map but ranked as an afterthought on a card.
 */
export const TIER1_CITY_ORDER: readonly string[] = [
  "Bengaluru",
  "Hyderabad",
  "Pune",
  "NCR",
  "Chennai",
  "Mumbai",
  "Kolkata",
];

export const TIER1_CITIES: ReadonlySet<string> = new Set(TIER1_CITY_ORDER);

/** A city's display rank: its index in the tier-1 order, or the end for tier-2. */
const CITY_RANK = new Map(TIER1_CITY_ORDER.map((city, index) => [city, index]));

/**
 * Cities sorted so the most prominent hub leads, tier-2 cities trailing in their
 * original order.
 *
 * Used to decide which cities a peer card shows first and which fall into the "+N"
 * overflow: a reader scanning five cards wants Bengaluru before Coimbatore, and a
 * card that can only show two names should spend them on the hubs. The sort is stable,
 * so tier-2 cities keep the order the source listed them in — there is no measured
 * ranking below tier-1 to impose one.
 */
export function orderCitiesByProminence(cities: readonly string[]): string[] {
  return [...cities].sort(
    (a, b) =>
      (CITY_RANK.get(a) ?? Number.MAX_SAFE_INTEGER) -
      (CITY_RANK.get(b) ?? Number.MAX_SAFE_INTEGER),
  );
}

export function locationCount(company: Pick<Company, "cities">): number {
  return company.cities.length;
}

export function hasTier2Presence(company: Pick<Company, "cities">): boolean {
  return company.cities.some((city) => !TIER1_CITIES.has(city));
}

/**
 * Midpoint of an FTE band, used only for aggregate sums. Measured error against
 * the dropped exact-headcount column is +0.0% on the Fortune 500 subset and
 * +0.1% across all 1834 companies, because the bands are mostly 100 wide.
 *
 * Never render this as a per-company figure: per-company display is a band.
 */
export function fteMidpoint(fte: FteRange): number {
  return (fte.min + fte.max) / 2;
}

const numberFormat = new Intl.NumberFormat("en-IN");

/**
 * Per-company headcount display. Always a band, never a point figure — the
 * exact headcount column is dropped, and a band reads more honestly anyway.
 */
export function fteDisplay(fte: FteRange): string {
  if (fte.min === fte.max) return `${numberFormat.format(fte.min)}+`;
  if (fte.min === 0) return `under ${numberFormat.format(fte.max)}`;
  return `${numberFormat.format(fte.min)}\u2013${numberFormat.format(fte.max)}`;
}

/** Sum of band midpoints across a set. Round before display. */
export function sumProfessionals(companies: readonly Company[]): number {
  return companies.reduce((total, company) => total + fteMidpoint(company.fte), 0);
}
/**
 * Which result screen a CTA press came from, as the two link fields' own key suffix.
 *
 * Named after the phases in `tool.tsx` rather than after the tab labels, because the
 * phase is what actually selects the link and a tab label is editable prose.
 */
export type CtaScreen = "peers" | "functions";

/**
 * The link the close's button points at, for one screen.
 *
 * **Data over configuration over the hardcoded fallback, resolved in ONE place.** The
 * three sources exist for three different reasons and the order is what keeps all three
 * honest: `siteContent.close` is what an admin sets per screen so the two presses are
 * distinguishable in ANSR's analytics, `NEXT_PUBLIC_GCC_CTA_URL` is what a deployment sets
 * when there is one landing page and no tagging, and ansr.com is what is certainly correct
 * when neither has been decided. A blank field is therefore not a missing value — it is
 * the admin declining to override, which is why this reads `|| fallback` rather than
 * treating `""` as a link.
 *
 * Here rather than in `closing-cta.tsx` on the rule that a component decides nothing: the
 * band draws the `href` it is handed, and which of three sources produced it is a
 * derivation over the dataset. `tool.tsx` is the one caller, because it is the one place
 * that holds the close copy and knows which screen is about to render.
 */
export function resolveCtaHref(
  close: Pick<CloseCopy, "ctaHrefPeers" | "ctaHrefFunctions">,
  screen: CtaScreen,
  fallback: string,
): string {
  const configured =
    screen === "peers" ? close.ctaHrefPeers : close.ctaHrefFunctions;
  return configured.trim() || fallback;
}
