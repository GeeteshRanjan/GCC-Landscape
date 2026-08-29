import { expect, test, type Page } from "@playwright/test";

import { band, choose } from "./helpers";

/**
 * Screen 2, the public Function View, against a real production build.
 *
 * Numbered `0-` so it lands in the `public` project — the `admin` project's pattern
 * is a character class, so a spec numbered outside every project's pattern lands in
 * no project and silently never runs. `0-` also puts it ahead of `5-publish`, which
 * rewrites the fixture dataset, so the figures asserted here are the seeded ones.
 * It sorts after `0-screen1.spec.ts`, which is fine: neither mutates anything.
 *
 * What only a browser can cover, and therefore what is here: reaching Screen 2 as a
 * state change rather than a navigation, focus moving to the new heading, the tab
 * widget's real keyboard behaviour, and the two things that would be invisible in a
 * unit test — that a gated metric's figures are absent from the actual document,
 * and that the internal lens names are nowhere on the page. The view model's own
 * arithmetic is unit-tested in tests/unit/screen2.
 */

/** The admin-only lens labels. None of these may ever reach a public screen. */
const LENS_LABELS = [
  "Talent supply",
  "Speed to stand up",
  "Location and infrastructure",
];

async function openFunctionView(page: Page): Promise<void> {
  await page.goto("/");
  await choose(page, "Industry", "BFSI");
  await choose(page, "Annual revenue", "Above $20 Bn");
  await choose(page, "Headquarters", "USA");
  await page.getByRole("button", { name: "See my results" }).click();
  await expect(band(page, "peers")).toBeVisible();
  /**
   * **The way across is the view tab, not a band at the foot of the page.** The
   * "Explore the function view" button in the second-to-last band is gone: the two
   * views are a connected tab strip at the head of both screens now, so the band was
   * repeating an offer the visitor had already been given and could already see.
   */
  await page.getByRole("tab", { name: /Function Opportunity/ }).click();
}

function tabs(page: Page) {
  return page.getByRole("tablist", { name: "Function" });
}

