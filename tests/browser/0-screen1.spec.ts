import { expect, test } from "@playwright/test";

import { band, expectBand } from "./helpers";

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
  await page.getByLabel("Industry").selectOption(options.industry);
  await page.getByLabel("Annual revenue").selectOption(options.revenueBand);
  await page.getByLabel("Headquarters").selectOption(options.hqCountry ?? "USA");
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
  test("offers exactly the five inputs, and asks for no revenue figure", async ({
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
    // The sixth input. This test was named "the five inputs" and never asserted
    // it, so nothing here would have noticed the field disappearing. A count in a
    // test name has to match the list beneath it or the name is decoration.
    await expect(page.getByLabel(/^Line of business/)).toBeVisible();
    await expect(page.getByLabel("Annual revenue")).toBeVisible();
    await expect(page.getByLabel("Headquarters")).toBeVisible();
    // **No India-presence control, and its absence is asserted.** The question was
    // removed at ANSR's request; the field behind it was kept and is supplied as a
    // constant. A radio group reappearing here means someone restored the control
    // without deciding to.
    expect(await page.locator("form input[type='radio']").count()).toBe(0);

    // Five controls, and no sixth: a field added without a consumer should fail
    // here rather than ship silently.
    expect(
      await page.locator("form select, form input[type='text']").count(),
    ).toBe(5);

    // Revenue is a band, never a figure — the data holds bands, so the input is
    // one. A number input here would be the wrong question.
    await expect(page.getByLabel("Annual revenue")).toHaveJSProperty(
      "tagName",
      "SELECT",
    );

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

    await expect(page.locator("h1#ask-title")).toHaveText("India GCC Intelligence");

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

    // Line of business is the only field that carries the marker.
    expect(
      await page.locator("form label", { hasText: "(optional)" }).count(),
    ).toBe(1);
    await expect(page.getByLabel(/^Line of business/)).toBeVisible();
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
   * The submit button is the screen's only button, which is also the brand's
   * one-orange-per-band rule holding: a second control in the hero would have had
   * to be either a second primary or a visibly weaker one.
   */
  test("the hero is two text elements and no control", async ({ page }) => {
    await page.goto("/");

    const hero = page.locator("h1#ask-title").locator("..");
    expect(await hero.locator("button, a").count()).toBe(0);

    // One button on the whole entry point, and it is the form's.
    const buttons = page.locator("button");
    await expect(buttons).toHaveCount(1);
    await expect(buttons.first()).toHaveText(SUBMIT);

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
  test("shows all four evidence blocks, the map, and the way out", async ({
    page,
  }) => {
    await page.goto("/");
    await ask(page, {
      industry: "BFSI",
      revenueBand: "Above $20 Bn",
      companyName: "Northwind Financial",
    });

    // The heading personalises on the company name and takes focus, because the
    // swap is a state change and nothing else would announce it.
    const heading = page.getByRole("heading", {
      level: 1,
      name: /Northwind Financial/,
    });
    await expect(heading).toBeVisible();
    await expect(heading).toBeFocused();

    // Every block is a named region, so it is reachable by role. Located by id and
    // checked for a name, rather than located BY its name — the ids are the
    // structural contract and the headings are a copywriter's to change.
    for (const id of ["peers", "industry", "largest", "functions", "map", "scale"]) {
      await expectBand(page, id);
    }

    // Five peer cards, each with a headcount band rather than a point figure.
    const peers = band(page, "peers");
    await expect(peers.getByRole("heading", { level: 4 })).toHaveCount(5);
    await expect(peers.getByText("India headcount").first()).toBeVisible();

    // The industry count, drawn as the peer set's share of the whole industry —
    // which is what makes five named companies read as a selection rather than as
    // the supply.
    const industry = band(page, "industry");
    await expect(industry.getByText(/BFSI companies already run a centre/)).toBeVisible();
    await expect(industry.getByText("Named above")).toBeVisible();
    await expect(industry.getByText("Elsewhere in your industry")).toBeVisible();

    // The largest block is a ranking, and an overlap with the peer set is marked
    // rather than restated as a second identical card.
    const largest = band(page, "largest");
    await expect(largest.getByRole("listitem")).toHaveCount(5);
    await expect(largest.getByText("Also in your peer set").first()).toBeVisible();
    await expect(largest.getByText(/Bars compare the size of the India centre/)).toBeVisible();

    // Scale proof is national, and says it is approximate rather than implying
    // band midpoints are a measurement.
    const scale = band(page, "scale");
    await expect(scale.getByText("181")).toBeVisible();
    await expect(scale.getByText(/1,834 India GCCs/)).toBeVisible();
    await expect(scale.getByText(/sum of band midpoints/)).toBeVisible();

    // The map is a real graphic with an accessible summary, paired with the
    // ranked list that carries the figures.
    const map = band(page, "map");
    await expect(map.getByRole("img", { name: /GCC locations across India/ })).toBeVisible();
    // Scoped to the ranked list: the dot's own <title> matches the city name too,
    // which is the point — the graphic and the list say the same thing.
    await expect(
      map.getByRole("listitem").filter({ hasText: "Bengaluru" }).first(),
    ).toBeVisible();

    // The close links out and collects nothing.
    const cta = page.getByRole("link", { name: /Talk to ANSR/ });
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute("href", /^https?:\/\//);
    await expect(cta).toHaveAttribute("target", "_parent");
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

    // The `evaluating` branch: true for any reader, because it is a statement about
    // the industry rather than about them.
    await expect(
      page.getByRole("heading", { level: 1, name: /would not be first/ }),
    ).toBeVisible();

    // Three facts echoed back, and every one is something they typed. "India today"
    // was the fourth and is gone with the question.
    //
    // Located on the summary's own `dl` rather than by walking up from the heading:
    // the facts are a SIBLING of the heading's block, so `h1`'s parent does not
    // contain them and the assertion passed vacuously against an empty scope.
    await expect(page.getByText("India today")).toHaveCount(0);
    const facts = page.locator("main dl").first();
    for (const term of ["Industry", "Revenue", "Headquarters"]) {
      await expect(facts.getByText(term, { exact: true })).toBeVisible();
    }
  });

  test("returns to the form with the answers still in it", async ({ page }) => {
    await page.goto("/");
    await ask(page, {
      industry: "BFSI",
      revenueBand: "Above $20 Bn",
      hqCountry: "Germany",
      companyName: "Northwind Financial",
    });
    await expect(page.getByRole("heading", { level: 1, name: /Northwind/ })).toBeVisible();

    await page.getByRole("button", { name: "Change these details" }).click();

    // Back on the form, and a correction starts from the last answer rather than
    // from an empty form.
    await expect(page.getByLabel(/^Company name/)).toHaveValue("Northwind Financial");
    await expect(page.getByLabel("Industry")).toHaveValue("BFSI");
    await expect(page.getByLabel("Annual revenue")).toHaveValue("Above $20 Bn");
    await expect(page.getByLabel("Headquarters")).toHaveValue("Germany");
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
    await expect(peers.getByRole("heading", { level: 4 })).toHaveCount(2);
    await expect(peers.getByRole("heading", { level: 4, name: "Barco" })).toBeVisible();
    await expect(
      peers.getByRole("heading", { level: 4, name: "Iskraemeco" }),
    ).toBeVisible();

    // One line, said plainly, reframed rather than apologised for. It states the
    // shortfall and does NOT narrate our own restraint — "we would rather show you
    // two defensible comparisons than pad the list" answered a question the reader
    // had not asked, and planted it by answering.
    await expect(peers.getByText(/Electrical & Electronics is thin in India/)).toBeVisible();
    await expect(peers.getByText(/Early ground, not absent ground/)).toBeVisible();
    await expect(peers.getByText(/pad/i)).toHaveCount(0);

    // The industry count degrades instead of reading "and 0 others" — and so does
    // its heading, which would otherwise claim the peers were a selection out of
    // something larger than the two companies printed above it.
    const industry = band(page, "industry");
    await expect(industry).toBeVisible();
    await expect(
      industry.getByRole("heading", { name: /All of Electrical & Electronics in India/ }),
    ).toBeVisible();
    await expect(
      industry.getByRole("heading", { name: /a selection, not the supply/ }),
    ).toHaveCount(0);
    await expect(
      industry.getByText(/that is all of them in our data/),
    ).toBeVisible();
    // The split collapses to the named peers alone rather than drawing an empty
    // remainder segment beside them.
    await expect(industry.getByText("Elsewhere in your industry")).toHaveCount(0);

    // The largest panel would be the same two companies, so it becomes a line.
    const largest = band(page, "largest");
    await expect(largest.getByText(/the same ones shown above/)).toBeVisible();
    await expect(largest.getByRole("heading", { level: 4 })).toHaveCount(0);

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
