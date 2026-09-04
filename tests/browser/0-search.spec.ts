import { expect, test } from "@playwright/test";

/**
 * The industry dropdown's FILTER, against a real build.
 *
 * Numbered `0-` so it lands in the `public` project — a spec numbered outside every
 * project's `testMatch` silently never runs, and this one has to run before
 * `5-publish` rewrites the fixture.
 *
 * ── Why this exists ─────────────────────────────────────────────────────────
 *
 * A visitor reported peers that had nothing to do with their business. The cause was
 * not the scoring engine, which is coherent whenever it is given a sub-industry
 * (`tests/unit/match-quality.test.ts` measures it). The cause was that they could not
 * FIND their sub-industry: the filter tested the row's printed label as a substring,
 * so `fintech`, `saas`, `3pl`, `bpo` and 37 other ordinary trade words matched nothing
 * at all, and the visitor took `All of {industry}` instead — which drops the primary
 * ordering signal.
 *
 * `tests/unit/search-terms.test.ts` covers the vocabulary and the matcher. What only a
 * browser can cover, and therefore what is here: that the terms are actually WIRED to
 * the control, that a matched sub-industry surfaces its parent industry in the first
 * pane, that the cascade then holds the narrowed child, and that a term never becomes
 * visible text on a row — because a `treeitem`'s accessible name is computed from its
 * contents, so a visible synonym would rename the row and break every exact-name
 * lookup in this suite.
 */

function panel(page: import("@playwright/test").Page) {
  return page.getByRole("tree");
}

async function openIndustryAndFilter(
  page: import("@playwright/test").Page,
  query: string,
) {
  await page.goto("/");
  await page.getByLabel("Industry").click();
  await expect(panel(page)).toBeVisible();
  await page.getByLabel(/^Filter/).fill(query);
}

