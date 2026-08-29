import { expect, test } from "@playwright/test";

import { discardEverything, waitForDraftSaved } from "./helpers";

/**
 * The entry-point editor: the public hero's two lines, and ANSR's impact figures.
 *
 * Numbered `4-` so it lands in the `admin` project (whose `testMatch` is a
 * character class) and ahead of `5-publish`, which is the spec that owns writing to
 * the fixture. Everything here is discarded afterwards.
 *
 * What only a browser can cover, and why each of these is worth a test rather than
 * a reading:
 *
 *   - **This editor has no local form state and no Save button**, unlike the metric
 *     editor. Each control writes straight to the draft. That is a deliberate
 *     difference — nothing here has a cross-field rule that has to land as one edit
 *     — but it means the autosave is the only thing between a typed headline and a
 *     lost one, so "does an edit make the draft dirty and survive a reload" is the
 *     first thing to check.
 *   - **A new editable collection means an older draft is missing a key.** The
 *     provider's `STORAGE_KEY` moved to v4 for that reason, and `helpers.ts` mirrors
 *     it. If the two ever disagree, the draft tests pass while reading a key nothing
 *     writes.
 *   - **The publish gate and the editor's own warning have to agree.** The gate is
 *     the schema; the editor quotes the same schema for its bounds. A form that says
 *     "fine" for something the publish endpoint rejects is worse than no warning.
 */

test.afterEach(async ({ page }) => {
  await discardEverything(page);
});

test("edits the hero copy and keeps it across a reload", async ({ page }) => {
  await page.goto("/admin/entry-point");

  await expect(page.getByRole("heading", { name: "Entry point", level: 1 })).toBeVisible();

  const title = page.getByLabel("Title");
  await expect(title).toHaveValue("India GCC Intelligence");

  await title.fill("India GCC Benchmarks");
  await waitForDraftSaved(page);

  // The whole point of the draft: a month of edits has to survive a closed tab.
  await page.reload();
  await expect(page.getByLabel("Title")).toHaveValue("India GCC Benchmarks");
});

test("warns on an over-long headline rather than letting the publish fail", async ({
  page,
}) => {
  await page.goto("/admin/entry-point");

  // 60 is the schema's own bound, quoted by the form so the two cannot drift.
  await page.getByLabel("Title").fill("x".repeat(61));

  const error = page.getByText(/61 characters\. The limit is 60/);
  await expect(error).toBeVisible();
  // Form and words, never colour alone — this palette carries no danger hue.
  await expect(
    page.getByText(/Publishing is blocked until it is fixed/),
  ).toBeVisible();

  // And an empty required field is called out too, since the public page has no
  // fallback for it.
  await page.getByLabel("Title").fill("");
  await expect(page.getByText(/Required — the public page has no fallback/)).toBeVisible();
});

test("adds, edits, reorders and removes an impact figure", async ({ page }) => {
  await page.goto("/admin/entry-point");

  const figures = page.getByRole("listitem");
  await expect(figures).toHaveCount(5);

  // Order is what a visitor reads left to right, so it has to be settable.
  await expect(figures.first().getByLabel("Figure")).toHaveValue("225K+");
  await figures.nth(1).getByRole("button", { name: /Move .* earlier/ }).click();
  await expect(figures.first().getByLabel("Figure")).toHaveValue("210+");

  // The first row cannot move up and the last cannot move down, rather than the
  // buttons silently doing nothing.
  await expect(
    figures.first().getByRole("button", { name: /Move .* earlier/ }),
  ).toBeDisabled();
  await expect(
    figures.last().getByRole("button", { name: /Move .* later/ }),
  ).toBeDisabled();

  await page.getByRole("button", { name: "Add a figure" }).click();
  await expect(figures).toHaveCount(6);
  // Six is the cap: past that the public row either wraps to a second line of one
  // figure or shrinks them all below the size that makes a figure read as a figure.
  await expect(page.getByRole("button", { name: "Add a figure" })).toBeDisabled();

  // A new row is empty, which is a blocked state until it is filled — the editor
  // says so rather than publishing a blank figure.
  await expect(
    page.getByText(/Publishing is blocked until it is fixed/),
  ).toBeVisible();

  await figures.last().getByRole("button", { name: /Remove/ }).click();
  await expect(figures).toHaveCount(5);
  await expect(
    page.getByText(/Publishing is blocked until it is fixed/),
  ).toHaveCount(0);
});

test("shows the entry point in the publish diff, with both sides of the copy", async ({
  page,
}) => {
  await page.goto("/admin/entry-point");
  await page.getByLabel("Title").fill("India GCC Benchmarks");
  await waitForDraftSaved(page);

  // The panel fetches the diff on arrival rather than behind a button, so there is
  // nothing to press — just the loading state to wait past.
  await page.goto("/admin/publish");
  await expect(page.getByText("Checking the changes…")).toHaveCount(0);

  /**
   * The reason this section exists at all: every other part of a publish changes
   * what SOME visitor is shown after they answer the form, while this changes the
   * first thing all of them read. An edit here that the diff did not report would
   * be a headline changed on the live site with nothing in the review saying so.
   */
  await expect(page.getByText("India GCC Intelligence")).toBeVisible();
  await expect(page.getByText("India GCC Benchmarks")).toBeVisible();
});
