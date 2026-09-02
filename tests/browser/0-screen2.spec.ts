import { expect, test, type Page } from "@playwright/test";

import { band, choose, expectBand, LEAK_CANARY } from "./helpers";
/**
 * **Imported rather than retyped.** This sentence was spelled out in three places in this
 * file, so rewording it — "+ indicates a floor" for "+ is a floor", at the HR
 * composition's request — failed a spec that was testing WHERE the note renders rather
 * than what it says. A suite that fails for a reason unrelated to its subject is one
 * people learn to re-run instead of read.
 */
import { FLOOR_NOTE } from "../../src/components/screen2/copy";

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
  await page.getByRole("tab", { name: /Function Metrics/ }).click();
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
     * **The `h1` is the product on both result screens, and this screen now has no
     * `h2` of its own above the evidence.** It had one — `functionFraming`'s title,
     * "What an India GCC would give {name}" — which was a promise rather than a claim,
     * and which the band above already covers in scope terms. The band carries an
     * `aria-label` instead, since a `<section>` with no accessible name is not a
     * `region`, and the cards inside are `h2` so the outline skips no level.
     */
    await expect(
      page.getByRole("heading", { level: 1, name: "ANSR GCC Intelligence" }),
    ).toBeVisible();
    await expectBand(page, "function-metrics");
    await expect(page.getByText(/What an India GCC would give/)).toHaveCount(0);
    /**
     * **The band carries a line here too, matched with Screen 1's.** It had none for a
     * pass, on the argument that the content already opens on the finding as an `h2` —
     * which is why this line is a SCOPE statement and not that finding. What the argument
     * missed is that the band is shared: crossing between views dropped a whole row out of
     * it and jumped the answer pills up the page, so one header read as two.
     *
     * **It interpolates no industry**, and nor does Screen 1's. `HeaderFinding` is capped
     * at 800px and sets at 48px, so an industry name is one line for some visitors and two
     * for others — the previous wording held `{industry}` and was verified on BFSI alone.
     */
    await expect(page.locator("#header-finding")).toHaveText(
      "The India market beyond your industry",
    );
    await expect(page.locator("#header-finding")).not.toContainText(
      /Software|BFSI|Retail/,
    );
    /**
     * Focus lands on the TAB PANEL instead. Nothing announces a phase change because
     * no navigation happened, and a panel named by its own tab announces "Function
     * opportunity, tab panel" — the change said out loud, where re-reading a shared
     * product heading would have said nothing.
     */
    await expect(
      page.getByRole("tabpanel", { name: /Function Metrics/ }),
    ).toBeFocused();

    // The URL is the parent page's, so it does not move. There is nothing to
    // deep-link into and this is what that looks like.
    expect(new URL(page.url()).pathname).toBe("/");

    // The peer view is gone rather than scrolled past.
    await expect(band(page, "peers")).toHaveCount(0);

    /**
     * **The way back is the other tab**, and the treatment reverses — which is the
     * property that makes one shared component worth having rather than two hand-built
     * strips that have to be kept in agreement. The selected cell is the notch filled
     * with the card's own glass and joined to its top edge; the other is open, on the
     * band's gradient. Asserted as geometry and fill rather than by class name.
     */
    const tablist = page.getByRole("tablist", { name: "Result view" });
    const peersTab = tablist.getByRole("tab", { name: /Peer Landscape/ });
    const functionsTab = tablist.getByRole("tab", { name: /Function Metrics/ });
    await expect(functionsTab).toHaveAttribute("aria-selected", "true");
    await expect(peersTab).toHaveAttribute("aria-selected", "false");
    const panelId = await functionsTab.getAttribute("aria-controls");
    expect(panelId).toBeTruthy();
    const card = page.locator(".gcc-result-card");
    await expect(card).toHaveCount(1);
    const tabBox = (await functionsTab.boundingBox())!;
    const cardBox = (await card.boundingBox())!;
    // Two equal halves of the card, and the bar is the card's own first row.
    expect(Math.abs(tabBox.width * 2 - cardBox.width)).toBeLessThanOrEqual(2);
    expect(Math.abs(tabBox.y - cardBox.y)).toBeLessThanOrEqual(2);
    /**
     * **The selected cell is filled with the ground of the content under it**, which
     * on this screen is white where Screen 1's is the mint zone. Same component, same
     * assertion, different ground — which is the property that makes `ground` a prop
     * rather than a constant.
     */
    const metrics = page.locator("section#function-metrics");
    const metricsBox = (await metrics.boundingBox())!;
    expect(Math.abs(tabBox.y + tabBox.height - metricsBox.y)).toBeLessThanOrEqual(1);
    const [selectedFill, contentFill, unselectedFill] = await Promise.all([
      functionsTab.evaluate((el) => getComputedStyle(el).backgroundColor),
      metrics.evaluate((el) => getComputedStyle(el).backgroundColor),
      peersTab.evaluate((el) => getComputedStyle(el).backgroundColor),
    ]);
    expect(selectedFill).toBe(contentFill);
    expect(unselectedFill).not.toBe(selectedFill);
    await peersTab.click();
    // Focus follows to the peer view's own panel, and the answer is the one already
    // computed rather than a re-fetch.
    await expect(
      page.getByRole("tabpanel", { name: /Peer Landscape/ }),
    ).toBeFocused();
    // The finding is on the band, not in the live region — the region no longer
    // restates it, because the band shows it, the count is under the grid, and the tab
    // panel announces itself on focus. Three readings of one state change was two too
    // many.
    await expect(page.locator("#header-finding")).toContainText(
      /How your industry operates in India/,
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
    await page.getByRole("tab", { name: /Function Metrics/ }).click();

    /**
     * The framing is no longer varied from the browser: the India-presence question
     * was removed at ANSR's request and `gccStatus` is supplied as a constant, so
     * this screen always gets the `evaluating` branch. That the three branches stay
     * distinct is asserted in `tests/unit/screen1.test.ts`, where the input can
     * actually be varied.
     *
     * What is still worth checking here, and what this test is really for, is that
     * the ANSWERS cross the phase boundary — the visitor is not asked twice.
     *
     * The heading that used to interpolate the company name is gone with the rest of
     * the copy strip, so the answers themselves are the only place a visitor sees what
     * they typed. That makes the pills load-bearing rather than decorative.
     */
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
      .getByRole("button", { name: "Edit answers" })
      .click();
    await expect(page.locator("h1#ask-title")).toBeVisible();
    await page.getByRole("button", { name: "See my results" }).click();
    await page.getByRole("tab", { name: /Function Metrics/ }).click();
    /**
     * **The close is BACK, on both screens, at the project owner's decision.** It was
     * removed from Screen 1 on the page-end instruction and from this screen in the
     * pass that rebuilt its zones. Both halves are asserted, because either one
     * arriving alone is a half-restored decision: exactly one outbound link, and the
     * source line still under the card after it.
     *
     * ONE link rather than "at least one". The band is the tool's single call to
     * action, and the thing worth catching is a second one appearing somewhere else.
     */
    await expect(page.getByRole("link")).toHaveCount(1);
    // By role inside the band, not by its words — the label is admin-editable copy.
    await expect(band(page, "close").getByRole("link")).toBeVisible();
    await expect(page.getByText("Source: ANSR Research")).toBeVisible();

    // No form, and no lead capture anywhere in this codebase. Unchanged by the close
    // coming back — it links out and asks for nothing.
    expect(await page.locator('input[type="email"]').count()).toBe(0);
    expect(await page.locator("select").count()).toBe(0);
  });

  /**
   * The close, on the screen whose own metrics are the gated ones.
   *
   * `0-screen1.spec.ts` tests the band's guarantee in full. This asserts it HERE too,
   * because this is the screen where the gated metrics live and therefore the screen
   * where a regression in `publicMetric` would surface first — and because the two
   * screens' closes must not diverge, which is a thing only a test on both can hold.
   */
  test("closes on the same band, over a field that carries no data", async ({
    page,
  }) => {
    await openFunctionView(page);

    await expectBand(page, "close");
    const close = band(page, "close");
    await expect(close).toBeVisible();
    await expect(close.getByRole("link")).toBeVisible();

    // One line and a button, no heading and no eyebrow. Same two as Screen 1.
    await expect(close.getByRole("heading")).toHaveCount(0);
    await expect(close.locator("p")).toHaveCount(1);

    /**
     * **Nothing in the blurred layer, on the tab whose figures are the withheld ones.**
     * The gated branch of `publicMetric` has no field a value could travel in, so this
     * asserts the compiler's guarantee end to end rather than trusting it.
     */
    const backdrop = page.locator(".gcc-close-backdrop");
    await expect(backdrop).toHaveCount(1);
    await expect(backdrop).toHaveAttribute("aria-hidden", "true");
    expect(
      await backdrop.evaluate((el) => (el as HTMLElement).innerText.trim()),
    ).toBe("");
    // And the band as a whole states no figure: the copy names a limit, not a number.
    expect(await close.innerText()).not.toMatch(/\d/);
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
        level: 2,
        name: "Talent Depth by Specialisation",
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
    /**
     * An operations-EXCLUSIVE card title, which is what this assertion needs. The
     * "Scale and connectivity" section heading it used to use was removed at ANSR's
     * request (the composed tabs no longer carry group headings), and a shared metric
     * such as the scale milestones would pass on the wrong panel because the HR tab
     * carries it too. "Network latency to cloud regions" is operations-only.
     */
    await expect(
      page.getByRole("tabpanel").getByRole("heading", {
        level: 2,
        name: "Network latency to cloud regions",
      }),
    ).toBeVisible();

    // One panel at a time: the previous tab's content is unmounted, not hidden
    // behind the new one. Asserted on a card that belongs to the technology tab
    // alone — "Technology professionals" is on three tabs by design, so it would still
    // be present after the switch and would prove nothing.
    await expect(
      page.getByRole("heading", { level: 2, name: "Talent Depth by Specialisation" }),
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
      ["Technology professionals", "8.7M+"],
      ["Time to backfill a role", "35"],
      ["Time to first hire", "7"],
      ["Time to reach each scale milestone", "6"],
    ];

    for (const name of ["Technology", "Operations", "HR"]) {
      await page.getByRole("tab", { name, exact: true }).click();
      const panel = page.getByRole("tabpanel");
      for (const [title, figure] of shared) {
        // Either shape: a shared scalar is a figure-row cell and a shared breakdown is
        // a `Block` section, and this asserts the FIGURE rather than the container.
        /**
         * **Any heading LEVEL, and dropping the `level: 2` is a fix rather than a
         * loosening.** A card is `h2` on a derived tab, where it is a top-level section
         * of the panel, and `h3` on a composed one, where it sits under a section
         * heading of its own — so pinning level 2 silently matched nothing on HR and
         * then on operations, and the loop's own "not every shared metric is on every
         * tab" escape hatch turned that into a skip rather than a failure. Two of the
         * three tabs this claim is about were going unchecked.
         */
        const card = panel
          .locator('section[id^="metric-"], #function-metrics ul > li')
          .filter({
            has: page.getByRole("heading", { name: title, exact: true }),
          });
        // Not every shared metric is on every tab — technology carries bench
        // strength but not the hiring timings. Where one IS present, the figure is.
        if ((await card.count()) === 0) continue;
        await expect(card.getByText(figure, { exact: false }).first()).toBeVisible();
      }
    }
  });

  test("shows every OPEN metric and no empty tab", async ({ page }) => {
    await openFunctionView(page);

    /**
     * **The counts are the OPEN metrics per tab now, because a gated one is drawn
     * nowhere.** The sealed group was deleted from the HR and finance tabs at ANSR's
     * request, so HR draws 8 of its 10 and finance 6 of its 8 — the four gated metrics
     * (two HR, two finance) have no placeholder, no heading and no chip. The gate itself
     * is unchanged and is asserted separately.
     *
     * Technology is 8 since `tech-community-events` was deleted and
     * `tech-graduate-output` was replaced by the two-part `tech-graduate-pipeline`.
     * Operations is 9, all open.
     */
    const expected: Array<[string, number]> = [
      ["Technology", 8],
      ["Operations", 9],
      ["HR", 8],
      ["Finance", 6],
    ];

    for (const [name, cards] of expected) {
      await page.getByRole("tab", { name, exact: true }).click();
      const band = page.locator("#function-metrics");
      /**
       * **Counted in two places now, because a tab is two kinds of object.** Every bare
       * scalar is a cell in the figure row — a `<li>` — and everything that draws a mark
       * is a `Panel`, which is a `<section>` with an accessible name rather than a list
       * item. Summing them is the assertion that every OPEN metric on the tab is
       * somewhere: one that fell out of the split entirely would leave this short.
       */
      const figures = await band.locator("ul > li").count();
      const panels = await band.locator('section[id^="metric-"]').count();
      expect(figures + panels, name).toBe(cards);
    }
  });

  test("splits every tab into a figure row and a card grid", async ({ page }) => {
    /**
     * The promoted structure, on all four tabs. A bare scalar leaves the card grid for
     * the figure row; everything that draws a mark stays a bordered card.
     *
     * The counts are the catalogue's OPEN metrics, so a change to it is a visible test
     * change rather than a silently different screen. Nothing here counts a gated metric:
     * the sealed group was deleted from HR and finance, and the other two tabs have none.
     */
    const expected: Array<[string, number, number]> = [
      // tab, figure-row cells, metric sections
      ["Technology", 5, 3],
      /**
       * **Operations is 4 and 5, and like HR these are not `layoutArea`'s numbers** —
       * that still produces one figure and eight cards, and `screen2.test.ts` still pins
       * it. `OpsPanel` composes the tab instead: four summary cells in a `ul`, and five
       * drawn cards. Three metrics moved from a card to a cell (uptime, office stock,
       * disruption days) and one scalar was already a cell, which is what turns 1 + 8
       * into 4 + 5. The total is still every metric on the tab.
       */
      ["Operations", 4, 5],
      /**
       * **HR is 3 and 5, and like operations these are not `layoutArea`'s own numbers.**
       * The tab is composed rather than derived: `HrPanel` places the three scalars as
       * figure-row cells and its five open metrics as `metric-*` sections. It was 3 and 7
       * while the two gated metrics drew sealed cards; that group is deleted, so they draw
       * nothing.
       */
      ["HR", 3, 5],
      // Finance was 3 and 5 for the same reason: its two gated metrics are no longer
      // drawn, leaving the three growth rates and three charts.
      ["Finance", 3, 3],
    ];

    await openFunctionView(page);
    for (const [name, figures, cards] of expected) {
      await page.getByRole("tab", { name, exact: true }).click();
      const band = page.locator("#function-metrics");
      await expect(band).toBeVisible();
      await expect(band.locator("ul > li"), `${name} figures`).toHaveCount(figures);
      await expect(
        band.locator('section[id^="metric-"]'),
        `${name} cards`,
      ).toHaveCount(cards);
      // No scalar kept a card: a card's heading is 24px and a figure-row label is 14px,
      // so a scalar that stayed behind would show up as a card whose body has no mark.
      await expect(
        band.locator('section[id^="metric-"] svg, section[id^="metric-"] table, section[id^="metric-"] [aria-hidden="true"]').first(),
        `${name} first card draws something`,
      ).toBeAttached();
    }
  });

  test("leaves no part-empty row on any tab, at three widths", async ({ page }) => {
    /**
     * **An empty cell in a grid of evidence reads as a card that failed to load**, which
     * on a screen whose whole argument is "these numbers are solid" is expensive. The
     * packing is unit-tested in `screen2.test.ts`; this is the same property measured on
     * the render, because the unit test proves the arithmetic and only the browser proves
     * the arithmetic was the right arithmetic.
     *
     * Three widths, because the OLD rule was correct at 1440 and wrong between `sm` and
     * `lg`: `third` mapped to six columns below `lg` and four above it, so a rule
     * reasoning in thirds-of-twelve left a hole at 768 that never appeared at 1440. Two
     * widths cannot do that, and 768 is where it would show.
     *
     * It also covers the HELD grid, which was never packed at all — HR's pair is a half
     * then a full, and a full cannot fit beside a half, so it dropped a row and left six
     * empty columns beside the placeholder.
     */
    for (const width of [1440, 768, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await openFunctionView(page);

      for (const name of ["Technology", "Operations", "HR", "Finance"]) {
        await page.getByRole("tab", { name, exact: true }).click();
        const band = page.locator("#function-metrics");
        await expect(band).toBeVisible();

        const rows = await band.evaluate((section) => {
          const cards = [...section.querySelectorAll('section[id^="metric-"]')];
          /**
           * Group by the top edge, which is what "a row" is once the widths are packed,
           * and keep each row's OWN container.
           *
           * **Per row rather than `cards[0].parentElement`, and the finance composition
           * is what broke the old version.** It took every row's available width from
           * the first card's parent, which held while the first card was always inside a
           * padding-free grid; on a composed tab a full-measure `Panel` can be a direct
           * child of the zone's own padded container, and measuring a 1120px card
           * against a 1184px padded box reports 0.946 for a row that is completely full.
           */
          const byTop = new Map<number, { widths: number[]; parent: Element | null }>();
          for (const card of cards) {
            const box = card.getBoundingClientRect();
            const top = Math.round(box.top + window.scrollY);
            const row = byTop.get(top) ?? { widths: [], parent: card.parentElement };
            row.widths.push(box.width);
            byTop.set(top, row);
          }
          return [...byTop.entries()].map(([top, { widths, parent }]) => {
            /**
             * The container's CONTENT box, not its border box: a zone's own container
             * carries the surface's horizontal padding, and a card is laid out inside
             * that padding rather than across it.
             */
            let available = 0;
            if (parent) {
              const style = getComputedStyle(parent);
              available =
                parent.clientWidth -
                (parseFloat(style.paddingLeft) || 0) -
                (parseFloat(style.paddingRight) || 0);
            }
            /**
             * Cards plus the container's OWN column gap, read off the element rather
             * than hardcoded. It was 16px, and the gap widened to 32/40px when the cards
             * gave up their borders — a hairline needs 16px of ground between two edges
             * to read as a separation and a borderless column needs the space itself. A
             * constant here would have made a full row measure 0.978 and drifted toward
             * the threshold with every spacing change.
             */
            const gap = parent
              ? parseFloat(getComputedStyle(parent).columnGap) || 0
              : 0;
            const used =
              widths.reduce((sum, w) => sum + w, 0) + (widths.length - 1) * gap;
            return { top, cards: widths.length, fill: available ? used / available : 1 };
          });
        });

        for (const row of rows) {
          // Within a pixel of full. A part-empty row is short by a whole half — 50% —
          // so the threshold is nowhere near a rounding call.
          expect(row.fill, `${name} at ${width}, row at y=${row.top}`).toBeGreaterThan(
            0.97,
          );
        }
      }
    }
    await page.setViewportSize({ width: 1280, height: 900 });
  });

  test("keeps #function-metrics a named region with the figures inside it", async ({
    page,
  }) => {
    /**
     * The band is located by id everywhere in this suite and named by `aria-label`
     * rather than by a heading, because it has no heading to point at — its `h2` went
     * with the copy strip. A `<section>` with no accessible name is not a `region` and
     * is invisible to anyone navigating by landmark, so the name is the contract.
     */
    await openFunctionView(page);
    const band = page.locator("#function-metrics");
    await expect(band).toBeVisible();
    await expect(band).toHaveAttribute("aria-label", /metrics/i);
    // Reachable by role, which is the thing an id alone does not prove.
    await expect(
      page.getByRole("region", { name: /metrics/i }).locator("#function-metrics").or(
        page.getByRole("region", { name: /metrics/i }),
      ).first(),
    ).toBeVisible();
    // And the figure row is inside it rather than somewhere above the band.
    await expect(band.locator("ul > li").first()).toBeVisible();
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
  });

  test("carries a rating in the accessibility tree and not in visible text", async ({
    page,
  }) => {
    /**
     * **This asserts an inversion, which is why it is its own test.** Every cell used
     * to draw the rating twice — "Very strong" in text AND four filled segments — with
     * a key at the foot naming the same four words a third time. The word is now
     * `sr-only` and the segments are the only visible reading, so which of the two
     * carries the figure has swapped over.
     *
     * The project's rule is that a mark is a second reading of a figure already in
     * text, and there is exactly one precedent for inverting it: Screen 1's density
     * map, whose orange marks are permitted because every one of them restates a
     * figure the ranked list beside it already carries. The same argument holds here
     * and nothing wider — the four ordinal words are still in text, in the KEY, which
     * is why the key moved from under the grid to above it.
     */
    await openFunctionView(page);
    const table = page
      .getByRole("table")
      .filter({ hasText: "Product engineering" });

    // In the accessibility tree: a cell still reads as its rating, so the grid is
    // navigable by a screen-reader user exactly as it was.
    await expect(
      table.getByRole("cell", { name: "Very strong", exact: true }).first(),
    ).toHaveCount(1);
    await expect(
      table.getByRole("row", { name: /Data and AI.*Strong/ }).first(),
    ).toHaveCount(1);

    /**
     * Not in visible text: twenty clipped 1px boxes rather than twenty words.
     * Asserted as geometry because `innerText` reports `sr-only` content — the span is
     * rendered, just at a size and clip nobody can read — so a text assertion here
     * would pass whether the change had happened or not.
     */
    const words = table.locator("td span.sr-only");
    await expect(words).toHaveCount(20);
    const boxes = await words.evaluateAll((elements) =>
      elements.map((element) => {
        const rect = element.getBoundingClientRect();
        return Math.max(rect.width, rect.height);
      }),
    );
    expect(boxes).toHaveLength(20);
    for (const size of boxes) expect(size).toBeLessThanOrEqual(1);

    /**
     * And the key is BELOW the grid, at the trailing end, at ANSR's request. It was
     * above, on the argument that a reader needs the scale before the thing it decodes.
     * What licenses the `sr-only` rating in the cells is that the four ordinal words
     * are present in TEXT somewhere in this card, which is a property of the document
     * rather than of the order — so the inversion above still holds.
     */
    const card = page
      .locator('section[id^="metric-"]')
      .filter({ hasText: "Capability against other GCC hubs" });
    /**
     * **The key is DRAWN, not listed.** It was four words separated by middots, which
     * states the order of the steps and nothing about which fill count is which — so a
     * cell showing two filled marks was undecodable. Each step now carries its own
     * four-segment mark at the cells' own mark size. The assertion is therefore split
     * three ways: the words are visible, the framing is `sr-only`, and each step is
     * accompanied by marks.
     */
    const key = card.locator("p").filter({ hasText: /^Scale, weakest first:/ }).first();
    await expect(key).toBeVisible();
    await expect(key).toContainText("Developing");
    await expect(key).toContainText("Very strong");
    const framing = key.locator("span.sr-only");
    await expect(framing).toHaveText("Scale, weakest first: ");
    expect(
      await framing.evaluate((el) => el.getBoundingClientRect().width),
    ).toBeLessThanOrEqual(1);
    // Four steps, each drawn against the full four-segment track: 16 marks.
    const keyMarks = key.locator("span[aria-hidden] > span");
    await expect(keyMarks).toHaveCount(16);
    /**
     * **And each is SMALLER than the cell mark it decodes.** At the cell size the key
     * was sixteen marks of the same weight as the eighty above it, one gap under the
     * last row, so it read as a fifth data row — the interference ANSR reported. Same
     * landscape ratio, because that is what makes four of them read as one part-filled
     * bar; smaller, because the size is what says chrome rather than evidence.
     */
    const area = (locator: typeof keyMarks) =>
      locator.first().evaluate((el) => {
        const rect = el.getBoundingClientRect();
        return rect.width * rect.height;
      });
    expect(await area(keyMarks)).toBeLessThan(
      (await area(table.locator("td span[aria-hidden] > span"))) * 0.75,
    );
    const keyBox = (await key.boundingBox())!;
    const tableBox = (await table.boundingBox())!;
    expect(keyBox.y).toBeGreaterThanOrEqual(tableBox.y + tableBox.height - 1);
    // Trailing end of the card, not the leading one.
    const cardBox = (await card.boundingBox())!;
    expect(keyBox.x + keyBox.width).toBeGreaterThan(cardBox.x + cardBox.width / 2);
  });

  test("draws the rating grid's marks as rectangles, not squares", async ({ page }) => {
    /**
     * **Four squares read as four objects to count; four rectangles read as one
     * segmented bar that is part-filled.** The grid was 10×10 for a pass and lost the
     * at-a-glance comparison down a column, which is the only thing a rated matrix is
     * for. ANSR asked for the earlier landscape mark back. Asserted as geometry
     * because the shape IS the finding — a class assertion would pass on any width.
     */
    await openFunctionView(page);
    const table = page
      .getByRole("table")
      .filter({ hasText: "Product engineering" });
    const marks = table.locator("td span[aria-hidden] > span");
    await expect(marks).toHaveCount(80);
    const boxes = await marks.evaluateAll((elements) =>
      elements.map((element) => {
        const rect = element.getBoundingClientRect();
        return { width: rect.width, height: rect.height };
      }),
    );
    for (const box of boxes) {
      expect(box.width).toBeGreaterThan(box.height * 1.3);
    }
  });

  test("draws a progression as one path, not as four separate bars", async ({
    page,
  }) => {
    /**
     * The scale curve is one centre measured four times as it grows — six months to
     * fifty FTEs, twelve to a hundred, twenty-four to three hundred, thirty-six to five
     * hundred. It was drawn as four bars from a shared zero, which is the drawing of
     * four independent quantities and is what graduate output by discipline actually
     * is.
     *
     * `progression` is authored on the metric rather than derived from its values,
     * because the latency breakdown on this same tab has the same format, the same
     * length and the same rising figures and is genuinely four destinations. Both are
     * checked here, so the discriminator cannot quietly become monotonicity.
     *
     * **It is a `MilestoneTrack` here now, not `Journey`'s staircase.** The composed
     * operations tab draws the progression exactly as the composed HR tab does, at
     * ANSR's instruction that a shared section read identically across functions — so
     * this asserts one rail with four proportional positions rather than four legs each
     * beginning where the last ended.
     *
     * **What went with `Journey` is the derived intervals — "+6", "+12", "+12" — and
     * they are now drawn nowhere on the screen**, operations having been the last tab
     * drawing them. `journeyLegs` is still unit-tested and `metric-card.tsx` still routes
     * a `journey` display to `Journey`, so a progression on a derived tab would still get
     * the staircase; nothing in the catalogue is in that position today. Asserted absent
     * so the loss is a decision rather than something nobody noticed.
     */
    await openFunctionView(page);
    await page.getByRole("tab", { name: "Operations", exact: true }).click();

    const curve = page
      .locator('section[id^="metric-"]')
      .filter({ hasText: "Time to reach each scale milestone" });
    await expect(curve).toBeVisible();
    await expect(curve.getByText("months, median")).toBeVisible();

    /**
     * Two rails now: the market curve and, under it, the ANSR one. Scoped to the first
     * track, because this test is about the progression's own positions — the second rail
     * has its own assertions on the HR tab, where the same component draws it.
     */
    const tracks = curve.locator(".gcc-milestone-track");
    await expect(tracks).toHaveCount(2);
    const points = await tracks
      .first()
      .locator(".gcc-milestones__item")
      .evaluateAll((nodes) =>
        nodes.map((node) => ({
          at: getComputedStyle(node).getPropertyValue("--gcc-at").trim(),
          text: (node.textContent ?? "").replace(/\s+/g, " ").trim(),
        })),
      );
    // Milestone then duration, as a `dt`/`dd` pair, so a screen reader announces
    // "50 FTEs, 6" rather than a row of unattached numerals.
    expect(points.map((point) => point.text)).toEqual([
      "50 FTEs6",
      "100 FTEs12",
      "300 FTEs24",
      "500 FTEs36",
    ]);
    // Proportional to the stored figures, never evenly spaced: even spacing would be a
    // lie about the one thing this chart exists to show.
    const shares = points.map((point) => Number.parseFloat(point.at));
    expect(shares[0]).toBeCloseTo((6 / 36) * 100, 1);
    expect(shares[1]).toBeCloseTo((12 / 36) * 100, 1);
    expect(shares[2]).toBeCloseTo((24 / 36) * 100, 1);
    expect(shares[3]).toBeCloseTo(100, 1);
    // One rail per track, however many milestones each has.
    await expect(tracks.first().locator(".gcc-milestones__rail")).toHaveCount(1);
    await expect(tracks.last().locator(".gcc-milestones__rail")).toHaveCount(1);
    // And no staircase intervals, anywhere on the tab.
    const tab = await band(page, "function-metrics").innerText();
    expect(tab).not.toMatch(/\+6\b/);
    expect(tab).not.toMatch(/\+12\b/);

    // The counter-example, on the same tab: a set of destinations, one bar each, every
    // one of them starting at the axis.
    const latency = page
      .locator('section[id^="metric-"]')
      .filter({ hasText: "Network latency to cloud regions" });
    /**
     * One level deeper than it was: an inline ranked row puts the bar in its own grid
     * cell so it can be the middle column, so the track is a grandchild of the row
     * rather than a child. The property being asserted is unchanged — one bar per
     * destination, every one starting at the axis.
     */
    const bars = await latency
      .locator("dl > div > div > div[aria-hidden='true'] > div")
      .evaluateAll((marks) =>
        marks.map((mark) => {
          const parent = mark.parentElement!.getBoundingClientRect();
          return Math.round(mark.getBoundingClientRect().left - parent.left);
        }),
      );
    /**
     * **Seven destinations, up from four, at ANSR's request** — Middle East, Singapore and
     * US West added so the card covers the regions a global business runs in, and so this
     * card is not a third the height of the two-rail scale curve beside it. Three of the
     * seven are provisional figures and the metric's note names them.
     */
    expect(bars).toHaveLength(7);
    for (const start of bars) expect(start).toBeLessThanOrEqual(1);
    /**
     * **Ordered OUTWARD BY DISTANCE, which is what keeps the grey track.** A ranking
     * sorted by the quantity its own bars encode states its axis in row one and may drop
     * the track; this one is a geography, so it keeps the shared axis every row is
     * measured against. The two coincide today because latency rises with distance, and
     * the ORDER is the contract if they ever stop coinciding — asserted as the order
     * rather than as the sort.
     */
    const destinations = await latency
      .locator("dt")
      .evaluateAll((nodes) => nodes.map((node) => (node.textContent ?? "").trim()));
    expect(destinations).toEqual([
      "Same-city cloud region",
      "Another India region",
      "Middle East",
      "Singapore",
      "Europe",
      "US East",
      "US West",
    ]);
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
     *
     * **It is three cards now rather than three rows of one chart**, the finance tab
     * being composed — but every property this test was written for is unchanged, which
     * is why it stays here rather than moving into the composition's own block: no
     * table, the difference stated rather than left to be subtracted, and the index base
     * and its direction both on the card.
     */
    await openFunctionView(page);
    await page.getByRole("tab", { name: "Finance", exact: true }).click();

    const card = page.locator("section#metric-fin-tier-cost-spread");
    await expect(card).toBeVisible();
    await expect(card.getByRole("table")).toHaveCount(0);

    // The gap, already formatted by the view model, with a real minus sign rather
    // than a hyphen.
    await expect(card.getByText("\u221215")).toBeVisible();
    /**
     * The Tier 2 index itself, as the card's own figure — which now sits under its own
     * mark on the rail rather than in a display pair above it. Located as the `dd`, which
     * is what the point's figure IS: the name is the `dt` beside it, so this asserts the
     * pairing survived the display figures being deleted.
     */
    await expect(card.locator("dd", { hasText: /^85$/ })).toBeVisible();

    // An index says what it is indexed on, and which way is better. One with no
    // stated base is unreadable; one with no stated direction leaves the reader to
    // guess whether the short mark is the good news.
    await expect(
      page.getByText("Indexed: Tier 1 = 100. Lower is cheaper."),
    ).toBeVisible();
  });

});

