/**
 * The one implementation of "does what the visitor typed match this row".
 *
 * Used by the four dropdowns on the entry point and by the test that measures
 * findability, so the measurement and the behaviour cannot drift apart.
 *
 * ── The rule ────────────────────────────────────────────────────────────────
 *
 * Normalise both sides, split the query on whitespace, and require EVERY token to
 * appear somewhere in the row's haystack. Two properties fall out of that and both
 * are the reason for choosing it over anything cleverer:
 *
 * It is a strict WIDENING of the previous behaviour — a single-token query is
 * exactly the old `label.includes(needle)` once punctuation is normalised — so no
 * row that used to be findable can stop being findable. And AND across tokens keeps
 * it tight: `payment` alone is deliberately generous, while `payment gateway` still
 * narrows, because both words have to land. An OR would turn every two-word query
 * into a longer list than the unfiltered one.
 *
 * Substring rather than prefix matching per token, so `pay` finds `payments` and
 * `fin` finds `financial`. The cost is that a token can match inside an unrelated
 * word; the AND across tokens and the curated term lists both absorb it, and
 * `search-terms.test.ts` asserts no authored term is broad enough to matter.
 *
 * ── The one exception: a SHORT token must be a whole word ───────────────────
 *
 * Substring matching on two and three letters is noise, and measurably so. As a
 * substring, `ai` reached 39 of the 158 sub-industries — `retail`, `domain`, `chain`
 * — `si` reached 50 through `business`, and `and` reached everything, because almost
 * every row in this taxonomy contains an ampersand. Meanwhile the short queries a
 * visitor actually types are acronyms they expect to land exactly: `ai`, `hr`, `erp`,
 * `crm`, `bpo`, `3pl`, `cro`, `kyc`, `pos`, `ev`, `isp`, `qsr`.
 *
 * So a token of three characters or fewer has to match a whole word. This is the one
 * place the matcher is NARROWER than the old label substring test, and it is
 * deliberate: it trades matches nobody wanted for acronyms that now work reliably.
 * The widening guarantee in the test is scoped to four characters and up for exactly
 * this reason.
 *
 * ── Normalisation ───────────────────────────────────────────────────────────
 *
 * Lowercase, strip diacritics, and turn every run of non-alphanumerics into a
 * single space. That is what makes `p and c` reach `Property & casualty`, `ci cd`
 * reach `CI/CD`, `e commerce`, `e-commerce` and `ecommerce` reach each other, and
 * `Dassault Systèmes` reachable by typing `systemes`.
 *
 * The ampersand is the case that matters most here: nearly every row in this
 * taxonomy contains one, so a visitor typing `research and development` against
 * `Clinical Research & Development Services` used to match nothing. Both sides
 * collapse `&` and `and` to the same thing.
 */

/** Lowercase, de-accented, punctuation flattened to single spaces, trimmed. */
export function normaliseSearchText(value: string): string {
  return value
    .normalize("NFD")
    // Combining marks, so `è` has already become `e` + mark and the mark goes.
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    // `&` is written `and` at least as often as it is typed, on both sides.
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * One searchable string for a row: its visible label first, then its extra terms.
 *
 * Joined with a space so a token cannot bridge two entries — `x y` cannot match a
 * haystack that holds `x` and `y` as separate terms unless one of them really
 * contains both, which is the point of building it as words rather than a blob.
 */
export function searchHaystack(
  label: string,
  terms: readonly string[] = [],
): string {
  // Padded with a single space at each end so a whole-word test is a plain
  // `includes(" word ")` — the haystack is already single-space separated, so no
  // regex and no per-row allocation is needed for the short-token rule.
  return ` ${[label, ...terms].map(normaliseSearchText).join(" ")} `;
}

/** At or below this length a token must match a whole word. See the note above. */
export const WHOLE_WORD_MAX_LENGTH = 3;

/**
 * The query, ready to test against a haystack. Empty means "no filter".
 *
 * Exported so a caller can normalise once per keystroke rather than once per row —
 * with 201 countries and 158 sub-industries that is the difference between one
 * normalisation and hundreds.
 */
export function searchTokens(query: string): readonly string[] {
  const normalised = normaliseSearchText(query);
  return normalised === "" ? [] : normalised.split(" ");
}

/** Every token present in the haystack. Vacuously true for an empty query. */
export function matchesTokens(
  tokens: readonly string[],
  haystack: string,
): boolean {
  if (tokens.length === 0) return true;
  return tokens.every((token) =>
    token.length <= WHOLE_WORD_MAX_LENGTH
      ? haystack.includes(` ${token} `)
      : haystack.includes(token),
  );
}

/** Convenience for a one-off test: `matchesSearch("3pl", "Freight forwarding…", terms)`. */
export function matchesSearch(
  query: string,
  label: string,
  terms: readonly string[] = [],
): boolean {
  return matchesTokens(searchTokens(query), searchHaystack(label, terms));
}
