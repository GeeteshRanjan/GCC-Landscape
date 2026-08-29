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
export const DRAFT_STORAGE_KEY = "gcc-admin-draft-v4";

/* ==========================================================================
   The public screens' bands
   ========================================================================== */

/**
 * One evidence band, located by its stable id rather than by its heading text.
 *
 * Twenty public specs used to locate bands with
 * `getByRole("region", { name: /companies match you closely/ })`, which couples
 * every structural and gate assertion in the suite to a sentence a copywriter is
 * expected to change. They all broke on a copy pass that changed nothing they were
 * testing — and a suite that fails for a reason unrelated to its subject is a suite
 * people learn to re-run rather than read.
 *
 * The id IS the contract: `peers`, `industry`, `largest`, `functions`, `map`,
 * `scale`, `advance` are the band identifiers in `peer-view.tsx`, and they are also
 * what `aria-labelledby` is built from. So this still asserts the landmark — a
 * `<section>` with no accessible name is not a `region` and would not match — while
 * leaving the wording free.
 *
 * Where the COPY is the subject, a spec should assert on its text directly instead
 * of reaching for this.
 */
export function band(page: Page, id: string) {
  return page.locator(`section#${id}[role], section#${id}`).first();
}

/**
 * Asserts a band is present AND is a real landmark with an accessible name.
 *
 * The two halves matter separately. Present-and-unnamed is the failure mode the
 * original name-based locators caught by accident: a `<section>` whose heading id
 * stopped matching its `aria-labelledby` is invisible to a screen-reader user
 * navigating by region, and looks perfect on screen.
 */
export async function expectBand(page: Page, id: string): Promise<void> {
  const section = band(page, id);
  await expect(section).toBeVisible();
  const labelledBy = await section.getAttribute("aria-labelledby");
  expect(labelledBy, `#${id} must be a named region`).toBeTruthy();
  await expect(page.locator(`#${labelledBy}`)).toHaveText(/\S/);
}
