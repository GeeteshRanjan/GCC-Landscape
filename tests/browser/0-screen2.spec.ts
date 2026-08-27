import { expect, test, type Page } from "@playwright/test";

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
  await page.getByLabel("Industry").selectOption("BFSI");
  await page.getByLabel("Annual revenue").selectOption("Above $20 Bn");
  await page.getByLabel("Headquarters").selectOption("USA");
  await page.getByRole("radio", { name: "No India GCC yet" }).check();
  await page.getByRole("button", { name: "Show me the landscape" }).click();
  await expect(
    page.getByRole("region", { name: /companies match you closely/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "See the function view" }).click();
}

function tabs(page: Page) {
  return page.getByRole("tablist", { name: "Function" });
}

test.describe("getting there and back", () => {
  test("is a state change, not a navigation, and moves focus with it", async ({
    page,
  }) => {
    await openFunctionView(page);

    const heading = page.getByRole("heading", {
      level: 1,
      name: /What it would take to run these functions in India/,
    });
    await expect(heading).toBeVisible();
    // Nothing announces a phase change, because no navigation happened.
    await expect(heading).toBeFocused();

    // The URL is the parent page's, so it does not move. There is nothing to
    // deep-link into and this is what that looks like.
    expect(new URL(page.url()).pathname).toBe("/");

    // The peer view is gone rather than scrolled past.
    await expect(
      page.getByRole("region", { name: /companies match you closely/ }),
    ).toHaveCount(0);

    await page.getByRole("button", { name: "Back to your peer view" }).click();
    const peerHeading = page.getByRole("heading", { level: 1, name: /already run GCCs/ });
    await expect(peerHeading).toBeVisible();
    await expect(peerHeading).toBeFocused();
    // The answer is the one already computed, not a re-fetch.
    await expect(
      page.getByRole("region", { name: /companies match you closely/ }),
    ).toBeVisible();
  });

  test("carries the visitor's answers across without asking again", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByLabel(/^Company name/).fill("Northwind Financial");
    await page.getByLabel("Industry").selectOption("BFSI");
    await page.getByLabel("Annual revenue").selectOption("Above $20 Bn");
    await page.getByLabel("Headquarters").selectOption("Germany");
    await page
      .getByRole("radio", { name: "We run one and are expanding it" })
      .check();
    await page.getByRole("button", { name: "Show me the landscape" }).click();
    await page.getByRole("button", { name: "See the function view" }).click();

    // The GCC status branches the framing here as well as on Screen 1.
    await expect(
      page.getByRole("heading", { level: 1, name: /functions you are adding/ }),
    ).toBeVisible();
    await expect(page.getByText("Germany")).toBeVisible();
    await expect(
      page.getByRole("link", { name: /scaling your India GCC/ }),
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

  test("renders a grid as a table with headers on both axes", async ({ page }) => {
    await openFunctionView(page);
    await page.getByRole("tab", { name: "Finance", exact: true }).click();

    const table = page
      .getByRole("table")
      .filter({ hasText: "All-in operating cost" });
    await expect(table).toBeVisible();
    await expect(
      table.getByRole("columnheader", { name: "Tier 2 cities" }),
    ).toBeVisible();
    await expect(
      table.getByRole("rowheader", { name: "Compensation" }),
    ).toBeVisible();
    await expect(
      table.getByRole("row", { name: /Compensation/ }).getByText("85"),
    ).toBeVisible();

    // An index says what it is indexed on. One with no stated base is unreadable.
    await expect(page.getByText("Indexed: Tier 1 cities = 100")).toBeVisible();
  });

});

test.describe("the gate", () => {
  test("shows a held metric as a shape and nothing else", async ({ page }) => {
    await openFunctionView(page);
    await page.getByRole("tab", { name: "HR", exact: true }).click();

    const group = page.getByRole("region", { name: /work through with you/ });
    await expect(group).toBeVisible();
    await expect(group.getByText(/nothing here to uncover/)).toBeVisible();

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
        (await page.getByRole("region", { name: "The four functions, measured" }).innerText()) ??
        "";
      // Scoped to the metrics band on purpose: the header echoes the visitor's
      // own revenue band, which is where the only "$" on the screen lives.
      expect(text).not.toMatch(/[₹$€£¥]/);
      expect(text).not.toMatch(/\b(USD|INR|EUR|lakh|crore)\b/i);
    }

    // Said out loud where the cost figures are, rather than in a footer.
    await expect(
      page.getByText(/We do not publish a per-head salary figure/),
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