test.describe("the gate", () => {
  test("draws a gated metric nowhere at all", async ({ page }) => {
    /**
     * **The sealed group is DELETED from the HR and finance tabs at ANSR's request**, so a
     * gated metric now has no placeholder, no heading, no lock and no chip — it is simply
     * absent from the page. This replaces the test that asserted the shape-only card, and
     * it asserts the stronger property: nothing about the four gated metrics is drawn.
     *
     * The GATE is untouched and is still what makes this safe rather than cosmetic —
     * `publicMetric` has no field a withheld figure could travel in. The next test asserts
     * that from the document side.
     */
    await openFunctionView(page);

    for (const tab of ["HR", "Finance"]) {
      await page.getByRole("tab", { name: tab, exact: true }).click();
      const metrics = band(page, "function-metrics");

      // No sealed group, on either tab.
      await expect(page.locator("#hr-held")).toHaveCount(0);
      await expect(page.locator("#fin-held")).toHaveCount(0);
      await expect(metrics.getByText("Figures shaped by your roles and cities")).toHaveCount(0);
      await expect(metrics.getByText("Held back")).toHaveCount(0);
      // No hatched placeholder blocks and no cardinality note anywhere.
      await expect(metrics.locator(".gcc-held")).toHaveCount(0);
      await expect(metrics.getByText(/rows across \d+ columns\./)).toHaveCount(0);
      // And no card for any of the four gated metrics.
      for (const id of [
        "metric-hr-cost-per-employee-served",
        "metric-hr-fully-loaded-cost",
        "metric-fin-workplace-cost-gradient",
        "metric-fin-cost-vs-ecosystem-depth",
      ]) {
        await expect(page.locator(`#${id}`)).toHaveCount(0);
      }
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

    /**
     * **And the page no longer SAYS so, which is a real loss rather than a tidy-up.**
     * The invariant is intact and enforced by construction — the schema has no currency
     * format and refuses a currency-looking unit — but a reader could previously see
     * that no per-head salary exists behind the gate either, and now cannot. No label
     * or heading can imply it, so `COST_PROVENANCE` is kept exported and unit-tested,
     * rendered nowhere, and is on `handoff.md`'s blocked list. Asserted absent so no
     * half of the removal comes back by accident.
     */
    await expect(
      page.getByText(/We publish no per-head salary figure/),
    ).toHaveCount(0);
  });
});

test.describe("the technology composition", () => {
  test("alternates zone grounds so every section boundary is a real one", async ({
    page,
  }) => {
    /**
     * **The band was one flat white surface holding a grid of bordered cards.** It is
     * Screen 1's zone system now: a colour change at a boundary and nothing else, with
     * the cards inside giving up their borders because the ground does the sectioning.
     *
     * The sequence is derived from the sections a tab HAS rather than written out, so
     * this asserts the property — adjacent grounds differ — rather than a list of
     * colours. A hardcoded sequence would have put two white zones together on a tab
     * with no half-width cards, which is the failure the derivation prevents.
     */
    await openFunctionView(page);
    for (const name of ["Technology", "Operations", "HR", "Finance"]) {
      await page.getByRole("tab", { name, exact: true }).click();
      const grounds = await band(page, "function-metrics")
        .locator(".gcc-zone")
        .evaluateAll((zones) =>
          zones.map((zone) => getComputedStyle(zone).backgroundColor),
        );
      /**
       * **At least one, not at least two, since the operations tab was composed.** The
       * property this test is about is that ADJACENT grounds differ; the old floor was
       * incidental and became wrong for a legitimate reason. Operations draws a single
       * white zone — all four of its sections are bordered cards, so the boundary between
       * them is the card's own edge, and it has no gated metric and therefore no mint
       * band. HR still has two because its sealed pair does.
       */
      expect(grounds.length, name).toBeGreaterThanOrEqual(1);
      for (const [index, ground] of grounds.entries()) {
        if (index === 0) continue;
        expect(ground, `${name}: zone ${index} repeats its neighbour's ground`).not.toBe(
          grounds[index - 1],
        );
      }
    }
  });

  test("puts the graduate pair and the specialisms side by side, matrix below", async ({
    page,
  }) => {
    /**
     * The reference composition, read off the render. It falls out of the widths rather
     * than being composed by hand — the halves are ordered first and share a zone, the
     * full-measure matrix takes the next one — so this is the assertion that the widths
     * still produce it. `screen2.test.ts` pins the same property on the view model.
     */
    await page.setViewportSize({ width: 1440, height: 1000 });
    await openFunctionView(page);

    const graduates = page.locator("section#metric-tech-graduate-pipeline");
    const specialisms = page.locator("section#metric-tech-ecosystem-size");
    const matrix = page.locator("section#metric-tech-capability-comparison");
    for (const section of [graduates, specialisms, matrix]) {
      await expect(section).toBeVisible();
    }

    const [g, s, m] = await Promise.all(
      [graduates, specialisms, matrix].map(async (section) => (await section.boundingBox())!),
    );
    // Side by side: same top, and the specialisms start after the graduates end.
    expect(Math.abs(g!.y - s!.y)).toBeLessThanOrEqual(2);
    expect(s!.x).toBeGreaterThan(g!.x + g!.width - 2);
    // The matrix is below both and runs wider than either.
    expect(m!.y).toBeGreaterThan(g!.y + g!.height - 2);
    expect(m!.width).toBeGreaterThan(g!.width * 1.5);
    await page.setViewportSize({ width: 1280, height: 900 });
  });

  test("draws the graduate pair as two adjacent blocks, never one inside the other", async ({
    page,
  }) => {
    /**
     * **The data-integrity rule, asserted on the geometry.** 450K is total management
     * and MBA output, not the count of MBA graduates who hold an engineering degree, and
     * no source here contains that number — so nesting the smaller block inside the
     * larger would assert an overlap nobody has measured. The two are drawn beside each
     * other, sized against the set's total, with nothing between them.
     *
     * Containment is authored on the metric rather than inferred from the two parts
     * sharing a unit; `metrics.test.ts` pins the schema side and this pins the drawing.
     */
    await openFunctionView(page);
    const card = page.locator("section#metric-tech-graduate-pipeline");
    await expect(card).toBeVisible();
    await expect(card.getByText("1.5M", { exact: true })).toBeVisible();
    await expect(card.getByText("450K", { exact: true })).toBeVisible();
    await expect(card.getByText("Engineering, other disciplines")).toBeVisible();
    await expect(card.getByText("Management & MBA graduates")).toBeVisible();

    // Disjoint boxes: the smaller starts after the larger ends. A nested drawing would
    // put one inside the other's bounds.
    const boxes = await card
      .locator("p.gcc-adjacent-block")
      .evaluateAll((blocks) =>
        blocks.map((block) => {
          const rect = block.getBoundingClientRect();
          return { left: rect.left, right: rect.right, width: rect.width, height: rect.height };
        }),
      );
    expect(boxes).toHaveLength(2);
    expect(boxes[1]!.left).toBeGreaterThanOrEqual(boxes[0]!.right - 1);
    // Equal height, so width alone carries the ratio, and the ratio is the figures'.
    expect(Math.abs(boxes[0]!.height - boxes[1]!.height)).toBeLessThanOrEqual(1);
    const ratio = boxes[1]!.width / boxes[0]!.width;
    expect(ratio).toBeGreaterThan(450 / 1500 - 0.04);
    expect(ratio).toBeLessThan(450 / 1500 + 0.04);

    /**
     * And no overlap is stated in words either. The ~26% figure a previous draft
     * carried had no source behind it; there is nothing here to derive one from, which
     * is the whole reason the two blocks are adjacent.
     */
    const text = await card.innerText();
    expect(text).not.toMatch(/%/);
    expect(text).not.toMatch(/with an? MBA|with engineering|overlap/i);
  });

  test("names the figure row for a screen reader but shows no heading, no glyph and no divider", async ({
    page,
  }) => {
    await openFunctionView(page);
    const band = page.locator("#function-metrics");
    const row = band.locator("ul").first();
    /**
     * **The subject line is `sr-only` now, at ANSR's request.** "India's technology
     * talent" (and its three siblings) were removed from the visible page — the figures
     * open the tab directly. It stays in the accessibility tree because the section
     * points its `aria-labelledby` at it, so it is present as a heading but clipped to
     * a 1px box rather than shown.
     */
    const heading = band.getByRole("heading", {
      level: 2,
      name: "India's technology talent",
    });
    await expect(heading).toBeAttached();
    const headingSize = await heading.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      return Math.max(rect.width, rect.height);
    });
    expect(headingSize).toBeLessThanOrEqual(1);
    // "at a glance" is nowhere on the tab either.
    expect(await band.innerText()).not.toMatch(/at a glance/i);

    /**
     * **No glyph on any cell, and no rule between two of them.** The row had a line icon
     * over every figure and CSS hairlines between the cells; all four tabs draw one
     * component now, on Screen 1's snapshot treatment, which had already ruled both out
     * — a pale disc holding a line icon is the stats block every generated dashboard
     * ships with, and a rule between two cells with no container round them puts the row
     * back to reading as a table.
     */
    const cells = row.locator("> li");
    await expect(cells).toHaveCount(5);
    await expect(cells.locator("svg")).toHaveCount(0);

    /**
     * **The unit is a step down from the numeral, which is Screen 1's own device.** An
     * `M+` at the figure's 48px is a third of the cell's optical weight carrying none of
     * its information. Asserted as a real size difference rather than as a class name.
     */
    const sizes = await cells
      .first()
      .locator("p")
      .first()
      .evaluate((figure) => {
        const unit = figure.querySelector("span > span");
        return {
          figure: Number.parseFloat(getComputedStyle(figure).fontSize),
          unit: unit
            ? Number.parseFloat(getComputedStyle(unit as Element).fontSize)
            : 0,
        };
      });
    expect(sizes.unit).toBeGreaterThan(0);
    expect(sizes.unit).toBeLessThan(sizes.figure * 0.75);

    // Abbreviated, and 1,250 deliberately keeps its commas: "1.25K" is a less immediate
    // read for a count of GCCs than the digits are.
    for (const figure of ["8.7M+", "1.4M+", "800K", "1,250", "17M"]) {
      await expect(row.getByText(figure, { exact: true })).toBeVisible();
    }
    const text = await row.innerText();
    expect(text).not.toMatch(/million|800,000/);
  });

  test("draws the capability matrix with every column on equal terms", async ({
    page,
  }) => {
    await openFunctionView(page);
    const card = page.locator("section#metric-tech-capability-comparison");
    const table = card.getByRole("table");
    await expect(table).toBeVisible();

    /**
     * **Four markers, not five, and this is a stated departure from the brief for
     * accuracy.** The declared scale has four ordinal steps — Developing, Moderate,
     * Strong, Very strong — so four is the number of positions a rating can occupy. A
     * fifth marker would be a step the assessment does not contain, and the rule that
     * no supplied rating may be changed or exaggerated is what rules it out.
     */
    const markers = table.locator("td span[aria-hidden='true'] > span");
    await expect(markers).toHaveCount(5 * 4 * 4);

    /**
     * **No emphasis on India, at ANSR's request, and asserted in all three of the places
     * it used to appear.** The subject column carried a `surface-pale` band the height of
     * the grid, a brand-teal column heading, and filled segments a step darker than the
     * comparators'. The grid exists to let a reader compare four locations on equal
     * terms, and a highlight on one of them is a thumb on that scale — the visitor knows
     * which column is theirs because it is named.
     *
     * The column is still derived; `screen2.test.ts` pins `grid.anchorColumn`. What this
     * asserts is that nothing draws it.
     */
    const grounds = await table
      .locator("td")
      .evaluateAll((cells) =>
        cells.map((cell) => getComputedStyle(cell).backgroundColor),
      );
    expect(new Set(grounds).size).toBe(1);

    // Skipping the leading corner cell, which holds only the `sr-only` "Capability" and
    // sets no ink of its own.
    const headingInks = await table
      .locator("thead th[scope='col']:not(:first-child)")
      .evaluateAll((heads) => heads.map((head) => getComputedStyle(head).color));
    expect(headingInks).toHaveLength(4);
    expect(new Set(headingInks).size).toBe(1);

    const marks = await table
      .locator("td span[aria-hidden='true'] > span")
      .evaluateAll((spans) =>
        spans.map((span) => getComputedStyle(span).backgroundColor),
      );
    // Two fills only across all eighty marks: filled and unfilled. A third would be the
    // subject column's deeper step.
    expect(new Set(marks).size).toBe(2);

    // Country headings are centred over their own marker group rather than aligned to
    // its first segment.
    await expect(table.getByRole("columnheader", { name: "India" })).toHaveCSS(
      "text-align",
      "center",
    );

    // A restrained glyph beside each capability name, decorative and hidden.
    await expect(table.locator("th[scope='row'] svg[aria-hidden='true']")).toHaveCount(5);
  });

  test("removes the technical community section without moving its figures", async ({
    page,
  }) => {
    /**
     * Deleted at ANSR's request, and asserted absent in both directions: the section is
     * gone AND neither of its figures reappeared in the snapshot row, which is the
     * obvious place a removed metric gets quietly rehomed.
     */
    await openFunctionView(page);
    const text = await band(page, "function-metrics").innerText();
    expect(text).not.toMatch(/Technical community activity/);
    expect(text).not.toMatch(/meetup/i);
    expect(text).not.toMatch(/conferences? a year/i);
    expect(text).not.toMatch(/1,400/);
    // And the nine-discipline split is off this tab, though it is still on two others.
    expect(text).not.toMatch(/Graduate output by discipline/);
    expect(text).not.toMatch(/Computer science and IT/);
    await page.getByRole("tab", { name: "Operations", exact: true }).click();
    await expect(
      page.getByRole("heading", { level: 2, name: "Graduate output by discipline" }),
    ).toBeVisible();
  });

  test("ends the card at the evidence, with one attribution under it", async ({
    page,
  }) => {
    await openFunctionView(page);
    const card = page.locator(".gcc-result-card");
    const source = page.getByText("Source: ANSR Research");
    await expect(source).toBeVisible();
    // Outside the card: it is an attribution for the surface, not a note on whichever
    // zone happens to be last.
    expect(
      await source.evaluate(
        (el, selector) => el.closest(selector) === null,
        ".gcc-result-card",
      ),
    ).toBe(true);
    const [cardBox, sourceBox] = await Promise.all([
      card.boundingBox(),
      source.boundingBox(),
    ]);
    expect(sourceBox!.y).toBeGreaterThan(cardBox!.y + cardBox!.height - 1);
    /**
     * **The last zone's ground runs to the card's foot: nothing between it and the
     * edge.** The property is unchanged and the LOCATOR moved, which is the whole
     * correction — this measured the last zone inside `#function-metrics`, and with the
     * close restored the card's final band is the close's zone rather than a metrics
     * zone. Scoped to the card, so it asserts what it always meant: the card ends on a
     * ground, never on padding.
     *
     * That the close is the last band is asserted separately, and on both screens.
     */
    const lastZone = card.locator(".gcc-zone").last();
    const zoneBox = (await lastZone.boundingBox())!;
    expect(Math.abs(zoneBox.y + zoneBox.height - (cardBox!.y + cardBox!.height))).toBeLessThanOrEqual(2);
    // And that final zone is the close's, not a metrics zone that happens to be last.
    expect(
      await lastZone.evaluate((el) => el.querySelector("#close") !== null),
    ).toBe(true);
  });
});

