import { expect, type Page } from "@playwright/test";

/**
 * Waits until the draft has actually been written to localStorage.
 *
 * Not a convenience. The draft lives in React state, which a client-side
 * navigation preserves and a full page load does not — so anything that reaches
 * a tab via `page.goto` is relying on the autosave having landed, exactly as a
 * user who reloads is. Skipping this wait tests a race, and the debounce is
 * 800ms, so the race is easy to lose.
 */
export async function waitForDraftSaved(page: Page): Promise<void> {
  await expect(
    page.getByRole("status").filter({ hasText: "Saved locally" }),
  ).toBeVisible();
}

/** Opens a company's editor from the table. */
export async function openEditor(page: Page, name: string): Promise<void> {
  await page.getByLabel("Search").fill(name);
  await page
    .getByRole("row")
    .filter({ hasText: name })
    .first()
    .getByRole("button", { name: new RegExp(`^Edit ${name}`) })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
}

/** Returns the draft to the published state, so specs do not leak into each other. */
export async function discardEverything(page: Page): Promise<void> {
  await page.goto("/admin/publish");

  const discard = page.getByRole("button", { name: "Discard all changes" });
  const empty = page.getByText("Nothing to publish");

  // Wait for the panel to settle before deciding. `isVisible()` does not wait, so
  // checking it straight after a navigation samples the loading skeleton, finds
  // no button, and silently skips the discard.
  await expect(discard.or(empty).first()).toBeVisible();

  if (await discard.isVisible()) {
    await discard.click();
    await expect(empty).toBeVisible();
  }
}

/**
 * The draft's localStorage key, in one place.
 *
 * Two specs reach into storage directly, to forge a stale baseline and to forge a
 * dataset the UI will not build. The key was written out as a literal in eight
 * places, so bumping it — which the provider does deliberately whenever the
 * editable shape changes — broke both specs in a way that looked like a
 * regression in the draft rather than a stale test constant.
 *
 * `page.evaluate` callbacks cannot close over Node values, so this is passed in as
 * an argument rather than read from the enclosing scope.
 */
export const DRAFT_STORAGE_KEY = "gcc-admin-draft-v3";
