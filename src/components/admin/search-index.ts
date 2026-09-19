import {
  ADMIN_TABS,
  TAXONOMY_LIST_TITLES,
  tabLabel,
} from "@/components/admin/sections";
import { PUBLIC_COPY_LABELS, describePeerOverride } from "@/data/diff";
import { METRIC_FUNCTION_LABELS, METRIC_LENS_ADMIN_LABELS } from "@/data/metrics";
import { searchableText, type SearchablePart } from "@/data/search";
import type { Dataset } from "@/data/schema";

/**
 * What the universal search can find, and where each result goes.
 *
 * **A plain module with no React in it, deliberately.** `global-search.tsx` is the
 * palette — a dialog, a listbox and a keyboard model — and this is the answer to "what
 * exists and how is it reached". Splitting them is what makes the half that can be
 * wrong cheaply testable: a result's HREF is the thing with a silent failure mode. Route
 * a company at a page that cannot act on `open` and the admin arrives somewhere
 * plausible with nothing selected, which reads as the search having found the wrong
 * thing. `tests/unit/search-index.test.ts` asserts every link against the routes that
 * exist and against the three surfaces that read `open`.
 *
 * The palette's own reasoning — why this is a way in rather than a second editor, why
 * the URL carries the jump, and why the index is built on first open — is at the top of
 * `global-search.tsx`.
 */

/**
 * The kinds of thing that can be found, in the order results are grouped.
 *
 * **Order is by how specific the answer is, not by how many there are of it.** A page is
 * the vaguest possible answer, so it leads — a query naming a page is almost certainly
 * asking for the page, and there are only six, so they crowd nothing out. Companies come
 * last for the mirror-image reason: 1,834 rows would otherwise bury the eight other
 * things a word like "cost" also matches.
 */
export const SEARCH_KINDS = [
  "page",
  "copy",
  "metric",
  "sub-industry",
  /**
   * Pinned peer sets, ranked between the sub-industries they overrule and the taxonomy.
   *
   * **The one kind whose collection is legitimately EMPTY on the shipped dataset**, which
   * is the healthy state — the engine is right almost everywhere. So the coverage test
   * asserts one entry per row rather than at least one entry, for this kind alone.
   */
  "peer-override",
  "taxonomy",
  "company",
] as const;

export type EntryKind = (typeof SEARCH_KINDS)[number];

/** The heading each group of results is drawn under. */
export const KIND_LABELS: Record<EntryKind, string> = {
  page: "Pages",
  copy: "Public copy and figures",
  metric: "Function metrics",
  "sub-industry": "Sub-industries",
  "peer-override": "Pinned peer sets",
  taxonomy: "Taxonomy",
  company: "Companies",
};

/**
 * The surfaces that act on `?open=`, and the only ones an entry may set it for.
 *
 * The other three have nothing to open: taxonomy rows have a Rename button rather than
 * an editor, and every field on the site-copy page writes straight to the draft. An
 * `open` sent to one of those would be read by nothing.
 */
export const OPENABLE = [
  "/admin",
  "/admin/metrics",
  "/admin/business-types",
  "/admin/peer-overrides",
] as const;

export interface SearchEntry {
  /** Stable across renders and unique across kinds — the React key and the DOM id. */
  key: string;
  kind: EntryKind;
  /** The bold line: what the thing is called where it lives. */
  title: string;
  /** The muted line under it. Enough to tell two similar titles apart. */
  detail?: string;
  /** The trailing chip: which surface or group owns this. */
  where: string;
  href: string;
  haystack: string;
}

/**
 * `?find=` seeds the target page's own filter; `?open=` opens one row's editor.
 *
 * Through `URLSearchParams` rather than a template string, because a company name holds
 * ampersands and slashes and a business type's name holds spaces — all of which a
 * hand-built query string silently truncates at.
 */