test.describe("the copy strip", () => {
  /**
   * **Screen 2 explained itself four times over and now explains itself once.** The
   * band above the card states the scope; everything else was the reader being told
   * what they were looking at again. Every sentence below is asserted ABSENT, which is
   * the same discipline Screen 1's specs carry for its six removed leads: three of
   * these cost the page a claim and are exported, unit-tested and blocked, so a spec
   * that only checked the survivors would let half a removal come back unnoticed.
   */
  const gone = [
    // The screen's `h2` and the lead under it.
    /What an India GCC would give/,
    /These are figures for India as a whole/,
    // The four per-tab leads.
    /How deep the engineering pool is/,
    /The same talent picture, plus how long a function takes/,
    /The same talent picture, plus how fast you can hire/,
    /Where the cost advantage comes from, whether it lasts/,
    // Six of the thirty-five card questions, one per shape.
    /How many people with the skills we need are available today/,
    /When somebody leaves, how long does the seat stay empty/,
    /Once the first team proves out/,
    /Where does the saving actually come from/,
    /Where does India lead the alternatives/,
    /How much does the workplace cost change/,
    // The screen-level and per-tab provenance.
    /National aggregates maintained by ANSR/,
    /Bench strength, graduate output and the hiring timings/,
    /Same figures on every tab/,
  ];

  test("says none of it, on any tab", async ({ page }) => {
    await openFunctionView(page);
    for (const name of ["Technology", "Operations", "HR", "Finance"]) {
      await page.getByRole("tab", { name, exact: true }).click();
      const text = await band(page, "function-metrics").innerText();
      for (const sentence of gone) {
        expect(text, `${name}: ${sentence}`).not.toMatch(sentence);
      }
    }
  });

  test("no longer spells out the plus, but keeps the marker", async ({
    page,
  }) => {
    /**
     * **The floor sentence is gone from every tab, at ANSR's request, and the `+` on
     * the figure carries it unexplained.** It used to explain the trailing plus once at
     * the foot of a tab, then per card, then once per figure row — every version was a
     * caveat about a marker most cards did not have. It is removed now; the marker
     * stays, because it is authored on the metric and applied in `screen2.ts`.
     */
    await openFunctionView(page);
    const band = page.locator("#function-metrics");

    // The marker is still on the figures that declare a floor.
    const row = band.locator("ul").first();
    await expect(row.getByText("8.7M+", { exact: true })).toBeVisible();
    await expect(row.getByText("1.4M+", { exact: true })).toBeVisible();

    // But the sentence explaining it is nowhere, on any tab.
    for (const name of ["Technology", "Operations", "HR", "Finance"]) {
      await page.getByRole("tab", { name, exact: true }).click();
      await expect(
        band.getByText(FLOOR_NOTE, { exact: true }),
        `${name}: the floor note is gone`,
      ).toHaveCount(0);
    }
  });

  test("leaves a real heading outline with no level skipped", async ({ page }) => {
    /**
     * The consequence of removing the `h2`. Cards were `h3` under it; left alone they
     * would be `h3` directly under the `h1`, which is a skipped level and a broken
     * structure for anyone navigating by heading. They are `h2` now — with no section
     * heading above them a card IS a top-level section of the tab — and the held group
     * is another, with its own sealed cards at `h3`.
     */
    await openFunctionView(page);
    // **All three composed tabs**, because each nests cards or cells under a section
    // heading of its own and is therefore where a level can be skipped. A derived tab
    // has one level of `h2` cards and nothing to get wrong.
    for (const name of ["HR", "Operations", "Finance"]) {
      await page.getByRole("tab", { name, exact: true }).click();
      const levels = await page
        .locator("h1, h2, h3, h4, h5, h6")
        .evaluateAll((headings) =>
          headings.map((heading) => Number(heading.tagName.slice(1))),
        );
      expect(levels[0], name).toBe(1);
      for (const [index, level] of levels.entries()) {
        if (index === 0) continue;
        expect(level - levels[index - 1]!, name).toBeLessThanOrEqual(1);
      }
      expect(levels, name).toContain(3);
    }
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
    // would be the first thing to appear. Shared with the peer-view spec so the two
    // cannot drift — see `LEAK_CANARY`.
    expect(html).not.toContain(LEAK_CANARY);
    expect(html.length).toBeLessThan(300_000);
  });
});

