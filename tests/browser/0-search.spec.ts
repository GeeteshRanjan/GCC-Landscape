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
   * sides of a hard industry boundary — `Payments & financial infrastructure` under
   * Software & Internet and `Payment processing & gateways` under BFSI — and matching never
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
   * (`fin-payments` was renamed "Payment processing & gateways" when payments was split
   * into four BFSI rows; it keeps `fintech` among its search terms.)
   */
  /**
   * Two page loads rather than one, because below 1440 the cascade pane is a DRILL-IN
   * that covers the parent list — so once Software & Internet is open, BFSI is behind
   * it and unclickable. That is the control working as designed; a spec that clicked
   * both in one pass would be asserting the pane does not cover the list.
   */
  for (const [industry, subIndustry] of [
    ["Software & Internet", "Payments & financial infrastructure"],
    ["BFSI", "Payment processing & gateways"],
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
    ["3pl", "Logistics & Transportation", "Freight forwarding & third-party logistics"],
    ["bpo", "Professional Services", "Business process outsourcing"],
    ["qsr", "Restaurant & Food Service", "Quick service restaurants"],
    ["cro", "Healthcare & Lifescience", "Clinical research & development services"],
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
      page.getByRole("treeitem", { name: "Clinical research & development services" }),
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
      page.getByRole("treeitem", { name: "Payment processing & gateways", exact: true }),
    ).toBeVisible();
    const named = await page
      .getByRole("treeitem", { name: /fintech/i })
      .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("aria-label")));
    expect(named).toEqual(["Fintech & digital lending"]);
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
          ? "Payments & financial infrastructure"
          : "All of Software & Internet",
        exact: true,
      })
      .click();

    await page.getByLabel("Annual revenue").click();
    await page.getByRole("option", { name: "$1 Bn – $5 Bn", exact: true }).click();
    await page.getByLabel("Headquarters").click();
    await page.getByLabel(/^Filter/).fill("USA");
    await page.getByRole("option", { name: "USA", exact: true }).click();

    await page.getByRole("button", { name: "See my results" }).click();
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
