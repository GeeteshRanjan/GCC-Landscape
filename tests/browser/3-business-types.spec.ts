import { expect, test } from "@playwright/test";

import { waitForDraftSaved } from "./helpers";

/**
 * The admin business-types tab, and the company table's sub-industry column.
 *
 * Numbered `3-` so it lands in the `admin` project (`[2345]-`) and runs before
 * `5-publish.spec.ts` mutates the fixture dataset. A spec numbered outside every
 * project's `testMatch` silently never runs; see playwright.config.ts.
 *
 * What only a browser can cover: that a tag edit is reported by the publish diff even
 * though no company row moved, and that removing a type degrades its companies rather
 * than leaving them pointing at nothing — which the schema would reject at publish.
 */

test("lists the catalogue and filters it by industry", async ({ page }) => {
  await page.goto("/admin/business-types");

  await expect(page.getByRole("heading", { name: "Business types", level: 1 })).toBeVisible();
  await expect(page.getByText(/164 business types/)).toBeVisible();

  await page.getByLabel("Filter by industry").selectOption("Retail");
  await expect(page.getByText(/10 business types/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: /^Edit Apparel & Footwear Brand \(Retail\)$/ }),
  ).toBeVisible();
});

test("the company table shows the sub-industry, and finds it by name", async ({
  page,
}) => {
  await page.goto("/admin");

  // Named, not counted: peer similarity is driven entirely by this column, so an
  // admin has to be able to read it without opening the editor.
  await page.getByLabel("Search").fill("Nike");
  await expect(
    page.getByRole("cell", { name: "Apparel & Footwear Brand" }).first(),
  ).toBeVisible();

  // Searching the business-type NAME is how a tagging decision gets checked in bulk
  // rather than one row at a time.
  await page.getByLabel("Search").fill("Sportswear & athletic");
  await expect(page.getByRole("cell", { name: /Sportswear & Athletic Brand/ }).first()).toBeVisible();

  // Untagged is a real state, not missing data, and has to look different from blank.
  await page.getByLabel("Search").fill("not set");
  await expect(page.getByRole("cell", { name: "Not set" }).first()).toBeVisible();
});

test("a tag edit is reported by the publish diff with no company row touched", async ({
  page,
}) => {
  await page.goto("/admin/business-types");
  await page.getByLabel("Filter by industry").selectOption("Retail");
  await page
    .getByRole("button", { name: /^Edit Apparel & Footwear Brand \(Retail\)$/ })
    .click();

  await page.getByRole("checkbox", { name: /^luxury/ }).check();
  await page.getByRole("button", { name: "Save to draft" }).click();
  await waitForDraftSaved(page);

  await page.goto("/admin/publish");
  // The whole reason the diff has a business-types section: this edit changes which
  // five companies a visitor from an apparel brand sees, and moves no company row.
  await expect(page.getByRole("heading", { name: /Business types/ })).toBeVisible();
  await expect(page.getByText("ret-apparel")).toBeVisible();
  await expect(page.getByRole("heading", { name: /^Edited \(/ })).toHaveCount(0);

  await page.getByRole("button", { name: "Discard all changes" }).click();
});

test("refuses a type with fewer than two tags, and explains why", async ({ page }) => {
  await page.goto("/admin/business-types");
  await page.getByRole("button", { name: "Add a business type" }).click();

  await page.getByLabel("Name").fill("Quick commerce");
  // The form own select, distinct from the list "Filter by industry".
  await page.getByLabel("Belongs to industry").selectOption("Retail");
  await expect(page.getByText('Id will be "quick-commerce"')).toBeVisible();

  await page.getByRole("checkbox", { name: /^ecommerce/ }).check();
  await page.getByRole("button", { name: "Add to draft" }).click();

  // One tag would match either everything in the industry or nothing at all.
  // Scoped to the field error: Next's route announcer is also role=alert.
  await expect(page.locator("p[role=alert]")).toContainText("at least two tags");
});

/**
 * A TAG OF THE ADMIN'S OWN, which the vocabulary used to refuse.
 *
 * Three things only a browser can check here: that the slug is shown BEFORE the tag is
 * added (so `Quick Commerce` becoming `quick-commerce` is visible and rejectable rather
 * than happening silently at the publish gate), that the nudge fires and says the right
 * thing, and that the tag then reaches the publish diff as a real change.
 *
 * The nudge's WORDING is the part worth guarding. This page used to claim a tag on one
 * type "has no effect at all", which is backwards — IDF makes a rare tag the most
 * influential thing in its pool, which is why `capCustomTagWeights` exists. Asserting the
 * correct direction is what stops the old sentence coming back.
 */
test("adds a tag of its own, shows the slug first, and nudges rather than refusing", async ({
  page,
}) => {
  await page.goto("/admin/business-types");
  await page.getByLabel("Filter by industry").selectOption("Retail");
  await page
    .getByRole("button", { name: /^Edit Apparel & Footwear Brand \(Retail\)$/ })
    .click();

  const field = page.getByLabel("Add a tag of your own");
  await field.fill("Quick Commerce");

  // The slug, before anything is committed. A normaliser that ran silently is how one
  // idea ends up as two tags.
  await expect(page.getByText('Will be added as "quick-commerce".')).toBeVisible();

  // The nudge, in the direction that is actually true.
  await expect(page.getByText("No other business type carries this.")).toBeVisible();
  await expect(page.getByText(/STRONGEST signal in its industry/)).toBeVisible();

  await page.getByRole("button", { name: "Add tag" }).click();
  await expect(page.getByRole("checkbox", { name: /^quick-commerce/ })).toBeChecked();

  await page.getByRole("button", { name: "Save to draft" }).click();
  await waitForDraftSaved(page);

  await page.goto("/admin/publish");
  // A tag edit re-scores the industry, so it is a real change however invisible the row is.
  await expect(page.getByRole("heading", { name: /Business types/ })).toBeVisible();
  await expect(page.getByText("quick-commerce")).toBeVisible();

  await page.getByRole("button", { name: "Discard all changes" }).click();
});

test("refuses a tag that is not a slug, by normalising it into one", async ({ page }) => {
  await page.goto("/admin/business-types");
  await page.getByRole("button", { name: "Add a business type" }).click();

  const field = page.getByLabel("Add a tag of your own");
  // Punctuation and case collapse; a value that normalises to nothing cannot be added.
  await field.fill("!!!");
  await expect(page.getByRole("button", { name: "Add tag" })).toBeDisabled();

  await field.fill("Direct  To   Consumer");
  await expect(page.getByText('Will be added as "direct-to-consumer".')).toBeVisible();
});
