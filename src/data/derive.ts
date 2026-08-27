import type { Company, FteRange } from "./schema";

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
export const TIER1_CITIES: ReadonlySet<string> = new Set([
  "Bengaluru",
  "Hyderabad",
  "Pune",
  "NCR",
  "Chennai",
  "Mumbai",
  "Kolkata",
]);

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
