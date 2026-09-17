import { expect, test } from "@playwright/test";

import { waitForDraftSaved } from "./helpers";

/**
 * Pinned peer sets: the admin surface that overrules the scoring engine.
 *
 * Numbered `3-` so it lands in the `admin` project (`[2345]-`) and runs before
 * `5-publish.spec.ts` rewrites the fixture dataset. A spec numbered outside every
 * project's `testMatch` silently never runs; see playwright.config.ts.
 *
 * What only a browser can cover, and therefore what is here: that the candidate list is
 * actually populated from the engine and marks what it would have shown, that the
 * already-pinned cue fires on a combination a BROADER row already covers, and that the
 * publish diff reports the change even though no company row moved. The matching itself,
 * the precedence rules and every schema refusal are unit-tested in
 * `tests/unit/peer-overrides.test.ts`, which is where they can be varied without driving
 * a browser.
 *
 * Every test that dirties the draft discards it at the end, because the specs after this
 * one read the same fixture.
 */

test("starts empty, and says that is the healthy state", async ({ page }) => {
  await page.goto("/admin/peer-overrides");

  await expect(
    page.getByRole("heading", { name: "Pinned peer sets", level: 1 }),
  ).toBeVisible();
  // The fixture pins nothing, which is the shipped state — the engine is right almost
  // everywhere and this page should stay near-empty.
  await expect(page.getByText("Nothing is pinned")).toBeVisible();
});

test("is reachable from the nav", async ({ page }) => {
  await page.goto("/admin");
  await page.getByRole("link", { name: "Pinned peer sets" }).click();
  await expect(
    page.getByRole("heading", { name: "Pinned peer sets", level: 1 }),
  ).toBeVisible();
});

/**
 * The candidate list is the whole reason this page is usable rather than merely possible.
 * It is `rankCandidates` — the same function `matchPeers` reads — so what is drawn here is
 * what the engine would do, and the five it would show are marked.
 */
test("offers the industry's companies in the engine's own order", async ({ page }) => {
  await page.goto("/admin/peer-overrides");
  await page.getByRole("button", { name: "Pin a peer set" }).first().click();

  /**
   * `{ exact: true }`, and it is worth knowing why rather than copying. `getByLabel`
   * matches on SUBSTRING, and this form carries both "Industry" and "Sub-industry" — so a
   * loose lookup for the first resolves to two controls. The labels themselves are right;
   * it is the lookup that has to be precise. (What was also wrong and is now fixed: the
   * hint used to sit inside the `<label>`, so every control's accessible name was its
   * label plus a sentence. See `AdminField`.)
   */
  await page.getByLabel("Industry", { exact: true }).selectOption("Retail");

  // The section names the population, which is the number an admin is deciding against.
  await expect(page.getByText(/in the industry, .* above the floor/)).toBeVisible();
  // And it marks what is being replaced. Five, because that is the peer limit.
  await expect(page.getByText("engine shows")).toHaveCount(5);

  // Choosing an industry with a sub-industry narrows the scoring, so the marked five
  // move — which is the thing an admin needs to see before overruling it.
  const before = await page
    .getByRole("checkbox")
    .evaluateAll((nodes) => nodes.length);
  await page.getByLabel("Sub-industry").selectOption({ label: "Apparel & Footwear Brand" });
  await expect(page.getByText("below the floor").first()).toBeVisible();
  expect(before).toBeGreaterThan(0);
});