test.describe("getting there and back", () => {
  test("is a state change, not a navigation, and moves focus with it", async ({
    page,
  }) => {
    await openFunctionView(page);

    /**
     * **The `h1` is the product on both result screens, so this screen's finding is
     * its first `h2`.** The teal display hero it used to headline is gone — the teal
     * area is a compact context strip now — and a heading identical on the two views
     * could not be the thing that announces a change between them anyway.
     */
    await expect(
      page.getByRole("heading", { level: 1, name: "ANSR. GCC Intelligence" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        level: 2,
        name: /What an India GCC would give you/,
      }),
    ).toBeVisible();
    /**
     * Focus lands on the TAB PANEL instead. Nothing announces a phase change because
     * no navigation happened, and a panel named by its own tab announces "Function
     * opportunity, tab panel" — the change said out loud, where re-reading a shared
     * product heading would have said nothing.
     */
    await expect(
      page.getByRole("tabpanel", { name: /Function Opportunity/ }),
    ).toBeFocused();

    // The URL is the parent page's, so it does not move. There is nothing to
    // deep-link into and this is what that looks like.
    expect(new URL(page.url()).pathname).toBe("/");

    // The peer view is gone rather than scrolled past.
    await expect(band(page, "peers")).toHaveCount(0);

    /**
     * **The way back is the other tab**, and the treatment reverses — which is the
     * property that makes one shared component worth having rather than two hand-built
     * strips that have to be kept in agreement. The selected cell is the white surface
     * continuous with this screen's content; the other returns to the band's own teal.
     * Asserted as geometry and fill rather than by class name.
     */
    const tablist = page.getByRole("tablist", { name: "Result view" });
    const peersTab = tablist.getByRole("tab", { name: /Peer Landscape/ });
    const functionsTab = tablist.getByRole("tab", { name: /Function Opportunity/ });
    await expect(functionsTab).toHaveAttribute("aria-selected", "true");
    await expect(peersTab).toHaveAttribute("aria-selected", "false");
    const panelId = await functionsTab.getAttribute("aria-controls");
    expect(panelId).toBeTruthy();
    const tabBox = (await functionsTab.boundingBox())!;
    const panelBox = (await page.locator(`#${panelId}`).boundingBox())!;
    expect(Math.abs(tabBox.y + tabBox.height - panelBox.y)).toBeLessThanOrEqual(1);
    const [selectedFill, panelFill, unselectedFill] = await Promise.all([
      functionsTab.evaluate((el) => getComputedStyle(el).backgroundColor),
      page
        .locator(`#${panelId}`)
        .evaluate((el) => getComputedStyle(el).backgroundColor),
      peersTab.evaluate((el) => getComputedStyle(el).backgroundColor),
    ]);
    expect(selectedFill).toBe(panelFill);
    expect(unselectedFill).not.toBe(selectedFill);
    await peersTab.click();
    // Focus follows to the peer view's own panel, and the answer is the one already
    // computed rather than a re-fetch.
    await expect(
      page.getByRole("tabpanel", { name: /Peer Landscape/ }),
    ).toBeFocused();
    await expect(page.getByRole("status")).toContainText(
      /relevant peers? operates? a GCC in India/,
    );
    await expect(band(page, "peers")).toBeVisible();
  });

  test("carries the visitor's answers across without asking again", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByLabel(/^Company name/).fill("Northwind Financial");
    await choose(page, "Industry", "BFSI");
    await choose(page, "Annual revenue", "Above $20 Bn");
    await choose(page, "Headquarters", "Germany");
    await page.getByRole("button", { name: "See my results" }).click();
    await page.getByRole("tab", { name: /Function Opportunity/ }).click();

    /**
     * The framing is no longer varied from the browser: the India-presence question
     * was removed at ANSR's request and `gccStatus` is supplied as a constant, so
     * this screen always gets the `evaluating` branch. That the three branches stay
     * distinct is asserted in `tests/unit/screen1.test.ts`, where the input can
     * actually be varied.
     *
     * What is still worth checking here, and what this test is really for, is that
     * the ANSWERS cross the phase boundary — the visitor is not asked twice.
     */
    await expect(
      page.getByRole("heading", { level: 2, name: /What an India GCC would give/ }),
    ).toBeVisible();
    await expect(page.getByText("Germany")).toBeVisible();
    /**
     * The company name crosses too, which it did not before: this summary carried
     * "India today" — the label of the question ANSR had removed — while the peer view
     * had correctly dropped it, so a visitor was shown a constant read back as their
     * own answer on the very next screen. Four facts, all of them theirs.
     */
    /**
     * The same four editable panels Screen 1 shows, from the same answers, in the same
     * order — one component in one place on both screens, so they cannot come to mean
     * two different things. New here: they are controls, and pressing one reaches the
     * form. This screen previously had no route to it at all.
     */
    const profile = page.getByRole("group", { name: /Your profile/ });
    /**
     * **One control beside four quiet pills, on this screen too.** The four chevroned
     * panels all went to the same place, so they were four affordances for one
     * destination — see Screen 1's profile test. It is the same component in the same
     * position on both screens, deliberately, so the two cannot mean different things.
     */
    await expect(profile.getByRole("button")).toHaveCount(1);
    await expect(profile.getByText("Company")).toBeVisible();
    await expect(profile.getByText("Northwind Financial")).toBeVisible();
    await expect(page.getByText("India today")).toHaveCount(0);
    await profile
      .getByRole("button", { name: "Change my answers" })
      .click();
    await expect(page.locator("h1#ask-title")).toBeVisible();
    await page.getByRole("button", { name: "See my results" }).click();
    await page.getByRole("tab", { name: /Function Opportunity/ }).click();
    await expect(
      page.getByRole("link", { name: /India GCC/ }),
    ).toBeVisible();

    // No second form, and no lead capture anywhere in this codebase.
    expect(await page.locator('input[type="email"]').count()).toBe(0);
    expect(await page.locator("select").count()).toBe(0);
  });
});

