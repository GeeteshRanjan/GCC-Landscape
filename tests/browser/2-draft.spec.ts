import { expect, test } from "@playwright/test";

import {
  DRAFT_STORAGE_KEY,
  discardEverything,
  openEditor,
  waitForDraftSaved,
} from "./helpers";

/**
 * The draft lifecycle. This is the reason a browser is in the loop at all.
 *
 * A month of edits is held in localStorage and sent as one commit, so the
 * failures that matter here are not "does the form submit" but "does an hour of
 * work survive a closed tab", "does navigating between tabs lose it", and "is the
 * admin ever told their changes are saved when they are not". None of that is
 * observable without real storage and real navigation.
 *
 * Every test edits and then discards, so the fixture dataset is left as found —
 * publishing is 5-publish.spec.ts's job.
 */


test.afterEach(async ({ page }) => {
  await discardEverything(page);
});

test("starts with no unpublished changes", async ({ page }) => {
  await page.goto("/admin");

  await expect(page.getByRole("status").filter({ hasText: "No unpublished changes" })).toBeVisible();
  await expect(page.getByText("You have unpublished changes.")).toHaveCount(0);
});

test("an edit raises the banner and reports being saved locally", async ({ page }) => {
  await page.goto("/admin");
  await openEditor(page, "3M");

  await page.getByLabel("GCC established").fill("2013");
  await page.getByRole("button", { name: "Save to draft" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await expect(page.getByText("You have unpublished changes.")).toBeVisible();
  // The debounce is 800ms; the claim must become true, not just appear.
  await waitForDraftSaved(page);
});

test("the draft survives a full page reload", async ({ page }) => {
  await page.goto("/admin");
  await openEditor(page, "3M");
  await page.getByLabel("GCC established").fill("2013");
  await page.getByRole("button", { name: "Save to draft" }).click();
  await waitForDraftSaved(page);

  await page.reload();

  await expect(page.getByText("You have unpublished changes.")).toBeVisible();
  await openEditor(page, "3M");
  await expect(page.getByLabel("GCC established")).toHaveValue("2013");
});

test("the draft survives moving between tabs", async ({ page }) => {
  await page.goto("/admin");
  await openEditor(page, "3M");
  await page.getByLabel("GCC established").fill("2011");
  await page.getByRole("button", { name: "Save to draft" }).click();

  // Real navigations, because /admin owns its URL — it is never framed.
  await page.getByRole("link", { name: "Taxonomy" }).click();
  await expect(page.getByRole("heading", { name: "Taxonomy", level: 1 })).toBeVisible();
  await page.getByRole("link", { name: "Companies" }).click();

  await expect(page.getByText("You have unpublished changes.")).toBeVisible();
  await openEditor(page, "3M");
  await expect(page.getByLabel("GCC established")).toHaveValue("2011");
});

test("editing a value back to its original clears the dirty state", async ({ page }) => {
  await page.goto("/admin");
  await openEditor(page, "3M");
  const original = await page.getByLabel("GCC established").inputValue();

  await page.getByLabel("GCC established").fill("1999");
  await page.getByRole("button", { name: "Save to draft" }).click();
  await expect(page.getByText("You have unpublished changes.")).toBeVisible();

  await openEditor(page, "3M");
  await page.getByLabel("GCC established").fill(original);
  await page.getByRole("button", { name: "Save to draft" }).click();

  // An edit counter would be wrong here; the draft is compared to the baseline.
  await expect(page.getByText("You have unpublished changes.")).toHaveCount(0);
  await expect(page.getByRole("status").filter({ hasText: "No unpublished changes" })).toBeVisible();
});

test("discarding restores the published values and clears local storage", async ({ page }) => {
  await page.goto("/admin");
  await openEditor(page, "3M");
  const original = await page.getByLabel("GCC established").inputValue();
  await page.getByLabel("GCC established").fill("1988");
  await page.getByRole("button", { name: "Save to draft" }).click();
  await waitForDraftSaved(page);

  await page.goto("/admin/publish");
  await page.getByRole("button", { name: "Discard all changes" }).click();

  await expect(page.getByText("Nothing to publish")).toBeVisible();
  const stored = await page.evaluate(
    (key) => window.localStorage.getItem(key),
    DRAFT_STORAGE_KEY,
  );
  expect(stored).toBeNull();

  await page.goto("/admin");
  await openEditor(page, "3M");
  await expect(page.getByLabel("GCC established")).toHaveValue(original);
});

test("a stale draft is surfaced as a conflict rather than replayed silently", async ({ page }) => {
  await page.goto("/admin");

  // A draft saved against a baseline that no longer exists — what an admin has
  // in the tab after someone else publishes, or after a re-import.
  await page.evaluate((key) => {
    const raw = window.localStorage.getItem(key);
    const draft = raw
      ? (JSON.parse(raw) as Record<string, unknown>)
      : { editable: null, savedAt: new Date().toISOString() };
    window.localStorage.setItem(
      key,
      JSON.stringify({
        ...draft,
        baselineGeneratedAt: "2020-01-01T00:00:00.000Z",
        savedAt: "2026-08-01T09:00:00.000Z",
        editable: draft.editable ?? null,
      }),
    );
  }, DRAFT_STORAGE_KEY);

  // Seed a real draft first so there is something to conflict over.
  await page.reload();
  await openEditor(page, "3M");
  await page.getByLabel("GCC established").fill("2007");
  await page.getByRole("button", { name: "Save to draft" }).click();
  await waitForDraftSaved(page);

  await page.evaluate((key) => {
    const draft = JSON.parse(
      window.localStorage.getItem(key) as string,
    ) as Record<string, unknown>;
    draft.baselineGeneratedAt = "2020-01-01T00:00:00.000Z";
    window.localStorage.setItem(key, JSON.stringify(draft));
  }, DRAFT_STORAGE_KEY);
  await page.reload();

  const conflict = page.getByRole("alert").filter({ hasText: "The live data changed" });
  await expect(conflict).toBeVisible();
  await expect(conflict).toContainText("would overwrite");
  await expect(conflict.getByRole("button", { name: "Keep my edits" })).toBeVisible();
  await expect(conflict.getByRole("button", { name: "Discard my edits" })).toBeVisible();

  // Keeping re-pins the draft, so the warning does not nag on every reload.
  await conflict.getByRole("button", { name: "Keep my edits" }).click();
  await expect(conflict).toHaveCount(0);
  await expect(page.getByText("You have unpublished changes.")).toBeVisible();
});

test("the editor validates on submit and names the field", async ({ page }) => {
  await page.goto("/admin");
  await openEditor(page, "3M");

  await page.getByLabel("GCC established").fill("12");
  await page.getByRole("button", { name: "Save to draft" }).click();

  // Still open, with an error tied to the field rather than a banner at the top.
  await expect(page.getByRole("dialog")).toBeVisible();
  const field = page.getByLabel("GCC established");
  await expect(field).toHaveAttribute("aria-invalid", "true");
  const describedBy = await field.getAttribute("aria-describedby");
  expect(describedBy).toBeTruthy();
  await expect(page.getByText("Enter a four-digit year")).toBeVisible();

  await page.getByRole("button", { name: "Cancel" }).click();
});

test("the FTE range refuses an inverted pair", async ({ page }) => {
  await page.goto("/admin");
  await openEditor(page, "3M");

  await page.getByLabel("Lower").fill("900");
  await page.getByLabel("Upper").fill("100");
  await page.getByRole("button", { name: "Save to draft" }).click();

  await expect(page.getByText("cannot be below the lower end")).toBeVisible();
  await page.getByRole("button", { name: "Cancel" }).click();
});

test("derived readouts update without saving, and are not editable", async ({ page }) => {
  await page.goto("/admin");
  await openEditor(page, "3M");

  await page.getByLabel("Lower").fill("100");
  await page.getByLabel("Upper").fill("500");
  // Location count, tier-2 presence and the display band are computed, never stored.
  await expect(page.getByText("100–500")).toBeVisible();

  await expect(page.getByLabel("Locations")).toHaveCount(0);
  await expect(page.getByLabel("Tier-2 presence")).toHaveCount(0);

  await page.getByRole("button", { name: "Cancel" }).click();
});

test("a new company is added to the draft and appears at the top", async ({ page }) => {
  await page.goto("/admin");
  await page.getByRole("button", { name: "Add a company" }).click();

  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Company name").fill("Testworks Global");
  await dialog.getByLabel("Industry").selectOption({ index: 1 });
  await dialog.getByLabel("Revenue band").selectOption({ index: 1 });
  await dialog.getByLabel("HQ country").selectOption({ index: 1 });
  await dialog.getByLabel("GCC established").fill("2024");
  await dialog.getByLabel("Lower").fill("50");
  await dialog.getByLabel("Upper").fill("200");
  await dialog.getByRole("checkbox").first().check();

  // The suggested id is shown before committing, so the admin sees the key.
  await expect(dialog.getByText('Row id will be "testworks-global"')).toBeVisible();

  await dialog.getByRole("button", { name: "Add to draft" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await page.getByLabel("Search").fill("Testworks");
  await expect(page.getByRole("cell", { name: /Testworks Global/ }).first()).toBeVisible();
  await expect(page.getByText("You have unpublished changes.")).toBeVisible();
});

test("deleting asks first and says the live data is untouched", async ({ page }) => {
  await page.goto("/admin");
  await page.getByLabel("Search").fill("3M");

  const row = page.getByRole("row").filter({ hasText: "3M" }).first();
  await row.getByRole("button", { name: /^Delete 3M/ }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("Remove 3M?");
  await expect(dialog).toContainText("only changes your draft");

  // Backing out must leave the row alone.
  await dialog.getByRole("button", { name: "Keep it" }).click();
  await expect(page.getByText("You have unpublished changes.")).toHaveCount(0);

  await row.getByRole("button", { name: /^Delete 3M/ }).click();
  await page.getByRole("button", { name: "Remove from draft" }).click();
  await expect(page.getByText("You have unpublished changes.")).toBeVisible();
});

test("the dialog traps focus and closes on Escape", async ({ page }) => {
  await page.goto("/admin");
  await openEditor(page, "3M");

  const dialog = page.getByRole("dialog");
  // Focus starts inside the dialog rather than on the page behind it.
  await expect(dialog).toContainText("Row id 3m");
  const focusedInsideDialog = await page.evaluate(() => {
    const dialogEl = document.querySelector('[role="dialog"]');
    return dialogEl?.contains(document.activeElement) ?? false;
  });
  expect(focusedInsideDialog).toBe(true);

  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
});

test("search narrows the table and reports the count", async ({ page }) => {
  await page.goto("/admin");

  const status = page.getByRole("status").filter({ hasText: /match|Showing/ });
  await page.getByLabel("Search").fill("Bengaluru");
  await expect(status).toContainText(/matches?/);

  await page.getByLabel("Search").fill("zzzz-no-such-company");
  await expect(page.getByText("Nothing matches that search.")).toBeVisible();

  await page.getByRole("button", { name: "Clear" }).click();
  await expect(page.getByText("Nothing matches that search.")).toHaveCount(0);
});

test("a skip link is the first thing a keyboard reaches", async ({ page }) => {
  await page.goto("/admin");
  await page.keyboard.press("Tab");

  const focused = await page.evaluate(() => document.activeElement?.textContent ?? "");
  expect(focused).toContain("Skip to content");
});
