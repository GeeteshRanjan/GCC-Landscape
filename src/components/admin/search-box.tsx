"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  matchesTokens,
  searchTokens,
  searchableText,
  type SearchablePart,
} from "@/data/search";

/**
 * One search control, and one matcher, for every admin surface.
 *
 * ## Why admin needs this at all
 *
 * Admin is an editor over a dataset that has outgrown scrolling. 1,834 companies,
 * 164 business types, 201 HQ countries, 200-odd cities, ~40 metrics and 28 fixed
 * strings — and only the company table had a way to type a word and be taken to the
 * row. Everywhere else the way to find a field was to know which of six pages it was
 * on and then read down it, which is how a five-second edit becomes a two-minute
 * hunt and how the same string gets edited on the wrong page.
 *
 * So each page filters ITS OWN rows against ONE control that behaves identically on
 * all of them. Filtering rather than jumping: an admin looking for "the leading city
 * label" does not know what it is called, so the useful answer is every field whose
 * label, hint or current VALUE mentions the word — which is a filter, not a
 * find-next.
 *
 * ## It reuses the public matcher, and that is the point
 *
 * `src/data/search.ts` is the one implementation of "does what somebody typed match
 * this row". It is the visitor's dropdown filter, and it is deliberately importable
 * by a client component — it holds no dataset and may never take `server-only`. Two
 * things come free by reusing it here rather than writing a second `includes`:
 *
 *   - **`&`, accents and punctuation fold on both sides.** The company table's own
 *     search used to be a raw `includes`, so `Sportswear and Athletic` found nothing
 *     while `Sportswear & Athletic` found the row, and `Nestle` missed `Nestlé`.
 *   - **Every token has to land, so a second word narrows.** A raw `includes` treats
 *     `tata pune` as one 9-character string and matches nothing at all; here it means
 *     the Tata rows with a Pune centre, which is the query an admin was trying to ask.
 *
 * It also inherits the rule the visitor's filter was fixed for: a one- or two-letter
 * query matches from the START of a word, so the list responds to the first keystroke
 * instead of the fourth. See the note at the top of `search.ts`.
 *
 * ## What this file does NOT do
 *
 * It does not decide what is searchable. Each page builds its own haystack out of the
 * strings an admin would plausibly type, because only the page knows which of its
 * fields are meaningful — a metric is found by its title, question, unit and id, a
 * taxonomy row by its own value, a copy field by its label, its hint AND the words
 * currently in it. Centralising that would mean one list of field names to keep in
 * step with five editors.
 */

/**
 * The query, the setter, and the two ways to test a row against it.
 *
 * `matches` is the convenient form and builds a haystack per call, which is right for
 * a list of tens. `matchesText` takes a haystack the caller has already built, which
 * is what the company table uses: 1,834 rows rebuilt on every keystroke is work with
 * a visible cost, so it memoises them once per draft change and tests them here.
 */
/**
 * The universal search's two parameters, read off the URL.
 *
 * `find` seeds this page's own filter; `open` names one row whose editor should open on
 * arrival. Both come from `global-search.tsx`, and this is the other half of that
 * contract — a page that ignored them would take the admin to the right surface and
 * leave them to find the row again, which is the whole failure the palette exists to
 * remove.
 *
 * **Read as an EFFECT on the value, not as a `useState` initialiser.** The layout owns
 * the draft and does not remount between pages, so choosing a second result on the page
 * you are already on changes the query string without remounting anything — a seeded
 * initial value would be read once and every later jump would silently do nothing.
 *
 * The effect fires only when the parameter is present and changes, so it seeds the field
 * and then leaves it alone: an admin who clears the box is not fighting the URL.
 */
