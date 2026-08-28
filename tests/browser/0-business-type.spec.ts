import { expect, test } from "@playwright/test";

/**
 * The line-of-business input, against a real production build.
 *
 * Numbered `0-` so it lands in the `public` project and runs before
 * `5-publish.spec.ts` rewrites the fixture dataset — the counts asserted here are
 * the seeded ones. A spec numbered outside every project's `testMatch` silently
 * never runs; see playwright.config.ts.
 *
 * What only a browser can cover, and therefore what is here: the select repopulating
 * when industry changes, a stale selection being cleared rather than submitted, the
 * enabling being ANNOUNCED rather than silent, and the peer set actually changing.
 * The scoring itself is unit-tested in tests/unit/similarity.
 */

const CONTROL = /^Line of business/;

async function chooseIndustry(page: import("@playwright/test").Page, industry: string) {
  await page.getByLabel("Industry").selectOption(industry);
}

async function submit(
  page: import("@playwright/test").Page,
  options: { businessType?: string } = {},
) {
  await page.getByLabel("Annual revenue").selectOption("Above $20 Bn");
  await page.getByLabel("Headquarters").selectOption("USA");
  if (options.businessType) {
    await page.getByLabel(CONTROL).selectOption({ label: options.businessType });
  }
  await page.getByRole("radio", { name: "No India GCC yet" }).check();
  await page.getByRole("button", { name: "Show me the landscape" }).click();
}

test("is disabled until an industry is chosen, and says so", async ({ page }) => {
  await page.goto("/");

  const control = page.getByLabel(CONTROL);
  await expect(control).toBeDisabled();
  await expect(page.getByText("Available once you choose an industry.")).toBeVisible();

  await chooseIndustry(page, "Retail");
  await expect(control).toBeEnabled();
  // The enabling is announced through an aria-live region rather than left silent,
  // which is the whole reason the control is rendered disabled from the start
  // instead of appearing on selection and shifting the form under the visitor.
  //
  // The subject is that the region SAYS something once the control is live, not the
  // sentence it says, so the pattern stops at the count and does not anchor on the
  // punctuation after it. Anchoring on a full stop is what broke this on a copy pass
  // that only replaced the clause following it.
  await expect(page.getByText(/\d+ to choose from/)).toBeVisible();
});

test("repopulates when the industry changes and drops a stale selection", async ({
  page,
}) => {
  await page.goto("/");

  await chooseIndustry(page, "Retail");
  const control = page.getByLabel(CONTROL);
  await control.selectOption({ label: "Apparel & footwear brand" });
  await expect(control).not.toHaveValue("");

  // Retail's options cannot exist under another industry, so the selection has to
  // clear. Left in place the server rejects it — correctly, since ignoring it would
  // return an industry-wide peer set while the visitor believes they narrowed it.
  await chooseIndustry(page, "BFSI");
  await expect(control).toHaveValue("");
  await expect(control.getByRole("option", { name: "Apparel & footwear brand" })).toHaveCount(0);
  await expect(control.getByRole("option", { name: "Retail & commercial banking" })).toHaveCount(1);
});

test("skipping it returns the same peers as before the field existed", async ({
  page,
}) => {
  await page.goto("/");
  await chooseIndustry(page, "Retail");
  await submit(page);

  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  // The industry-level split, not the business-type one: two segments rather than
  // three, because there is no line of business to draw a middle band from.
  const industry = page.locator("#industry");
  await expect(
    industry.getByText(/Retail companies already run a centre in India/),
  ).toBeVisible();
  await expect(industry.getByText("Named above")).toBeVisible();
  await expect(industry.getByText("Elsewhere in your industry")).toBeVisible();
  await expect(
    industry.getByText("More in a comparable line of business"),
  ).toHaveCount(0);
});

test("choosing it narrows the peer set to the same line of business", async ({
  page,
}) => {
  await page.goto("/");
  await chooseIndustry(page, "Retail");
  await submit(page, { businessType: "Apparel & footwear brand" });

  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  // The three-level split replaces the two-level one: the named peers, the rest of
  // the population they were drawn from, then the rest of the industry. That middle
  // segment is what turns a thin peer set into evidence.
  const industry = page.locator("#industry");
  await expect(
    industry.getByText("More in a comparable line of business"),
  ).toBeVisible();
  // And the method line names what the peers share rather than a revenue band the
  // peer cards do not even display.
  await expect(page.getByText(/Matched on line of business/)).toBeVisible();

  /*
    The original complaint, asserted directly: a home-improvement chain is not a
    peer for an apparel brand. Lowe's is in Retail and in this exact revenue band,
    so under band-only matching it is a top peer.

    Scoped to the PEER LIST, not the page. Lowe's still appears further down in the
    largest-in-industry panel, and that is correct — that block is the aspirational
    anchor and is deliberately industry-wide, so a page-wide assertion would fail
    on intended behaviour and then get "fixed" by weakening the wrong thing.
  */
  // Direct children only: each peer card contains its own city list, so a
  // descendant `listitem` query counts ten for five cards.
  const peerCards = page.locator("ul").first().locator("> li");
  await expect(peerCards).toHaveCount(5);
  await expect(peerCards.filter({ hasText: "Lowe's" })).toHaveCount(0);
});

/**
 * The peer block must not contradict itself.
 *
 * This is the check that was missing. The section's lead was a hardcoded "Same
 * industry, closest revenue band, and companies from your own market first" while
 * the method line three lines below it said revenue band is a preference and a
 * closer business beats a closer size. Both sentences rendered on the same card
 * for months. 336 unit tests and 110 browser tests passed throughout, because
 * nothing asserted the lead — it was found by hand on production.
 *
 * It is also demonstrably false rather than merely stale: this exact peer set puts
 * H&M (Sweden) and Adidas (Germany) above GAP (USA) for a US visitor, so
 * own-market-first is not what happened.
 */
test("the peer block's lead agrees with its method line", async ({ page }) => {
  await page.goto("/");
  await chooseIndustry(page, "Retail");
  await submit(page, { businessType: "Apparel & footwear brand" });

  const peers = page.locator("#peers");
  await expect(peers).toBeVisible();
  const block = (await peers.innerText()).replace(/\s+/g, " ");

  // The method line's claim.
  expect(block).toMatch(/Revenue band is a preference rather than a filter/);

  // The two claims the old lead made, which contradict it.
  expect(block).not.toMatch(/closest revenue band/i);
  expect(block).not.toMatch(/own market first/i);

  // And the lead leads on what actually decided the set. Asserted as an ORDER
  // rather than a phrase: the wording is a copywriter's to change, but "business
  // before size" is the ranking and has to stay true of the sentence describing it.
  expect(block).toMatch(/business/i);
  expect(block.search(/business/i)).toBeLessThan(block.search(/then by size/i));
});

test("the tag vocabulary never reaches the browser", async ({ page }) => {
  await page.goto("/");
  await chooseIndustry(page, "Retail");
  await submit(page, { businessType: "Apparel & footwear brand" });

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
