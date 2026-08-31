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
      name: "ANSR GCC Intelligence",
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
    // **The finding is asserted where it renders, on the band.** It used to be checked
    // through the live region, which opened with the same sentence — and the live region
    // no longer restates it: the finding is visible on the band, the count is visible
    // under the grid, and the tab panel announces itself on focus, so reading the
    // finding there made it the third thing said about one state change.
    /**
     * **The band's line states no COUNT, and that is the assertion.** Three wordings
     * failed here in sequence: "5 relevant peers operate a GCC in India" graded its own
     * output and spent its verb on something true of every company in the dataset; "5
     * India GCCs match your BFSI profile" fixed both and was still false in the one
     * direction that matters — five is what the grid SHOWS, capped by the peer limit, not
     * how many matched, and the count line under the grid says "Showing 5 of 189". So the
     * band understated the evidence beneath it and read as "we could only find five".
     *
     * It does not claim the opposite either: a denominator belongs on the count line,
     * which states it exactly.
     */
    await expect(page.locator("#header-finding")).toHaveText(
      "How your industry operates in India",
    );
    await expect(page.locator("#header-finding")).not.toContainText(/relevant/);
    await expect(page.locator("#header-finding")).not.toContainText(/\d/);
    // What the live region is for now: that a result exists, and how large the set is.
    await expect(page.getByRole("status")).toContainText(
      /Showing 5 comparable companies in BFSI/,
    );
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
    /**
     * **The first cell is a COUNT of comparable centres, where it was the industry's
     * share of the national base**, at ANSR's request. This visitor gave no sub-industry,
     * so the comparable population is the industry and the label says so — the
     * sub-industry wording is asserted in the unit suite, which can vary the input
     * without driving the cascade.
     */
    /**
     * **The industry is named by the section HEADING now, and by none of the four
     * labels.** Three of them interpolated it, which put one label at 34 characters
     * against another at 24 under four figures that align perfectly, and stated the same
     * word three times inside 900px. Both halves are asserted here so the change cannot
     * come back one label at a time.
     */
    await expect(
      snapshot.getByRole("heading", { name: "Snapshot of BFSI GCCs in India" }),
    ).toBeVisible();
    await expect(snapshot.getByText("GCCs in your industry")).toBeVisible();
    // The share's own label and its unit are both gone with it.
    await expect(snapshot.getByText("Of every GCC in India")).toHaveCount(0);
    await expect(snapshot.getByText("Typical GCC headcount")).toBeVisible();
    // **Not "Indian cities in play"**, which was consultants' shorthand and made a
    // plain count of cities sound like a shortlist somebody had drawn up.
    await expect(snapshot.getByText("Indian cities with a GCC")).toBeVisible();
    await expect(snapshot.getByText(/in play/)).toHaveCount(0);
    await expect(snapshot.getByText("Leading GCC city")).toBeVisible();
    // Two earlier headings, and the label that carried the concentration finding.
    await expect(snapshot.getByText("Your industry in India")).toHaveCount(0);
    await expect(snapshot.getByText(/^BFSI in India$/)).toHaveCount(0);
    await expect(
      snapshot.getByText("Where the industry concentrates"),
    ).toHaveCount(0);
    // "GCCs", never "GCC's", which ANSR asked never to appear anywhere.
    await expect(snapshot.getByText(/GCC's/)).toHaveCount(0);
    /**
     * **The leading city takes the same orange and one size step down, not two.** It was
     * `--ansr-accent-warm` at 20/30px beside three `--ansr-action` figures at 36/48 — two
     * different oranges and a two-step gap, which read as a cell from another component.
     * The deeper step was needed while the value was 20px; at 30px rising to 38, Semibold,
     * the anchor clears the 3:1 large-text floor on white.
     */
    const [cityInk, figureInk] = await Promise.all([
      snapshot
        .getByText("Bengaluru")
        .evaluate((el) => getComputedStyle(el.closest("p")!).color),
      snapshot
        .getByText("Typical GCC headcount")
        .evaluate((el) =>
          getComputedStyle(el.previousElementSibling as Element).color,
        ),
    ]);
    expect(cityInk).toBe(figureInk);
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
    /**
     * What each card does carry, at a size worth reading — **and every label names the
     * GCC.** "India employees" and "India locations" both named the country the whole
     * page is about and left the reader to infer that the subject is the CENTRE rather
     * than the company. On a card about JPMorgan Chase that inference is not safe.
     */
    /**
     * **Two of the three labels dropped the "GCC" prefix, at ANSR's request.** All three
     * opened on the same three letters inside 120px, on a card whose section heading
     * already says "India GCCs closest to your profile". What each replacement had to
     * keep is the thing the prefix was protecting: the year is the CENTRE's, so a bare
     * "Since 1799" on a JPMorgan Chase card is exactly the misreading the label exists
     * to prevent — "In India since" says the same thing without the third "GCC".
     */
    await expect(peers.getByText("GCC headcount").first()).toBeVisible();
    await expect(peers.getByText("Cities").first()).toBeVisible();
    await expect(peers.getByText(/In India since \d{4}/).first()).toBeVisible();
    await expect(peers.getByText("GCC cities")).toHaveCount(0);
    await expect(peers.getByText(/GCC since \d{4}/)).toHaveCount(0);
    /**
     * **No ordinal on any card.** It was a `Match N` eyebrow above every company name,
     * carrying the relevance order because a multi-row grid has no row position to carry
     * it. The set is one row now, so left-to-right reading position states the order and
     * the eyebrow is a claim the layout makes instead of a line of grey small caps above
     * five names.
     */
    await expect(peers.getByText(/^Match \d+$/)).toHaveCount(0);
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
      peers.getByText(/Showing 5 of \d+ comparable BFSI GCCs\./),
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
    /**
     * **The lead states no quantity, which is the point of asserting it here.** It read
     * "189 other BFSI companies run a centre in India" — the count's second of four
     * appearances on this surface, 120px above the chart layer labelled with the same
     * figure. The lead now names the three layers the chart draws, in the order it draws
     * them, and the figure lives only where it has a denominator. "other" went with it:
     * it invited "other than which?" and nothing on the page answered.
     */
    /**
     * **The lead is GONE from the render, at ANSR's request.** It described the three
     * layers the chart draws, in the order it draws them, which the chart's own labels
     * already say. Asserted absent rather than deleted, so it cannot come back by
     * accident — and "other BFSI companies", the phrasing before it that raised a question
     * the page never answered, must stay gone too.
     */
    await expect(
      industry.getByText(/Every GCC in India, with BFSI inside it/),
    ).toHaveCount(0);
    await expect(industry.getByText(/\bother BFSI companies\b/)).toHaveCount(0);
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
    /**
     * **The innermost level is a POSITION MARKER, not a third bar, and this asserts
     * the geometry rather than the pixels.** Five of 1,834 is 0.27%: as an extent it
     * was a floored sliver nobody could see and no scale fixes it — a log axis would
     * make the length a lie. So the marker is a fixed width capped by the layer it is
     * inside, and its figure carries the count exactly as every other layer's does.
     *
     * The cap is what the assertion is really for: it is the difference between a
     * marker inside the industry and one sticking out of it, which is what a thin
     * industry would produce if the width were unconditional.
     */
    const marker = industry.locator(".gcc-containment__bar--marker");
    await expect(marker).toHaveCount(1);
    const markerBox = await marker.boundingBox();
    const industryBar = industry.locator(".gcc-containment__bar").nth(1);
    const industryBox = await industryBar.boundingBox();
    expect(markerBox!.width).toBeGreaterThan(0);
    expect(markerBox!.width).toBeLessThanOrEqual(industryBox!.width + 0.5);
    /**
     * **Every label starts at or after its own mark's trailing edge**, which is what
     * stopped the chart drawing a figure that overhangs the bar it belongs to and what
     * turned the width it used to leave empty into where the figures are read. Asserted
     * on the two narrow layers: the outermost is full width and keeps its label inside.
     */
    for (const text of ["in BFSI", "shown above"]) {
      const label = industry.getByText(text);
      const box = await label.boundingBox();
      expect(box!.x, text).toBeGreaterThanOrEqual(industryBox!.x);
    }
    // The labels of both shapes this replaced.
    await expect(industry.getByText("Total industry companies")).toHaveCount(0);
    await expect(industry.getByText("Named above")).toHaveCount(0);
    /**
     * **The provenance sentence under the chart is gone**, at ANSR's request — "The 5
     * companies shown above were selected from the N in a comparable sub-industry, not
     * from the industry as a whole." The chart's own labelled layers carry it.
     */
    await expect(industry.getByText(/selected from the/)).toHaveCount(0);
    /**
     * The largest card is a ranking, and it is a CHART rather than a stack of company
     * cards. Neither a table nor a card grid: both were tried, and the card version was
     * what made a third of this page the same data twice — three of these five are in
     * the comparison set above, and each one restated that company's headcount range,
     * city list and establishment year in a bordered card the reader had already seen.
     */
    const largest = band(page, "largest");
    await expect(largest.getByRole("table")).toHaveCount(0);
    await expect(largest.getByRole("listitem")).toHaveCount(5);
    /**
     * **The city list and the establishment year are BACK, as tags, at ANSR's request —
     * and what this asserts is the shape rather than the fields.** They were dropped with
     * the company CARD, and the earlier assertion here read that as "these fields may
     * never return", which was one step stronger than the finding: the duplication was a
     * bordered card restating four facts the reader had passed a screen earlier, not the
     * facts. As one line of `sm` pills under a one-line ranking row they cost about 26px
     * and there is no second card.
     *
     * So the assertions that matter are still above and below this one — no table, no
     * card, five rows — and these two say the tags are on every row and are pills rather
     * than prose. The year keeps "In India since" in full because a bare year on a
     * JPMorgan Chase row reads as 1799.
     */
    await expect(largest.getByText(/^In India since \d{4}$/)).toHaveCount(5);
    // Every row carries at least one city pill beside its year pill. Counted rather than
    // named: which cities the industry's biggest centres sit in is a dataset fact, and a
    // spec that names one fails on a legitimate publish.
    expect(
      await largest.locator("li span.rounded-full").count(),
    ).toBeGreaterThanOrEqual(10);
    /**
     * **The overlap marker's wording changed with its job.** "Also in your peer set" on
     * a duplicate card admitted the repeat; on a chart row the marker lets a reader map
     * the ranking onto the set they were given, and the sentence under the block states
     * what that mapping amounts to — which is a finding rather than an apology.
     */
    await expect(largest.getByText("Also in your peer set")).toHaveCount(0);
    await expect(
      largest.getByText("in your comparison set", { exact: true }),
    ).toHaveCount(3);
    await expect(
      largest.getByText(
        "3 of the 5 largest BFSI GCCs in India are in your comparison set above.",
      ),
    ).toBeVisible();
    /**
     * **The ordering qualifier is GONE, at ANSR's request, and of the six leads removed in
     * that pass this is the one with the sharpest edge on it.**
     *
     * It travelled as a footnote — "Ranges reflect reported employee bands, so nothing here
     * is ranked by revenue." at 12px under the block — then as the section's lead, "Ranked
     * by the size of the centre itself, never by revenue." Either way it was the one
     * sentence stopping a reader taking "largest" for largest by revenue, on a page that
     * holds revenue BANDS and can never rank by them.
     *
     * What is left on screen is the evidence rather than the statement: the heading says
     * "centres", every row shows a headcount range, and the bars encode that range, so a
     * reader who checks can see which quantity ordered the list. What no longer appears is
     * the sentence that says so before they check.
     *
     * `LARGEST_LEAD` is still exported and still unit-tested, so restoring it is one prop.
     * Both wordings are asserted absent here so the removal stays deliberate; it is on the
     * blocked list with the other provenance removals.
     */
    await expect(largest.getByText(/never by revenue/)).toHaveCount(0);
    await expect(
      largest.getByText(/Ranges reflect reported employee bands/),
    ).toHaveCount(0);
    /**
     * **The axis note is gone from this block too**, and it is the one axis note whose
     * absence costs nothing. It read "Full width is JPMorgan Chase, at 59,900–60,000."
     * under a ranked stack whose FIRST ROW is JPMorgan Chase, drawing a full-width bar,
     * with 59,900–60,000 beside it at 24px — so it restated a name and a figure the
     * reader had passed four rows earlier. An unstated axis is a problem when nothing on
     * screen reveals it; on a ranking sorted by the quantity the bars encode, row one is
     * the axis. The bars themselves are unchanged.
     */
    await expect(largest.getByText(/Full width is/)).toHaveCount(0);
    /**
     * **The count line is gone, at ANSR's request.** It read "The 5 largest BFSI GCCs in
     * our India data." directly under a five-row ranking headed "The largest BFSI GCCs in
     * India" — the heading restated with the row count in front of it, which the reader
     * can see. `largestCountLine` is kept in `copy.ts` and still unit-tested, so restoring
     * it is one line; asserted absent here so the removal stays deliberate.
     */
    await expect(
      largest.getByText(/largest BFSI GCCs in our India data/),
    ).toHaveCount(0);
    await expect(largest.getByText(/we hold/)).toHaveCount(0);
    /**
     * **What replaced it is a column header naming the QUANTITY.** Nothing on the block
     * said what the five ranges are: over five bars, under a heading that says "largest",
     * a reader could take them for revenue, for the company's whole Indian workforce, or
     * for the company. The section heading names the subject and cannot carry the
     * quantity too.
     */
    await expect(largest.getByText("GCC headcount")).toBeVisible();
    /**
     * The function card draws no share against any function, and that is the
     * assertion rather than an omission. There is no per-company function record in
     * this dataset, so the percentages in the reference composition would every one
     * have been invented.
     */
    const functions = band(page, "functions");
    await expect(functions.getByText("Technology & engineering")).toBeVisible();
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
     * **No ordering claim, and no numbering to imply one.** The lead read "Most to least
     * common across India GCCs." over eight numbered tiles — and `COMMON_FUNCTIONS` is a
     * hardcoded list with `COMMON_FUNCTIONS_BASIS` deleted, so nothing measures a
     * frequency. The rank badges made an unmeasured claim look measured, so they went
     * with the sentence.
     *
     * The element changed with them: an ordered list IS an ordering claim, announced as
     * one to a screen reader, and it would have survived the badges being deleted. So
     * the assertion is on the `<ul>` rather than on the badge text — which is also the
     * only half of this a reader using a screen reader would have noticed.
     */
    await expect(functions.getByText(/most to least/i)).toHaveCount(0);
    await expect(functions.locator("ol")).toHaveCount(0);
    await expect(functions.locator("ul")).toHaveCount(1);
    /**
     * **`FUNCTIONS_LEAD` is gone from the render, at ANSR's request.** It said "Common
     * across India GCCs, whatever the industry." — which is the sentence that made the
     * block's scope explicit: this list does not move with the visitor's answers. The
     * HEADING still carries the general claim ("Functions most GCCs run from India", a
     * statement about GCCs rather than about the five companies above), which is what
     * `project.md` relies on, so what is lost is the "whatever the industry" half.
     *
     * Asserted absent so the removal stays deliberate. The constant is still exported and
     * still unit-tested for the two things it may never do — state a share or claim an
     * order.
     */
    await expect(
      functions.getByText("Common across India GCCs, whatever the industry."),
    ).toHaveCount(0);
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
    /**
     * **All three labels are whole sentences now, and the duplicated denominator is
     * gone.** The first two cells rendered "181", then a smaller "of 500" beside it,
     * then "of the Fortune Global 500 companies have GCCs in India" underneath — so a
     * reader met the denominator twice and then a line opening with a preposition. Each
     * label is now the predicate of a sentence whose subject is the figure above it.
     */
    await expect(
      scale.getByText("Fortune Global 500 companies run a GCC in India."),
    ).toBeVisible();
    await expect(
      scale.getByText("Forbes Global 2000 companies run a GCC in India."),
    ).toBeVisible();
    /**
     * **The third cell covers BOTH indices now, and the figure is their union.** It was
     * the Fortune Global 500 subset alone, sitting under two cells that name two different
     * memberships — so the narrower of the two stood in as the total for both, and "those
     * GCCs" pointed at one while reading as both. The union is deduplicated by
     * construction: the sum is taken over companies filtered on `either index`, so a
     * company on both lists appears once. See `indexedProfessionals`.
     */
    await expect(
      scale.getByText(
        "people work in those Fortune Global 500 and Forbes Global 2000 GCCs in India.",
      ),
    ).toBeVisible();
    // The standalone denominator that made it "500" twice.
    await expect(scale.getByText("of 500")).toHaveCount(0);
    await expect(scale.getByText("of 2,000")).toHaveCount(0);
    /**
     * **No label states a share, at ANSR's request.** Both carried one — ", 36% of the
     * list." — which arrived when the two proportion bars came off, on the argument that a
     * figure with a denominator should state it. The count and the index name are what is
     * left, and the index name still carries its own denominator.
     *
     * The bars are still gone and still for their own reason: they were drawn on the first
     * two cells and the third has no denominator to draw, so the row read as two marks
     * beside a figure carrying neither.
     */
    await expect(scale.getByText(/of the list/)).toHaveCount(0);
    await expect(scale.getByText(/%/)).toHaveCount(0);
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
    /**
     * **The legend is gone too, and it is the third thing this block has lost.** It
     * named two mark shapes, "Established hub" and "Emerging location" — and every
     * city now draws the same orange halo at ANSR's request, so the key described a
     * distinction the graphic had stopped making. A false key is worse than none, so
     * it went with the ring rather than being reworded.
     *
     * **What that costs: the established/emerging distinction is no longer on the
     * graphic at all.** It survives only as the "emerging" qualifier on the ranked
     * list's rows, which is asserted below. On the blocked list.
     */
    await expect(map.getByText("Established hub")).toHaveCount(0);
    await expect(map.getByText("Emerging location")).toHaveCount(0);
    // The one place the tier distinction still exists for a visitor.
    await expect(map.getByText("emerging").first()).toBeVisible();
    // Scoped to the `dl`, not the band: every dot on the map also carries its city in
    // an SVG `<title>`, which is what the accessible summary is built from and is
    // `hidden` to a visibility assertion. That is the pairing working — the graphic
    // and the list say the same thing — so the locator has to name which one it means.
    await expect(map.locator("dl").getByText("Bengaluru").first()).toBeVisible();
    /**
     * **The page ends at the CLOSE now, and the evidence strip is the last thing before
     * it.** The close was removed at ANSR's request on the page-end instruction and is
     * restored at the project owner's decision; this assertion is inverted rather than
     * deleted, because a close arriving back on one screen and not the other is the
     * half-restored state the shared component exists to prevent. Screen 2's own is
     * asserted in `0-screen2.spec.ts`.
     *
     * Still no footer and still no methodology link: only the close came back.
     */
    await expect(page.locator("footer")).toHaveCount(0);
    await expectBand(page, "close");
    // Located by ROLE inside the band, never by its words: the button's label is
    // `siteContent.close.ctaLabel` and admin-editable, so naming it here would make a
    // copy edit break a public spec — the same failure twenty band locators had.
    await expect(band(page, "close").getByRole("link")).toBeVisible();
    // And the close really is last: nothing follows it in the document.
    const trailing = await band(page, "close").evaluate((el) => {
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
   * The close, and the one thing about it that is an INVARIANT rather than a design
   * decision.
   *
   * It is a paywall band: a blurred field of content with the ask centred over it. The
   * blurred layer is what needs a test, because it is the part that would be a leak if
   * it were built the obvious way.
   *
   * **It is not built that way, and this asserts the difference structurally.** What is
   * blurred is a synthetic lattice authored in `closing-cta.tsx` — no figure, no metric
   * name, nothing read from the data. `publicMetric`'s gated branch has no `value` and
   * no `structure` field, so a withheld figure never reaches the document to be covered
   * up. So the test reads the backdrop's TEXT rather than checking that a filter is
   * applied: emptiness of content is the guarantee, and the blur is only how the band
   * suggests depth.
   *
   * The whole layer is also `aria-hidden`, so nothing fabricated is in the reading
   * order — asserted here, because a decorative layer that reaches a screen reader is
   * the same defect as one that carries real data.
   */
  test("closes on an ask over a blurred field that carries no data", async ({
    page,
  }) => {
    await page.goto("/");
    await ask(page, { industry: "BFSI", revenueBand: "Above $20 Bn" });

    const close = band(page, "close");
    await expect(close).toBeVisible();

    // Exactly one outbound link on the whole screen, and it is this one. The tool had
    // none at all for a while; what must not come back is a second one somewhere else.
    await expect(page.getByRole("link")).toHaveCount(1);
    const cta = close.getByRole("link");
    await expect(cta).toHaveAttribute("target", "_parent");

    /**
     * **The backdrop carries no text at all**, which is the assertion that fails if
     * anyone ever implements this band by rendering something real and blurring it.
     */
    const backdrop = page.locator(".gcc-close-backdrop");
    await expect(backdrop).toHaveCount(1);
    expect(
      await backdrop.evaluate((el) => (el as HTMLElement).innerText.trim()),
    ).toBe("");
    // And it is out of the accessibility tree, along with the scrim over it.
    await expect(backdrop).toHaveAttribute("aria-hidden", "true");
    await expect(page.locator(".gcc-close-scrim")).toHaveAttribute(
      "aria-hidden",
      "true",
    );

    /**
     * **The band says it in TWO elements: one line and a button.** Asserted as a count
     * rather than by wording, because what this replaced was verbose — an eyebrow, a
     * heading, a two-sentence body and a bordered panel listing four metric names — and
     * the failure mode is it growing back one element at a time.
     *
     * **No heading at all**, so the band takes its accessible name from `aria-label`.
     * `expectBand` above accepts either mechanism; what must not pass is a band with
     * neither, which would not be a `region` and would be unreachable by role.
     */
    await expect(close.getByRole("heading")).toHaveCount(0);
    await expect(close.locator("p")).toHaveCount(1);
    // And nothing above the line: no eyebrow came back with the heading's removal.
    expect(
      await close.evaluate((el) => el.firstElementChild?.tagName ?? ""),
    ).toBe("P");

    // Unchanged by the close coming back: it links out and collects nothing.
    expect(await page.locator('input[type="email"]').count()).toBe(0);
    expect(await close.locator("form, input, textarea").count()).toBe(0);
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
    const functionsTab = page.getByRole("tab", { name: /Function Metrics/ });
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
     * **The switch is the CARD'S OWN TOP ROW: full width, two equal halves, and the
     * selected cell filled with the ground of the content under it.** Two earlier
     * shapes are recorded in `ViewTabs`; what a spec can hold is the three properties
     * that make this one seamless rather than attached.
     *
     * One: the bar spans the card, and each cell is half of it. Two: the selected
     * cell's fill is the same fill as the zone beneath it, so the joint is the absence
     * of an edge rather than two colours that nearly match — this is the assertion
     * that fails if someone hard-codes white here, which is exactly what happened
     * once. Three: the bar is inside the card, which is what makes it the card's row
     * rather than a strip above it.
     */
    const card = page.locator(".gcc-result-card");
    await expect(card).toHaveCount(1);
    const tab = (await peersTab.boundingBox())!;
    const cardBox = (await card.boundingBox())!;
    expect(Math.abs(tab.width * 2 - cardBox.width)).toBeLessThanOrEqual(2);
    expect(Math.abs(tab.y - cardBox.y)).toBeLessThanOrEqual(2);
    // The first zone is the content directly under the bar. Its fill and the selected
    // cell's are one value, and the two boxes share an edge.
    const firstZone = page.locator(".gcc-zone").first();
    const zoneBox = (await firstZone.boundingBox())!;
    expect(Math.abs(tab.y + tab.height - zoneBox.y)).toBeLessThanOrEqual(1);
    const [tabFill, zoneFill, otherFill] = await Promise.all([
      peersTab.evaluate((el) => getComputedStyle(el).backgroundColor),
      firstZone.evaluate((el) => getComputedStyle(el).backgroundColor),
      functionsTab.evaluate((el) => getComputedStyle(el).backgroundColor),
    ]);
    expect(tabFill).toBe(zoneFill);
    expect(otherFill).not.toBe(tabFill);
    // The panel is inside the card, not beside it.
    const body = (await page.locator(`#${panelId}`).boundingBox())!;
    expect(body.y).toBeGreaterThanOrEqual(cardBox.y);
    expect(body.width).toBeLessThanOrEqual(cardBox.width);
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
      page.getByRole("tab", { name: /Function Metrics/ }),
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
      profile.getByRole("button", { name: "Edit answers" }),
    ).toBeVisible();
    // The four answers, as text. "Company" rather than "Your company": a pill is sized
    // to its own content and the possessive was two thirds of the width of the value.
    await expect(profile.getByText("Company")).toBeVisible();
    await expect(profile.getByText("Northwind Financial")).toBeVisible();
    await expect(profile.getByText("Above 20 Bn")).toBeVisible();
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
    await profile.getByRole("button", { name: "Edit answers" }).click();
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
     * **And it is UNSTROKED.** A hairline coast made India read as a boundary
     * drawing rather than as the ground the marks sit on, which is most of why the
     * graphic looked like a school diagram. Invariant 8 governs where the geometry
     * comes from, not whether it is outlined — a filled silhouette is the same
     * claim, drawn as ground.
     *
     * Asserted here rather than left to the render because the fix has a tempting
     * wrong repair: unstroking at the pale mint the land used to be leaves a 1.27:1
     * shape, and the obvious response to an invisible country is to put the stroke
     * back. The land is a step darker instead.
     */
    expect(
      await outline.evaluate((el) => getComputedStyle(el).stroke),
    ).toBe("none");

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
   * **The map labels and the ranked list name the same cities, and the disclosure
   * drives both.** That coupling is ANSR's ask and it is the kind of thing that
   * decays quietly: the two are built from separate expressions, so one could keep
   * showing eight while the other showed twenty-two and the screen would still look
   * fine.
   *
   * The other half is the `overflow-visible` hazard. Labels are drawn outside the
   * viewBox on purpose, into the wrapper's padding, and content that overflows
   * visibly does not affect layout but DOES enlarge an ancestor's scrollable region —
   * so a label reaching too far is a horizontal scrollbar on a document this tool
   * does not own the scroll of. The 320px reflow test does not catch it, because
   * below `sm` the labels are not drawn at all.
   */
  test("labels every ranked city on the map, and never widens the document", async ({
    page,
  }) => {
    // 640 is the narrowest width that draws labels, so it is the tightest case for
    // the gutters.
    await page.setViewportSize({ width: 640, height: 900 });
    await page.goto("/");
    await ask(page, { industry: "BFSI", revenueBand: "Above $20 Bn" });
    const map = band(page, "map");

    // Wait for the band before counting. Without this the counts are taken while the
    // phase change is still committing: the section is absent, every locator reports
    // zero, and the failure reads as a broken selector rather than as a race.
    await expect(map).toBeVisible();

    const labels = map.locator("svg text");
    const rows = map.locator("dl dt");
    const leading = await rows.count();
    expect(leading).toBeGreaterThan(1);
    await expect(labels).toHaveCount(leading);

    const noScroll = async () => {
      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
    };
    await noScroll();

    // Expanding the list has to expand the map's labels with it.
    await map.getByRole("button", { name: /Explore all cities/ }).click();
    const all = await rows.count();
    expect(all).toBeGreaterThan(leading);
    await expect(labels).toHaveCount(all);
    await noScroll();
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
    /**
     * **And it STOPS.** It ran `infinite`, which is the one place the project's
     * motion read as decoration rather than as meaning: nothing about the map
     * changes once the screen has arrived, so a pulse that never ends announces an
     * event that is not happening — and a reader comparing two halo areas is doing
     * it on a graphic that keeps moving under them. Two cycles, then still, which
     * puts it on the enter animations' footing rather than the marquee's.
     */
    expect(
      await halos
        .first()
        .evaluate((el) => getComputedStyle(el).animationIterationCount),
    ).toBe("2");

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
     * **`framing()` no longer reaches this band, so the browser-side assertion is the
     * ABSENCE of it.** The line is a constant from `HEADER_LINES`, because the wording it
     * replaced stated a peer count the grid's own count line contradicted. `framing()` is
     * kept and unit-tested, which is where its branching is covered.
     *
     * **`gccStatus` is still rendered, on the OTHER screen** — `functionFraming` branches
     * on it for the three fields of its closing CTA, which is now the only thing it
     * branches: that screen's `h2` and lead have gone with the rest of its copy strip.
     * `screen2.test.ts` covers the three branches. So this test is about Screen 1 saying
     * nothing the visitor did not tell us, not about the field being unused.
     *
     * What only a browser can check is that nothing here reads the constant back to them
     * as something they said: no "India today" pill, and no framing sentence that presumes
     * what they run.
     */
    await expect(page.locator("#header-finding")).toHaveText(
      "How your industry operates in India",
    );
    await expect(page.getByText(/would not be first/)).toHaveCount(0);
    // Neither of the two earlier band lines, both of which made a claim about the visitor
    // or about how many companies matched.
    await expect(page.getByText(/relevant peers/)).toHaveCount(0);
    await expect(page.getByText(/match your BFSI profile/)).toHaveCount(0);

    /**
     * Three answers echoed back, and every one is something they typed. **"India
     * today" was a fourth and is gone with the question** — `gccStatus` is a constant
     * the form supplies, so showing it would be the tool reading its own assumption
     * back as the visitor's input.
     */
    await expect(page.getByText("India today")).toHaveCount(0);
    const profile = page.getByRole("group", { name: /Your profile/ });
    for (const label of ["Industry", "Headquarters", "Revenue band (USD)"]) {
      await expect(profile.getByText(label, { exact: true })).toBeVisible();
    }
    // And the one control, which is the only way back from either result screen.
    await expect(
      profile.getByRole("button", { name: "Edit answers" }),
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
      .getByRole("button", { name: "Edit answers" })
      .click();

    // Back on the form, and a correction starts from the last answer rather than
    // from an empty form.
    await expect(page.getByLabel(/^Company name/)).toHaveValue("Northwind Financial");
    // The three dropdowns are a custom listbox now, not `<select>`, so what carries
    // the answer is the trigger's own label rather than a `value` property. A button
    // has no `value` at all, so `toHaveValue` here would not fail loudly — it would
    // compare against undefined.
    await expect(page.getByLabel("Industry")).toContainText("BFSI");
    await expect(page.getByLabel("Annual revenue")).toContainText("Above 20 Bn");
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
    // **The heading is only asserted to EXIST, not to say a particular thing.** It was
    // pinned to "How much of your industry is in India", which a copy pass then changed
    // for a reason that had nothing to do with this spec's subject — the same failure
    // mode as the twenty specs that used to locate a band by its heading text. What
    // this test is about is the SENTENCE underneath, which is the thing that has to
    // stay honest for an exhausted industry.
    await expect(industry.getByRole("heading")).toBeVisible();
    /**
     * **The exhaustive claim is no longer on the page, and this is the removal with the
     * real cost.** `industrySentence`'s exhaustive branch said "…and that is all of them
     * in our data" — the sentence that tells a reader of a six-company industry that the
     * set above IS the industry rather than a selection from something larger. It went with
     * the lead at ANSR's request, so an exhausted industry now looks like any other.
     *
     * The claim still exists in `industryLine` and is still unit-tested per industry, so
     * restoring it is one prop. Asserted absent here so the loss is deliberate and visible
     * to whoever reads this next; it is on the blocked list with the other provenance
     * removals.
     */
    await expect(
      industry.getByText(/that is all of them in our data/),
    ).toHaveCount(0);
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
    // The labels no longer interpolate the industry; the section heading names it once.
    await expect(
      strip.getByRole("heading", { name: "Snapshot of Electrical & Electronics GCCs in India" }),
    ).toBeVisible();
    await expect(strip.getByText("GCCs in your industry")).toBeVisible();
    await expect(strip.getByText("Typical GCC headcount")).toBeVisible();
    await expect(strip.getByText(/^(—|n\/a)$/i)).toHaveCount(0);
    /**
     * **The thinnest industry in the dataset, and the opening cell still reads as a
     * count rather than as a nought.** Two companies, so the cell states 2 — where the
     * share this replaced had to be special-cased to "<1%", because 2 against a national
     * base of 1,834 rounds to 0 and a nought there says the industry is not in India at
     * all. A count needs no such branch: the figure it states is the population itself.
     */
    await expect(strip.getByText(/^0%$/)).toHaveCount(0);
    await expect(strip.getByText("<1%")).toHaveCount(0);
    await expect(strip.getByText("Data unavailable")).toHaveCount(0);

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
