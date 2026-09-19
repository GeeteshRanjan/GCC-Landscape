import { expect, test } from "@playwright/test";

import { DEFAULT_PUBLIC_COPY as COPY } from "@/data/schema";

import { choose, chooseSubIndustry } from "./helpers";

/**
 * The sub-industry input, against a real production build.
 *
 * Numbered `0-` so it lands in the `public` project and runs before
 * `5-publish.spec.ts` rewrites the fixture dataset — the counts asserted here are
 * the seeded ones. A spec numbered outside every project's `testMatch` silently
 * never runs; see playwright.config.ts.
 *
 * **It is no longer a field of its own.** Sub-industries are a second level inside
 * the industry dropdown, so choosing one answers both questions in a single act.
 * What that changed for this spec: there is no disabled state to assert and no live
 * region announcing that a control became usable, because there is no control to
 * enable — the level is simply not there until the industry it belongs to is opened.
 *
 * **And that second level is a CASCADE now, not an indent.** Pressing an industry
 * commits it and opens a pane beside the list rather than expanding rows inside it,
 * so two things this spec asserts moved: there is no expander zone to press, and the
 * child rows are not inside the `tree` element — the pane is `aria-owns`-ed by its
 * parent row instead, because a cascade puts the child list in a different box.
 * `aria-expanded` on the parent row is still the state, and is still where the
 * relationship is asserted.
 *
 * What only a browser can cover, and therefore what is still here: the nesting being
 * real (an industry's own sub-industries and nobody else's), a sub-industry setting
 * its parent industry with it, switching industry dropping a selection made under the
 * old one, and the peer set actually changing. The scoring itself is unit-tested in
 * tests/unit/similarity.
 */

const INDUSTRY = "Industry";

async function chooseIndustry(page: import("@playwright/test").Page, industry: string) {
  await choose(page, INDUSTRY, industry);
}

async function submit(
  page: import("@playwright/test").Page,
  options: { industry?: string; businessType?: string } = {},
) {
  if (options.industry && options.businessType) {
    await chooseSubIndustry(page, options.industry, options.businessType);
  } else if (options.industry) {
    // **An industry on its own, which is the default path and had no caller until
    // now.** The helper used to answer the industry only as a side effect of picking a
    // sub-industry, so passing `industry` alone silently left the field blank and the
    // form refused to submit. `choose` takes the cascade's `All of {industry}` exit,
    // which is what keeps the broad answer.
    await chooseIndustry(page, options.industry);
  }
  await choose(page, "Annual revenue", "Above $20 Bn");
  await choose(page, "Headquarters", "USA");
  await page.getByRole("button", { name: "Build my GCC Landscape" }).click();
}

test("cascades each industry's own sub-industries, and nobody else's", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByLabel(INDUSTRY).click();
  const tree = page.getByRole("tree");
  await expect(tree).toBeVisible();

  // Closed at rest, so the panel opens as a list of industries rather than as 182
  // rows. `aria-expanded` is the state, and it is on the row rather than on a button
  // inside it — interactive descendants of a `treeitem` are invalid ARIA.
  const retail = tree.getByRole("treeitem", { name: "Retail", exact: true }).first();
  await expect(retail).toHaveAttribute("aria-expanded", "false");
  await expect(
    page.getByRole("treeitem", { name: "Apparel & Footwear Brand", exact: true }),
  ).toHaveCount(0);

  await retail.click();
  await expect(retail).toHaveAttribute("aria-expanded", "true");
  // The pane is a separate box, so the row that opened it is the only place the
  // relationship lives. Losing this attribute would leave a screen-reader user with
  // a pane that belongs to nothing.
  await expect(retail).toHaveAttribute("aria-owns", /\S/);
  // Its leading row is the way out that keeps the broad answer. Without it, choosing
  // "all of Retail" would have no target at all — the press that opened the pane
  // does not close the panel.
  await expect(page.getByRole("treeitem", { name: "All of Retail" })).toBeVisible();

  // Retail's own sub-industry, at the second level, and NOT inside the tree element:
  // `aria-owns` carries the containment because the cascade cannot. A BFSI
  // sub-industry cannot be here — the nesting is per industry, and a company may
  // only carry a business type scoped to its own.
  const sub = page
    .getByRole("treeitem", { name: "Apparel & Footwear Brand", exact: true })
    .first();
  await expect(sub).toBeVisible();
  await expect(sub).toHaveAttribute("aria-level", "2");
  await expect(
    page.getByRole("treeitem", { name: "Retail & Commercial Banking", exact: true }),
  ).toHaveCount(0);
});

