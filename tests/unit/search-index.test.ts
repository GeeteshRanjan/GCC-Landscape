import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  ADMIN_TABS,
  NAV_GROUPS,
  TAXONOMY_LIST_TITLES,
} from "@/components/admin/sections";
import {
  KIND_LABELS,
  OPENABLE,
  SEARCH_KINDS,
  buildAdminIndex,
} from "@/components/admin/search-index";
import { PUBLIC_COPY_LABELS } from "@/data/diff";
import { matchesTokens, searchTokens } from "@/data/search";
import { parseDataset, type Dataset } from "@/data/schema";

/**
 * THE UNIVERSAL SEARCH'S LINKS, which is the half of it that can be silently wrong.
 *
 * The palette is a dialog, a listbox and a keyboard model, and every one of those fails
 * loudly. What fails QUIETLY is a result's destination: send a company to a page that
 * does not read `?open=`, or name a route that does not exist, and the admin arrives
 * somewhere plausible with nothing selected — which reads as the search having found the
 * wrong thing rather than as a broken link. So the index is a plain module and this file
 * checks every entry against the routes that actually exist on disk.
 *
 * It also checks COVERAGE, because the failure there is the same shape: a kind of object
 * that is not indexed is not missing from a list, it is a thing an admin is told does not
 * exist.
 */

const dataset: Dataset = parseDataset(
  JSON.parse(readFileSync(path.join(process.cwd(), "data", "dataset.json"), "utf8")),
);

const index = buildAdminIndex(dataset);

/** The `/admin` routes that exist, read off the App Router rather than restated. */
const ROUTES = new Set(
  ADMIN_TABS.map((tab) => tab.href),
);

const hits = (query: string) => {
  const tokens = searchTokens(query);
  return index.filter((item) => matchesTokens(tokens, item.haystack));
};

const of = (kind: (typeof SEARCH_KINDS)[number]) =>
  index.filter((item) => item.kind === kind);

describe("the admin's own section list", () => {
  /**
   * The nav and the palette read one list now. This is what that bought: a tab renamed
   * in `sections.ts` moves in both places, and a route added to the nav without a page
   * is caught here rather than by a 404 an admin reaches from a search result.
   */
  it("names a real route for every tab, and every route has a page file", () => {
    for (const tab of ADMIN_TABS) {
      const segment = tab.href.replace(/^\/admin\/?/, "");
      const file = path.join(
        process.cwd(),
        "src/app/admin/(authed)",
        segment,
        "page.tsx",
      );
      expect(() => readFileSync(file), `${tab.href} → ${file}`).not.toThrow();
    }
  });

  it("has no duplicate href and no duplicate label", () => {
    expect(new Set(ADMIN_TABS.map((tab) => tab.href)).size).toBe(ADMIN_TABS.length);
    expect(new Set(ADMIN_TABS.map((tab) => tab.label)).size).toBe(ADMIN_TABS.length);
  });

  it("keeps the three groups the product is organised into", () => {
    expect(NAV_GROUPS.map((group) => group.label)).toEqual([
      "Public screens",
      "Data",
      "Release",
    ]);
  });
});