export function useDeepLinkQuery(setQuery: (value: string) => void) {
  const params = useSearchParams();
  const find = params.get("find") ?? "";
  useEffect(() => {
    if (find) setQuery(find);
    // `setQuery` is a stable setter; re-running on it would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [find]);
}

/** The row whose editor should open on arrival, or null. See `useDeepLinkQuery`. */
export function useDeepLinkOpen(onOpen: (id: string) => void) {
  const params = useSearchParams();
  const open = params.get("open") ?? "";
  useEffect(() => {
    if (open) onOpen(open);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
}

export type AdminSearchState = {
  query: string;
  setQuery: (value: string) => void;
  searching: boolean;
  matches: (...parts: readonly SearchablePart[]) => boolean;
  matchesText: (haystack: string) => boolean;
  clear: () => void;
};

export function useAdminSearch(): AdminSearchState {
  const [query, setQuery] = useState("");
  // Normalised once per keystroke rather than once per row.
  const tokens = useMemo(() => searchTokens(query), [query]);

  const matchesText = useCallback(
    (haystack: string) => matchesTokens(tokens, haystack),
    [tokens],
  );

  const matches = useCallback(
    (...parts: readonly SearchablePart[]) =>
      matchesTokens(tokens, searchableText(...parts)),
    [tokens],
  );

  return {
    query,
    setQuery,
    /** True when a filter is actually applied. An all-whitespace query is not one. */
    searching: tokens.length > 0,
    matches,
    matchesText,
    clear: useCallback(() => setQuery(""), []),
  };
}

/**
 * The control itself: a labelled search box, a live result count, and Clear.
 *
 * **The count is not decoration.** Every one of these filters can hide a section
 * entirely, and a page that silently loses two thirds of itself reads as broken. The
 * count is what makes the emptiness legible, and it is a `role="status"` present
 * before its text changes, so a screen reader hears "12 matches" rather than nothing
 * — the same shape the company table already used and the reason it is copied here
 * rather than reinvented per page.
 *
 * **Clear is only rendered while filtering**, so it cannot be pressed to no effect,
 * and it returns focus to the field: an admin who clears is about to type again.
 */
export function AdminSearch({
  label = "Search",
  placeholder,
  hint,
  value,
  onChange,
  onClear,
  status,
  children,
}: {
  /**
   * Defaults to "Search", which is what the company table's control is already
   * called and what its specs locate it by.
   *
   * Override it only where a page carries a SECOND control that would otherwise
   * share the name — two fields whose accessible names are both "Search" cannot be
   * told apart by name, by a screen reader or by a test.
   */
  label?: string;
  placeholder?: string;
  /** One line under the field, naming what is searched. Not a tooltip. */
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  /** The result count, in the caller's own words — it knows what it counted. */
  status?: string;
  /** Extra controls on the same row: the industry select the two lists carry. */
  children?: React.ReactNode;
}) {
  const fieldId = useId();
  const statusId = useId();
  const hintId = useId();
  const input = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-end gap-4 border border-border-subtle bg-surface p-4">
        <div className="flex min-w-64 flex-1 flex-col gap-1.5">
          <Label htmlFor={fieldId}>{label}</Label>
          <Input
            id={fieldId}
            ref={input}
            type="search"
            value={value}
            placeholder={placeholder}
            aria-describedby={
              [hint ? hintId : null, status ? statusId : null]
                .filter(Boolean)
                .join(" ") || undefined
            }
            onChange={(event) => onChange(event.target.value)}
          />
          {hint ? (
            <p id={hintId} className="text-xs text-text-muted">
              {hint}
            </p>
          ) : null}
        </div>
        {children}
        {value ? (
          <Button
            variant="ghost"
            onClick={() => {
              onClear?.();
              onChange("");
              input.current?.focus();
            }}
          >
            Clear
          </Button>
        ) : null}
      </div>
      {status ? (
        <p id={statusId} role="status" className="text-sm text-text-muted">
          {status}
        </p>
      ) : null}
    </div>
  );
}

/**
 * The empty state, shared so all five pages say the same thing in the same place.
 *
 * It names the query back, because the commonest cause of no matches is a typo the
 * admin cannot see in a field they have stopped looking at.
 */
export function NoSearchMatches({
  query,
  what,
  hint,
}: {
  query: string;
  /** What was searched, in the plural: "fields", "metrics", "taxonomy values". */
  what: string;
  hint?: string;
}) {
  return (
    <div className="border border-border-subtle bg-surface px-6 py-12 text-center">
      <p className="text-sm text-text">
        No {what} match &ldquo;{query.trim()}&rdquo;.
      </p>
      <p className="mt-1 text-sm text-text-muted">
        {hint ?? "Try a shorter word, or clear the search."}
      </p>
    </div>
  );
}
