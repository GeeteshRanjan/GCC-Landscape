import { expect, test } from "@playwright/test";

import { discardEverything, waitForDraftSaved } from "./helpers";

/**
 * The taxonomy editor. Two things here are genuinely dangerous rather than
 * merely fiddly, and both are the point of this file:
 *
 *   - Revenue band order is the contract for adjacent-band peer matching, so the
 *     editor must let it be reordered and must never sort it.
 *   - Renaming a value has to cascade into every company that referenced it, or
 *     the publish fails referential integrity and the rename looked successful.
 *
 * Everything is discarded afterwards; 4-publish.spec.ts owns the writing.
 */

function section(page: import("@playwright/test").Page, heading: string) {
  return page.getByRole("region").filter({ has: page.getByRole("heading", { name: heading }) });
}

test.afterEach(async ({ page }) => {
  await discardEverything(page);
});

test("all four lists are editable, with usage counts", async ({ page }) => {
  await page.goto("/admin/taxonomy");

  for (const heading of ["Industries", "Revenue bands", "India cities", "HQ countries"]) {
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
  }
  // A count is what makes a delete decision possible.
  await expect(page.getByText(/\d+,?\d* rows/).first()).toBeVisible();
});

test.describe("revenue bands — order is the contract", () => {
  test("are shown in stored order, not alphabetical", async ({ page }) => {
    await page.goto("/admin/taxonomy");
    const bands = await section(page, "Revenue bands").locator("li span.flex-1").allTextContents();

    expect(bands[0]).toBe("< $100 Mn");
    expect(bands.at(-1)).toBe("Above $20 Bn");
    // The concrete tell: alphabetical would put "$10 Bn – $20 Bn" second.
    expect(bands[1]).not.toBe("$10 Bn – $20 Bn");
    expect([...bands].sort()).not.toEqual(bands);
  });

  test("say out loud that the order means something", async ({ page }) => {
    await page.goto("/admin/taxonomy");
    const bandSection = section(page, "Revenue bands");

    await expect(bandSection.getByText("Order is meaningful")).toBeVisible();
    await expect(bandSection).toContainText("lowest to highest");
  });

  test("can be reordered from the keyboard, and the change registers", async ({ page }) => {
    await page.goto("/admin/taxonomy");
    const bandSection = section(page, "Revenue bands");
    const before = await bandSection.locator("li span.flex-1").allTextContents();

    // Buttons, not drag and drop, so this works without a pointer.
    await bandSection.getByRole("button", { name: `Move ${before[1]} up` }).click();

    const after = await bandSection.locator("li span.flex-1").allTextContents();
    expect(after[0]).toBe(before[1]);
    expect(after[1]).toBe(before[0]);
    await expect(page.getByText("You have unpublished changes.")).toBeVisible();
  });

  test("cannot be moved off either end", async ({ page }) => {
    await page.goto("/admin/taxonomy");
    const bandSection = section(page, "Revenue bands");
    const bands = await bandSection.locator("li span.flex-1").allTextContents();

    await expect(
      bandSection.getByRole("button", { name: `Move ${bands[0]} up` }),
    ).toBeDisabled();
    await expect(
      bandSection.getByRole("button", { name: `Move ${bands.at(-1) as string} down` }),
    ).toBeDisabled();
  });

  test("a new band lands at the end rather than being sorted into place", async ({ page }) => {
    await page.goto("/admin/taxonomy");
    const bandSection = section(page, "Revenue bands");

    await bandSection.getByLabel("New revenue band").fill("$20 Bn – $50 Bn");
    await bandSection.getByRole("button", { name: "Add" }).click();

    const bands = await bandSection.locator("li span.flex-1").allTextContents();
    expect(bands.at(-1)).toBe("$20 Bn – $50 Bn");
    await expect(bandSection.getByText("Added at the end")).toBeVisible();
  });
});

test("adding a value makes it available to the company editor immediately", async ({ page }) => {
  await page.goto("/admin/taxonomy");
  const cities = section(page, "India cities");

  await cities.getByLabel("New city").fill("Testville");
  await cities.getByRole("button", { name: "Add" }).click();
  // Scoped to the list row: the value also appears in the input that created it
  // and in the delete button's accessible name.
  const row = cities.locator("li").filter({ hasText: "Testville" });
  await expect(row.locator("span.flex-1")).toHaveText("Testville");
  await expect(row).toContainText("not used");

  // The dropdowns read the taxonomy, so no code change is involved.
  await page.getByRole("link", { name: "Companies" }).click();
  await page.getByLabel("Search").fill("3M");
  await page.getByRole("button", { name: /^Edit 3M/ }).first().click();
  await page.getByLabel("Find a city").fill("Testville");
  await expect(page.getByRole("checkbox", { name: "Testville" })).toBeVisible();
});