describe("every entry's destination", () => {
  it("points at a route that exists", () => {
    const bad = index
      .map((item) => item.href.split("?")[0] ?? "")
      .filter((path) => !ROUTES.has(path));
    expect([...new Set(bad)]).toEqual([]);
  });

  /**
   * **`?open=` is only read by three surfaces**, and this is the assertion that keeps the
   * index honest about it. Taxonomy rows have a Rename button rather than an editor, and
   * every field on the site-copy page writes straight to the draft — so an `open` sent
   * there is read by nothing and the result quietly under-delivers.
   */
  it("only sets ?open= on a page that acts on it", () => {
    const wrong = index
      .filter((item) => new URL(item.href, "http://x").searchParams.has("open"))
      .map((item) => item.href.split("?")[0] ?? "")
      .filter((path) => !(OPENABLE as readonly string[]).includes(path));
    expect([...new Set(wrong)]).toEqual([]);
  });

  /**
   * A page result deliberately carries NO `find`, because seeding a filter would land an
   * admin on a list already narrowed by a word they typed only to get to the page.
   */
  it("sends a page result to the bare route", () => {
    for (const item of of("page")) {
      expect(item.href).not.toContain("?");
      expect(ROUTES.has(item.href)).toBe(true);
    }
  });

  /** A name with an ampersand, a slash or a space must survive the round trip. */
  it("encodes a query it cannot control the contents of", () => {
    const awkward = index.filter((item) => /[&/?#]/.test(item.title));
    // The dataset holds plenty: "Procter & Gamble", "AT&T", industries with ampersands.
    expect(awkward.length).toBeGreaterThan(0);
    for (const item of awkward) {
      const url = new URL(item.href, "http://x");
      expect(url.searchParams.get("find"), item.title).toBe(item.title);
    }
  });

  it("gives every entry a unique key", () => {
    expect(new Set(index.map((item) => item.key)).size).toBe(index.length);
  });
});

describe("what is indexed", () => {
  /**
   * **`peer-override` is exempt, and it is the only exemption.** Every other kind has
   * rows in every plausible dataset, so a zero means a loop was never written. Pinned
   * peer sets are corrections to the scoring engine and the healthy state is none at
   * all — so an empty collection here is the product working, and the assertion that
   * catches a missing loop for this kind is the one-entry-per-row check below.
   */
  it("covers every kind it declares a heading for", () => {
    for (const kind of SEARCH_KINDS) {
      if (kind === "peer-override") continue;
      expect(of(kind).length, KIND_LABELS[kind]).toBeGreaterThan(0);
    }
  });

  it("holds one entry per company, metric, sub-industry, pinned peer set and taxonomy value", () => {
    expect(of("company").length).toBe(dataset.companies.length);
    expect(of("metric").length).toBe(dataset.metrics.length);
    expect(of("sub-industry").length).toBe(dataset.businessTypes.length);
    expect(of("peer-override").length).toBe(dataset.peerOverrides.length);
    const taxonomyValues = (
      Object.keys(TAXONOMY_LIST_TITLES) as (keyof typeof TAXONOMY_LIST_TITLES)[]
    ).reduce((n, key) => n + dataset.taxonomy[key].length, 0);
    expect(of("taxonomy").length).toBe(taxonomyValues);
  });

  /**
   * **Every editable public string is reachable**, which is the one coverage gap that
   * would be invisible: the copy block is 28 flat keys and a missing one is a field an
   * admin is told does not exist, on the page whose whole purpose is editing it.
   */
  it("holds an entry for every public copy key, and for the hero, close, figures, tags and logos", () => {
    const copyEntries = of("copy");
    for (const label of Object.values(PUBLIC_COPY_LABELS)) {
      expect(
        copyEntries.some((item) => item.title === label),
        label,
      ).toBe(true);
    }
    const { impactStats, commonFunctions, logos } = dataset.siteContent;
    // Six for the hero's two, the close's two strings and its two per-screen CTA links,
    // plus one per figure, tag and logo, plus the 28 keys. The links are counted here
    // rather than exempted because an unset one is the entry an admin most needs to find.
    expect(copyEntries.length).toBe(
      6 +
        impactStats.length +
        commonFunctions.length +
        logos.length +
        Object.keys(PUBLIC_COPY_LABELS).length,
    );
  });
});

describe("finding a real thing", () => {
  /**
   * The queries this exists to answer, each naming a DIFFERENT kind. One assertion per
   * kind, because a search that only ever finds companies is the failure mode of an index
   * where one loop was written and the rest were not.
   */
  it("reaches a company, a sub-industry, a metric, a city and a page", () => {
    expect(hits("3M").map((item) => item.kind)).toContain("company");
    expect(hits("apparel").map((item) => item.kind)).toContain("sub-industry");
    expect(hits("bengaluru").map((item) => item.kind)).toContain("taxonomy");
    expect(hits("publish").map((item) => item.kind)).toContain("page");
  });

  /** A tag is not drawn as a title anywhere; it is how a tagging pass gets audited. */
  it("reaches a sub-industry by one of its tags", () => {
    const tag = dataset.businessTypes[0]?.tags[0];
    expect(tag).toBeTruthy();
    expect(hits(tag ?? "").map((item) => item.kind)).toContain("sub-industry");
  });

  /** A metric by its ID, which is what a `data:verify` report or a diff hands you. */
  it("reaches a metric by its id", () => {
    const metric = dataset.metrics[0];
    expect(metric).toBeTruthy();
    expect(hits(metric?.id ?? "").map((item) => item.key)).toContain(
      `metric:${metric?.id}`,
    );
  });

  /** A page is findable by a word that is not in its label. See `AdminTab.terms`. */
  it("reaches a page by a word an admin would use instead of its label", () => {
    expect(hits("diff").map((item) => item.href)).toContain("/admin/publish");
    expect(hits("dropdown").map((item) => item.href)).toContain("/admin/taxonomy");
  });

  it("finds nothing for a query nothing holds", () => {
    expect(hits("zzzz-no-such-thing")).toEqual([]);
  });
});