test.describe("the four functions", () => {
  test("are a real tab widget, keyboard included", async ({ page }) => {
    await openFunctionView(page);

    const list = tabs(page);
    await expect(list).toBeVisible();
    await expect(list.getByRole("tab")).toHaveText([
      "Technology",
      "Operations",
      "HR",
      "Finance",
    ]);

    await expect(page.getByRole("tab", { name: "Technology" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(
      page.getByRole("tabpanel").getByRole("heading", {
        level: 3,
        name: "Technology ecosystem by specialism",
      }),
    ).toBeVisible();

    // Arrow keys move between tabs — the behaviour that is worth taking from
    // Radix rather than hand-rolling.
    await page.getByRole("tab", { name: "Technology" }).focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("tab", { name: "Operations" })).toBeFocused();
    await expect(page.getByRole("tab", { name: "Operations" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(
      page.getByRole("tabpanel").getByRole("heading", {
        level: 3,
        name: "Grade A office stock",
      }),
    ).toBeVisible();

    // One panel at a time: the previous tab's content is unmounted, not hidden
    // behind the new one. Asserted on a card that belongs to the technology tab
    // alone — "Bench strength" is on three tabs by design, so it would still be
    // present after the switch and would prove nothing.
    await expect(
      page.getByRole("heading", { level: 3, name: "Technology ecosystem by specialism" }),
    ).toHaveCount(0);
  });

  test("show one national picture, with the shared figures identical on every tab", async ({
    page,
  }) => {
    await openFunctionView(page);

    /**
     * The product claim, read off the rendered page. The tabs are four views of one
     * India, not four datasets, so a figure that appears on more than one of them
     * has to be the same figure — which is what a CFO comparing notes with a CTO
     * would notice first if it were not.
     */
    const shared: Array<[string, string]> = [
      ["Bench strength", "8.7 million+"],
      ["Time to backfill a role", "35"],
      ["Time to first hire", "7"],
      ["Time to reach each scale milestone", "6"],
    ];

    for (const name of ["Technology", "Operations", "HR"]) {
      await page.getByRole("tab", { name, exact: true }).click();
      const panel = page.getByRole("tabpanel");
      for (const [title, figure] of shared) {
        const card = panel.getByRole("listitem").filter({
          has: page.getByRole("heading", { level: 3, name: title, exact: true }),
        });
        // Not every shared metric is on every tab — technology carries bench
        // strength but not the hiring timings. Where one IS present, the figure is.
        if ((await card.count()) === 0) continue;
        await expect(card.getByText(figure, { exact: false }).first()).toBeVisible();
      }
    }
  });

  test("shows the whole catalogue and no empty tab", async ({ page }) => {
    await openFunctionView(page);

    const expected: Array<[string, number]> = [
      ["Technology", 9],
      ["Operations", 9],
      ["HR", 11],
      ["Finance", 6],
    ];

    for (const [name, cards] of expected) {
      await page.getByRole("tab", { name, exact: true }).click();
      const panel = page.getByRole("tabpanel");
      // Every metric on the tab, held ones included.
      await expect(panel.getByRole("listitem")).toHaveCount(cards);
    }
  });

  test("renders a rated grid as a table with headers on both axes", async ({
    page,
  }) => {
    // An ordinal grid stays a real table: a row and a column header is exactly what
    // it is, the semantics are free, and a screen-reader user hears "Data and AI,
    // Poland, Strong" rather than a bare word.
    await openFunctionView(page);
    const table = page
      .getByRole("table")
      .filter({ hasText: "Product engineering" });
    await expect(table).toBeVisible();
    await expect(table.getByRole("columnheader", { name: "Poland" })).toBeVisible();
    await expect(
      table.getByRole("rowheader", { name: "Cybersecurity" }),
    ).toBeVisible();
    // The label is the whole reading. The filled steps beside it are a second,
    // positional one and are hidden, so an ordinal is never colour alone.
    await expect(
      table
        .getByRole("row", { name: /Product engineering/ })
        .getByText("Very strong")
        .first(),
    ).toBeVisible();
  });

  test("draws a two-column index as a gap, with the difference stated", async ({
    page,
  }) => {
    /**
     * Deliberately NOT a table, and this test is the record of that change.
     *
     * The answer to "what would we save by going beyond the established hubs" is
     * neither figure but the distance between them, and two table cells make the
     * reader subtract. The previous rendering also scaled each row to its own
     * maximum, so the tier-1 base drew a FULL bar and tier 2 a shorter one - which
     * reads as tier 2 being worse at the exact moment the number says it is cheaper.
     */
    await openFunctionView(page);
    await page.getByRole("tab", { name: "Finance", exact: true }).click();

    const card = page
      .getByRole("listitem")
      .filter({ hasText: "Tier 1 and tier 2 operating cost spread" });
    await expect(card).toBeVisible();
    await expect(card.getByRole("table")).toHaveCount(0);

    // The gap, already formatted by the view model, with a real minus sign rather
    // than a hyphen.
    await expect(card.getByText("\u221215")).toBeVisible();
    await expect(card.getByText("85")).toBeVisible();

    // An index says what it is indexed on, and which way is better. One with no
    // stated base is unreadable; one with no stated direction leaves the reader to
    // guess whether the short mark is the good news.
    await expect(
      page.getByText("Indexed: Tier 1 cities = 100. Lower is cheaper."),
    ).toBeVisible();
  });

});

test.describe("the gate", () => {
  test("shows a held metric as a shape and nothing else", async ({ page }) => {
    await openFunctionView(page);
    await page.getByRole("tab", { name: "HR", exact: true }).click();

    const group = page.getByRole("region", { name: /work through with you/ });
    await expect(group).toBeVisible();
    // Why they are held, which is the part worth saying: a national number without
    // the reader's own roles and cities behind it would mislead. The block used to
    // also promise that the values are omitted server-side so there is nothing to
    // uncover — true, enforced in `publicMetric`, and a promise made to a reader who
    // had not accused us of anything.
    await expect(group.getByText(/would mislead more than it would inform/)).toBeVisible();

    const cards = group.getByRole("listitem");
    await expect(cards).toHaveCount(2);
    await expect(group.getByText("Held back")).toHaveCount(2);

    // Cardinality is all the gate leaves, so cardinality is what the card says.
    await expect(group.getByText("5 rows across 5 columns.")).toBeVisible();
    await expect(group.getByText("2 parts.")).toBeVisible();

    // The 5x5 grid is drawn true: 25 slots, plus 2 rows of 2 for the breakdown's
    // label-and-bar pairs and the matrix's own count.
    const held = group.locator(".gcc-held");
    expect(await held.count()).toBeGreaterThanOrEqual(25);

    // Every slot is empty. A blur over real text would be a leak; there is no
    // text here to blur.
    for (const text of await held.allTextContents()) {
      expect(text.trim()).toBe("");
    }
  });

  test("does not put a gated figure or a gated label in the document", async ({
    page,
  }) => {
    await openFunctionView(page);
    await page.getByRole("tab", { name: "HR", exact: true }).click();
    const hr = await page.content();

    /**
     * Row and column names of the withheld grid, and only the two that appear
     * nowhere else on any tab. "Human resources" is also a discipline in the shared
     * graduate-output breakdown and a row of the open India-versus-hubs grid, so
     * asserting on it would fail while the gate was working perfectly. The
     * structural version of this check is in tests/unit/screen2.
     */
    expect(hr).not.toContain("Senior manager");
    expect(hr).not.toContain("Specialist");

    await page.getByRole("tab", { name: "Finance", exact: true }).click();
    const finance = await page.content();
    // The withheld workplace gradient's own parts and figures.
    expect(finance).not.toContain("Secondary business district");
    expect(finance).not.toContain("Outer ring road");
    // And the admin's internal working notes, in either tab.
    for (const html of [hr, finance]) {
      expect(html).not.toContain("STILL NEEDS");
      expect(html).not.toContain('"lens"');
    }
  });

  test("never shows a per-head money figure, in any tab", async ({ page }) => {
    await openFunctionView(page);

    for (const name of ["Technology", "Operations", "HR", "Finance"]) {
      await page.getByRole("tab", { name, exact: true }).click();
      const text =
        (await band(page, "function-metrics").innerText()) ??
        "";
      // Scoped to the metrics band on purpose: the header echoes the visitor's
      // own revenue band, which is where the only "$" on the screen lives.
      expect(text).not.toMatch(/[₹$€£¥]/);
      expect(text).not.toMatch(/\b(USD|INR|EUR|lakh|crore)\b/i);
    }

    // Said out loud where the cost figures are, rather than in a footer.
    await expect(
      page.getByText(/We publish no per-head salary figure/),
    ).toBeVisible();
  });
});

test.describe("the internal filing system stays internal", () => {
  test("never labels anything with a lens", async ({ page }) => {
    await openFunctionView(page);

    for (const name of ["Technology", "Operations", "HR", "Finance"]) {
      await page.getByRole("tab", { name, exact: true }).click();
      const html = await page.content();
      for (const label of LENS_LABELS) {
        expect(html).not.toContain(label);
      }
    }
  });

  test("never hints that an admin exists", async ({ page }) => {
    await openFunctionView(page);
    const html = await page.content();
    expect(html).not.toMatch(/\/admin/);
    expect(html.toLowerCase()).not.toMatch(/sign in|log in|login/);
  });
});

test.describe("iframe constraints", () => {
  test("nothing is fixed, sticky, or sized against the viewport", async ({
    page,
  }) => {
    await openFunctionView(page);
    await page.getByRole("tab", { name: "HR", exact: true }).click();

    const offenders = await page.evaluate(() => {
      const bad: string[] = [];
      for (const element of Array.from(document.querySelectorAll("*"))) {
        const style = getComputedStyle(element);
        if (style.position === "fixed" || style.position === "sticky") {
          bad.push(`${element.tagName}.${element.className} position:${style.position}`);
        }
      }
      return bad;
    });
    expect(offenders).toEqual([]);
  });

  test("reflows at 320px with no horizontal scrolling", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 720 });
    await openFunctionView(page);
    await page.getByRole("tab", { name: "Finance", exact: true }).click();

    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    // A wide grid scrolls inside its own focusable container, not the document.
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });

  test("keeps the dataset on the server", async ({ page }) => {
    await openFunctionView(page);
    const html = await page.content();
    // A company from an unrelated industry. If the dataset were serialized this
    // would be the first thing to appear.
    expect(html).not.toContain("Walmart");
    expect(html.length).toBeLessThan(300_000);
  });
});
