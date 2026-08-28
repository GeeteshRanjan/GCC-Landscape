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
    status?: string;
  },
): Promise<void> {
  if (options.companyName) {
    await page.getByLabel(/^Company name/).fill(options.companyName);
  }
  await page.getByLabel("Industry").selectOption(options.industry);
  await page.getByLabel("Annual revenue").selectOption(options.revenueBand);
  await page.getByLabel("Headquarters").selectOption(options.hqCountry ?? "USA");
  await page.getByRole("radio", { name: options.status ?? "No India GCC yet" }).check();
  await page.getByRole("button", { name: "Show me the landscape" }).click();
}

test.describe("the ask", () => {
  test("offers exactly the six inputs, and asks for no revenue figure", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: /already runs a GCC in India/,
      }),
    ).toBeVisible();

    await expect(page.getByLabel(/^Company name/)).toBeVisible();
    await expect(page.getByLabel("Industry")).toBeVisible();
    // The sixth input. This test was named "the five inputs" and never asserted
    // it, so nothing here would have noticed the field disappearing. A count in a
    // test name has to match the list beneath it or the name is decoration.
    await expect(page.getByLabel(/^Line of business/)).toBeVisible();
    await expect(page.getByLabel("Annual revenue")).toBeVisible();
    await expect(page.getByLabel("Headquarters")).toBeVisible();
    await expect(
      page.getByRole("group", { name: "Where are you with India today?" }),
    ).toBeVisible();

    // Five named controls plus the radio group, and no seventh: a field added
    // without a consumer should fail here rather than ship silently.
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

  test("validates on submit and puts focus on the first problem", async ({
    page,
  }) => {
    await page.goto("/");

    const submit = page.getByRole("button", { name: "Show me the landscape" });
    // Enabled before the form is valid: disabling it leaves a keyboard user with
    // no way to find out what is wrong.
    await expect(submit).toBeEnabled();
    await submit.click();

    await expect(page.getByText("Choose one to continue.").first()).toBeVisible();
    // First invalid control in DOM order is the industry select.
    await expect(page.getByLabel("Industry")).toBeFocused();

    // Still on the form; nothing was submitted.
    await expect(
      page.getByRole("heading", { level: 1, name: /already runs a GCC in India/ }),
    ).toBeVisible();
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

  test("branches the framing on the GCC status input", async ({ page }) => {
    await page.goto("/");
    await ask(page, {
      industry: "BFSI",
      revenueBand: "Above $20 Bn",
      status: "We run one and are expanding it",
    });

    await expect(
      page.getByRole("heading", { level: 1, name: /ground you are expanding into/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /scaling your India GCC/ }),
    ).toBeVisible();
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