/**
 * The pane does not grow the list it came out of.
 *
 * This is the reason the second level stopped being an indent. Expanding nine rows
 * inside a popup that already overhangs the form card ran it a third of the way into
 * the customer-logo strip below, and changed the panel's height under the pointer
 * mid-interaction. A fixed height whatever is open is the property that fixed it, and
 * it is the sort of thing that quietly regresses the next time somebody reaches for
 * the simpler nesting.
 */
test("opening a cascade does not change the panel's height", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel(INDUSTRY).click();

  /**
   * **Measured on the PANEL, where it used to be measured on the tree.** The tree
   * element is now the multi-column region inside the first pane, and its own height
   * genuinely does change when a branch opens — the list re-flows from two columns into
   * one to give the pane the trailing half, so the same rows stack taller. That reflow
   * is the design (see `.gcc-select-cols--single`), and asserting against it would be
   * asserting the list never gets columns.
   *
   * The panel is what the invariant was always about: a popup overhanging the form card
   * must not grow further into the customer-logo strip, and its height must not change
   * under the pointer mid-interaction. The fixed-height body is what guarantees it, and
   * this is the assertion that catches the next reach for the simpler nesting.
   */
  const panel = page.locator(".gcc-select-panel");
  // `clientHeight`, not a bounding box. The panel arrives on a 180ms entrance that
  // scales it from 0.98, so a box measured on open is short by a few pixels and the
  // comparison fails on the animation rather than on the layout. Layout size is what
  // this test is about.
  const height = () => panel.evaluate((node) => node.clientHeight);

  const before = await height();
  await page.getByRole("treeitem", { name: "Retail", exact: true }).first().click();
  await expect(page.getByRole("treeitem", { name: "All of Retail" })).toBeVisible();

  expect(await height()).toBe(before);
});

/**
 * The pane's two shapes, and the one way this geometry can break the page.
 *
 * It opens on the TRAILING side — parent left, child right — and it now does so INSIDE
 * the panel, which itself widens to the whole form grid from `md`. The two panes split
 * that box in half. Nothing is positioned outside the panel any more, so the pane's
 * width is derived from the field's rather than from a table of room measurements: the
 * threshold is `md`, where the form grid gains its second column, and below it the pane
 * covers the first pane as a drill-in because half a field's width is unusable.
 *
 * The failure mode being guarded is still the same one and it is still worth guarding at
 * every width: anything in this popup that overruns the window gives the framed document
 * a horizontal scrollbar, which the parent page cannot fix because it sizes the frame's
 * height and not its width. Both shapes are asserted here because nothing else in the
 * suite runs the form at more than one width.
 */