test.describe("finding a sub-industry by the words a visitor uses", () => {
  /**
   * The reported case. A payments platform is one business this taxonomy holds on both
   * sides of a hard industry boundary — `Payments & Financial Infrastructure` under
   * Software & Internet and `Payment Processing & Gateways` under BFSI — and matching never
   * crosses that boundary. So the one thing the form can do is refuse to hide the
   * choice: `payments` has to surface both industries, and the visitor picks.
   */
  test("`payments` surfaces both industries that hold a payments business", async ({
    page,
  }) => {
    await openIndustryAndFilter(page, "payments");
    await expect(
      page.getByRole("treeitem", { name: "Software & Internet", exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("treeitem", { name: "BFSI", exact: true })).toBeVisible();
    // And it still narrows. Twenty-four industries down to a handful is the point.
    expect(await page.getByRole("treeitem").count()).toBeLessThan(8);
  });

  /**
   * `fintech` appears in neither industry's name and in neither payments row's label.
   * It reaching a payments row in both industries is the mechanism working end to end.
   * (`fin-payments` was renamed "Payment Processing & Gateways" when payments was split
   * into four BFSI rows; it keeps `fintech` among its search terms.)
   */
  /**
   * Two page loads rather than one, and it is now belt-and-braces rather than a hard
   * constraint. The cascade pane sits BESIDE the first pane from `md` up, so at the
   * default viewport both industries are on screen and clickable in one pass. Below `md`
   * it is a drill-in covering the list, where the second industry would be behind it.
   * A fresh load per industry is correct at every width, so this stays.
   */
  for (const [industry, subIndustry] of [
    ["Software & Internet", "Payments & Financial Infrastructure"],
    ["BFSI", "Payment Processing & Gateways"],
  ] as const) {
    test(`\`fintech\` reaches ${subIndustry}`, async ({ page }) => {
      await openIndustryAndFilter(page, "fintech");
      await page.getByRole("treeitem", { name: industry, exact: true }).click();
      await expect(page.getByRole("treeitem", { name: subIndustry })).toBeVisible();
    });
  }

  /**
   * Four acronyms across four industries, each of which used to match nothing. Three
   * of them are three characters or fewer, which is the case the matcher handles as a
   * whole word rather than a substring — as a substring `bpo` is fine but `ai` and
   * `si` reached a third of the taxonomy.
   */
  const ACRONYMS = [
    ["3pl", "Logistics & Transportation", "Freight Forwarding & Third-Party Logistics"],
    ["bpo", "Professional Services", "Business Process Outsourcing"],
    ["qsr", "Restaurant & Food Service", "Quick Service Restaurants"],
    ["cro", "Healthcare & Lifescience", "Clinical Research & Development Services"],
  ] as const;

  for (const [query, industry, subIndustry] of ACRONYMS) {
    test(`\`${query}\` reaches ${subIndustry}`, async ({ page }) => {
      await openIndustryAndFilter(page, query);
      const parent = page.getByRole("treeitem", { name: industry, exact: true });
      await expect(parent).toBeVisible();
      await parent.click();
      await expect(page.getByRole("treeitem", { name: subIndustry })).toBeVisible();
    });
  }

  /**
   * A two-word query has to narrow, not widen. The matcher requires EVERY token, so
   * `payment gateway` is tighter than `payment` — an OR would have made every second
   * word make the list longer.
   */
  test("a second word narrows the list", async ({ page }) => {
    await openIndustryAndFilter(page, "payment");
    const broad = await page.getByRole("treeitem").count();
    await page.getByLabel(/^Filter/).fill("payment gateway");
    expect(await page.getByRole("treeitem").count()).toBeLessThanOrEqual(broad);
    await expect(
      page.getByRole("treeitem", { name: "Software & Internet", exact: true }),
    ).toBeVisible();
  });

  /**
   * Almost every row in this taxonomy contains an ampersand, and it is typed as a word
   * at least as often as it is typed as a glyph.
   */
  test("`and` and `&` are the same query", async ({ page }) => {
    await openIndustryAndFilter(page, "research and development");
    const parent = page.getByRole("treeitem", {
      name: "Healthcare & Lifescience",
      exact: true,
    });
    await expect(parent).toBeVisible();
    await parent.click();
    await expect(
      page.getByRole("treeitem", { name: "Clinical Research & Development Services" }),
    ).toBeVisible();
  });

  /**
   * The constraint the terms are designed around. A `treeitem`'s accessible name comes
   * from its contents, so a row that DISPLAYED its synonyms would be renamed by them —
   * which is why the visible count beside a branching row is `aria-hidden` too. This
   * asserts the row's name is still exactly its label after a term matched it.
   */
  test("a search term never becomes part of a row's name", async ({ page }) => {
    await openIndustryAndFilter(page, "fintech");
    const parent = page.getByRole("treeitem", { name: "BFSI", exact: true });
    await expect(parent).toBeVisible();
    await parent.click();
    // Named EXACTLY its label, with no trace of the term that found it. The only row
    // in the pane whose name contains "fintech" is the one whose printed label does.
    await expect(
      page.getByRole("treeitem", { name: "Payment Processing & Gateways", exact: true }),
    ).toBeVisible();
    const named = await page
      .getByRole("treeitem", { name: /fintech/i })
      .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("aria-label")));
    expect(named).toEqual(["Fintech & Digital Lending"]);
  });

  /** A country by a name that is not its entry. The field is one flat listbox. */
  test("the headquarters field finds the UK by `england`", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Headquarters").click();
    await page.getByLabel(/^Filter/).fill("england");
    await expect(page.getByRole("option", { name: "UK", exact: true })).toBeVisible();
  });

  /** A query nothing matches still says so, rather than showing an empty box. */
  test("says when nothing matches", async ({ page }) => {
    await openIndustryAndFilter(page, "zzzzz");
    await expect(page.getByText(/Nothing matches/)).toBeVisible();
  });
});

/**
 * THE SECOND PANE RANKS, IT DOES NOT CUT — and the first pane still cuts.
 *
 * Filtering pane B down to the hits alone showed 2 of BFSI's 15 sub-industries for
 * `fintech` and 2 of Software & Internet's 31, so a visitor could not see the sibling
 * that fitted them better and the fallback is `All of {industry}` — which drops the
 * primary ordering signal. The hits are hoisted above a breaker and everything else
 * stays on screen beneath it. `partitionByMatch` is unit-tested in
 * `tests/unit/search-terms.test.ts`; what only a browser can show is the ORDER on screen,
 * the breaker's presence in the three states, and that the keyboard walks straight
 * through it.
 *
 * Every industry named here is a measured case, not an assumption.
 */