/* ==========================================================================
   The operations tab's composed layout

   **The second authored tab.** `OpsPanel` selects by metric id, states its own three
   section headings, and — new here — draws three metrics as a single summary FIGURE each
   rather than as their own card, with their sections removed at ANSR's request.

   Located by section id throughout, never by heading text.
   ========================================================================== */
test.describe("the operations composition", () => {
  async function openOps(page: Page): Promise<void> {
    await openFunctionView(page);
    await page.getByRole("tab", { name: "Operations", exact: true }).click();
    await expectBand(page, "ops-velocity");
  }

  test("holds the sections in the composed order", async ({ page }) => {
    await openOps(page);
    for (const id of ["ops-velocity", "ops-supporting"]) {
      await expectBand(page, id);
    }
    // The summary row is named by its own heading rather than by a section id, because it
    // is a `ul` of figures rather than a group of cards — the same shape every other
    // tab's figure row has.
    await expect(page.locator("#figures-operations-heading")).toHaveText(
      "India's operations landscape",
    );
    const tops = await page.evaluate(() =>
      ["figures-operations-heading", "ops-velocity", "ops-supporting", "metric-ops-graduate-output"].map(
        (id) => document.getElementById(id)?.getBoundingClientRect().top ?? -1,
      ),
    );
    expect(tops.every((top) => top > 0)).toBe(true);
    expect([...tops].sort((a, b) => a - b)).toEqual(tops);
  });

  test("leads on four national facts, drawn in type alone", async ({ page }) => {
    await openOps(page);
    const summary = page.locator("#function-metrics ul").first();
    const cells = summary.locator("li");
    await expect(cells).toHaveCount(4);

    /**
     * The four figures, in composition order. Three of them are lifted out of a
     * breakdown whose own section was removed, which is what makes the notes below
     * load-bearing rather than decorative.
     */
    for (const [index, figure] of ["8.7M+", "99.95%", "854"].entries()) {
      await expect(cells.nth(index).getByText(figure, { exact: true })).toBeVisible();
    }

    /**
     * **A cell is ONE line under its figure now, and the SCOPE a lifted figure must not
     * lose is inside that line.** Three of these four are the leading part of a breakdown
     * whose own section was removed, so the cell has to say what population its figure
     * covers — 99.95% is true of a Grade A campus and not of the Tier 1 grid, and the
     * metric is deliberately split so the weaker of the two is not hidden. It used to be
     * carried by a second line holding the part's own label; the titles state it
     * themselves now, which is one authored string instead of two that have to agree.
     */
    await expect(
      cells.nth(1).getByRole("heading", { name: "Uptime at a Grade A campus" }),
    ).toBeVisible();
    await expect(
      cells
        .nth(2)
        .getByRole("heading", { name: "Grade A stock, top 7 cities, mn sq ft" }),
    ).toBeVisible();
    // Exactly one line under each figure: no unit line and no note line beside it.
    for (const index of [0, 1, 2, 3]) {
      await expect(cells.nth(index).locator("p")).toHaveCount(1);
    }
    // The floor sentence is gone from every tab at ANSR's request; the `+` on the
    // workforce figure carries it unexplained.
    await expect(cells.getByText(FLOOR_NOTE, { exact: true })).toHaveCount(0);
    await expect(cells.filter({ hasText: "8.7M+" })).toBeVisible();

    /**
     * **No mark on any of them, at ANSR's instruction and for a reason.** A gauge behind
     * 99.95% would be a part-to-whole claim about a figure that is not part of anything,
     * and a bar behind a single number invents a scale it has no axis for. So a cell holds
     * a figure and one label, and nothing else.
     */
    await expect(summary.locator("svg")).toHaveCount(0);
    await expect(summary.locator(".gcc-held")).toHaveCount(0);
  });

  test("states the disruption figure the project owner asked for, and states it once", async ({
    page,
  }) => {
    /**
     * **This test previously asserted the OPPOSITE and the reversal is the point of the
     * comment.** The cell stated the real extent, "2 – 6", because there is no zero in
     * this dataset: the four cities are 4, 2, 3 and 6 days and the metric's own note puts
     * the national figure at 3–6. The project owner instructed the cell to read 0, in
     * full knowledge of that, so the assertion now runs the other way — a figure this
     * page cannot evidence has to be pinned somewhere, or the next pass over
     * `ops-view.tsx` reads it as a bug and quietly restores the extent.
     *
     * What is still asserted: the literal is confined to the summary cell. The four city
     * figures behind it are not on the tab, so nothing on screen contradicts the 0, and
     * the extent's second figure is gone rather than left beside it.
     */
    await openOps(page);
    const cell = page
      .locator("#function-metrics ul")
      .first()
      .locator("li")
      .filter({ hasText: "Working days lost a year, by city" });
    await expect(cell).toHaveCount(1);
    // The label carries the unit and the by-city scope itself, the cell being one line
    // under its figure — the "Across the cities assessed" note went with the second line.
    const text = ((await cell.textContent()) ?? "").replace(/\s+/g, " ");
    expect(text).toMatch(/^0/);
    // One figure, not a pair: no en dash and no `sr-only` "to" bridging two numerals.
    expect(text).not.toMatch(/–/);
    expect(text).not.toMatch(/\bto\b/);
    const tab = await band(page, "function-metrics").innerText();
    expect(tab).not.toMatch(/Lowest recorded/);
  });

  test("removes the three infrastructure sections without losing the figures", async ({
    page,
  }) => {
    /**
     * Grade A office stock, power and connectivity, and days lost to disruption by city
     * are gone as sections, at ANSR's request. Asserted in both directions: no section,
     * and the headline figure of each still on the tab as a summary cell — a removal that
     * dropped the figure too would be a different change from the one that was asked for.
     */
    await openOps(page);
    const band_ = band(page, "function-metrics");
    await expect(band_.locator('section[id^="metric-"]')).toHaveCount(5);
    for (const id of [
      "metric-ops-grade-a-office-stock",
      "metric-ops-power-uptime",
      "metric-ops-disruption-days",
    ]) {
      await expect(page.locator(`#${id}`)).toHaveCount(0);
    }
    const text = await band_.innerText();
    // The parts that went with their cards: the second half of each split breakdown, and
    // the four city names.
    expect(text).not.toContain("Vacant and available now");
    expect(text).not.toContain("Tier 1 city grid");
    for (const city of ["Bengaluru", "Hyderabad", "Pune", "Chennai"]) {
      expect(text, city).not.toContain(city);
    }
    /**
     * And the three headline figures are still here — located rather than matched against
     * `innerText`, because a figure and its unit are now two elements. The numeral and its
     * `%` or `M+` sit in one flex line so the unit can be a step down and baseline-aligned
     * (Screen 1's snapshot device), and `innerText` puts a line break between flex items.
     * `getByText` matches the smallest element containing the whole string, which is the
     * span wrapping the pair.
     */
    for (const figure of ["99.95%", "854", "8.7M+"]) {
      await expect(band_.getByText(figure, { exact: true }).first()).toBeVisible();
    }
  });

  test("puts the nine disciplines in two columns on one scale", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await openOps(page);
    const card = page.locator("#metric-ops-graduate-output");
    await expect(card).toBeVisible();
    await expect(card.getByText("graduates a year")).toBeVisible();

    /**
     * Two `dl`s, four rows each, in the catalogue's own order — so the engineering and
     * science streams lead and the commerce, management, finance and HR streams follow.
     * Nothing is sorted by value, here or anywhere on this screen. "Other sciences" was
     * removed from the split at ANSR's request, taking it from nine parts to eight.
     */
    const lists = card.locator("dl");
    await expect(lists).toHaveCount(2);
    await expect(lists.nth(0).locator("dt")).toHaveCount(4);
    await expect(lists.nth(1).locator("dt")).toHaveCount(4);
    const labels = await card.locator("dt").allInnerTexts();
    expect(labels.map((label) => label.trim())).toEqual([
      "Engineering, other disciplines",
      "Computer science and IT",
      "Electronics and communication",
      "Mathematics and statistics",
      "Commerce",
      "Management and MBA",
      "Finance and accounting",
      "Human resources",
    ]);

    // Side by side: the second column starts after the first ends.
    const [first, second] = await Promise.all([
      lists.nth(0).boundingBox(),
      lists.nth(1).boundingBox(),
    ]);
    expect(Math.abs(first!.y - second!.y)).toBeLessThanOrEqual(2);
    expect(second!.x).toBeGreaterThan(first!.x + first!.width - 2);

    /**
     * **One scale across both columns**, which is what makes the nine comparable. Every
     * part's share is against the metric's own largest value in the view model, so there
     * is no per-column maximum to get wrong — this reads the rendered fills to prove it.
     * 1.5M is full width; 45,000 is 3% of it, which is under the 1.5% floor's neighbour
     * and is asserted against the real ratio rather than against a hardcoded pixel width.
     */
    const fills = await card
      .locator("dl > div > div > div[aria-hidden]")
      .evaluateAll((nodes) =>
        nodes.map((node) => {
          const bar = node.firstElementChild;
          const track = node.getBoundingClientRect().width;
          return track > 0 && bar ? bar.getBoundingClientRect().width / track : 0;
        }),
      );
    expect(fills).toHaveLength(8);
    expect(fills[0]).toBeCloseTo(1, 2);
    expect(fills[7]).toBeCloseTo(45_000 / 1_500_000, 2);
    // The track stays: the set is not sorted by its own quantity, so nothing else states
    // where full width is.
    expect(fills[4]).toBeCloseTo(600_000 / 1_500_000, 2);
  });

  test("carries no glyph in the function navigation", async ({ page }) => {
    /**
     * Removed at ANSR's request. The argument for having them is recorded in
     * `function-view.tsx` and is simply overruled; what the removal buys is that the two
     * strips at the head of the card carry the same amount of chrome as each other, which
     * is none.
     */
    await openFunctionView(page);
    await expect(tabs(page).locator("svg")).toHaveCount(0);
    // Still four real tabs with their labels, and the selected one still says so.
    await expect(tabs(page).getByRole("tab")).toHaveText([
      "Technology",
      "Operations",
      "HR",
      "Finance",
    ]);
  });

  test("keeps the composed tab clear of a horizontal scrollbar", async ({ page }) => {
    for (const width of [1440, 1024, 768, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await openOps(page);
      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(scrollWidth, `at ${width}`).toBeLessThanOrEqual(clientWidth + 1);
    }
    await page.setViewportSize({ width: 1280, height: 900 });
  });
});

