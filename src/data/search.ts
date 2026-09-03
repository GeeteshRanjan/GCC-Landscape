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
 * ── The one exception: a SHORT token matches from the START of a word ───────
 *
 * Substring matching on two and three letters is noise, and measurably so. As a
 * substring, `ai` reached 39 of the 158 sub-industries — `retail`, `domain`, `chain`
 * — `si` reached 50 through `business`, and `and` reached everything, because almost
 * every row in this taxonomy contains an ampersand. Meanwhile the short queries a
 * visitor actually types are acronyms they expect to land exactly: `ai`, `hr`, `erp`,
 * `crm`, `bpo`, `3pl`, `cro`, `kyc`, `pos`, `ev`, `isp`, `qsr`.
 *
 * So a token of three characters or fewer is anchored to a WORD BOUNDARY: it has to
 * begin a word in the haystack. `ai` still cannot reach `retail` or `domain`, and
 * `si` still cannot reach `business`, because in none of those does the token start
 * the word — but the rule no longer requires the WHOLE word, which is what makes the
 * filter answer the first keystroke instead of the fourth.
 *
 * **That is the reason it is a prefix and not a whole word.** The whole-word form was
 * measurably a dead control for the first three characters: `r`, `re` and `ret` all
 * matched nothing at all, so a visitor typing `retail` watched an unchanged list of
 * 24 industries and then saw it resolve on the fourth letter. A filter that appears
 * broken is a filter a visitor abandons, and abandoning it means taking the broad
 * answer, which is the findability failure this whole matcher exists to prevent.
 * Anchoring rather than dropping the rule is what keeps the acronyms working: an
 * unanchored two-letter substring is the noise measured above.
 *
 * **The prefix applies to EVERY short token, wherever it sits in the query.** It was
 * once scoped to a lone short token, so a short SECOND word was held to a whole word —
 * and `software se` matched nothing until `software secu`, four characters in, which a
 * visitor reads as the filter having died. Making a short token a prefix beside another
 * one costs breadth on an initialism typed complete — `p and c` and `m and a` reach
 * more rows as prefixes than as whole words, since `p`, `c` and `and` open a word
 * almost everywhere — but the AND across tokens still lands the row the visitor wants
 * near the top, and a filter that responds to every keystroke is worth more than one
 * that is tight on the handful of three-token initialisms.
 *
 * This is still the one place the matcher is NARROWER than the old label substring
 * test — `ai` inside `retail` is gone, because the anchor is to a word start — so the
 * widening guarantee in the test stays scoped to four characters and up.
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
    // An apostrophe is ELIDED, not turned into a space, so `L'Oréal` becomes `loreal`
    // and a visitor typing `Loreal` matches it. Every other punctuation mark separates
    // two words (`e-commerce` is two words); an apostrophe joins one (`L'Oréal`,
    // `O'Reilly`, `McDonald's` are single names), so splitting on it is what put a space
    // in the middle of the word the visitor types whole. Both the curly and straight
    // forms, plus the modifier-letter apostrophe some sources use.
    .replace(/['\u2019\u02bc]/g, "")
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
  // Padded with a single space at each end so the word-boundary test is a plain
  // `includes(" word")` — the haystack is already single-space separated, so no
  // regex and no per-row allocation is needed for the short-token rule, and the
  // leading pad is what lets the FIRST word match it too.
  return ` ${[label, ...terms].map(normaliseSearchText).join(" ")} `;
}

/** Anything `searchableText` accepts. A non-string is skipped rather than coerced. */
export type SearchablePart =
  | string
  | number
  | false
  | null
  | undefined
  | readonly (string | number | false | null | undefined)[];

/**
 * `searchHaystack`'s variadic sibling, for a row made of many fields.
 *
 * `searchHaystack(label, terms)` is shaped for the visitor's dropdown: one printed
 * label plus a curated term list. An ADMIN row is neither — a company is a name, a
 * country, a list of cities, a list of sub-industry names and two index flags — so
 * this takes whatever the row is made of and flattens it. Identical output shape, so
 * `matchesTokens` cannot tell the two apart and there is still ONE matcher rather
 * than an admin one and a public one drifting.
 *
 * **`false`, `null` and `undefined` are dropped rather than stringified**, which is
 * what lets a caller write `company.fortuneGlobal500 && "fortune global 500"` inline
 * and have a boolean become searchable WORDS only while it is set. Coercing instead
 * would put the word `false` into every unset row, where it is both meaningless and
 * matchable.
 */
export function searchableText(...parts: readonly SearchablePart[]): string {
  const words: string[] = [];
  const push = (part: SearchablePart) => {
    if (part === false || part === null || part === undefined) return;
    const text = normaliseSearchText(String(part));
    if (text) words.push(text);
  };
  for (const part of parts) {
    if (Array.isArray(part)) for (const entry of part) push(entry);
    else push(part as SearchablePart);
  }
  return ` ${words.join(" ")} `;
}

/**
 * At or below this length a token must start a word rather than sit anywhere inside
 * one. See the note above for why it is anchored and not required to be whole.
 *
 * The name is kept because it is what the constant BOUNDS — the length under which
 * the plain substring test is too loose — and every caller reads it as that.
 */
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
  // A short token matches a word's OPENING letters, wherever that word sits in the
  // haystack — so the filter answers the first keystroke of the FIRST word and of every
  // word after it. A second word used to have to reach four characters before it did
  // anything, because a short token standing beside another was held to a whole word;
  // that made `software se` show nothing until `software secu`, which reads as the
  // filter having stopped working. The anchor to a word start is what still keeps a
  // two-letter token from matching inside an unrelated word (`ai` does not reach
  // `retail`), so it is a prefix everywhere rather than a whole word anywhere.
  return tokens.every((token) =>
    token.length <= WHOLE_WORD_MAX_LENGTH
      ? haystack.includes(` ${token}`)
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