test.describe("the sub-industry pane hoists matches and keeps the rest", () => {
  /**
   * Row labels in the branch pane, in the order they are drawn.
   *
   * Scoped by the pane's own `role="group"` and its industry name, so it cannot pick up
   * the first pane's rows — and named rather than positional, because the entry point
   * grows other groups as the page changes.
   */
  async function paneRows(
    page: import("@playwright/test").Page,
    industry: string,
  ) {
    return page
      .getByRole("group", { name: industry })
      .getByRole("treeitem")
      .evaluateAll((nodes) =>
        nodes.map((node) => node.getAttribute("aria-label") ?? node.textContent ?? ""),
      );
  }

  /**
   * The case the change exists for. BFSI holds 15 sub-industries and `fintech` matches
   * two of them; the other thirteen used to vanish.
   */
  test("`fintech` hoists both BFSI hits and still shows the other thirteen", async ({
    page,
  }) => {
    await openIndustryAndFilter(page, "fintech");
    await page.getByRole("treeitem", { name: "BFSI", exact: true }).click();

    // Both hits, and a sibling that does NOT match — previously hidden entirely.
    await expect(
      page.getByRole("treeitem", { name: "Fintech & Digital Lending", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("treeitem", { name: "Retail & Commercial Banking", exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Other sub-industries")).toBeVisible();

    // The whole child set is present: `All of BFSI` plus all 15.
    const rows = await paneRows(page, "BFSI");
    expect(rows).toHaveLength(16);
    expect(rows[0]).toBe("All of BFSI");

    // ORDER: both hits precede every non-matching row.
    const hits = ["Payment Processing & Gateways", "Fintech & Digital Lending"];
    const lastHit = Math.max(...hits.map((name) => rows.indexOf(name)));
    const firstOther = rows.indexOf("Retail & Commercial Banking");
    expect(lastHit).toBeGreaterThan(0);
    expect(firstOther).toBeGreaterThan(lastHit);
  });

  /**
   * Education's two children BOTH match `education`, so nothing is on the far side of
   * the breaker and it must not be drawn.
   */
  test("draws no breaker when every sub-industry matches", async ({ page }) => {
    await openIndustryAndFilter(page, "education");
    await page.getByRole("treeitem", { name: "Education", exact: true }).click();
    await expect(
      page.getByRole("treeitem", { name: "All of Education", exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Other sub-industries")).toHaveCount(0);
  });

  /**
   * Wholesale matches on the INDUSTRY's own terms and on NEITHER of its two children.
   * Nothing was hoisted, so there is no division to label — and the old "No
   * sub-industries match" note must be gone, because it would be a false statement
   * beside two visible rows.
   */
  test("shows every sub-industry with no breaker when the industry matched but no child did", async ({
    page,
  }) => {
    await openIndustryAndFilter(page, "wholesale");
    await page.getByRole("treeitem", { name: "Wholesale", exact: true }).click();
    const rows = await paneRows(page, "Wholesale");
    // `All of Wholesale` plus both children.
    expect(rows).toHaveLength(3);
    expect(rows[0]).toBe("All of Wholesale");
    await expect(page.getByText("Other sub-industries")).toHaveCount(0);
    await expect(page.getByText(/No sub-industries match/)).toHaveCount(0);
  });

  /** Unfiltered, the pane is the full set and carries no breaker. */
  test("carries no breaker when not filtering", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Industry").click();
    await page.getByRole("treeitem", { name: "BFSI", exact: true }).click();
    const rows = await paneRows(page, "BFSI");
    expect(rows).toHaveLength(16);
    await expect(page.getByText("Other sub-industries")).toHaveCount(0);
  });

  /**
   * The breaker is `role="presentation"`, so it is not a stop on the way down: arrowing
   * off the last hit lands on the first row beneath the breaker.
   */
  test("the keyboard steps over the breaker", async ({ page }) => {
    await openIndustryAndFilter(page, "fintech");
    await page.getByRole("treeitem", { name: "BFSI", exact: true }).click();

    const rows = await paneRows(page, "BFSI");
    const firstOther = rows.indexOf("Retail & Commercial Banking");
    expect(firstOther).toBeGreaterThan(0);

    // ArrowRight is what moves the keyboard INTO an open branch; a press on the parent
    // row commits the industry and opens the pane but leaves the active row in pane A.
    // It lands on the pane's first row, `All of BFSI`, which is index 0 of `rows`.
    //
    // **Keys go to the COMBOBOX, and the active row is read off it too.** The tree is
    // the popup, not the focused element: nothing inside it is focusable, so
    // `aria-activedescendant` sits on the combobox that owns it — which is what the
    // pattern requires and where a screen reader looks. Pressing the tree instead
    // resolves to a no-op focus call and reading it back always answers null.
    // By ROLE, not by label: `getByLabel` matches on substring, and once the panel is
    // open the tree's own `aria-label` ("Choose your industry") matches "Industry" too.
    const combobox = page.getByRole("combobox", { name: "Industry" });
    await combobox.press("ArrowRight");
    for (let i = 0; i < firstOther; i += 1) await combobox.press("ArrowDown");

    // Resolved in the BROWSER: `aria-activedescendant` is an id holding encoded
    // characters, and `CSS.escape` is not available in the Node test process.
    const activeLabel = await combobox.evaluate((node) => {
      const id = node.getAttribute("aria-activedescendant");
      return id ? (document.getElementById(id)?.getAttribute("aria-label") ?? null) : null;
    });
    expect(activeLabel).toBe("Retail & Commercial Banking");
  });

  /**
   * The matched run is marked, and marking it does NOT rename the row.
   *
   * Splitting a label into elements is only safe because every row carries an explicit
   * `aria-label`, which overrides name-from-content — so this asserts both halves: that a
   * `<mark>` really is drawn inside the row, and that the row is still findable by its
   * exact plain name with the highlight in place. `highlightRanges` is unit-tested for
   * the offset mapping; this is the part only a browser can confirm.
   */
  test("marks the matched run without renaming the row", async ({ page }) => {
    await openIndustryAndFilter(page, "semiconductor");
    const row = page.getByRole("treeitem", { name: "Semiconductors", exact: true });
    // Still named exactly its label — the mark is invisible to the name computation.
    await expect(row).toBeVisible();
    // And the matched run really is marked.
    await expect(row.locator("mark")).toHaveText("Semiconductor");
  });

  /**
   * A row matched by a search TERM has nothing in its printed label to mark, and must
   * draw no highlight rather than displaying the term — a shown synonym would rename the
   * row. `fintech` reaches this row entirely through `search-terms.ts`.
   */
  test("draws no mark on a row matched only by a search term", async ({ page }) => {
    await openIndustryAndFilter(page, "fintech");
    await page
      .getByRole("treeitem", { name: "Software & Internet", exact: true })
      .click();
    const row = page.getByRole("treeitem", {
      name: "Payments & Financial Infrastructure",
      exact: true,
    });
    await expect(row).toBeVisible();
    await expect(row.locator("mark")).toHaveCount(0);
  });

  /**
   * The first pane is unchanged and must stay a hard filter — narrowing 24 industries to
   * a handful is its whole job, and this is the assertion that would catch the partition
   * being applied there by mistake.
   */
  test("the industry pane still cuts rather than ranking", async ({ page }) => {
    await openIndustryAndFilter(page, "payments");
    // No branch open, so every treeitem on the page is a first-pane industry row.
    expect(await page.getByRole("treeitem").count()).toBeLessThan(8);
    await expect(
      page.getByRole("treeitem", { name: "Telecom", exact: true }),
    ).toHaveCount(0);
  });
});

/**
 * The end-to-end point of all of it: a visitor who finds their sub-industry gets peers
 * in their own line of business, and one who takes the broad answer does not.
 *
 * Asserted on names rather than on a score, because a browser cannot see the score —
 * and because the two sets being DISJOINT is the strongest available statement that the
 * field is carrying real weight.
 */
test("finding the sub-industry changes which companies are shown", async ({ page }) => {
  async function submit(withSubIndustry: boolean) {
    await page.goto("/");
    await page.getByLabel("Industry").click();
    await page.getByLabel(/^Filter/).fill("payment gateway");
    await page.getByRole("treeitem", { name: "Software & Internet", exact: true }).click();
    await page
      .getByRole("treeitem", {
        name: withSubIndustry
          ? "Payments & Financial Infrastructure"
          : "All of Software & Internet",
        exact: true,
      })
      .click();

    await page.getByLabel("Annual revenue").click();
    await page.getByRole("option", { name: "1 Bn – 5 Bn", exact: true }).click();
    await page.getByLabel("Headquarters").click();
    await page.getByLabel(/^Filter/).fill("USA");
    await page.getByRole("option", { name: "USA", exact: true }).click();

    await page.getByRole("button", { name: "Build my GCC Landscape" }).click();
    const peers = page.locator("#peers");
    await expect(peers).toBeVisible();
    return (await peers.innerText()).toLowerCase();
  }

  const typed = await submit(true);
  const broad = await submit(false);

  // A payments visitor who said so sees payments companies.
  expect(typed).toContain("aci worldwide");
  // The same visitor who took the broad answer does not.
  expect(broad).not.toContain("aci worldwide");
});
