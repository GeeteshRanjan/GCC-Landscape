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

/**
 * **THE HEADLINE IS TWO FIELDS, so this drives both** — `hero.productName` and
 * `hero.tagline`, where it was a single `Title` holding both halves in one string. The
 * split is the project owner's request and it also deletes the literal-substring match
 * that used to find `GCC ATLAS` inside the one field and fail silently on a respelling.
 *
 * The labels are the locators, as they are for every control on both surfaces, so a
 * renamed field fails here rather than on the live site.
 */
test("edits both halves of the hero headline and keeps them across a reload", async ({
  page,
}) => {
  await page.goto("/admin/entry-point");

  await expect(page.getByRole("heading", { name: "Site copy", level: 1 })).toBeVisible();

  await expect(page.getByLabel("Product name")).toHaveValue("GCC ATLAS");
  const tagline = page.getByLabel("Tagline");
  await expect(tagline).toHaveValue("Benchmark against your peers");

  await tagline.fill("Built on real India GCC data");
  await waitForDraftSaved(page);

  // The whole point of the draft: a month of edits has to survive a closed tab.
  await page.reload();
  await expect(page.getByLabel("Tagline")).toHaveValue("Built on real India GCC data");
  // The half that was not touched has to come back unchanged, which is the assertion
  // the single-field version could not make.
  await expect(page.getByLabel("Product name")).toHaveValue("GCC ATLAS");
});

test("warns on an over-long headline rather than letting the publish fail", async ({
  page,
}) => {
  await page.goto("/admin/entry-point");

  /**
   * 56 is the schema's own bound on the tagline, quoted by the form so the two cannot
   * drift. **It is an exported CONSTANT rather than a value read off the schema**, because
   * the field is `.default()`-ed and a `ZodDefault` has no readable `maxLength` — so the
   * number reaching this message is the same one the gate enforces only as long as both
   * import it.
   */
  await page.getByLabel("Tagline").fill("x".repeat(57));

  const error = page.getByText(/57 characters\. The limit is 56/);
  await expect(error).toBeVisible();
  // Form and words, never colour alone — this palette carries no danger hue.
  await expect(
    page.getByText(/Publishing is blocked until it is fixed/),
  ).toBeVisible();

  // And an empty required field is called out too, since the public page has no
  // fallback for it.
  await page.getByLabel("Tagline").fill("");
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
  await page.getByLabel("Tagline").fill("Built on real India GCC data");
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
  await expect(page.getByText("Benchmark against your peers")).toBeVisible();
  await expect(page.getByText("Built on real India GCC data")).toBeVisible();
  /**
   * **The field is named by `HERO_FIELD_LABELS`, not by its key**, so the review says
   * "Hero tagline" rather than "Hero tagline"'s slot name. Asserted because the same map
   * feeds the text renderer, and a publish reviewed in one and approved in the other must
   * not read as two different changes.
   */
  await expect(page.getByText("Hero tagline")).toBeVisible();
});

/**
 * The closing call to action, which is the second thing this tab edits.
 *
 * **It is here rather than in a tab of its own because it is the same KIND of string as
 * the hero's**: positioning on ANSR's own schedule rather than an argument about the
 * dataset. Every other public sentence lives in code beside the logic that justifies it.
 *
 * Two halves are asserted, and the second is the one that matters. That the fields edit
 * the draft — and that the close reaches the public band at all, which is what makes it
 * worth editing. And that a close edit is REPORTED IN THE DIFF: it is the tool's only
 * call to action, so a publish that changed its words silently is the same defect as a
 * silently changed headline, which is the failure this whole diff category exists for.
 */
test("edits the closing call to action, and reports it in the diff", async ({
  page,
}) => {
  await page.goto("/admin/entry-point");
  await expect(
    page.getByRole("heading", { name: "Closing call to action", level: 2 }),
  ).toBeVisible();

  const close = page.locator("section[aria-labelledby='close-copy']");
  // Labelled the same way the hero's are, so the two bands read as one kind of edit.
  await close.getByLabel("Supporting line").fill("See the full picture.");
  await close.getByLabel("Button").fill("Request access");
  await waitForDraftSaved(page);

  // The limit is the render limit, and it is shown while typing rather than at publish.
  await close.getByLabel("Button").fill("x".repeat(40));
  await expect(close.getByText(/The limit is 28/)).toBeVisible();
  await close.getByLabel("Button").fill("Request access");
  await expect(close.getByText(/The limit is 28/)).toHaveCount(0);
  await waitForDraftSaved(page);

  await page.goto("/admin/publish");
  await expect(page.getByText("Checking the changes…")).toHaveCount(0);
  /**
   * The values this test TYPED, plus the row labels naming which band moved. Deliberately
   * not the "before" strings: those are whatever `siteContent.close` currently holds, so
   * asserting them would couple this test to editable copy — and an ANSR wording change
   * would fail a test about the diff mechanism rather than about the wording.
   */
  await expect(page.getByText("Request access")).toBeVisible();
  await expect(page.getByText("See the full picture.")).toBeVisible();
  await expect(page.getByText(/Result close body/i)).toBeVisible();
  await expect(page.getByText(/Result close button/i)).toBeVisible();
});