test.describe("the cascade fits the width it is given", () => {
  const widths = [390, 1024, 1280, 1366, 1440, 1536, 1920] as const;

  for (const width of widths) {
    test(`adds no horizontal scrolling at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/");
      await page.getByLabel(INDUSTRY).click();
      await page
        .getByRole("treeitem", { name: "Retail", exact: true })
        .first()
        .click();
      await expect(page.getByRole("treeitem", { name: "All of Retail" })).toBeVisible();

      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
    });
  }

  test("drills in below the threshold, and sits beside the panel above it", async ({
    page,
  }) => {
    /**
     * Both the panel and the pane arrive on an entrance — the panel scales from 0.98
     * and the pane slides 4px — so a box measured on open is a few pixels off in a
     * direction that depends on the frame. Waiting for the finite animations settles
     * it; the marquee is excluded because an infinite one never finishes and would
     * hang here.
     */
    const settle = () =>
      page.evaluate(() =>
        Promise.all(
          document
            .getAnimations()
            .filter(
              (animation) =>
                animation.effect?.getComputedTiming().iterations !== Infinity,
            )
            .map((animation) => animation.finished),
        ).then(() => undefined),
      );

    const edges = async () => {
      await settle();
      const pane = await page
        .getByRole("group", { name: "Retail" })
        .evaluate((node) => node.closest("div[class*=pane]")!.getBoundingClientRect().x);
      const panel = await page
        .getByRole("tree")
        .evaluate((node) => node.getBoundingClientRect());
      return { pane, listStart: panel.x, listEnd: panel.right };
    };

    const open = async (width: number) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/");
      await page.getByLabel(INDUSTRY).click();
      await page.getByRole("treeitem", { name: "Retail", exact: true }).first().click();
      await expect(page.getByRole("treeitem", { name: "All of Retail" })).toBeVisible();
    };

    // Narrow: the pane covers the list it came out of, so it starts where that list
    // starts. It covers the BODY rather than the whole panel, so the filter row above it
    // stays reachable — a visitor drilled into a branch can still narrow the list.
    // Only below `md`, which is a phone: that is where half the panel is unusable.
    for (const width of [390, 720]) {
      await open(width);
      const narrow = await edges();
      expect(narrow.pane, `${width}px should drill in`).toBe(narrow.listStart);
    }

    // Wide: it clears the first pane's trailing edge entirely, which is the whole claim
    // of opening on the trailing side. Asserted from `md` up, including at the two
    // laptop widths that used to drill in — the widened panel is what gave them room.
    for (const width of [768, 1280, 1366, 1440]) {
      await open(width);
      const wide = await edges();
      expect(wide.pane, `${width}px should sit beside the panel`).toBeGreaterThanOrEqual(
        wide.listEnd,
      );
    }
  });

  test("the drill-in offers a way back that a screen reader can reach", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 900 });
    await page.goto("/");
    await page.getByLabel(INDUSTRY).click();
    await page.getByRole("treeitem", { name: "Retail", exact: true }).first().click();

    // A real button, not a decorated div. On a touch screen reader it is the only exit
    // from the drill-in — ArrowLeft is not available there.
    const back = page.getByRole("button", { name: /^Close Retail sub-industries$/ });
    await expect(back).toBeVisible();
    await back.click();
    await expect(page.getByRole("treeitem", { name: "All of Retail" })).toHaveCount(0);
    // And the industry it committed on the way in is still the answer. Located by ROLE
    // rather than by label: the open tree is `aria-label`led "Choose your industry",
    // which `getByLabel("Industry")` also matches, so a label lookup is ambiguous for
    // as long as the panel is open.
    await expect(page.getByRole("combobox", { name: INDUSTRY })).toHaveText("Retail");
  });
});

test("choosing a sub-industry answers the industry with it", async ({ page }) => {
  await page.goto("/");

  await chooseSubIndustry(page, "Retail", "Apparel & Footwear Brand");

  /*
    A custom combobox carries its answer as the trigger's LABEL, not a `value`
    property — a button has none, so `toHaveValue` would silently compare against
    undefined and pass whatever the control did.

    Both halves are shown, and that is the assertion rather than a formatting
    detail: the field is labelled "Industry", so a trigger reading only "Apparel &
    footwear brand" would leave the industry answered and invisible.
  */
  const control = page.getByLabel(INDUSTRY);
  await expect(control).toContainText("Retail");
  await expect(control).toContainText("Apparel & Footwear Brand");
});

test("switching industry drops a sub-industry chosen under the old one", async ({
  page,
}) => {
  await page.goto("/");

  await chooseSubIndustry(page, "Retail", "Apparel & Footwear Brand");
  const control = page.getByLabel(INDUSTRY);
  await expect(control).toContainText("Apparel & Footwear Brand");

  // Retail's sub-industries cannot exist under another industry, so the selection has
  // to go. Left in place the server rejects it — correctly, since ignoring it would
  // return an industry-wide peer set while the visitor believes they narrowed it.
  await chooseIndustry(page, "BFSI");
  await expect(control).toHaveText("BFSI");
});

test("skipping it returns the same peers as before the field existed", async ({
  page,
}) => {
  await page.goto("/");
  await chooseIndustry(page, "Retail");
  await submit(page);

  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  // The industry-level split, not the business-type one: two segments rather than
  // three, because there is no sub-industry to draw a middle band from.
  const industry = page.locator("#industry");
  /**
   * **The lead no longer restates the industry count, so this asserts the SENTENCE
   * rather than the figure.** It used to read "189 other Retail companies run a centre
   * in India" — the count's second of four appearances on the surface, and "other" was
   * a question the page never answered. The lead now describes the three layers the
   * chart draws and states no quantity; the chart below is where the figure lives,
   * because that is the only place it has a denominator.
   */
  /**
   * **The lead is GONE from the render, at ANSR's request, and the absence is asserted so
   * nobody restores half of it.** It described the three layers the chart draws, in the
   * order it draws them — which the chart's own labels already say. `industrySentence` is
   * still exported and still unit-tested on both branches, so restoring it is one prop.
   */
  await expect(
    industry.getByText(/Every GCC in India, with Retail inside it/),
  ).toHaveCount(0);
  /**
   * **The containment chart's three layers, and with no sub-industry the innermost one
   * is the comparison set rather than a cohort.** The chart substitutes it deliberately
   * — two layers is the shape it looks worst in and says least — so what distinguishes
   * this branch from the one below is WHICH third layer is drawn, not how many there
   * are.
   */
  await expect(industry.getByText("GCCs across India")).toBeVisible();
  await expect(industry.getByText("shown above")).toBeVisible();
  await expect(industry.getByText("in your sub-industry")).toHaveCount(0);
});

test("choosing it narrows the peer set to the same sub-industry", async ({
  page,
}) => {
  await page.goto("/");
  await submit(page, { industry: "Retail", businessType: "Apparel & Footwear Brand" });

  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  /**
   * **The answer row echoes the sub-industry, which is the one answer it used to leave
   * out.** The pill is conditional on a field the visitor may skip — both result screens'
   * own specs assert its absence for an industry-only answer — and this is the present
   * case. It matters more than the other three: the sub-industry is the primary ordering
   * signal behind the five cards below, so a visitor who narrowed and then saw only
   * "Retail" echoed had no way to tell whether the narrowing had been read.
   *
   * The LABEL is read off the copy key, being admin-editable. The VALUE is the business
   * type's own name, which is dataset content and is what the trigger showed.
   */
  const profile = page.getByRole("group", { name: /Your profile/ });
  await expect(profile.getByText(COPY.pillSubIndustry, { exact: true })).toBeVisible();
  await expect(
    profile.getByText("Apparel & Footwear Brand", { exact: true }),
  ).toBeVisible();

  // The three-level split replaces the two-level one: the named peers, the rest of
  // the population they were drawn from, then the rest of the industry. That middle
  // segment is what turns a thin peer set into evidence.
  const industry = page.locator("#industry");
  /**
   * The third nested step appears: the named peers, the cohort they were drawn from,
   * then the industry. That middle step is what turns a thin peer set into evidence.
   *
   * Two matches, not one, and both are wanted — the step's own label and the
   * provenance sentence under the chart saying which of the two numbers the five came
   * out of. `.first()` names the chart's, since that is the subject here.
   */
  await expect(industry.getByText("in your sub-industry")).toBeVisible();
  // And the comparison-set layer gives way to it: three layers, not four.
  await expect(industry.getByText("shown above")).toHaveCount(0);
  /**
   * **The provenance sentence under the chart is gone**, at ANSR's request — "The 5
   * companies shown above were selected from the 73 in a comparable sub-industry, not
   * from the industry as a whole." The chart's own three labelled layers are what say
   * it now, which is why the substitution above matters: the relationship is only
   * visible if the third layer is drawn.
   */
  await expect(
    industry.getByText(/selected from the \d+ in a comparable sub-industry/),
  ).toHaveCount(0);
  // **The method line is gone from the render, at ANSR's request.** `peerLead` was the
  // block's only statement of method — which sub-industry was matched on, and that a
  // closer business outranks a closer band. What still proves the sub-industry was used
  // is the chart's own third layer, asserted just above, plus the unit suite's ordering
  // tests. The sentence is asserted absent so it cannot come back by accident.
  await expect(page.getByText(/matched on your sub-industry/i)).toHaveCount(0);

  /*
    The original complaint, asserted directly: a home-improvement chain is not a
    peer for an apparel brand. Lowe's is in Retail and in this exact revenue band,
    so under band-only matching it is a top peer.

    Scoped to the PEER LIST, not the page. Lowe's still appears further down in the
    largest-in-industry panel, and that is correct — that block is the aspirational
    anchor and is deliberately industry-wide, so a page-wide assertion would fail
    on intended behaviour and then get "fixed" by weakening the wrong thing.
  */
  /*
    The peer block is a LIST of five cards now, not a table — so the count is on
    `listitem` and each company name is an `h3`. A level-4 heading here would mean the
    lead card came back; a `rowheader` would mean the table did.
  */
  const peers = page.locator("#peers");
  await expect(peers.getByRole("heading", { level: 4 })).toHaveCount(0);
  await expect(peers.getByRole("rowheader")).toHaveCount(0);
  await expect(peers.getByRole("listitem")).toHaveCount(5);
  await expect(peers.getByRole("heading", { level: 3, name: /Lowe's/ })).toHaveCount(0);
});

/**
 * The broadened-set call-out: when the visitor's own answers cannot fill five and the
 * set reaches past them — a different line of business, a different size, or both — one
 * line names the axis that widened.
 *
 * Cybersecurity in Software & Internet is thin enough at the top band to reach on BOTH
 * axes, so the line names them together; apparel fills the set from itself and stays
 * silent. The engine logic and the per-axis wording are unit-tested across every
 * sub-industry and band in `screen1.test.ts`; this covers only that the sentence reaches
 * the render and is not confused with the thin-set line (which fires on a SHORT set).
 */
test("calls out a set that reached past the visitor's answers, and only then", async ({
  page,
}) => {
  await page.goto("/");
  await submit(page, {
    industry: "Software & Internet",
    businessType: "Cybersecurity",
  });

  const peers = page.locator("#peers");
  await expect(peers).toBeVisible();
  await expect(peers.getByRole("listitem")).toHaveCount(5);
  /**
   * **Read off the copy KEY, never typed** — the wording is `peersBroadenedNote`, an
   * admin-editable field, and this spec is the reason that convention exists: it used
   * to assert `/extend beyond your (sub-industry|revenue band)/`, which is the wording
   * from before the line gave up naming its axis. A full set can widen on sub-industry
   * AND revenue band at once, so naming both piled up; the sentence is fixed now and
   * names neither, which is also why there is nothing per-axis left to tolerate here.
   * The fixture publishes the shipped defaults, so the key resolves to what renders.
   */
  await expect(peers.getByText(COPY.peersBroadenedNote)).toBeVisible();

  // A well-populated sub-industry fills the set from itself and within band, so the
  // call-out is absent — the line appears only when required.
  await page.goto("/");
  await submit(page, { industry: "Retail", businessType: "Apparel & Footwear Brand" });
  await expect(page.locator("#peers").getByRole("listitem")).toHaveCount(5);
  await expect(page.getByText(COPY.peersBroadenedNote)).toHaveCount(0);
});

/**
 * The peer block's lead must describe the set under it.
 *
 * This is the check that was missing. The lead was a hardcoded "Same industry,
 * closest revenue band, and companies from your own market first" while the method
 * line three lines below it said revenue band is a preference and a closer business
 * beats a closer size. Both sentences rendered on the same card for months, and
 * nothing asserted either — it was found by hand on production.
 *
 * **The method line is gone now**, removed at ANSR's request along with the
 * headquarters column it partly existed to explain, so the lead is the only statement
 * of method on the block. That makes this test more load-bearing rather than less:
 * there is no second sentence to catch a wrong one.
 *
 * The old lead is also demonstrably false rather than merely stale: this exact peer
 * set puts H&M (Sweden) and Adidas (Germany) above GAP (USA) for a US visitor, so
 * own-market-first is not what happened.
 */
test("the peer block's lead describes the set under it", async ({ page }) => {
  await page.goto("/");
  await submit(page, { industry: "Retail", businessType: "Apparel & Footwear Brand" });

  const peers = page.locator("#peers");
  await expect(peers).toBeVisible();
  const block = (await peers.innerText()).replace(/\s+/g, " ");

  // **No lead at all now, at ANSR's request**, so what this test still holds is that the
  // block does not make any of the false claims the lead used to be the risk of. The
  // sentence itself is unit-tested in `screen1.test.ts`, which is where its two branches
  // can be varied without driving a browser.
  expect(block).not.toMatch(/Matched on your sub-industry/i);
  // And the footnote it used to agree with really is gone rather than moved.
  expect(block).not.toMatch(/preferences rather than filters/i);
  expect(block).not.toMatch(/They all share/i);

  // The two claims the old lead made, which the set contradicts.
  expect(block).not.toMatch(/closest revenue band/i);
  expect(block).not.toMatch(/own market first/i);

  /**
   * **The "business before size" ordering claim moved to the unit suite with the sentence
   * it was about.** It was asserted here as an ORDER within the rendered lead — business
   * mentioned before the second key — and there is no rendered lead to assert it in.
   * `screen1.test.ts` holds it on both branches, including the named counter-example that
   * makes the longer sentence fail rather than drift.
   *
   * What this spec still owns is the part only a browser can see: that the BLOCK makes no
   * claim the cards contradict. Every `not.toMatch` above is that.
   */
});

/**
 * **The same lead on the path where no sub-industry was given, which is the path most
 * visitors take and the one that had no spec at all.**
 *
 * That is how the false sentence survived: the fix reached the sub-industry branch,
 * the test above was written against it, and the default branch went on returning
 * "Same industry, closest revenue band, and companies from your own market first."
 * under a comment claiming it was accurate again. It was not — headquarters is a
 * tiebreak beneath the score and cannot put anything first, and the comparison card
 * stopped showing headquarters at all, so a visitor could not check the claim.
 *
 * **Asserted against the rendered text rather than through `expectBand`**, because here
 * the copy IS the subject. `band()` is for locating a section whose wording is
 * incidental to what is being tested; this test has nothing else to test.
 */
test("the peer block's lead is true with no sub-industry given", async ({ page }) => {
  await page.goto("/");
  // No `businessType`, so the industry keeps its broad answer and business similarity
  // is zero for every company — the score reduces to band proximity alone.
  await submit(page, { industry: "Retail" });

  const peers = page.locator("#peers");
  await expect(peers).toBeVisible();
  const block = (await peers.innerText()).replace(/\s+/g, " ");

  // **"India GCCs", not "companies".** Every card in the set runs a centre in India by
  // construction, and nothing on the block said so once the heading dropped its place
  // phrase — so a reader met five company names and a headcount and had to infer the
  // subject. The ORDERING claim is unchanged: closest revenue band first, one key.
  expect(block).not.toContain(
    "India GCCs in your industry, closest to your revenue band first.",
  );

  // The sentence that was there, and the claim inside it that could never come true.
  expect(block).not.toMatch(/own market first/i);
  expect(block).not.toMatch(/\bmarket\b/i);
  // No second key either. Size is what a reader would assume next and the HQ tiebreak
  // makes it false — see the unit suite's named counter-example.
  expect(block).not.toMatch(/largest India centres/i);
});

test("the tag vocabulary never reaches the browser", async ({ page }) => {
  await page.goto("/");
  await submit(page, { industry: "Retail", businessType: "Apparel & Footwear Brand" });

  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  // Tags are an internal filing system, exactly like Screen 2's lenses. The copy
  // renders them through a phrase table, so a raw slug on the page means a tag was
  // added without a phrase — which would read as a bug to a CIO.
  const body = (await page.locator("body").textContent()) ?? "";
  for (const slug of [
    "brand-owner",
    "supply-chain-heavy",
    "fashion-cycle",
    "physical-stores",
    "b2c",
  ]) {
    expect(body).not.toContain(slug);
  }
});
