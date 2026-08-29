import { expect, test } from "@playwright/test";

import { band, choose, expectBand } from "./helpers";

/**
 * Screen 1, the public Peer View, against a real production build.
 *
 * Numbered `0-` and matched by its own `public` project in playwright.config.ts.
 * The numbering is load-bearing: the config's `admin` project matches a character
 * class, so a spec numbered outside every project's pattern lands in no project
 * and silently never runs. `0-` also puts it before `5-publish`, which mutates the
 * fixture dataset, so the figures asserted here are the seeded ones.
 *
 * What only a browser can cover, and therefore what is here: the ask-to-answer
 * state change (which is component state, not a route, because the tool is
 * iframed), focus moving to the new heading, the form remembering its answers on
 * the way back, and — the one that matters most — that the dataset does not reach
 * the browser. The view model's own logic is unit-tested in tests/unit/screen1.
 */

/** Distinctive, present in the dataset, and in neither industry used below. */
const LEAK_CANARY = "Walmart";

async function ask(
  page: import("@playwright/test").Page,
  options: {
    industry: string;
    revenueBand: string;
    hqCountry?: string;
    companyName?: string;
  },
): Promise<void> {
  if (options.companyName) {
    await page.getByLabel(/^Company name/).fill(options.companyName);
  }
  await choose(page, "Industry", options.industry);
  await choose(page, "Annual revenue", options.revenueBand);
  await choose(page, "Headquarters", options.hqCountry ?? "USA");
  /**
   * No India-presence step. The question was removed at ANSR's request and the
   * FIELD was not — `gccStatus` still reaches the server, as a constant, and still
   * frames the whole answer. See `ASSUMED_GCC_STATUS` in `input-panel.tsx`.
   *
   * Which means the answer state is now always framed as "evaluating", and the
   * assertions below that read the heading depend on that. If the control ever
   * comes back, this helper regains a parameter and those headings become
   * variable again.
   */
  await page.getByRole("button", { name: SUBMIT }).click();
}

/**
 * The submit label, named once. Three tests press this button, and a copy change
 * that had to be made in three places is a copy change that gets made in two.
 */
const SUBMIT = "See my results";

test.describe("the ask", () => {
  test("offers exactly the four controls, and asks for no revenue figure", async ({
    page,
  }) => {
    await page.goto("/");

    // Located by id, not by heading text — the same reasoning as `band()` in
    // helpers.ts. This test's subject is which inputs exist, so coupling it to the
    // headline's wording makes a copy pass break an assertion about something
    // else. The headline's own words are asserted once, on their own, below.
    await expect(page.locator("h1#ask-title")).toBeVisible();

    await expect(page.getByLabel(/^Company name/)).toBeVisible();
    await expect(page.getByLabel("Industry")).toBeVisible();
    // **No sub-industry control, and its absence is asserted.** The field still
    // exists on `PeerViewInput`; it is answered inside the industry dropdown, as a
    // pane that cascades out of the industry — one act instead of two. A separate
    // field reappearing here means the merge was undone without deciding to. Its own
    // behaviour is covered in `0-business-type.spec.ts`.
    expect(await page.getByLabel(/^(Sub-industry|Line of business)/).count()).toBe(0);
    await expect(page.getByLabel("Annual revenue")).toBeVisible();
    await expect(page.getByLabel("Headquarters")).toBeVisible();
    // **No India-presence control, and its absence is asserted.** The question was
    // removed at ANSR's request; the field behind it was kept and is supplied as a
    // constant. A radio group reappearing here means someone restored the control
    // without deciding to.
    expect(await page.locator("form input[type='radio']").count()).toBe(0);

    /*
      Four controls, and no fifth: a field added without a consumer should fail here
      rather than ship silently.

      Counted as one text input plus three comboboxes, because the three dropdowns
      are a custom listbox rather than `<select>` — see `select-field.tsx`. Counting
      `form select` would now find zero and the total would pass at 1, which is the
      way this assertion would rot rather than fail.
    */
    expect(await page.locator("form input[type='text']").count()).toBe(1);
    expect(await page.locator("form [role='combobox']").count()).toBe(3);

    // Revenue is a band, never a figure — the data holds bands, so the input is a
    // chooser rather than anything that accepts a number. A text or number input
    // here would be the wrong question.
    await expect(page.getByLabel("Annual revenue")).toHaveAttribute(
      "role",
      "combobox",
    );
    expect(await page.locator("form input[type='number']").count()).toBe(0);

    // No lead capture anywhere in this codebase.
    expect(await page.locator('input[type="email"]').count()).toBe(0);
    expect(await page.locator('input[type="tel"]').count()).toBe(0);
  });

  test("never hints that an admin exists", async ({ page }) => {
    await page.goto("/");
    const html = await page.content();
    expect(html).not.toMatch(/\/admin/);
    expect(html.toLowerCase()).not.toMatch(/sign in|log in|login/);
  });

  /**
   * The entry point's own words, asserted as the subject rather than as a way to
   * find something else.
   *
   * The three negative assertions are each a line that shipped and was wrong:
   *
   *  - "Four answers. Twenty seconds." promised a length, above a form with six
   *    fields. A count on the page that disagrees with the thing under it is worse
   *    than no count.
   *  - "Nothing you enter is stored or sent to us" was false in the half that
   *    matters. The answers are sent, to a server action, because peer matching
   *    cannot happen in the browser without shipping the dataset there.
   *  - "(optional)" beside the company name talked visitors out of the one input
   *    that personalises every sentence of the result.
   */
  test("says what it is, once, and makes no claim it cannot keep", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(page.locator("h1#ask-title")).toHaveText("ANSR GCC Intelligence");
    // "ANSR" is set in the action orange, which is only legible against the top of
    // the gradient — 4.27:1 falling to 2.95:1 by 45% down the band. It is the
    // leading token, so it is always on the headline's first line and therefore
    // always legal; a highlight that drifted onto the second line would not be.
    await expect(page.locator("h1#ask-title .text-action")).toHaveText("ANSR");

    /**
     * The company count is asserted as "1,800+" and asserted NOT to be the exact
     * figure, which is the unusual half.
     *
     * ANSR asked for the rounded form, so the hero deliberately disagrees with
     * `companies.length`. That makes it the one number on the public screens that
     * `data:verify` cannot check — it is editable copy, not a total — so the
     * guard against someone "correcting" it to 1,834 lives here.
     */
    await expect(page.getByText("1,800+", { exact: false }).first()).toBeVisible();

    const text = (await page.locator("body").innerText()).toLowerCase();
    expect(text).not.toContain("1,834 global companies");
    expect(text).not.toContain("twenty seconds");
    expect(text).not.toContain("or sent to us");
    // The reassurance line was removed with the hero rework. It was true; it
    // narrated the tool's own integrity at the moment of submitting.
    expect(text).not.toContain("nothing is kept");

    // **Nothing on the form is marked optional now, and that is the honest state.**
    // The marker only ever belonged to line of business, which was a control
    // disabled until an industry was chosen — the label was what explained why it
    // could be left alone. It is a nested level inside the industry dropdown now,
    // where an unexplored second level needs no label to read as optional. Company
    // name deliberately never carried it: it personalises every sentence of the
    // result, and the marker talked visitors out of it.
    expect(
      await page.locator("form label", { hasText: "(optional)" }).count(),
    ).toBe(0);

    // The form card's own heading and the line under it, which ANSR supplied
    // verbatim. Asserted here rather than used to locate anything.
    await expect(
      page.getByRole("heading", { name: "Build your GCC intelligence view" }),
    ).toBeVisible();
    await expect(
      page.getByText(/Share your company details to identify relevant companies/),
    ).toBeVisible();
  });

  test("validates on submit and puts focus on the first problem", async ({
    page,
  }) => {
    await page.goto("/");

    const submit = page.getByRole("button", { name: SUBMIT });
    // Enabled before the form is valid: disabling it leaves a keyboard user with
    // no way to find out what is wrong.
    await expect(submit).toBeEnabled();
    await submit.click();

    await expect(page.getByText("Choose one to continue.").first()).toBeVisible();
    // First invalid control in DOM order is the industry select.
    await expect(page.getByLabel("Industry")).toBeFocused();

    // Still on the form; nothing was submitted.
    await expect(page.locator("h1#ask-title")).toBeVisible();
  });

  /**
   * The hero carries exactly two text elements and no control.
   *
   * It used to carry an outlined pill that moved the keyboard to the industry
   * select, which earned its place when the form was a full band below the fold.
   * The form now overlaps the hero, so its first field is already on screen and the
   * pill was a control that scrolled you to something you could see. The spec that
   * covered it is replaced by this one rather than deleted, so the removal stays a
   * decision instead of becoming an untested gap.
   *
   * The form's submit is the screen's only SUBMIT, which is also the brand's
   * one-orange-per-band rule holding: a second control in the hero would have had
   * to be either a second primary or a visibly weaker one.
   */
  test("the hero is two text elements and no control", async ({ page }) => {
    await page.goto("/");

    const hero = page.locator("h1#ask-title").locator("..");
    expect(await hero.locator("button, a").count()).toBe(0);

    /*
      One submit on the entry point, and it is the form's.

      Asserted on `type="submit"` rather than on a count of every `button`. The four
      dropdowns are custom listboxes whose triggers are buttons, so a bare count is
      now five and says nothing about primacy — which was the property this line was
      actually protecting.
    */
    const submits = page.locator("button[type='submit']");
    await expect(submits).toHaveCount(1);
    await expect(submits.first()).toHaveText(SUBMIT);

    // No eyebrow above the headline: the product label IS the headline, so a
    // kicker would have been the same words twice.
    expect(await page.locator("h1#ask-title ~ *, h1#ask-title").count()).toBe(2);
  });
});

