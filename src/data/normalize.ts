/**
 * Cleaning primitives. Every function here exists because of a measured defect
 * in the source spreadsheet — the list is docs/data-audit.md, "Cleaning the
 * importer must do".
 *
 * These are shared deliberately: the seed importer uses them, and the admin
 * bulk-append path will use the same ones. Two parsers for one file format is
 * how the two paths start disagreeing.
 */

/**
 * The seven revenue bands, ascending. Seeds `taxonomy.revenueBands`, whose
 * ORDER is the contract for adjacent-band matching. Alphabetical sorting puts
 * "$10 Bn – $20 Bn" second, so the order cannot be computed from the labels.
 *
 * After the seed import, admin owns this list. This constant is not consulted
 * at runtime.
 */
export const SEED_REVENUE_BAND_ORDER = [
  "< $100 Mn",
  "$100 Mn – $500 Mn",
  "$500 Mn – $1 Bn",
  "$1 Bn – $5 Bn",
  "$5 Bn – $10 Bn",
  "$10 Bn – $20 Bn",
  "Above $20 Bn",
] as const;

/** Collapses whitespace and trims. Source cells carry stray double spaces. */
/**
 * Industry names the spreadsheet supplies as an abbreviation, mapped to the form
 * a visitor should read.
 *
 * **Applied once, where the sheet is read**, so exactly one spelling exists
 * downstream: the company's `industry`, `taxonomy.industries`, the business-type
 * map's `industry||subIndustry` keys and the public dropdown all see the canonical
 * name. Renaming the published dataset alone would have been the obvious move and
 * is the broken one — the map is keyed on the industry string, so the next import
 * would look up "Consumer Packaged Goods||CPG - Ice Cream" against a table written
 * as "CPG||…", find nothing, and silently untag all 24 companies. Untagged is a
 * safe state, which is exactly why nobody would notice.
 *
 * Only expansions belong here. This is not a place to merge two industries or fix
 * a typo in one: both change which companies are compared with which, and both
 * belong in the taxonomy editor, where the rename cascades and the diff records it.
 */
const INDUSTRY_ALIASES: Readonly<Record<string, string>> = {
  CPG: "Consumer Packaged Goods",
};

/**
 * The one spelling of an industry name. Idempotent, so it is safe to call on a
 * value that has already been through it.
 */
export function canonicalIndustry(value: unknown): string {
  const cleaned = cleanText(value);
  return INDUSTRY_ALIASES[cleaned] ?? cleaned;
}

/**
 * Company names the spreadsheet writes in a shape the company does not, keyed by
 * the source's own spelling.
 *
 * ── Why this is a TABLE and not a rule ──────────────────────────────────────
 *
 * Twenty-three names arrive in full capitals and eighteen of them are correct:
 * SABIC, AECOM, IQVIA, ABBYY, GEODIS, MULTIVAC, STRATACACHE and the rest are how
 * those companies write themselves. A "title-case anything shouting" rule would
 * damage eighteen marks to repair five. Same on the other side: twenty names start
 * lowercase and seventeen of them — eBay, iSolved, pSemi, smartShift, d-Matrix,
 * ebm-papst, lastminute.com — are deliberate brand styling. There is no rule here,
 * only a decision per name, so the artifact is a list somebody can read and argue
 * with.
 *
 * ── What earns an entry ─────────────────────────────────────────────────────
 *
 * Only a name the company itself writes differently, checked one at a time. Not a
 * house style: `Inc.`, `Corp.` and `plc` suffixes are left exactly as supplied even
 * though only 28 of 1,834 carry one, because stripping them would rewrite a legal
 * name on a judgement about tidiness. Not a merge either — two rows that look like
 * one company stay two rows; see `mintSlug`.
 *
 * ── The constraint that shapes the list ─────────────────────────────────────
 *
 * `scripts/business-type-map.ts` is keyed on `industry||name` and folds case, so a
 * CASE-ONLY correction is free. Anything that changes a letter has to be changed in
 * that table too, or the company silently loses its business type — which is a safe
 * state and therefore an invisible one. Two entries here do that and both are edited
 * in both places: `EA - Electronic Arts`, the only spaced dash among 38 hyphenated
 * names, moves to the parenthetical form the file already uses twenty times over;
 * and `Victoria Secret` is a misspelling of a brand this tool shows to a CIO.
 */
