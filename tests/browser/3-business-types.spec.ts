import { expect, test } from "@playwright/test";

import { waitForDraftSaved } from "./helpers";

/**
 * The admin business-types tab, and the company table's line-of-business column.
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
  await expect(page.getByText(/158 business types/)).toBeVisible();

  await page.getByLabel("Filter by industry").selectOption("Retail");
  await expect(page.getByText(/10 business types/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: /^Edit Apparel & footwear brand \(Retail\)$/ }),
  ).toBeVisible();
});

test("the company table shows the line of business, and finds it by name", async ({
  page,
}) => {
  await page.goto("/admin");

  // Named, not counted: peer similarity is driven entirely by this column, so an
  // admin has to be able to read it without opening the editor.
  await page.getByLabel("Search").fill("Nike");
  await expect(
    page.getByRole("cell", { name: "Apparel & footwear brand" }).first(),
  ).toBeVisible();

  // Searching the business-type NAME is how a tagging decision gets checked in bulk
  // rather than one row at a time.
  await page.getByLabel("Search").fill("Sportswear & athletic");
  await expect(page.getByRole("cell", { name: /Sportswear & athletic brand/ }).first()).toBeVisible();

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
    .getByRole("button", { name: /^Edit Apparel & footwear brand \(Retail\)$/ })
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