export function searchHref(path: string, find: string, open?: string): string {
  const params = new URLSearchParams({ find });
  if (open) params.set("open", open);
  return `${path}?${params.toString()}`;
}

function entry(
  parts: Omit<SearchEntry, "haystack"> & { terms?: readonly SearchablePart[] },
): SearchEntry {
  const { terms = [], ...rest } = parts;
  return {
    ...rest,
    // Every visible line is searchable, plus whatever the builder adds. A result an
    // admin can read but cannot reach by the words in it is the whole point missed.
    haystack: searchableText(rest.title, rest.detail, rest.where, ...terms),
  };
}

/** Everything findable in the draft, built once per draft change. */
export function buildAdminIndex(draft: Dataset): readonly SearchEntry[] {
  const out: SearchEntry[] = [];

  for (const tab of ADMIN_TABS) {
    out.push(
      entry({
        key: `page:${tab.href}`,
        kind: "page",
        title: tab.label,
        detail: tab.summary,
        where: tab.group,
        // No `find`: a page result IS the page, so seeding a filter would land an admin
        // on a list already narrowed by a word they only typed to get there.
        href: tab.href,
        terms: [tab.terms],
      }),
    );
  }

  const { hero, close, impactStats, commonFunctions, roleMap, logos, copy } =
    draft.siteContent;
  const site = tabLabel("/admin/entry-point");

  out.push(
    /* **Two entries for the headline, because it is two fields.** It was one `title`
       holding the product's name and the promise in one string; splitting it means an
       admin searching for either half has to land on the field that actually holds it,
       and a single entry would send someone looking for the tagline to a control whose
       value does not contain it. */
    entry({
      key: "copy:hero.productName",
      kind: "copy",
      title: "Hero product name",
      detail: hero.productName,
      where: site,
      href: searchHref("/admin/entry-point", "hero"),
      terms: ["headline", "h1", "first screen", "product", "name", "atlas"],
    }),
    entry({
      key: "copy:hero.tagline",
      kind: "copy",
      title: "Hero tagline",
      detail: hero.tagline,
      where: site,
      href: searchHref("/admin/entry-point", "hero"),
      terms: ["headline", "h1", "first screen", "promise", "strapline"],
    }),
    entry({
      key: "copy:hero.lead",
      kind: "copy",
      title: "Hero supporting line",
      detail: hero.lead,
      where: site,
      href: searchHref("/admin/entry-point", "hero"),
      terms: ["subtitle", "first screen"],
    }),
    entry({
      key: "copy:close.body",
      kind: "copy",
      title: "Closing call to action — supporting line",
      detail: close.body,
      where: site,
      href: searchHref("/admin/entry-point", "closing"),
      terms: ["cta", "last band", "result screens"],
    }),
    entry({
      key: "copy:close.ctaLabel",
      kind: "copy",
      title: "Closing call to action — button",
      detail: close.ctaLabel,
      where: site,
      href: searchHref("/admin/entry-point", "closing"),
      terms: ["cta", "button", "link out"],
    }),
    /**
     * The two per-screen links, indexed as `copy` beside the words they sit under.
     *
     * **Kind `copy` even though a URL is not copy, and that is the lesser of two wrongs.**
     * The kinds are how results are capped and grouped, so a sixth kind for two entries
     * would spend a whole group on them; and the thing an admin is looking for when they
     * type "utm" is the closing band, which is where these land them. The `detail` is the
     * stored URL, so the palette shows which link is currently set without navigating.
     *
     * A BLANK link still gets an entry. It is the field an admin most needs to find — an
     * untagged screen is the reason to come here at all — and an index that hid unset
     * fields would answer "utm" with nothing on exactly the deployment that has not been
     * tagged yet.
     */
    entry({
      key: "copy:close.ctaHrefPeers",
      kind: "copy",
      title: "Closing call to action — peer landscape link",
      detail: close.ctaHrefPeers,
      where: site,
      href: searchHref("/admin/entry-point", "closing"),
      terms: ["cta", "link", "url", "utm", "tracking", "campaign", "screen 1"],
    }),
    entry({
      key: "copy:close.ctaHrefFunctions",
      kind: "copy",
      title: "Closing call to action — function metrics link",
      detail: close.ctaHrefFunctions,
      where: site,
      href: searchHref("/admin/entry-point", "closing"),
      terms: ["cta", "link", "url", "utm", "tracking", "campaign", "screen 2"],
    }),
  );

  for (const stat of impactStats) {
    out.push(
      entry({
        key: `copy:stat.${stat.id}`,
        kind: "copy",
        title: `Impact figure — ${stat.value}`,
        detail: stat.label,
        where: site,
        href: searchHref("/admin/entry-point", stat.label),
        terms: ["impact", "numbers", "dark band"],
      }),
    );
  }

  for (const value of commonFunctions) {
    out.push(
      entry({
        key: `copy:function.${value}`,
        kind: "copy",
        title: value,
        detail: "Function tag on the peer landscape",
        where: site,
        href: searchHref("/admin/entry-point", value),
        terms: ["function list", "tags"],
      }),
    );
  }

  /**
   * The role map: one entry per role and one per group.
   *
   * **Roles are indexed individually because a role name is what an admin arrives with.**
   * "Move Data Scientist" and "add Prompt Engineer" are the two requests this section
   * exists for, and neither is answerable by a section-level entry. Thirty-six entries is
   * the same order as the copy labels beside them and the palette caps per KIND, so they
   * cannot bury anything.
   *
   * `kind: "copy"` rather than a kind of their own, on the CTA links' argument: the kinds
   * are how results are capped and grouped, and a whole group for one section of one page
   * would spend a heading on it. `?find=` seeds the page's own filter, which is what
   * reveals the section — and no `?open=`, because `/admin/entry-point` is not in
   * `OPENABLE` and every field there writes straight to the draft.
   */
  for (const role of roleMap.roles) {
    const family = roleMap.families.find((held) => held.id === role.familyId);
    out.push(
      entry({
        key: `copy:role.${role.id}`,
        kind: "copy",
        /* The bold line is the role's OWN NAME, not "Role — {name}", and the two are not
           interchangeable: `find` is seeded with the name, and a palette whose title is a
           superset of the query it sends is a result that does not match its own
           destination — which the round-trip test catches. It also reads better, because the
           name is what the admin typed. The kind's own heading says these are copy entries
           and the detail says which map they are on. */
        title: role.name,
        detail: [
          "Role map bubble",
          family?.name,
          roleMap.demandLevels[role.demand - 1],
        ]
          .filter(Boolean)
          .join(" · "),
        where: site,
        href: searchHref("/admin/entry-point", role.name),
        // `band` in words, because "emerging" is what somebody types and the stored value
        // is the enum. The id is here on `PUBLIC_COPY_LABELS`' argument: it is the handle
        // a reader arriving from a publish diff is holding.
        terms: [role.id, role.band, "role map", "bubble", "job complexity"],
      }),
    );
  }

  for (const family of roleMap.families) {
    out.push(
      entry({
        key: `copy:roleFamily.${family.id}`,
        kind: "copy",
        title: family.name,
        detail: `Role map group · colour ${family.tone}`,
        where: site,
        href: searchHref("/admin/entry-point", family.name),
        terms: [family.id, "role map", "legend", "colour", "group"],
      }),
    );
  }

  for (const logo of logos) {
    out.push(
      entry({
        key: `copy:logo.${logo.src}`,
        kind: "copy",
        title: `Customer logo — ${logo.name}`,
        detail: logo.src,
        where: site,
        href: searchHref("/admin/entry-point", logo.name),
        terms: ["logo strip", "customers"],
      }),
    );
  }

  for (const key of Object.keys(PUBLIC_COPY_LABELS) as (keyof typeof copy)[]) {
    out.push(
      entry({
        key: `copy:${key}`,
        kind: "copy",
        title: PUBLIC_COPY_LABELS[key],
        detail: copy[key],
        where: site,
        href: searchHref("/admin/entry-point", PUBLIC_COPY_LABELS[key]),
        // The schema key, for the reader arriving from `copy.ts` or from a publish diff
        // rather than from the page: everything else here is prose, and the key is the
        // only handle they are holding.
        terms: [key],
      }),
    );
  }

  for (const metric of draft.metrics) {
    out.push(
      entry({
        key: `metric:${metric.id}`,
        kind: "metric",
        title: metric.title,
        detail: metric.question,
        // The function area is part of the identity rather than decoration: six titles
        // appear on more than one tab, so "Bench strength" alone names three rows.
        where: `${METRIC_FUNCTION_LABELS[metric.functionArea]} · ${METRIC_LENS_ADMIN_LABELS[metric.lens]}`,
        href: searchHref("/admin/metrics", metric.title, metric.id),
        terms: [
          metric.id,
          metric.unit,
          metric.gated && "behind the gate gated withheld",
        ],
      }),
    );
  }

  for (const type of draft.businessTypes) {
    out.push(
      entry({
        key: `type:${type.id}`,
        kind: "sub-industry",
        title: type.name,
        detail: type.tags.join(" · "),
        where: type.industry,
        href: searchHref("/admin/business-types", type.name, type.id),
        terms: [type.id],
      }),
    );
  }

  /**
   * Pinned peer sets, found by their combination or by any company in them.
   *
   * **The company names are the load-bearing half of the haystack.** The question an
   * admin arrives with is "is Lowe's pinned anywhere" — an audit that is otherwise every
   * row read by eye, and one they need before wondering why a company keeps appearing.
   * The `detail` is the pinned list itself, so the palette answers it without navigating.
   */
  const companyNames = new Map(draft.companies.map((c) => [c.id, c.name]));
  const overrides = tabLabel("/admin/peer-overrides");
  for (const override of draft.peerOverrides) {
    const pinned = override.companyIds.map((id) => companyNames.get(id) ?? id);
    out.push(
      entry({
        key: `peer-override:${override.id}`,
        kind: "peer-override",
        title: describePeerOverride(override),
        detail: pinned.join(" → "),
        where: overrides,
        href: searchHref(
          "/admin/peer-overrides",
          override.industry,
          override.id,
        ),
        terms: [override.id, override.note, pinned],
      }),
    );
  }

  for (const key of Object.keys(TAXONOMY_LIST_TITLES) as (keyof typeof TAXONOMY_LIST_TITLES)[]) {
    for (const value of draft.taxonomy[key]) {
      out.push(
        entry({
          key: `taxonomy:${key}:${value}`,
          kind: "taxonomy",
          title: value,
          where: TAXONOMY_LIST_TITLES[key],
          href: searchHref("/admin/taxonomy", value),
        }),
      );
    }
  }

  const typeNames = new Map(draft.businessTypes.map((type) => [type.id, type.name]));
  // `companyNames` is built above, for the pinned peer sets.
  for (const company of draft.companies) {
    out.push(
      entry({
        key: `company:${company.id}`,
        kind: "company",
        title: company.name,
        detail: [
          company.industry,
          // Untagged is a real state — the company matches on industry and revenue band
          // alone — so it is named rather than left as a gap in the line.
          company.businessTypes.length === 0
            ? "No sub-industry"
            : company.businessTypes.map((id) => typeNames.get(id) ?? id).join(" · "),
          company.cities.join(", "),
        ]
          .filter(Boolean)
          .join(" — "),
        where: company.hqCountry,
        href: searchHref("/admin", company.name, company.id),
        terms: [
          company.revenueBand,
          company.fortuneGlobal500 && "fortune global 500",
          company.forbesGlobal2000 && "forbes global 2000",
        ],
      }),
    );
  }

  return out;
}