/**
 * The three bands the entry point gained below the form: the pale-teal transition
 * the card sits on, the customer-logo strip, and the dark impact band.
 *
 * Located by id throughout, never by heading text — the same rule `helpers.ts`
 * states for the evidence bands, and the reason twenty specs broke once already.
 */
test.describe("the entry point's bands", () => {
  test("the form card overlaps the hero rather than sitting under it", async ({
    page,
  }) => {
    await page.goto("/");

    /**
     * The one geometric assertion on the public screens, and it earns its place:
     * the overlap is produced by a negative margin on the card, and a negative
     * margin on the first child of a section with no top padding COLLAPSES THROUGH
     * and moves the section itself instead. The rendered result is a card flush to
     * the boundary with no overlap at all, which looks exactly like the margin
     * being ignored and is invisible to every other check in this repo.
     *
     * Measured as a fraction rather than in pixels, because the card's height
     * depends on how the field labels wrap.
     */
    const geometry = await page.evaluate(() => {
      const hero = document.querySelector(".gcc-ground-hero");
      const card = document.querySelector("#ask [class*='rounded-']");
      if (!hero || !card) return null;
      const h = hero.getBoundingClientRect();
      const c = card.getBoundingClientRect();
      return { overlap: h.bottom - c.top, cardHeight: c.height };
    });
    expect(geometry).not.toBeNull();
    const { overlap, cardHeight } = geometry!;
    expect(overlap).toBeGreaterThan(0);
    // The brief asks for roughly the upper quarter to third of the card on the
    // hero. Bounded loosely at both ends: the point is that it is unmistakably an
    // overlap and unmistakably not most of the card.
    expect(overlap / cardHeight).toBeGreaterThan(0.15);
    expect(overlap / cardHeight).toBeLessThan(0.45);
  });

  test("the logo strip names its companies without claiming they used the tool", async ({
    page,
  }) => {
    await page.goto("/");

    // A region with an accessible name but no visible heading — the name is the
    // only thing making it a landmark, so losing it is losing the band's identity.
    const strip = page.locator("section#customers");
    await expect(strip).toHaveAttribute("aria-label", /worked with/i);

    // Ten marks, twice: the duplicate is what makes the loop seamless.
    await expect(strip.locator("img")).toHaveCount(20);
    // Only the first copy is announced. Ten company names read out twice is the
    // bug the `aria-hidden` on the second list prevents.
    await expect(strip.locator('img:not([alt=""])')).toHaveCount(10);

    // Every mark actually rendered. Six of the ten are SVGs that were served with
    // no intrinsic size once, and all six collapsed to 0x0 inside the capped flex
    // row — visible as an empty strip and caught by nothing else.
    const collapsed = await strip.locator("img").evaluateAll((imgs) =>
      imgs
        .filter((i) => i.getBoundingClientRect().width < 8)
        .map((i) => i.getAttribute("src")),
    );
    expect(collapsed).toEqual([]);

    const text = (await strip.innerText()).toLowerCase();
    expect(text).not.toContain("used");
    expect(text).not.toContain("this tool");
  });

  test("the impact band shows ANSR's figures and hides its ornament", async ({
    page,
  }) => {
    await page.goto("/");

    // `expectBand` asserts the landmark; `band` is the locator to read from. It
    // returns void deliberately — many specs call it for the assertion alone.
    await expectBand(page, "impact");
    const impact = band(page, "impact");
    for (const figure of ["225K+", "210+", "14M+", "20+", "$2.5B+"]) {
      await expect(impact.getByText(figure, { exact: true })).toBeVisible();
    }

    // Decorative, so out of the accessibility tree entirely. The ring layer is one
    // element wrapping two images, because two adjacent `.ansr-motif` siblings made
    // tokens.css re-position the second one into the flow.
    const rings = impact.locator(".gcc-impact-rings");
    await expect(rings).toHaveAttribute("aria-hidden", "true");
    await expect(rings.locator("img")).toHaveCount(2);

    // Nothing in the band announces itself as a heading below h2, so the document
    // outline stays hero -> band.
    await expect(impact.locator("h2")).toHaveCount(1);
  });

  test("the marquee moves without adding scroll or claiming the viewport", async ({
    page,
  }) => {
    await page.goto("/");

    // The whole reason this is a transform inside an overflow-hidden box: the
    // duplicated track is twice the band's width, and as real layout it would give
    // the document a horizontal scrollbar. The iframe spec asserts nothing is
    // fixed or sticky; this asserts the other half.
    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(scrollWidth).toBe(clientWidth);

    const animation = await page
      .locator(".gcc-marquee-track")
      .evaluate((el) => getComputedStyle(el).animationName);
    expect(animation).toBe("gcc-marquee");
  });

  test("under reduced motion the strip is scrollable instead of moving", async ({
    browser,
  }) => {
    // Continuous, unstoppable movement is exactly what this preference exists to
    // switch off, and unlike a 200ms entrance it never ends. tokens.css clamps
    // animation duration globally under `reduce`, which on an infinite loop leaves
    // the track flickering at frame rate rather than stopping it — so the animation
    // is opt-in inside `no-preference` and the fallback is a real scrollable row.
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto("/");

    const style = await page
      .locator("#customers .gcc-marquee")
      .evaluate((el) => getComputedStyle(el).overflowX);
    expect(style).toBe("auto");

    const animation = await page
      .locator(".gcc-marquee-track")
      .evaluate((el) => getComputedStyle(el).animationName);
    expect(animation).toBe("none");

    await context.close();
  });
});

