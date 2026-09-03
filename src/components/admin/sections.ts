import type { TaxonomyKey } from "@/components/admin/draft-provider";

/**
 * What the admin is made of, BY NAME. One home for the vocabulary three things need.
 *
 * The nav renders it, the universal search indexes it, and the taxonomy editor titles
 * its four lists from it. Before this module the nav owned its labels and the search
 * would have had to restate them — six page names and four list names typed twice,
 * where the failure is silent: a renamed tab still reachable in the palette under its
 * old name, sending an admin to a page that no longer calls itself that.
 *
 * **It holds no component and no JSX on purpose.** `admin-shell.tsx` is in the
 * authenticated layout, so it loads on every admin page; if the search index had to
 * import the taxonomy editor to learn what its lists are called, the taxonomy editor
 * would ship on the company table. A plain module with a type-only import is free.
 */

export interface AdminTab {
  href: string;
  /** What the nav draws, and what the palette calls the page. */
  label: string;
  /** One line under the label in the palette. Not drawn in the nav. */
  summary: string;
  /**
   * Extra words the page is findable by, beyond its label and summary.
   *
   * The same idea as `search-terms.ts` on the public side and for the same reason: an
   * admin looking for the company table may type "rows", "import" or "FTE", none of
   * which is the word ANSR chose for the tab. Never displayed.
   */
  terms: readonly string[];
}

/**
 * The six sections, grouped the way the product is.
 *
 * Flat, the list said nothing about what a tab reaches: "Site copy" and "Function
 * metrics" edit what a visitor is SHOWN, "Companies" and "Taxonomy" edit what that is
 * drawn FROM, and "Publish" is the one act that makes either live. Three groups in
 * that order, so a change request about a public screen maps to one place.
 *
 * Every label uses the product's own vocabulary, which is why `/admin/business-types`
 * reads "Sub-industries": that is the word on the public dropdown and in the company
 * table. **Only the LABEL moves** — the route, the dataset key and the component all
 * keep their names, and the route is what the browser specs navigate by.
 *
 * "Site copy" is likewise named for the surface it edits rather than for the
 * `siteContent` key behind it: an admin is looking for the headline on the first page,
 * not for a schema field.
 */
export const NAV_GROUPS: readonly {
  label: string;
  tabs: readonly AdminTab[];
}[] = [
  {
    label: "Public screens",
    tabs: [
      {
        href: "/admin/entry-point",
        label: "Site copy",
        summary:
          "The hero, the closing call to action, ANSR's impact figures, the function tags, the customer logos and the 28 fixed labels.",
        terms: ["headline", "hero", "wording", "strings", "labels", "cta", "logos"],
      },
      {
        href: "/admin/metrics",
        label: "Function metrics",
        summary:
          "The figures behind the second result screen, by function area and internal lens.",
        terms: ["screen 2", "figures", "values", "gated", "charts"],
      },
    ],
  },
  {
    label: "Data",
    tabs: [
      {
        href: "/admin",
        label: "Companies",
        summary:
          "Every company row: name, industry, sub-industry, revenue band, cities, FTE range and index flags.",
        /**
         * **A page's terms name the PAGE, never the fields on it.** `fte`, `headcount`
         * and `gcc` were here and are removed: every field they describe is indexed as
         * its own entry, and because pages are the first group, a content word on a page
         * put the Companies TAB above the actual field for any query containing it —
         * "GCC headcount" resolved to the company table rather than to the peer-card
         * label of that name.
         */
        terms: ["rows", "table", "company list", "add a company", "import"],
      },
      {
        href: "/admin/taxonomy",
        label: "Taxonomy",
        summary:
          "Industries, revenue bands, India cities and HQ countries — what the public dropdowns offer.",
        terms: ["dropdown", "industries", "bands", "cities", "countries", "coordinates"],
      },
      {
        href: "/admin/business-types",
        label: "Sub-industries",
        summary:
          "The business-type catalogue and its tags, which drive peer similarity.",
        terms: ["business types", "tags", "similarity", "peers"],
      },
    ],
  },
  {
    label: "Release",
    tabs: [
      {
        href: "/admin/publish",
        label: "Publish",
        summary: "Review the diff and make the draft live.",
        terms: ["diff", "release", "commit", "go live", "review"],
      },
    ],
  },
];

/** Every tab, flat, each knowing which group it sits in. */
export const ADMIN_TABS: readonly (AdminTab & { group: string })[] =
  NAV_GROUPS.flatMap((group) =>
    group.tabs.map((tab) => ({ ...tab, group: group.label })),
  );

/** The href a page is reached at, by the label the nav gives it. */
export function tabLabel(href: string): string {
  return ADMIN_TABS.find((tab) => tab.href === href)?.label ?? href;
}

/**
 * The four taxonomy lists, by the heading the editor gives each one.
 *
 * Here rather than inside `taxonomy-manager.tsx`'s own `LISTS` because the palette has
 * to tell an admin WHICH list a value came from — "Bengaluru" is meaningless without
 * "India cities" beside it — and the editor's config carries a description, an add
 * label and an ordering flag the palette has no use for.
 */
export const TAXONOMY_LIST_TITLES: Record<TaxonomyKey, string> = {
  industries: "Industries",
  revenueBands: "Revenue bands",
  cities: "India cities",
  hqCountries: "HQ countries",
};