const COMPANY_NAME_FIXES: Readonly<Record<string, string>> = {
  /* Full capitals the company does not use. */
  "DR. MARTENS": "Dr. Martens",
  "GRUPO ANTOLIN": "Grupo Antolin",
  "KDDI CORPORATION": "KDDI Corporation",
  "OIA GLOBAL": "OIA Global",
  "ADVANZ PHARMA": "Advanz Pharma",
  /* Lowercase openings that are not brand styling. */
  eurofins: "Eurofins",
  ilantus: "Ilantus",
  "o9 solutions": "o9 Solutions",
  /* A lowercase letter after the hyphen, where the second half is an initialism. */
  "Sanmina-sci": "Sanmina-SCI",
  "Read-ink": "Read-Ink",
  /**
   * Two rows, one spelling. They stay two companies — merging them changes the
   * count and every profile figure, and whether they are one entity is ANSR's
   * call — but the case difference was hiding the duplicate rather than
   * recording it. `mintSlug` suffixes the second.
   */
  "Iq-eq": "IQ-EQ",
  /* The two that change a letter. Both are also edited in business-type-map.ts. */
  "EA - Electronic Arts": "EA (Electronic Arts)",
  "Victoria Secret": "Victoria's Secret",
};

/**
 * The one spelling of a company name. Idempotent, like `canonicalIndustry`, and
 * applied in the same place for the same reason — once, where the sheet is read.
 */
export function canonicalCompanyName(value: unknown): string {
  const cleaned = cleanText(value);
  return COMPANY_NAME_FIXES[cleaned] ?? cleaned;
}

export function cleanText(value: unknown): string {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * `2022` and `2022.0` are stored as distinct values in the source, which breaks
 * any grouping by year. Excel readers hand back either a number or a string
 * depending on the cell, so both are handled here.
 */
export function parseYear(value: unknown): number | null {
  const text = cleanText(value);
  if (!text) return null;
  const numeric = Number(text);
  if (!Number.isFinite(numeric)) return null;
  const year = Math.trunc(numeric);
  if (year < 1900 || year > 2100) return null;
  return year;
}

/** Yes/No columns to boolean. Anything unrecognised is a parse failure. */
export function parseYesNo(value: unknown): boolean | null {
  const text = cleanText(value).toLowerCase();
  if (text === "yes" || text === "y" || text === "true") return true;
  if (text === "no" || text === "n" || text === "false") return false;
  return null;
}

/**
 * Splits the comma-joined "GCC Location(s)" cell into a city list, preserving
 * source order and dropping duplicates.
 */
export function parseCities(value: unknown): string[] {
  const seen = new Set<string>();
  const cities: string[] = [];
  for (const part of cleanText(value).split(",")) {
    const city = part.trim();
    if (!city || seen.has(city)) continue;
    seen.add(city);
    cities.push(city);
  }
  return cities;
}

const DASHES = /[-–—‒]/;

/**
 * Parses "GCC FTE Range" into a closed integer pair.
 *
 * All 130 distinct values in the seed are closed pairs; the only defect is dash
 * inconsistency (`0-50` vs `0–50`). The open-ended forms (`100+`, `<50`) live
 * only in the dropped display column, but they are handled anyway so a future
 * batch that carries them does not silently fail — an open lower or upper end
 * is clamped to the stated bound rather than inventing a ceiling.
 */
export function parseFteRange(
  value: unknown,
): { min: number; max: number } | null {
  const text = cleanText(value).replace(/,/g, "");
  if (!text) return null;

  const plus = /^(\d+)\s*\+$/.exec(text);
  if (plus?.[1]) {
    const min = Number(plus[1]);
    return { min, max: min };
  }

  const under = /^[<≤]\s*(\d+)$/.exec(text);
  if (under?.[1]) return { min: 0, max: Number(under[1]) };

  const over = /^[>≥]\s*(\d+)$/.exec(text);
  if (over?.[1]) {
    const min = Number(over[1]);
    return { min, max: min };
  }

  const parts = text.split(DASHES).map((p) => p.trim());
  if (parts.length === 2) {
    const [rawMin, rawMax] = parts;
    const min = Number(rawMin);
    const max = Number(rawMax);
    if (Number.isFinite(min) && Number.isFinite(max) && max >= min) {
      return { min: Math.trunc(min), max: Math.trunc(max) };
    }
    return null;
  }

  const single = Number(text);
  if (Number.isFinite(single)) {
    const n = Math.trunc(single);
    return { min: n, max: n };
  }

  return null;
}

/** Lowercase, ASCII-ish, hyphen-joined. The company id. */
export function slugify(value: string): string {
  const slug = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "company";
}

/**
 * Mints a stable, unique slug. The source has one duplicate company name
 * ("Astera Labs"), so collisions are real and get a numeric suffix rather than
 * being silently merged — two rows may be two genuinely different entities.
 */
export function uniqueSlug(name: string, taken: Set<string>): string {
  const base = slugify(name);
  let candidate = base;
  let n = 2;
  while (taken.has(candidate)) {
    candidate = `${base}-${n}`;
    n += 1;
  }
  taken.add(candidate);
  return candidate;
}