test.describe("the answer", () => {
  test("shows every evidence card, the map, and the two views", async ({
    page,
  }) => {
    await page.goto("/");
    await ask(page, {
      industry: "BFSI",
      revenueBand: "Above $20 Bn",
      companyName: "Northwind Financial",
    });
    /**
     * **The `h1` is the PRODUCT, and that is a deliberate reversal.** It used to state
     * the finding — "5 relevant peers operate a GCC in India" — at display size in a
     * teal hero. The hero is gone: the teal area is now a compact context strip, so
     * there is nowhere for a headline and nothing on either result screen that would
     * carry a different one. The finding did not disappear; it moved into the live
     * region asserted below, which every reader is told once rather than only the ones
     * who scroll.
     */
    const heading = page.getByRole("heading", {
      level: 1,
      name: "ANSR. GCC Intelligence",
    });
    await expect(heading).toBeVisible();
    /**
     * **Focus lands on the TAB PANEL, not the heading.** With one shared product
     * heading, focusing it would announce nothing about a phase change — whereas a
     * panel named by its own tab announces "Peer landscape, tab panel". No navigation
     * happens between phases, so this is the only thing that tells a screen reader the
     * screen changed.
     */
    const panel = page.getByRole("tabpanel", { name: /Peer Landscape/ });
    await expect(panel).toBeFocused();
    // The finding, announced rather than headlined.
    await expect(page.getByRole("status")).toContainText(/5 relevant peers/);
    // Every card is a named region, so it is reachable by role. Located by id and
    // checked for a name, rather than located BY its name — the ids are the
    // structural contract and the headings are a copywriter's to change.
    for (const id of [
      "snapshot",
      "peers",
      "industry",
      "largest",
      "functions",
      "map",
      "scale",
    ]) {
      await expectBand(page, id);
    }
    /**
     * SNAPSHOT: four figures before any card begins, so the result is legible without
     * scrolling. **Every one is a property of the INDUSTRY**, not of the five-company
     * set our own matching chose — that was the previous strip's mistake, and a
     * statistic about the tool is not what a CIO is sizing.
     */
    const snapshot = band(page, "snapshot");
    await expect(snapshot.getByText("BFSI companies in India")).toBeVisible();
    await expect(snapshot.getByText("Typical centre size in BFSI")).toBeVisible();
    await expect(snapshot.getByText("Indian cities in play")).toBeVisible();
    await expect(
      snapshot.getByText("Where the industry concentrates"),
    ).toBeVisible();
    /**
     * **The method line under the mean headcount is gone**, at ANSR's request — it read
     * "Mean of reported employee bands, rounded". The figure is still a rounded mean of
     * band midpoints, so the honesty now rests on the word "Typical" alone; the unit
     * test carries what is left of the guard. Asserted absent so nobody restores half
     * of it.
     */
    await expect(
      snapshot.getByText(/Mean of reported employee bands/),
    ).toHaveCount(0);
    // And no cell reads "other than your own", which was the first cell's old note.
    await expect(snapshot.getByText(/other than your own/)).toHaveCount(0);
    // No cell is a placeholder. A missing figure is a stated "Data unavailable", and
    // BFSI is missing none of them.
    await expect(snapshot.getByText(/^(—|n\/a)$/i)).toHaveCount(0);
    await expect(snapshot.getByText("Data unavailable")).toHaveCount(0);
    // "GCCs" is the plural, everywhere. "GCC's" is a possessive and ANSR asked for it
    // never to appear.
    await expect(snapshot.getByText(/GCC's/)).toHaveCount(0);
    /**
     * **One table of every peer, and no "Why in this set?" column.** There was a
     * full-width lead card above the table carrying the closest match at display size;
     * it solved the entry-point problem and created a worse one, because the closest
     * match was then the one company in the set that could not be compared with
     * anything. Five rows, five row headers, one chip marking the ranking.
     */
    const peers = band(page, "peers");
    /**
     * **A packed grid of five cards, not a table, and each company name is an `h3`.**
     * The table was one pass and it was a spreadsheet dropped into a brand page — four
     * of its five columns held a chip list, a year and a band rather than anything a
     * reader ranks down a column, and no cell could carry a figure at a size worth
     * reading. A `rowheader` here means the table came back; a level-4 heading means the
     * lead card did.
     */
    await expect(peers.getByRole("table")).toHaveCount(0);
    await expect(peers.getByRole("rowheader")).toHaveCount(0);
    await expect(peers.getByRole("listitem")).toHaveCount(5);
    await expect(peers.getByRole("heading", { level: 3 })).toHaveCount(5);
    await expect(peers.getByRole("heading", { level: 4 })).toHaveCount(0);
    /**
     * **The "Closest comparison" chip is gone**, at ANSR's request. The ranking is still
     * visible and still never re-sorted: each card carries its position as a rank badge,
     * which is what the table's row order did for free.
     */
    await expect(peers.getByText("Closest comparison")).toHaveCount(0);
    /**
     * **Headquarters is off the block, and the field went with the column.** It was
     * shown for one pass and ANSR asked for it back off. Nothing about matching moved
     * either time — HQ is a sort preference and never a filter — so its absence cannot
     * change which companies come back. `toCard` no longer carries it, which is asserted
     * in the unit suite by an exhaustive key list.
     */
    await expect(peers.getByText("Headquarters")).toHaveCount(0);
    await expect(peers.getByText("USA")).toHaveCount(0);
    // What each card does carry, at a size worth reading.
    await expect(peers.getByText("India employees").first()).toBeVisible();
    await expect(peers.getByText("India locations").first()).toBeVisible();
    /**
     * **No "Why in this set?" column, and no similarity-reason column of any kind.**
     * Per-peer scores never leave `similarity.ts`, and what the set has in common is a
     * property of the SET — which the method line carries. A column of "similar scale"
     * labels would have been three words repeated five times.
     */
    await expect(
      peers.getByRole("columnheader", { name: /why|reason|match/i }),
    ).toHaveCount(0);
    await expect(peers.getByText(/similar scale/i)).toHaveCount(0);
    // Exact both sides of the count. "5 of many comparable companies" is in the
    // reference composition and is the one thing in it that must not ship.
    await expect(
      peers.getByText(/Showing 5 of \d+ comparable BFSI companies\./),
    ).toBeVisible();
    await expect(peers.getByText(/of many/)).toHaveCount(0);
    /**
     * **No bars on the comparison cards, so no axis note.** Both were removed at ANSR's
     * request and they go together: the note said "Bars compare these companies with
     * each other. Full width is X, at Y." Each card now carries its employee band as a
     * 24px figure, which is the reading the bar was a second copy of. The
     * largest-centres block keeps both, and asserts both below.
     */
    await expect(peers.getByText(/Full width is/)).toHaveCount(0);
    /**
     * **No company logo, initial, monogram or reserved empty box anywhere.** This
     * dataset holds no company marks, so every one of those would be either a
     * fabricated identity or a visible gap. Every row starts with the name.
     */
    await expect(peers.locator("img")).toHaveCount(0);
    await expect(peers.locator("svg[role='img']")).toHaveCount(0);
    /**
     * The industry context: three nested populations rather than one divided bar. The
     * figures do not sum to each other — 5 is inside a cohort which is inside the
     * industry — so a divided bar would invite the reader to add them.
     */
    const industry = band(page, "industry");
    await expect(industry.getByText(/BFSI companies run a centre/)).toBeVisible();
    /**
     * **Three overlapping layers on one z-stack**, in the shape ANSR asked for: the
     * national base, the industry inside it, and — with no sub-industry answered — the
     * comparison set inside that. The stepped tracks this replaced put a gap between
     * each row, and a gap is the one thing the eye reliably reads as separation, which
     * is the opposite of the claim.
     */
    await expect(industry.getByText("GCCs across India")).toBeVisible();
    await expect(industry.getByText("in BFSI")).toBeVisible();
    await expect(industry.getByText("shown above")).toBeVisible();
    // The labels of both shapes this replaced.
    await expect(industry.getByText("Total industry companies")).toHaveCount(0);
    await expect(industry.getByText("Named above")).toHaveCount(0);
    /**
     * **The provenance sentence under the chart is gone**, at ANSR's request — "The 5
     * companies shown above were selected from the N in a comparable sub-industry, not
     * from the industry as a whole." The chart's own labelled layers carry it.
     */
    await expect(industry.getByText(/selected from the/)).toHaveCount(0);
    // The largest card is a ranking, and an overlap with the comparison set is marked
    // rather than restated as a second identical card.
    const largest = band(page, "largest");
    // A stacked ranking of cards, not a table. Deliberately a different shape from the
    // comparison grid — two grids of company cards under two headings is what makes a
    // page read as padded.
    await expect(largest.getByRole("table")).toHaveCount(0);
    await expect(largest.getByRole("listitem")).toHaveCount(5);
    await expect(largest.getByText("Also in your peer set").first()).toBeVisible();
    /**
     * **The ordering is stated as the section's LEAD now, not as a footnote.** It read
     * "Ranges reflect reported employee bands, so nothing here is ranked by revenue." at
     * 12px under the block. We hold employee bands and never revenue, so it is the one
     * note in this pass that could not simply go — it moved to where it is read before
     * the ranking is.
     */
    await expect(largest.getByText(/never by revenue/)).toBeVisible();
    await expect(
      largest.getByText(/Ranges reflect reported employee bands/),
    ).toHaveCount(0);
    await expect(largest.getByText(/Full width is .+, at /)).toBeVisible();
    /**
     * The function card draws no share against any function, and that is the
     * assertion rather than an omission. There is no per-company function record in
     * this dataset, so the percentages in the reference composition would every one
     * have been invented.
     */
    const functions = band(page, "functions");
    await expect(functions.getByText("Technology and engineering")).toBeVisible();
    /**
     * **Both caveat paragraphs are gone**, at ANSR's request: "The general pattern
     * across India GCCs… Not a per-company breakdown of the companies above." and
     * "Ordered by how common each function is. We hold no per-company function
     * record…". They were true and load-bearing, so the job moved into the HEADING —
     * "Functions most GCCs run from India" is a claim about GCCs in general and cannot
     * be read as one about the five companies above.
     */
    await expect(
      functions.getByText(/no per-company function record/),
    ).toHaveCount(0);
    await expect(functions.getByText(/general pattern across India GCCs/)).toHaveCount(0);
    await expect(
      functions.getByRole("heading", { name: /most GCCs run from India/ }),
    ).toBeVisible();
    // The property those sentences protected, still asserted: no share is drawn or
    // stated against any function.
    await expect(functions.getByText(/%/)).toHaveCount(0);
    /**
     * The terminating evidence strip. Scale proof is national, the denominators are
     * drawn rather than left in a footnote, and both index names are written out in
     * full — "Fortune Global 500" and "Fortune 500" are different lists.
     */
    const scale = band(page, "scale");
    await expect(scale.getByText("181")).toBeVisible();
    /**
     * **The whole source-and-method block under the figures is gone**, at ANSR's
     * request: the audit disclaimer, the band-midpoint method line, the national
     * company count, the database credit and the machine-stamped as-at date.
     *
     * This is the one removal in the pass with no compensating line anywhere. The page
     * now carries no provenance at its foot at all — the professionals figure is a sum
     * of headcount BANDS and nothing says so, and there is no date telling a reader how
     * current any of it is. Asserted absent rather than left untested, so restoring one
     * of the five is a decision rather than an accident.
     */
    await expect(scale.getByText(/1,834 centres in all/)).toHaveCount(0);
    await expect(scale.getByText(/sum of band midpoints/)).toHaveCount(0);
    await expect(scale.getByText(/indicative rather than audited/)).toHaveCount(0);
    await expect(scale.getByText("Source: ANSR GCC Database")).toHaveCount(0);
    await expect(scale.getByText(/Data as at \w+ \d{4}/)).toHaveCount(0);
    // Every mark carries its figure in text.
    await expect(scale.getByText("36% of the list")).toBeVisible();
    await expect(
      scale.getByText("of the Fortune Global 500 companies have GCCs in India"),
    ).toBeVisible();
    await expect(
      scale.getByText("of the Forbes Global 2000 companies have GCCs in India"),
    ).toBeVisible();
    await expect(
      scale.getByText("people across those Fortune Global 500 GCCs in India"),
    ).toBeVisible();
    // The one thing the reference composition got wrong here: it labels the third
    // figure "Fortune 500", which is a different index from the one counted.
    await expect(scale.getByText(/Fortune 500 GCCs/)).toHaveCount(0);
    // The map is a real graphic with an accessible summary, paired with the
    // ranked list that carries the figures.
    const map = band(page, "map");
    await expect(map.getByRole("img", { name: /GCC locations plotted on India/ })).toBeVisible();
    /**
     * **The boundary attribution is gone from the page**, at ANSR's request — it read
     * "Boundaries as India states them, from Natural Earth's India point-of-view
     * dataset." The outline is still generated from exactly that dataset, so the claim
     * drawn has not changed; what changed is that the page no longer states whose claim
     * it is. **Invariant 8 in project.md required that line**, so this is the one
     * removal that needs ANSR's explicit sign-off rather than only their instruction.
     *
     * Two other lines went with it and are asserted absent here too: "Larger means more
     * GCCs" (the area encoding) and the company-presences denominator.
     */
    await expect(map.getByText(/Boundaries as India states them/)).toHaveCount(0);
    await expect(map.getByText(/Larger means more GCCs/)).toHaveCount(0);
    await expect(map.getByText(/Counted as company presences/)).toHaveCount(0);
    await expect(map.getByText(/cities in all/)).toHaveCount(0);
    // The legend still decodes the two mark shapes, which is what the graphic cannot
    // convey on its own.
    await expect(map.getByText("Established hub")).toBeVisible();
    await expect(map.getByText("Emerging location")).toBeVisible();
    // Scoped to the `dl`, not the band: every dot on the map also carries its city in
    // an SVG `<title>`, which is what the accessible summary is built from and is
    // `hidden` to a visibility assertion. That is the pairing working — the graphic
    // and the list say the same thing — so the locator has to name which one it means.
    await expect(map.locator("dl").getByText("Bengaluru").first()).toBeVisible();
    /**
     * **The page ends at the evidence strip.** No closing CTA card, no "Talk to ANSR"
     * panel, no review-profile action, no footer and no methodology links — all
     * removed at ANSR's request. Screen 2 still carries the conversation, which is
     * asserted in `0-screen2.spec.ts`.
     */
    await expect(page.getByRole("link", { name: /Talk to ANSR/ })).toHaveCount(0);
    await expect(page.locator("footer")).toHaveCount(0);
    // And the strip really is last: nothing follows it in the document.
    const trailing = await band(page, "scale").evaluate((el) => {
      // Non-rendering elements only. Next.js appends its own `<script>` tags after
      // the tree, so the assertion is about RENDERED content rather than about the
      // document ending — otherwise it fails on the framework rather than on the page.
      const ignore = new Set([
        "SCRIPT",
        "STYLE",
        "TEMPLATE",
        "LINK",
        "NOSCRIPT",
        "NEXT-ROUTE-ANNOUNCER",
      ]);
      const rest: string[] = [];
      let node: Element | null = el;
      while (node && node !== document.body) {
        let sibling = node.nextElementSibling;
        while (sibling) {
          if (
            !ignore.has(sibling.tagName) &&
            (sibling as HTMLElement).innerText?.trim()
          ) {
            rest.push(sibling.tagName);
          }
          sibling = sibling.nextElementSibling;
        }
        node = node.parentElement;
      }
      return rest;
    });
    expect(trailing).toEqual([]);
  });
  /**
   * **The two views are connected TABS at the head of the page, not a pill switch in
   * a hero and a button in the second-to-last band.** A visitor used to have to reach
   * the foot of a long page to discover that a second view existed, and nothing said
   * which of the two they were reading.
   *
   * Real tab semantics, with MANUAL activation: arrow keys move focus, Enter or Space
   * activates. Manual because activating swaps the entire screen, and arrowing across
   * with automatic activation would tear the page down under a visitor who was only
   * looking.
   *
   * Deliberately NOT sticky — the separate `iframe constraints` test asserts that
   * nothing on this screen computes to `fixed` or `sticky`.
   */
  test("offers the two views as accessible tabs, and marks the one being read", async ({
    page,
  }) => {
    await page.goto("/");
    await ask(page, { industry: "BFSI", revenueBand: "Above $20 Bn" });
    const tablist = page.getByRole("tablist", { name: "Result view" });
    await expect(tablist).toBeVisible();
    const peersTab = page.getByRole("tab", { name: /Peer Landscape/ });
    const functionsTab = page.getByRole("tab", { name: /Function Opportunity/ });
    await expect(peersTab).toHaveAttribute("aria-selected", "true");
    await expect(functionsTab).toHaveAttribute("aria-selected", "false");
    /**
     * The roving tabindex. Exactly one tab is in the tab order and it is the selected
     * one, so Tab lands on where the visitor already is rather than on a control that
     * would take them somewhere else.
     */
    await expect(peersTab).toHaveAttribute("tabindex", "0");
    await expect(functionsTab).toHaveAttribute("tabindex", "-1");
    /**
     * The selected tab owns the panel; the unselected one points at nothing, because
     * the other view's panel is genuinely not mounted. There is one result on the page
     * at a time, and `aria-controls` naming an absent id would be a broken reference
     * rather than a hidden panel.
     */
    const panelId = await peersTab.getAttribute("aria-controls");
    expect(panelId).toBeTruthy();
    await expect(page.locator(`#${panelId}`)).toHaveAttribute("role", "tabpanel");
    expect(await functionsTab.getAttribute("aria-controls")).toBeNull();
    /**
     * **The selected tab is physically continuous with the content surface**, which is
     * the whole reason this is a tab strip rather than a floating segmented control.
     * Asserted as geometry: the tab's bottom edge and the panel's top edge are the
     * same line, and both are the same fill.
     */
    const tab = (await peersTab.boundingBox())!;
    const body = (await page.locator(`#${panelId}`).boundingBox())!;
    expect(Math.abs(tab.y + tab.height - body.y)).toBeLessThanOrEqual(1);
    const [tabFill, panelFill] = await Promise.all([
      peersTab.evaluate((el) => getComputedStyle(el).backgroundColor),
      page.locator(`#${panelId}`).evaluate((el) => getComputedStyle(el).backgroundColor),
    ]);
    expect(tabFill).toBe(panelFill);
    /**
     * Manual activation. Arrowing onto the other tab moves focus and does NOT swap the
     * screen; the peer view is still the one selected and still the one rendered.
     */
    await peersTab.focus();
    await page.keyboard.press("ArrowRight");
    await expect(functionsTab).toBeFocused();
    await expect(peersTab).toHaveAttribute("aria-selected", "true");
    await expect(band(page, "peers")).toBeVisible();
    // And then it activates, and the treatment reverses: the function view's tab
    // becomes the selected one and the peer cards are gone.
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("tab", { name: /Function Opportunity/ }),
    ).toHaveAttribute("aria-selected", "true");
    await expect(
      page.getByRole("tab", { name: /Peer Landscape/ }),
    ).toHaveAttribute("aria-selected", "false");
    await expect(page.locator("section#peers")).toHaveCount(0);
  });
  /**
   * **The four answers are CONTROLS now, not a caption.** They were a run of
   * `dt`/`dd` pairs with one "Change these details" button beside them, so a visitor
   * who had picked the wrong revenue band had to notice the mistake in a caption and
   * then find an unrelated control. Here the thing that is wrong is the thing you
   * press, and each panel's accessible name says what pressing it does rather than
   * just naming the field.
   *
   * The company panel is OMITTED rather than stubbed when the field was left blank,
   * since it is optional on the form.
   */
  test("shows the profile as quiet pills with one way back, and omits the company when none was given", async ({
    page,
  }) => {
    await page.goto("/");
    await ask(page, {
      industry: "BFSI",
      revenueBand: "Above $20 Bn",
      companyName: "Northwind Financial",
    });
    const profile = page.getByRole("group", { name: /Your profile/ });
    await expect(profile).toBeVisible();
    /**
     * **ONE control, not four, and the four answers are quiet pills again.** For one
     * pass each answer was its own chevroned button. All four went to the same place —
     * the form, with the answers intact — so there were four affordances for one
     * destination, and the chevron promised an in-place editor that does not exist. On
     * screen it read as four dropdowns the visitor was expected to operate, directly
     * under the product name.
     *
     * So the answers are a summary and the way back is explicit. A count of four here
     * means the panels became controls again.
     */
    await expect(profile.getByRole("button")).toHaveCount(1);
    await expect(
      profile.getByRole("button", { name: "Change my answers" }),
    ).toBeVisible();
    // The four answers, as text. "Company" rather than "Your company": a pill is sized
    // to its own content and the possessive was two thirds of the width of the value.
    await expect(profile.getByText("Company")).toBeVisible();
    await expect(profile.getByText("Northwind Financial")).toBeVisible();
    await expect(profile.getByText("Above $20 Bn")).toBeVisible();
    // And no affordance survives on the answers themselves.
    await expect(profile.getByText("Edit profile")).toHaveCount(0);
    /**
     * **No company logo, and no reserved empty box for one.** This dataset holds no
     * marks; an initial in a coloured square is a fabricated identity and an empty
     * placeholder is a visible gap. The reference composition draws a logo disc beside
     * the company name and it is deliberately not built.
     */
    await expect(profile.locator("img")).toHaveCount(0);
    // Not in the headline. The h1 is the product.
    await expect(
      page.getByRole("heading", { level: 1, name: /Northwind Financial/ }),
    ).toHaveCount(0);
    // Pressing it returns to the form with the answers intact.
    await profile.getByRole("button", { name: "Change my answers" }).click();
    await expect(page.locator("h1#ask-title")).toBeVisible();
    // Without a name: three pills, no empty fourth, no stub — and still one control.
    await page.goto("/");
    await ask(page, { industry: "BFSI", revenueBand: "Above $20 Bn" });
    const anon = page.getByRole("group", { name: /Your profile/ });
    await expect(anon.getByRole("button")).toHaveCount(1);
    await expect(anon.getByText("Company")).toHaveCount(0);
  });
  /**
   * The density map draws India now, and three properties of that are worth pinning
   * because none of them is visible from the source of a component.
   *
   * The outline is GENERATED — `scripts/build_india_outline.py`, from Natural
   * Earth's India point-of-view admin-0 set — so what a spec can check is that it
   * arrived, that the caption invariant 8 requires is on the page, and that the
   * graticule it replaced is gone.
   */
  test("draws India under the city dots, from the generated point-of-view outline", async ({
    page,
  }) => {
    await page.goto("/");
    await ask(page, { industry: "BFSI", revenueBand: "Above $20 Bn" });
    const map = band(page, "map");

    // The generated path. Asserted by SIZE rather than by content: a truncated or
    // failed generation would leave a short `d`, which is the failure mode that
    // would otherwise render as a blank field with dots floating on it — exactly
    // what this replaced.
    const outline = map.locator("svg path").first();
    const d = await outline.getAttribute("d");
    expect((d ?? "").length).toBeGreaterThan(5_000);

    /**
     * **The caption invariant 8 required is no longer on the page**, removed at ANSR's
     * request. The outline is still cut from Natural Earth's India point-of-view set —
     * that is what the generated path above is — so what is asserted here is the part
     * that still holds: the geometry arrived, and it is the right geometry. The stated
     * point of view is the part that has gone, and it is on the blocked list in
     * handoff.md rather than quietly dropped.
     */
    await expect(map.getByText(/Boundaries as India states them/)).toHaveCount(0);

    // And the old field is gone. The dashed graticule was a reference that asserted
    // nothing, which was the point and was also why it told the eye nothing.
    await expect(
      map.getByText(/The grid is a reference, not a boundary/),
    ).toHaveCount(0);
  });

  /**
   * The hub pulse is the second continuous motion in the project, and it inherits
   * the marquee's hard requirement: opt-in inside `no-preference`, because
   * tokens.css clamps animation duration globally under `reduce` and a 1ms clamp on
   * an infinite loop flickers rather than stops.
   *
   * The halo's resting `opacity: 0` is the other half. Without an animation the ring
   * must be invisible rather than sitting at a visible radius, or three city dots
   * gain a permanent second circle that reads as a different kind of mark.
   */
  test("pulses the leading hubs, and does not under reduced motion", async ({
    page,
    browser,
  }) => {
    await page.goto("/");
    await ask(page, { industry: "BFSI", revenueBand: "Above $20 Bn" });
    const halos = page.locator(".gcc-map-pulse");
    await expect(halos).toHaveCount(3);
    expect(
      await halos.first().evaluate((el) => getComputedStyle(el).animationName),
    ).toBe("gcc-map-pulse");

    const context = await browser.newContext({ reducedMotion: "reduce" });
    const still = await context.newPage();
    await still.goto("/");
    await ask(still, { industry: "BFSI", revenueBand: "Above $20 Bn" });
    const resting = still.locator(".gcc-map-pulse").first();
    expect(
      await resting.evaluate((el) => getComputedStyle(el).animationName),
    ).toBe("none");
    expect(await resting.evaluate((el) => getComputedStyle(el).opacity)).toBe("0");
    await context.close();
  });

  test("reflows the answer at 320px with no horizontal scrolling", async ({
    page,
  }) => {
    // The answer state's layouts all changed in the same pass — a full-width lead
    // peer card, a twelve-column grid under it, a two-column map band and a
    // multi-column function list. Every one of them is a chance to widen the
    // document, and the tool is embedded in a page it does not own the scroll of.
    await page.setViewportSize({ width: 320, height: 720 });
    await page.goto("/");
    await ask(page, { industry: "BFSI", revenueBand: "Above $20 Bn" });
    await expect(band(page, "peers")).toBeVisible();
    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });

  test("keeps the dataset on the server", async ({ page }) => {
    await page.goto("/");
    await ask(page, { industry: "BFSI", revenueBand: "Above $20 Bn" });
    await expect(band(page, "peers")).toBeVisible();

    const html = await page.content();

    // A company from another industry has no business being in the document. If
    // the dataset were serialized to the client this would be the first thing to
    // appear.
    expect(html).not.toContain(LEAK_CANARY);

    // 1834 companies is ~326 KB of JSON before markup. A document anywhere near
    // that means the whole thing crossed.
    expect(html.length).toBeLessThan(300_000);
  });

  /**
   * The framing the form now always produces, and the fact it no longer echoes.
   *
   * This test used to drive the India-presence control through all three statuses
   * and assert three different framings. That control is gone — the question was
   * removed at ANSR's request and `gccStatus` is supplied as a constant — so the
   * branch is no longer reachable from a browser at all. **The branching itself is
   * still covered**, in `tests/unit/screen1.test.ts`, which asserts every status
   * produces a distinct title and CTA label; moving it there rather than deleting
   * it is what keeps the field from quietly becoming decoration.
   *
   * What only a browser can check is the pair of consequences: that the constant is
   * the framing that makes no claim about the visitor, and that the answer's fact
   * summary does not read the constant back to them as their own answer.
   */
  test("frames the answer without claiming an India status the visitor never gave", async ({
    page,
  }) => {
    await page.goto("/");
    await ask(page, { industry: "BFSI", revenueBand: "Above $20 Bn" });

    /**
     * The `evaluating` branch. It no longer reads "would not be first", which was the
     * framing this constant was chosen for and was the wrong sentence for it: it
     * presumes the reader's concern is priority and answers it as a rebuttal. What
     * makes the constant safe is unchanged — the finding is a statement about the
     * industry rather than about the visitor — and it is now the count, which is true
     * of any reader whatever they run today.
     */
    // The finding is in the live region rather than in an `h1` now — the teal hero it
    // used to headline is gone. `framing()` still produces it and `gccStatus` still
    // selects the branch, so what is asserted is unchanged; only where it lands moved.
    await expect(page.getByRole("status")).toContainText(
      /relevant peers? operates? a GCC in India/,
    );
    await expect(page.getByText(/would not be first/)).toHaveCount(0);

    /**
     * Three answers echoed back, and every one is something they typed. **"India
     * today" was a fourth and is gone with the question** — `gccStatus` is a constant
     * the form supplies, so showing it would be the tool reading its own assumption
     * back as the visitor's input.
     */
    await expect(page.getByText("India today")).toHaveCount(0);
    const profile = page.getByRole("group", { name: /Your profile/ });
    for (const label of ["Industry", "Headquarters", "Revenue band"]) {
      await expect(profile.getByText(label, { exact: true })).toBeVisible();
    }
    // And the one control, which is the only way back from either result screen.
    await expect(
      profile.getByRole("button", { name: "Change my answers" }),
    ).toHaveCount(1);
  });

  test("returns to the form with the answers still in it", async ({ page }) => {
    await page.goto("/");
    await ask(page, {
      industry: "BFSI",
      revenueBand: "Above $20 Bn",
      hqCountry: "Germany",
      companyName: "Northwind Financial",
    });
    // Waits on the answer, not on a name in the heading — the `h1` is the product, and
    // the answers are the four context panels.
    await expect(band(page, "peers")).toBeVisible();

    /**
     * **The way back is one labelled control beside the answers.** It was four chevroned
     * panels for a pass, one per answer, all of them reaching the same form — see the
     * profile test above for why that went back to a summary plus one button.
     */
    await page
      .getByRole("group", { name: /Your profile/ })
      .getByRole("button", { name: "Change my answers" })
      .click();

    // Back on the form, and a correction starts from the last answer rather than
    // from an empty form.
    await expect(page.getByLabel(/^Company name/)).toHaveValue("Northwind Financial");
    // The three dropdowns are a custom listbox now, not `<select>`, so what carries
    // the answer is the trigger's own label rather than a `value` property. A button
    // has no `value` at all, so `toHaveValue` here would not fail loudly — it would
    // compare against undefined.
    await expect(page.getByLabel("Industry")).toContainText("BFSI");
    await expect(page.getByLabel("Annual revenue")).toContainText("Above $20 Bn");
    await expect(page.getByLabel("Headquarters")).toContainText("Germany");
    await expect(page.getByLabel(/^Company name/)).toBeVisible();
  });
});

test.describe("a thin industry", () => {
  /**
   * Electrical & Electronics holds two companies in the whole dataset. Three of
   * the four blocks degrade at once, and none of them may pad, hide, or repeat.
   */
  test("states the shortfall, pads nothing, and collapses the repeat", async ({
    page,
  }) => {
    await page.goto("/");
    await ask(page, {
      industry: "Electrical & Electronics",
      revenueBand: "Above $20 Bn",
    });

    const peers = band(page, "peers");
    await expect(peers).toBeVisible();

    // Exactly two. Never five, never a filler card.
    await expect(peers.getByRole("listitem")).toHaveCount(2);
    await expect(
      peers.getByRole("heading", { level: 3, name: "Barco" }),
    ).toBeVisible();
    await expect(
      peers.getByRole("heading", { level: 3, name: "Iskraemeco" }),
    ).toBeVisible();

    // One line, said plainly, reframed rather than apologised for. It states the
    // shortfall and does NOT narrate our own restraint — "we would rather show you
    // two defensible comparisons than pad the list" answered a question the reader
    // had not asked, and planted it by answering.
    await expect(peers.getByText(/Electrical & Electronics is thin in India/)).toBeVisible();
    await expect(peers.getByText(/Early ground, not absent ground/)).toBeVisible();
    await expect(peers.getByText(/pad/i)).toHaveCount(0);

    /**
     * The industry card degrades instead of reading "and 0 others".
     *
     * **The claim lives in the line under the figure, not in the heading.** The card's
     * heading is fixed — "The wider industry context" — so the thing that has to stay
     * honest here is `industryLine`, which for an exhaustive industry says the peers
     * ARE the industry rather than implying they were selected out of something
     * larger. A derived heading used to carry it and had to go when the card headings
     * became the reference composition's; the sentence is the same sentence.
     */
    const industry = band(page, "industry");
    await expect(industry).toBeVisible();
    await expect(
      industry.getByRole("heading", {
        name: "How much of your industry is in India",
      }),
    ).toBeVisible();
    await expect(
      industry.getByText(/that is all of them in our data/),
    ).toBeVisible();
    // And nothing anywhere on the card claims the industry runs past the table above,
    // which would be a plain falsehood here.
    await expect(industry.getByText(/much larger industry base/)).toHaveCount(0);
    await expect(industry.getByText(/selected from the/)).toHaveCount(0);
    /**
     * The containment chart still draws three layers here, and the thin case is the one
     * that proves the width floor works: two companies against a national base of 1,834
     * is a 0.1% bar, so without a floor the industry and comparison layers would both
     * render as nothing. What it must never do is inflate the figure to match the mark.
     */
    await expect(industry.getByText("GCCs across India")).toBeVisible();
    await expect(industry.getByText("in Electrical & Electronics")).toBeVisible();
    await expect(industry.getByText("shown above")).toBeVisible();
    await expect(industry.getByText("in your sub-industry")).toHaveCount(0);

    // The largest panel would be the same two companies, so it becomes a line — and
    // that line may not carry a possessive on the industry name, which is what
    // `${industry}'s` was producing here: "Electrical & Electronics's". This is the
    // branch every thin industry takes, so it was the one sentence guaranteed to reach
    // the visitors most likely to see it.
    const largest = band(page, "largest");
    await expect(largest.getByText(/already named above/)).toBeVisible();
    await expect(largest.getByText(/Electronics's/)).toHaveCount(0);
    await expect(largest.getByRole("heading", { level: 4 })).toHaveCount(0);
    // A line, not a collapsed list of cards.
    await expect(largest.getByRole("listitem")).toHaveCount(0);

    /**
     * **A thin set is the same SHAPE as a full one**, which has been the rule through
     * two rewrites of this block: no lead card, no two-peer variant, no collapse to a
     * different layout. It is now two cards in the same packed grid a full set uses —
     * a remainder of two widens to two halves, so the row still fills.
     */
    await expect(peers.getByRole("table")).toHaveCount(0);
    await expect(peers.getByRole("listitem")).toHaveCount(2);

    /**
     * SNAPSHOT holds four cells whatever the result, because a stated four-up snapshot
     * that silently renders three reads as a card which failed to load. What it must
     * never do is fill one: a cell the data cannot supply says "Data unavailable".
     */
    const strip = band(page, "snapshot");
    await expect(
      strip.getByText("Electrical & Electronics companies in India"),
    ).toBeVisible();
    await expect(
      strip.getByText("Typical centre size in Electrical & Electronics"),
    ).toBeVisible();
    await expect(strip.getByText(/^(—|n\/a)$/i)).toHaveCount(0);

    // The national scale block is unchanged — that is what it is for.
    await expect(band(page, "scale").getByText("181")).toBeVisible();
  });
});

test.describe("iframe constraints", () => {
  test("nothing is fixed, sticky, or sized against the viewport", async ({
    page,
  }) => {
    await page.goto("/");
    await ask(page, { industry: "BFSI", revenueBand: "Above $20 Bn" });
    await expect(band(page, "peers")).toBeVisible();

    // The tool does not own the scroll container, so any of these would break the
    // moment it is embedded. Checked on the rendered result, not the source, so a
    // utility class that resolves to them is caught too.
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

    // The document's height is its content's height, not the viewport's — which
    // is the precondition for the parent being able to size the frame.
    const { scrollHeight, innerHeight } = await page.evaluate(() => ({
      scrollHeight: document.documentElement.scrollHeight,
      innerHeight: window.innerHeight,
    }));
    expect(scrollHeight).toBeGreaterThan(innerHeight);
  });

  test("posts its height to the parent when framed", async ({ page }) => {
    // Framed for real rather than mocked: the hook returns early when
    // `window.parent === window`, so testing it unframed would test the guard.
    //
    // Navigated first so the document has our origin as its base URL. `setContent`
    // on the initial about:blank leaves `src="/"` with nothing to resolve against,
    // and the frame silently loads nothing.
    await page.goto("/");
    await page.setContent(`
      <div id="log"></div>
      <iframe id="tool" src="/" style="width:1000px;height:200px;border:0"></iframe>
      <script>
        window.__heights = [];
        window.addEventListener("message", (event) => {
          if (event.data && event.data.type === "gcc-landscape:height") {
            window.__heights.push(event.data.height);
          }
        });
      </script>
    `);

    await expect
      .poll(async () => page.evaluate(() => (window as never as { __heights: number[] }).__heights.length), {
        timeout: 15_000,
      })
      .toBeGreaterThan(0);

    const heights = await page.evaluate(
      () => (window as never as { __heights: number[] }).__heights,
    );
    // A real content height, not the frame's own 200px.
    expect(Math.max(...heights)).toBeGreaterThan(400);
  });
});