test("a duplicate value is refused with a reason", async ({ page }) => {
  await page.goto("/admin/taxonomy");
  const cities = section(page, "India cities");

  await cities.getByLabel("New city").fill("Bengaluru");
  await cities.getByRole("button", { name: "Add" }).click();

  await expect(cities.getByRole("alert")).toContainText("already in this list");
});

test("an empty value is refused", async ({ page }) => {
  await page.goto("/admin/taxonomy");
  const cities = section(page, "India cities");

  await cities.getByLabel("New city").fill("   ");
  await cities.getByRole("button", { name: "Add" }).click();
  await expect(cities.getByRole("alert")).toContainText("Enter a value");
});

test("deleting an unused value works; an in-use one is refused with the count", async ({ page }) => {
  await page.goto("/admin/taxonomy");
  const cities = section(page, "India cities");

  await cities.getByLabel("New city").fill("Deleteme");
  await cities.getByRole("button", { name: "Add" }).click();
  await cities.getByRole("button", { name: /^Delete Deleteme/ }).click();
  await expect(cities.getByText("Deleteme")).toHaveCount(0);

  // Bengaluru has over a thousand rows. Deleting it would fail the publish gate
  // on referential integrity, so it is refused here where the reason can be given.
  const inUse = cities.getByRole("button", { name: /^Delete Bengaluru/ });
  await expect(inUse).toHaveAttribute("aria-disabled", "true");
  await expect(inUse).toHaveAttribute("title", /In use by [\d,]+ rows?/);

  const industries = section(page, "Industries");
  const bengaluruRowsBefore = await cities.locator("li").filter({ hasText: "Bengaluru" }).textContent();
  await inUse.click({ force: true });
  // Nothing happened.
  expect(
    await cities.locator("li").filter({ hasText: "Bengaluru" }).textContent(),
  ).toBe(bengaluruRowsBefore);
  await expect(industries).toBeVisible();
});

test("renaming cascades into the companies that used the old value", async ({ page }) => {
  await page.goto("/admin/taxonomy");
  const industries = section(page, "Industries");

  const firstRow = industries.locator("li").first();
  const original = (await firstRow.locator("span.flex-1").textContent()) ?? "";
  const usage = (await firstRow.locator("span.text-xs").textContent()) ?? "";
  const renamed = `${original} Renamed`;

  await firstRow.getByRole("button", { name: new RegExp(`^Rename ${original}`) }).click();
  const field = industries.getByLabel(`Rename ${original}`);
  await field.fill(renamed);
  await industries.getByRole("button", { name: "Save" }).click();

  // Same row count under the new name is the cascade: without it the count would
  // drop to "not used" and the publish would fail referential integrity.
  const updated = industries.locator("li").filter({ hasText: renamed }).first();
  await expect(updated.locator("span.text-xs")).toHaveText(usage);
  await expect(industries.getByText(original, { exact: true })).toHaveCount(0);

  // And the publish gate agrees the dataset is still coherent. A full load, so
  // the draft has to have reached localStorage first.
  await waitForDraftSaved(page);
  await page.goto("/admin/publish");
  await expect(page.getByRole("button", { name: "Publish changes" })).toBeEnabled();
  await expect(page.getByText("Not published")).toHaveCount(0);
});

test("a rename can be cancelled without changing anything", async ({ page }) => {
  await page.goto("/admin/taxonomy");
  const industries = section(page, "Industries");
  const firstRow = industries.locator("li").first();
  const original = (await firstRow.locator("span.flex-1").textContent()) ?? "";

  await firstRow.getByRole("button", { name: new RegExp(`^Rename ${original}`) }).click();
  await industries.getByLabel(`Rename ${original}`).fill("Something Else Entirely");
  await industries.getByRole("button", { name: "Cancel" }).click();

  await expect(industries.getByText(original, { exact: true }).first()).toBeVisible();
  await expect(page.getByText("You have unpublished changes.")).toHaveCount(0);
});