/* ==========================================================================
   The HR tab's composed layout

   **One tab is authored rather than derived, and these assert the parts of that which
   only the render can show.** Every other tab lays itself out from the data —
   `layoutArea` splits the scalars into a figure row, `metricWidth` sizes what is left,
   and `AreaPanel` alternates the grounds from the list it gets. `HrPanel` selects by
   metric id instead, states its own section headings, and puts the sealed pair on its
   own ground. The composition's own reasoning is in `hr-view.tsx`.

   Located by SECTION ID throughout, never by heading text. Twenty specs in this suite
   once located a band by its wording and one copy pass broke all twenty.
   ========================================================================== */
test.describe("the HR composition", () => {
  async function openHr(page: Page): Promise<void> {
    await openFunctionView(page);
    await page.getByRole("tab", { name: "HR", exact: true }).click();
    await expectBand(page, "hr-velocity");
  }

  test("holds the four sections in the composed order", async ({ page }) => {
    await openHr(page);
    /**
     * Market, then velocity, then scale and cost, then the graduate supply all three of
     * those stand on. That order is an argument — it is what a reader asks in sequence —
     * rather than a consequence of how wide each chart is, which is what decides it on the
     * technology tab. So the order itself is the assertion.
     *
     * **The sealed group was the fifth and is deleted at ANSR's request**, so the tab ends
     * on the graduate card. The graduate card is not in the loop below because it is a bare
     * `Panel` under the metric's own title rather than a section wrapping cards — the same
     * shape it takes on the operations tab, and located by the same `metric-` id.
     *
     * The two grouped sections carry `aria-label` rather than a visible heading now: the
     * group headings went at ANSR's request, and `expectBand` accepts either naming
     * mechanism while still refusing a band with neither.
     */
    for (const id of ["hr-velocity", "hr-analysis"]) {
      await expectBand(page, id);
    }
    // The market summary is named by its own heading rather than by a section id, because
    // it is a `ul` of figures rather than a group of cards — the same shape the other
    // three tabs' figure rows have.
    await expect(page.locator("#figures-hr-heading")).toHaveText(
      "India's hiring market",
    );
    const tops = await page.evaluate(() =>
      [
        "figures-hr-heading",
        "hr-velocity",
        "hr-analysis",
        "metric-hr-graduate-output",
      ].map((id) => document.getElementById(id)?.getBoundingClientRect().top ?? -1),
    );
    expect(tops.every((top) => top > 0)).toBe(true);
    expect([...tops].sort((a, b) => a - b)).toEqual(tops);
  });

  test("leads on three national facts, as facts rather than charts", async ({
    page,
  }) => {
    await openHr(page);
    const summary = page.locator("#function-metrics ul").first();
    const cells = summary.locator("li");
    await expect(cells).toHaveCount(3);
    for (const [index, figure] of ["8.7M+", "800K", "72%"].entries()) {
      await expect(cells.nth(index).getByText(figure, { exact: true })).toBeVisible();
    }
    /**
     * **No mark on any of them.** A gauge or a ring behind 72% would be a part-to-whole
     * claim about a figure that is not part of anything, and a bar behind a single
     * number invents a scale it has no axis for. The composition says these are facts;
     * this is what "facts, not charts" means in the document.
     */
    await expect(summary.locator(".gcc-held")).toHaveCount(0);
    await expect(summary.locator("svg[aria-hidden] + svg")).toHaveCount(0);
  });

  test("shows the floor marker but no longer spells it out", async ({
    page,
  }) => {
    await openHr(page);
    const cells = page.locator("#function-metrics ul").first().locator("li");
    /**
     * The floor sentence was removed from every tab at ANSR's request; the `+` on the
     * bench-strength figure carries it unexplained.
     */
    await expect(cells.getByText(FLOOR_NOTE, { exact: true })).toHaveCount(0);
    await expect(cells.filter({ hasText: "8.7M+" })).toBeVisible();
  });

  test("draws each hiring range as two labelled endpoints on a zeroed rail", async ({
    page,
  }) => {
    await openHr(page);
    const velocity = band(page, "hr-velocity");
    await expect(velocity.locator('section[id^="metric-"]')).toHaveCount(2);

    const first = velocity.locator("#metric-hr-time-to-first-hire");
    /**
     * The spread as one display line, then each end again at its own position on the
     * rail, then the origin.
     *
     * Read off the card's normalised text rather than with `getByText`, because every one
     * of these figures is a bare numeral inside an element that also holds its unit —
     * "7" and "days" are two children of one span — so there is no element whose exact
     * text is "7" and a non-exact match for it hits "70" as well.
     */
    const text = ((await first.textContent()) ?? "").replace(/\s+/g, " ");
    // The display value: both ends, an en dash between them, the unit once.
    expect(text).toMatch(/7\s*–\s*70\s*days/);
    // The rail: the origin, then each endpoint's own figure beneath its own mark.
    expect(text).toMatch(/0\s*7\s*days/);
    expect(text).toMatch(/70\s*days/);
    /**
     * **The end labels are whole clauses now.** They were fragments — "on an employer of
     * record" — written to be prefixed with their own endpoint figure by `RangeBar`; this
     * drawing puts the figures on the rail itself, so the fragment had nothing to attach
     * to and the prefix would have been the third appearance of the same number on one
     * card.
     */
    await expect(
      first.getByText("Hiring through an employer of record"),
    ).toBeVisible();
    await expect(
      first.getByText("Hiring directly into your own entity"),
    ).toBeVisible();
    // The caveat the card owes a reader, on the card rather than at the foot of the tab.
    await expect(
      first.getByText(/Timelines vary by hiring model, role, location and seniority/),
    ).toBeVisible();

    // Backfill deliberately has no end labels: naming them would re-introduce the
    // per-function split the shared metric exists to collapse.
    const second = velocity.locator("#metric-hr-backfill-time");
    await expect(second.getByText(/employer of record/)).toHaveCount(0);
    /**
     * **It carries a note of its own now, and the two cards' value lines are level.**
     * ANSR reported the pair as asymmetrical: a caveat under one card and nothing under
     * the other, with both bodies centred, put "7 – 70 days" and "35 – 75 days" at
     * different heights. Backfill's line is not filler — the metric stores a deliberately
     * wide span because it collapses a per-function split, so which END applies is the one
     * thing a reader needs and it is a seniority question rather than a function one.
     */
    await expect(
      second.getByText(/A mid-level seat refills near the lower end/),
    ).toBeVisible();
    const tops = await velocity
      .locator("section[id^='metric-'] p")
      .filter({ hasText: /\d+\s*–\s*\d+/ })
      .evaluateAll((values) =>
        values.map((value) => Math.round(value.getBoundingClientRect().top)),
      );
    expect(tops).toHaveLength(2);
    expect(Math.abs(tops[0]! - tops[1]!)).toBeLessThanOrEqual(1);
  });

  test("draws the scale curve as one line with proportional milestones, beside an ANSR rail", async ({
    page,
  }) => {
    await openHr(page);
    const card = band(page, "hr-analysis").locator("#metric-hr-scale-milestones");
    await expect(card.getByText("months, median")).toBeVisible();

    const tracks = card.locator(".gcc-milestone-track");
    await expect(tracks).toHaveCount(2);
    const market = tracks.first();
    const ansr = tracks.last();

    const points = await market.locator(".gcc-milestones__item").evaluateAll((nodes) =>
      nodes.map((node) => ({
        at: getComputedStyle(node).getPropertyValue("--gcc-at").trim(),
        text: (node.textContent ?? "").replace(/\s+/g, " ").trim(),
      })),
    );
    /**
     * Milestone then duration, with no separator between them — they are a `dt` and a `dd`
     * of one pair, which is what makes a screen reader announce "50 FTEs, 6" rather than
     * reading a row of numerals with nothing attaching them to anything.
     *
     * The entries lost their "To " prefix in this pass: at 1024 the first two waypoints
     * land about 56px apart, and "To 50 FTEs" does not fit between them — nor was "To"
     * adding anything, since the card's own title already says "Time to reach each scale
     * milestone".
     */
    expect(points.map((point) => point.text)).toEqual([
      "50 FTEs6",
      "100 FTEs12",
      "300 FTEs24",
      "500 FTEs36",
    ]);
    /**
     * **Proportional to the stored figures, not evenly spaced.** Six, twelve, twenty-four
     * and thirty-six months land at a sixth, a third, two thirds and all of the rail, so
     * the drawing shows what the numbers say — the first two milestones are close together
     * and the last is a long way out. Evenly spaced circles would be a lie about the one
     * thing this chart exists to show, and the same lie a truncated axis tells.
     */
    const shares = points.map((point) => Number.parseFloat(point.at));
    expect(shares[0]).toBeCloseTo((6 / 36) * 100, 1);
    expect(shares[1]).toBeCloseTo((12 / 36) * 100, 1);
    expect(shares[2]).toBeCloseTo((24 / 36) * 100, 1);
    expect(shares[3]).toBeCloseTo(100, 1);
    // One rail per track, however many milestones each has.
    await expect(market.locator(".gcc-milestones__rail")).toHaveCount(1);
    await expect(ansr.locator(".gcc-milestones__rail")).toHaveCount(1);

    /**
     * **The ANSR rail, COLUMN-ALIGNED with the market one, at ANSR's request.**
     *
     * Its figures are SUPPLIED in `milestone-card.tsx` at the project owner's instruction;
     * the dataset does not hold them, which is why nothing here reads them back out of the
     * metric.
     *
     * What this asserts is the alignment, because it is the property the card's whole
     * reading depends on and the one that would go wrong silently. Each waypoint sits at
     * the position of the market waypoint it answers — "500 FTEs" under "500 FTEs" — so a
     * reader compares straight down a column. The axis is therefore the MILESTONE, not
     * elapsed time; the first version divided these months by the market curve's largest
     * value, which put the lower circles between the upper ones rather than under them.
     * The cost is that a position on this rail is not proportional to the figure beneath
     * it, which is why the card states no ratio and no "faster" — see the block comment in
     * `milestone-card.tsx`.
     */
    const accelerated = await ansr
      .locator(".gcc-milestones__item")
      .evaluateAll((nodes) =>
        nodes.map((node) => ({
          at: Number.parseFloat(
            getComputedStyle(node).getPropertyValue("--gcc-at"),
          ),
          text: (node.textContent ?? "").replace(/\s+/g, " ").trim(),
        })),
      );
    expect(accelerated.map((point) => point.text)).toEqual([
      "50 FTEs4",
      "100 FTEs8",
      "300 FTEs16",
      "500 FTEs24",
    ]);
    // Same position, waypoint for waypoint, so the two rails read as two rows of one
    // table. Compared against the market shares this test already measured rather than
    // against literals, so it cannot pass by both rails being wrong together.
    expect(accelerated.map((point) => point.at)).toEqual(shares);

    /**
     * **Every ANSR figure is lower than the market figure above it, which is the whole
     * claim the rail makes now that its geometry no longer makes one.** With the positions
     * borrowed, the numbers are the only thing saying the curve is faster — so this is the
     * assertion that would catch a supplied figure edited upward past the market's.
     */
    const [marketFigures, ansrFigures] = await Promise.all(
      [market, ansr].map((track) =>
        track
          .locator(".gcc-milestones__figure")
          .evaluateAll((nodes) =>
            nodes.map((node) => Number.parseInt(node.textContent ?? "", 10)),
          ),
      ),
    );
    expect(ansrFigures).toEqual([4, 8, 16, 24]);
    expect(marketFigures).toHaveLength(4);
    for (const [index, months] of ansrFigures!.entries()) {
      expect(months).toBeLessThan(marketFigures![index]!);
    }

    /**
     * **The full lockup — circular mark and wordmark — at ANSR's request**, where this was
     * the drawn wordmark alone. It is the only place ANSR is named on this screen below the
     * `h1`. `alt="ANSR"` carries the caption's accessible reading, so it comes out "Built
     * with ANSR" rather than as an unnamed graphic.
     */
    await expect(ansr.getByText("Built with")).toBeVisible();
    await expect(ansr.getByRole("img", { name: "ANSR" })).toBeVisible();
    await expect(ansr.locator("img")).toHaveAttribute(
      "src",
      "/brand/ansr-logo.svg",
    );

    /**
     * **No ratio, no percentage, no "faster" anywhere on the card.** The comparison is the
     * drawing. A "40% faster" line would be arithmetic over two sets of numbers only one
     * of which has a source behind it, which is the reason the second rail is drawn rather
     * than summarised.
     */
    const text = await card.innerText();
    expect(text).not.toMatch(/%/);
    expect(text).not.toMatch(/faster|quicker|sooner|\bx\b/i);

    /**
     * **The two rails are the SAME DRAWING, at ANSR's request, and this is the assertion
     * that keeps them so.** The lower one had discs where the upper has rings, its figures
     * in the heading teal, and its waypoint names clipped to a screen reader — all three
     * reverted, because a rail drawn differently from the rail it is compared with reads as
     * a different kind of chart, which defeats the comparison.
     *
     * Asserted as computed style and box geometry rather than by class name, so the
     * differentiation cannot come back by another route.
     */
    const dots = await card
      .locator(".gcc-milestones__dot")
      .evaluateAll((nodes) =>
        nodes.map((node) => {
          const style = getComputedStyle(node);
          return `${style.backgroundColor}|${style.borderColor}|${style.borderWidth}`;
        }),
      );
    expect(dots).toHaveLength(8);
    expect(new Set(dots).size).toBe(1);

    const figureInks = await card
      .locator(".gcc-milestones__figure")
      .evaluateAll((nodes) => nodes.map((node) => getComputedStyle(node).color));
    expect(figureInks).toHaveLength(8);
    expect(new Set(figureInks).size).toBe(1);

    // Both rails name their waypoints on screen. Eight visible labels, not four and four
    // clipped ones.
    const labelBoxes = await card
      .locator(".gcc-milestones__label")
      .evaluateAll((labels) =>
        labels.map((label) => Math.round(label.getBoundingClientRect().height)),
      );
    expect(labelBoxes).toHaveLength(8);
    for (const box of labelBoxes) expect(box).toBeGreaterThan(1);

    /**
     * **The caption belongs to the rail under it, so the two tracks sit further apart than
     * a caption sits from its own chart.** At the first attempt's 20px gap over a 16px
     * inset the two distances were near enough equal that the lower caption read as a note
     * on the upper chart — the crowding ANSR reported. Asserted as an inequality rather
     * than as two pixel values, so the rhythm survives a spacing token moving.
     */
    const [firstCaption, secondCaption] = await card
      .locator(".gcc-milestone-track > p")
      .evaluateAll((nodes) =>
        nodes.map((node) => {
          const rect = node.getBoundingClientRect();
          return { top: rect.top, bottom: rect.bottom };
        }),
      );
    const firstTrackBottom = await card
      .locator(".gcc-milestone-track")
      .first()
      .evaluate((node) => node.getBoundingClientRect().bottom);
    const betweenTracks = secondCaption!.top - firstTrackBottom;
    const captionToOwnChart = firstCaption!.bottom - firstCaption!.top;
    expect(betweenTracks).toBeGreaterThan(captionToOwnChart);
  });

  test("ranks salary pressure with the comparator named in text, not only in colour", async ({
    page,
  }) => {
    await openHr(page);
    const card = band(page, "hr-analysis").locator("#metric-hr-salary-growth");
    // "Base pay", not "Base salary" — the title one line above already says salary.
    await expect(card.getByText("Base pay growth, year on year")).toBeVisible();

    const rows = await card.locator("dt").evaluateAll((nodes) =>
      nodes.map((node) => (node.textContent ?? "").trim()),
    );
    // Descending, which is what states the axis in row one and licenses the bare track.
    expect(rows).toEqual([
      "AI and machine learning",
      "Cybersecurity",
      "Cloud",
      "Software Development (SDE)",
      "Product Management",
      "DevOps / Platform Engineering",
      "All roles",
      "Roles outside engineering R&D",
    ]);
    for (const figure of ["21.1%", "20%", "16.1%", "15%", "14.5%", "14%", "9.8%", "7.5%"]) {
      await expect(card.getByText(figure, { exact: true })).toBeVisible();
    }

    /**
     * **The comparator is orange AND is named in text — by its own LABEL, not by a
     * sentence.** Colour is never the only carrier of a distinction on these screens, this
     * palette being unable to separate categories by hue at all, so something written has
     * to say the "All roles" row is not another specialism. "All roles (reference)" carried
     * it and the bracket came off at ANSR's request; the words "All roles" are
     * self-descriptive as the all-up baseline, so the label itself is the text carrier and
     * no sentence sits under the chart.
     *
     * The bracket coming back and a comparator sentence appearing are BOTH asserted absent,
     * because either would be a silent regression — the height a sentence bought is now
     * carried by the three supplied specialism rows above.
     */
    await expect(card.getByText("All roles", { exact: true })).toBeVisible();
    await expect(card.getByText(/\(reference\)/)).toHaveCount(0);
    await expect(card.getByText(/Non-ER&D/)).toHaveCount(0);
    await expect(card.getByText(/market comparator/)).toHaveCount(0);

    /**
     * **One teal across the ranking, matching the graduate card a section below.** Seven
     * subject bars in `teal-500` and one comparator in the action orange. The grey `muted`
     * row and the deeper bare teal both came off at ANSR's request — the grey read as a
     * third category rather than another measurement, and the deeper teal made this card
     * and the graduate card look like two kinds of chart. Asserted as two distinct fills
     * over eight bars rather than by class name.
     */
    const fills = await card
      .locator("dl > div > div > div[aria-hidden='true'] > div")
      .evaluateAll((bars) =>
        bars.map((bar) => getComputedStyle(bar).backgroundColor),
      );
    expect(fills).toHaveLength(8);
    expect(new Set(fills).size).toBe(2);
    // The comparator is the odd one out, and it is the seventh row — the three supplied
    // specialisms sit fourth, fifth and sixth.
    expect(fills[6]).not.toBe(fills[0]);
    expect(fills[7]).toBe(fills[0]);

    /**
     * **The bars are scaled to the largest rate, so the ranking is legible.** Against a
     * 100% axis eight growth rates from 7.5% to 21.1% draw as slivers occupying a fifth of
     * the track, with four fifths of the card given to a region no value can reach. A
     * percentage scales to 100 where the parts ARE the whole — a stacked bar — and a rate
     * is not a share of anything. See `breakdownScale`.
     */
    const widths = await card
      .locator("dl > div > div > div[aria-hidden]")
      .evaluateAll((nodes) =>
        nodes.map((node) => {
          const bar = node.firstElementChild;
          const track = node.getBoundingClientRect().width;
          const fill = bar ? bar.getBoundingClientRect().width : 0;
          return track > 0 ? fill / track : 0;
        }),
      );
    expect(widths).toHaveLength(8);
    expect(widths[0]).toBeCloseTo(1, 2);
    expect(widths[7]).toBeCloseTo(7.5 / 21.1, 2);
  });

  test("draws graduate output identically to the operations tab", async ({ page }) => {
    /**
     * **Restored at ANSR's request, and the assertion is that the two tabs agree.** This is
     * one shared definition drawn by one component, `GraduateOutput`, so the nine
     * disciplines, their order and their figures have to be byte-identical across the two
     * views — two copies of the markup would let one tab be re-split or re-ordered alone,
     * which is the drift the extraction exists to make impossible.
     *
     * Read off the `dt`/`dd` pairs rather than by locating each figure, because the card
     * is two `dl`s side by side above `lg` and one below it: the pairs are the same in both
     * layouts and the geometry is not.
     */
    async function readCard(id: string): Promise<string[]> {
      const card = page.locator(`#metric-${id}`);
      await expect(card).toBeVisible();
      await expect(card.getByText("graduates a year")).toBeVisible();
      return card
        .locator("dt, dd")
        .evaluateAll((nodes) => nodes.map((node) => (node.textContent ?? "").trim()));
    }

    await openHr(page);
    const hr = await readCard("hr-graduate-output");
    await page.getByRole("tab", { name: "Operations", exact: true }).click();
    const ops = await readCard("ops-graduate-output");

    expect(hr).toEqual(ops);
    // Eight disciplines in the catalogue's own family order, never sorted by value, with
    // the counts abbreviated exactly as `formatCompact` leaves them. "Other sciences" was
    // removed at ANSR's request, taking the split from nine parts to eight.
    expect(hr.slice(0, 4)).toEqual([
      "Engineering, other disciplines",
      "1.5M",
      "Computer science and IT",
      "300K",
    ]);
    expect(hr).toHaveLength(16);
    expect(hr).toContain("Human resources");
    expect(hr).toContain("45K");
  });

  test("draws nothing for its two gated metrics", async ({ page }) => {
    /**
     * **The sealed group is DELETED at ANSR's request.** It was the tab's fifth section: a
     * heading, two `tone="sealed"` cards, a lock disc each, a hatched placeholder and a
     * line stating when the figures become available. All of it is gone, so the tab ends on
     * the graduate card and a gated metric is drawn nowhere.
     *
     * Asserted here as well as in the gate block because this is the composition's own
     * shape: a spec that only counted cards would pass with the heading left behind.
     */
    await openHr(page);
    const metrics = band(page, "function-metrics");

    await expect(page.locator("#hr-held")).toHaveCount(0);
    await expect(metrics.getByText("Figures shaped by your roles and cities")).toHaveCount(0);
    await expect(metrics.getByText("Held back")).toHaveCount(0);
    await expect(metrics.locator(".gcc-held")).toHaveCount(0);
    // The availability line and the lead went with the section.
    await expect(
      metrics.getByText(
        "Both become available once roles, levels and Indian cities are selected.",
      ),
    ).toHaveCount(0);
    await expect(
      metrics.getByText(
        "These measures depend on the roles, levels and Indian locations selected for your GCC.",
      ),
    ).toHaveCount(0);
    // And the ordinal scaffolding the withheld matrix used to draw.
    for (const label of ["Role family 1", "L1", "L5", "High touch", "Scaled"]) {
      await expect(metrics.getByText(label, { exact: true })).toHaveCount(0);
    }
  });

  test("keeps the composed tab clear of a horizontal scrollbar", async ({ page }) => {
    /**
     * The one thing the absolutely-positioned milestone track and the overhanging
     * endpoint figures could break, and it is not cosmetic: the tool is framed and does
     * not own its own horizontal scroll, so a document wider than its frame is the
     * parent page's problem rather than ours. Three widths, because the two devices with
     * overhang are measured against a rail whose width changes at each of them.
     */
    for (const width of [1440, 1024, 768, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await openHr(page);
      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(scrollWidth, `at ${width}`).toBeLessThanOrEqual(clientWidth + 1);
    }
    await page.setViewportSize({ width: 1280, height: 900 });
  });
});

/* ==========================================================================
   The finance tab's composed layout

   **The third authored tab.** `FinPanel` selects by metric id, states its own overview
   row, and draws two of the three analytical metrics differently from the derived
   version: the tier spread as three cards rather than three rows of one chart, and the
   location comparison as a table rather than a plot per row.

   **Half of these assert REFUSALS**, which is more than either earlier composition
   needed. The supplied reference asks for a leading "30–40% lower" card, a second
   cost-structure panel, three columns of deep-dive bullets and a "Book a conversation"
   button; the first three are figures and sentences that exist nowhere in this
   repository, and the fourth is gone from the whole tool at ANSR's request. Each is
   asserted absent, so no half of a refusal comes back unnoticed.

   Located by section id throughout, never by heading text.
   ========================================================================== */
test.describe("the finance composition", () => {
  async function openFinance(page: Page): Promise<void> {
    await openFunctionView(page);
    await page.getByRole("tab", { name: "Finance", exact: true }).click();
    await expect(page.locator("section#metric-fin-cost-composition")).toBeVisible();
  }

  test("holds the sections in the composed order", async ({ page }) => {
    await openFinance(page);
    /**
     * Overview, then where the advantage comes from, then what a cheaper city saves, then
     * how India sits against the alternatives. That order is an argument — it is the
     * sequence a CFO asks in — rather than a consequence of how wide each chart is, which
     * is what decides it on a derived tab.
     *
     * **The sealed group was the fifth and is deleted at ANSR's request**, so the tab ends
     * on the location comparison and its two gated metrics are drawn nowhere.
     */
    await expect(page.locator("#fin-held")).toHaveCount(0);
    const tops = await page.evaluate(() =>
      [
        "figures-finance-heading",
        "metric-fin-cost-composition",
        "metric-fin-tier-cost-spread",
        "metric-fin-india-vs-hubs",
      ].map((id) => document.getElementById(id)?.getBoundingClientRect().top ?? -1),
    );
    expect(tops.every((top) => top > 0)).toBe(true);
    expect([...tops].sort((a, b) => a - b)).toEqual(tops);
  });

  test("leads on the three growth rates, with the period stated once", async ({
    page,
  }) => {
    await openFinance(page);
    await expect(page.locator("#figures-finance-heading")).toHaveText(
      "India's cost base",
    );
    /**
     * **The qualifier is gone, and asserted absent.** `FIN_FIGURES_QUALIFIER` sat beside
     * the heading because all three figures are rates and none carries a `unit` — but all
     * three TITLES end in "year on year", so the row stated the period four times, and the
     * heading is a 12px caps eyebrow now, which a line of body text beside it reads as a
     * subtitle to. Kept exported and unrendered, on the blocked list.
     */
    await expect(page.getByText("Year-on-year growth")).toHaveCount(0);

    const cells = page.locator("#function-metrics ul").first().locator("li");
    await expect(cells).toHaveCount(3);
    for (const [index, figure] of ["9.8%", "10%", "10%"].entries()) {
      await expect(cells.nth(index).getByText(figure, { exact: true })).toBeVisible();
    }
    // Titles verbatim, because shortening one would mean parsing an admin-editable
    // string to find the part to drop.
    await expect(
      cells.nth(0).getByRole("heading", { name: "India wage growth, year on year" }),
    ).toBeVisible();
    const row = await page.locator("#function-metrics ul").first().innerText();
    expect(row).not.toMatch(/vs last year/i);
    /**
     * **No mark on any of them**, which is the composition's own instruction and is also
     * the rule: a gauge behind 9.8% would be a part-to-whole claim about a figure that is
     * not part of anything. No glyph either — finance has no entry in `FIGURE_ICONS` and
     * the composed cells draw none.
     */
    await expect(
      page.locator("#function-metrics ul").first().locator("svg"),
    ).toHaveCount(0);
  });

  test("draws the cost-advantage split as one divided bar with its reading", async ({
    page,
  }) => {
    await openFinance(page);
    const card = page.locator("section#metric-fin-cost-composition");
    await expect(card.getByText("Share of total cost advantage")).toBeVisible();

    /**
     * **One bar, not four.** Four bars against a 100% axis say "each of these is some of
     * it"; one divided bar says "these four are all of it", which is the claim. Asserted
     * on the segments' own widths, which sum to the whole.
     */
    const segments = await card
      .locator('div[aria-hidden="true"] > span')
      .evaluateAll((nodes) => nodes.map((node) => Number.parseFloat(node.style.width)));
    expect(segments).toEqual([72, 12, 8, 8]);

    const labels = await card.locator("dt").allInnerTexts();
    expect(labels.map((label) => label.trim())).toEqual([
      "Salary differential",
      "Real estate and facilities",
      "Statutory and benefits differential",
      "Scale and span-of-control efficiency",
    ]);
    for (const figure of ["72%", "12%"]) {
      await expect(card.getByText(figure, { exact: true })).toBeVisible();
    }

    /**
     * **The interpretive line is gone, and asserted absent.** It was a filled mint strip
     * under this bar, which made the sentence the loudest object on the tab — and what it
     * said is what the leading segment draws at 72% of the width with its figure beside
     * its label. `FIN_DRIVERS_INSIGHT` is kept exported and unrendered, on the blocked
     * list, because the reading a CFO takes from a 72% segment is the one thing here that
     * only words could carry. The `leads` guard went with it.
     */
    await expect(
      card.getByText("Talent (salary) is the biggest lever of cost advantage."),
    ).toHaveCount(0);
  });

  test("draws the tier spread as three cards on an axis that starts at zero", async ({
    page,
  }) => {
    await openFinance(page);
    const card = page.locator("section#metric-fin-tier-cost-spread");

    // Three measures, one card each, each with its own name and its own difference.
    for (const [name, delta] of [
      ["All-in operating cost", "\u221225"],
      ["Compensation", "\u221215"],
      ["Office space", "\u221219"],
    ]) {
      await expect(card.getByRole("heading", { name, level: 3 })).toBeVisible();
      await expect(card.getByText(`${delta} vs Tier 1`)).toBeVisible();
    }

    /**
     * **The rail still starts at zero, and this is the record of refusing the supplied
     * axis.** The reference draws 50 to 125, which puts 75 against 100 a third of the
     * way along a track rather than three quarters — a 25-point difference magnified into
     * a 2:1 picture. `project.md` bans exactly that for a cost index, and the reason is
     * that a truncated axis is how one would be faked. So the base sits at the rail's end
     * and each comparator at its own share of the same zero-based axis, which is what
     * these positions assert: 100% for every Tier 1 mark, and 75/85/81 for the three
     * Tier 2 marks.
     */
    /**
     * Every positioned column on the three rails, in DOM order. Each point is one item —
     * its name, its mark and its figure in a single positioned column — so a card
     * contributes three: the origin at 0%, the base at 100%, and the comparator at its own
     * share. The origin is drawn because a cost index has to show its track is not
     * truncated.
     */
    /**
     * **Read from `--gcc-at`, not from `style.insetInlineStart`.** The rail positions each
     * item through a custom property so `.gcc-index-rail` owns every measurement in one
     * place — the offset is derived from the reserved label row, and two copies of that
     * number is how a rail stops meeting its marks. This spec read the inline logical
     * property and silently got nine empty strings when that moved, which is a stale
     * READING of a chart that was drawing correctly; the positions asserted below are
     * unchanged.
     */
    const marks = await card
      .locator(".gcc-index-rail__item")
      .evaluateAll((nodes) =>
        nodes.map((node) =>
          (node as HTMLElement).style.getPropertyValue("--gcc-at").trim(),
        ),
      );
    expect(marks).toEqual([
      "0%",
      "100%",
      "75%",
      "0%",
      "100%",
      "85%",
      "0%",
      "100%",
      "81%",
    ]);
    // The origin, labelled, which is what says the track starts at zero.
    await expect(card.getByText("0", { exact: true })).toHaveCount(3);
    // And no truncated domain anywhere on the card.
    const text = await card.innerText();
    expect(text).not.toMatch(/\b125\b/);

    /**
     * **The two display figures are GONE and the column names are on the marks, at ANSR's
     * request.** Each index was stated twice — a 30px figure under its column name, and the
     * same number again under its own mark — on a card whose whole subject is one
     * difference. What must hold now is that the figures are still REAL TEXT: the rail used
     * to be `aria-hidden` wholesale, which was correct only while the pair existed above
     * it. So each point is a `dt`/`dd` pair, six per card, and only the marks and the
     * origin are hidden.
     */
    await expect(card.getByText("Tier 2", { exact: true })).toHaveCount(3);
    await expect(card.locator("dl.gcc-index-rail > div > dt")).toHaveCount(6);
    await expect(card.locator("dl.gcc-index-rail > div > dd")).toHaveCount(6);
    for (const figure of ["75", "85", "81"]) {
      await expect(
        card.locator("dd").filter({ hasText: new RegExp(`^${figure}$`) }),
      ).toHaveCount(1);
    }
    // And no legend for the set: the marks are labelled, so there is nothing to key.
    await expect(card.getByText("Tier 1", { exact: true })).toHaveCount(3);

    /**
     * And the direction stated once, as the card's subtitle. The reference repeats "Lower
     * index = lower cost" under each of the three scales; the metric's own index base says
     * it already, and three copies of one sentence inside one section is the redundancy
     * this screen keeps removing.
     */
    await expect(
      card.getByText("Indexed: Tier 1 = 100. Lower is cheaper."),
    ).toBeVisible();
  });

  test("draws the location comparison as a table on one shared maximum", async ({
    page,
  }) => {
    await openFinance(page);
    const card = page.locator("section#metric-fin-india-vs-hubs");
    const table = card.getByRole("table");
    await expect(table).toBeVisible();

    /**
     * **A table rather than a plot per row**, which is the composition's ask and has an
     * argument behind it: four functions against five locations is read DOWN a column as
     * much as along a row, and a row of dots cannot be read down.
     */
    for (const column of [
      "Function",
      "India",
      "Philippines",
      "Mexico",
      "Poland",
      "United States",
    ]) {
      await expect(table.getByRole("columnheader", { name: column })).toBeVisible();
    }
    for (const row of ["Technology", "Operations", "Human resources", "Finance"]) {
      await expect(table.getByRole("rowheader", { name: row })).toBeVisible();
    }
    // Every cell states its exact index, so nothing is encoded only by length.
    await expect(table.getByRole("row", { name: /Finance 100 120 158 182 340/ })).toHaveCount(
      1,
    );

    /**
     * **NO ROW IS EMPHASISED, and this assertion is the reversal of the one it replaces.**
     * The reader's own function — Finance, on this tab — was filled a step, which was the
     * one place this screen read an admin-editable string. Removed at ANSR's request, so
     * every row is on the card's own ground and the only fill left in the table is the
     * India column's.
     */
    const grounds = await table.locator("tbody tr").evaluateAll((rows) =>
      rows.map((row) => ({
        label: (row.querySelector("th")?.textContent ?? "").trim(),
        ground: getComputedStyle(row).backgroundColor,
      })),
    );
    for (const row of grounds) {
      expect(row.ground, row.label).toBe("rgba(0, 0, 0, 0)");
    }

    /**
     * **AND NO BARS, which is the other half of the same instruction.** Each non-base cell
     * drew a bare teal bar beside its figure, all sixteen against the grid's own largest
     * cell. They were this card's only encoding of magnitude, so what is asserted here is
     * that twenty numbers are now compared as numbers — and that the removal took the
     * whole mark rather than leaving an empty track behind.
     */
    await expect(table.locator("td span[aria-hidden]")).toHaveCount(0);

    /**
     * The India column keeps its fill and its ink, which is what the instruction asked to
     * KEEP: it is the base every other figure is read against, so it is the one thing in
     * the grid still marked.
     */
    const anchor = await table
      .locator("tbody tr td:first-of-type")
      .evaluateAll((cells) =>
        cells.map((cell) => getComputedStyle(cell).backgroundColor),
      );
    expect(anchor).toHaveLength(4);
    for (const ground of anchor) expect(ground).not.toBe("rgba(0, 0, 0, 0)");

    // The index base and its direction, as the card's subtitle rather than a foot note.
    await expect(
      card.getByText("Indexed: India = 100. Higher is more expensive."),
    ).toBeVisible();
  });

  test("draws none of the four asks that have nothing behind them", async ({
    page,
  }) => {
    await openFinance(page);
    const text = await band(page, "function-metrics").innerText();

    /**
     * **Three refusals and one instruction, each asserted absent.** The reasoning is in
     * `copy.ts`'s finance block and on `handoff.md`'s blocked list; what matters here is
     * that none of them can come back by accident, and that a future pass which restores
     * one has to change this test to do it.
     */
    // A peer cost advantage of "30–40% lower". No such figure exists in this repository.
    expect(text).not.toMatch(/30\s*[–-]\s*40/);
    expect(text).not.toMatch(/vs global peers/i);
    // A second cost split — people, facilities, technology, business services, other.
    expect(text).not.toMatch(/cost structure breakdown/i);
    expect(text).not.toMatch(/people cost/i);
    expect(text).not.toMatch(/business services/i);
    // Three columns of unsourced bullets.
    expect(text).not.toMatch(/deep dive/i);
    expect(text).not.toMatch(/what'?s cheaper in india/i);
    // And the composition's own "Book a conversation" card, which this tab does not
    // draw. **The tool has a close again, so the assertion is scoped to the TAB rather
    // than to the page** — which is what it always meant, and what the three assertions
    // above it are already scoped to. The screen's one call to action is the shared
    // close below the tabs, asserted in its own test; what is refused here is a second
    // one inside the finance tab, where the reference put it.
    expect(text).not.toMatch(/book a conversation/i);
    expect(text).not.toMatch(/closer look/i);
    await expect(band(page, "function-metrics").getByRole("link")).toHaveCount(0);
    /**
     * **No selector either.** The reference puts "View by: Total operating cost" at the
     * table's upper right; there is one view of this metric, so the control would have
     * one option and nowhere to go — the same defect as HR's missing "Update roles &
     * cities" button. The whole public surface still has no `<select>`.
     */
    expect(await page.locator("select").count()).toBe(0);
  });

  test("keeps the composed tab clear of a horizontal scrollbar", async ({ page }) => {
    /**
     * The comparison table is the widest object on the screen and is the one thing here
     * that could break this: it carries a minimum width and scrolls INSIDE its own
     * focusable container, because the tool is framed and does not own the document's
     * horizontal scroll.
     */
    for (const width of [1440, 1024, 768, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await openFinance(page);
      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(scrollWidth, `at ${width}`).toBeLessThanOrEqual(clientWidth + 1);
    }
    await page.setViewportSize({ width: 1280, height: 900 });
  });
});