test("pins a set, and the publish diff reports it with no company row touched", async ({
  page,
}) => {
  await page.goto("/admin/peer-overrides");
  await page.getByRole("button", { name: "Pin a peer set" }).first().click();

  await page.getByLabel("Industry", { exact: true }).selectOption("Education");

  // Education has seven companies, so the whole industry fits in the candidate list.
  const candidates = page.getByRole("checkbox");
  await candidates.nth(0).check();
  await candidates.nth(1).check();

  // The picked set is drawn in order, because position on the comparison grid IS the
  // ranking — there is no numeral on a peer card.
  await expect(page.getByText("1 of 5")).toHaveCount(0);
  await expect(page.getByText("2 of 5")).toBeVisible();

  await page.getByRole("button", { name: "Add to draft" }).click();
  await waitForDraftSaved(page);

  await expect(page.getByText(/1 pinned peer set\./)).toBeVisible();
  await expect(page.getByText("any sub-industry").first()).toBeVisible();

  await page.goto("/admin/publish");
  /**
   * The whole reason the diff has this section: a pinned set changes which companies a
   * real visitor is shown and moves NOTHING else — no company row, no taxonomy value, no
   * string on the page — and the public screen deliberately never says a set was chosen by
   * hand. Without a section of its own this would publish under "no changes".
   */
  await expect(
    page.getByRole("heading", { name: /Pinned peer sets \(1\)/ }),
  ).toBeVisible();
  await expect(page.getByText(/Pinned: Education/)).toBeVisible();
  // And it is not reported as a company edit.
  await expect(page.getByRole("heading", { name: /^Edited \(/ })).toHaveCount(0);

  await page.getByRole("button", { name: "Discard all changes" }).click();
});

/**
 * The visual cue the request was explicitly about: a combination that is already covered
 * says so, while it is being typed.
 *
 * Asserted against a BROADER row rather than an identical one, which is the case a
 * same-fields comparison would miss and the confusing one — pinning
 * `Education · one band` when `Education · any band` exists is not a duplicate, and yet
 * the new row silently takes precedence for a slice of the old one's visitors.
 */
test("warns that a combination is already covered, and refuses an exact clash", async ({
  page,
}) => {
  await page.goto("/admin/peer-overrides");

  // A broad row first: the whole of Education.
  await page.getByRole("button", { name: "Pin a peer set" }).first().click();
  await page.getByLabel("Industry", { exact: true }).selectOption("Education");
  await page.getByRole("checkbox").nth(0).check();
  await page.getByRole("button", { name: "Add to draft" }).click();
  await waitForDraftSaved(page);

  // Now a second row on the SAME combination: an exact duplicate, which the publish gate
  // refuses because the tiebreak would be list position — something nothing on this page
  // shows. So the form has to refuse it too, and say which row to edit instead.
  await page.getByRole("button", { name: "Pin a peer set" }).first().click();
  await page.getByLabel("Industry", { exact: true }).selectOption("Education");
  await expect(page.getByText("This exact combination is already pinned.")).toBeVisible();

  await page.getByRole("checkbox").nth(1).check();
  await page.getByRole("button", { name: "Add to draft" }).click();
  await expect(page.locator("p[role=alert]")).toContainText("already covers this exact");

  /**
   * **Narrowing it is LEGAL, and this is the assertion that caught the form refusing it.**
   * The broad row still covers the combination until the narrow one exists, so a check
   * written against "does anything cover this" was permanently true and made the feature's
   * main use unreachable. The cue stays — a broader row taking second place is worth
   * saying — but the wording changes and the save goes through.
   */
  await page.getByLabel("Revenue band").selectOption({ index: 1 });
  await expect(page.getByText("This exact combination is already pinned.")).toHaveCount(0);
  await expect(page.getByText("A broader pinned set already covers this.")).toBeVisible();
  await page.getByRole("button", { name: "Add to draft" }).click();
  await waitForDraftSaved(page);
  await expect(page.getByText(/2 pinned peer sets\./)).toBeVisible();

  await page.goto("/admin/publish");
  await page.getByRole("button", { name: "Discard all changes" }).click();
});

/**
 * A pinned sub-industry is surfaced on the sub-industry row, because a tag edit there
 * will not reach those visitors.
 *
 * That is a silent no-op on a deliberate edit — an admin retagging a type to fix a bad
 * peer set, with the set pinned — which is the class of failure this repo spends most of
 * its comments on.
 */
test("tells the sub-industry editor that a peer set is pinned", async ({ page }) => {
  await page.goto("/admin/peer-overrides");
  await page.getByRole("button", { name: "Pin a peer set" }).first().click();
  await page.getByLabel("Industry", { exact: true }).selectOption("Retail");
  await page.getByLabel("Sub-industry").selectOption({ label: "Apparel & Footwear Brand" });
  await page.getByRole("checkbox").first().check();
  await page.getByRole("button", { name: "Add to draft" }).click();
  await waitForDraftSaved(page);

  await page.goto("/admin/business-types");
  await page.getByLabel("Filter by industry").selectOption("Retail");
  await expect(page.getByText("peer set pinned")).toBeVisible();

  await page.goto("/admin/publish");
  await page.getByRole("button", { name: "Discard all changes" }).click();
});
