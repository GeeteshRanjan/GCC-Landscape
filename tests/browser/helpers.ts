import { expect, type Page } from "@playwright/test";

import { formatRevenueBand } from "@/components/public/primitives";

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

/**
 * Picks a value from one of the PUBLIC form's dropdowns.
 *
 * The public selects are a custom listbox, not `<select>`, so `selectOption` does
 * not apply to them — see `select-field.tsx` for why the native element was given
 * up (its open menu is drawn by the OS and cannot be made to look like the page).
 * This drives it the way a visitor does: open, narrow if there is a filter, click.
 *
 * **Admin's selects are still native and must keep using `selectOption`.** Only the
 * four controls on the entry point changed.
 *
 * Living here rather than in each spec is deliberate: three specs drive this form —
 * `0-screen1`, `0-screen2` and `0-business-type` — so a change to a control is one
 * edit rather than three.
 */
export async function choose(
  page: Page,
  label: string | RegExp,
  value: string,
): Promise<void> {
  await page.getByLabel(label).click();
  const panel = selectPanel(page);
  await expect(panel).toBeVisible();

  // The country list is 201 options. Narrowing first is what a visitor would do and
  // it keeps the click off a virtual scroll the option may not be near.
  const filter = page.getByLabel(/^Filter/);
  if (await filter.count()) await filter.fill(value);

  /**
   * **The revenue control is the one field whose visible label is not its value**, so
   * the translation lives here rather than in every caller.
   *
   * A band is STORED as `"Above $20 Bn"` — that string is the peer-matching key 1834
   * companies carry, and the order of the array it sits in is the adjacent-band
   * contract — and it is DRAWN as `"Above 20 Bn"`, because the panel states the currency
   * once in its own hint instead of on all seven rows. Specs go on naming a band by the
   * value, which is what identifies it; `formatRevenueBand` is the same single definition
   * the control and both result screens use, so a spec cannot drift from the rendering.
   *
   * Keyed on the LABEL rather than sniffed from the value: the label is a literal the
   * caller passes, so the exception is visible at the one place it applies. Admin's band
   * control is a native `<select>` on the stored strings and is driven by `selectOption`,
   * which is right — admin edits the datum.
   */
  const shown = /revenue/i.test(String(label)) ? formatRevenueBand(value) : value;

  // `exact`, because "India" is a substring of "Indonesia" and "Retail" of several
  // industry names. A non-exact match here picks whichever came first.
  await selectItem(page, shown).click();

  /**
   * **An industry that carries sub-industries does not close the panel**, and that
   * is the control's design rather than a race worth waiting out: the press commits
   * the industry and opens its cascade, because that is the only moment a visitor
   * learns a narrower answer exists. The pane's leading row is the way out that
   * keeps the broad answer, so this takes it.
   *
   * Conditional, because the same helper drives the three flat listboxes and an
   * industry with nothing mapped under it, all of which close on the first press.
   */
  if (await panel.isVisible()) {
    await selectItem(page, `All of ${value}`).click();
  }
  await expect(panel).toBeHidden();
}

/**
 * The open popup, whichever of the two shapes it is.
 *
 * **The industry dropdown's popup is a `tree`, not a `listbox`, and that is not an
 * implementation detail this can look past.** Sub-industries live inside it as a
 * second level, and a listbox whose options contain options is not a listbox — so
 * the combobox owns a tree, which is the ARIA pairing that exists for exactly this.
 * The other three fields are still flat listboxes. Both are located here so a spec
 * never has to know which control it is driving.
 */
function selectPanel(page: Page) {
  return page.getByRole("listbox").or(page.getByRole("tree")).first();
}

/**
 * One row in the open popup, in either pane.
 *
 * **Scoped to the PAGE rather than to the popup element, and that is a consequence
 * of the cascade.** The second level is a separate pane in a separate box, tied back
 * to its parent row by `aria-owns` rather than by DOM containment — so its rows are
 * genuinely not inside the `tree` element and a locator scoped to that element finds
 * only the first level. One dropdown is open at a time, so the page is the right
 * scope.
 */
function selectItem(page: Page, name: string) {
  return page
    .getByRole("option", { name, exact: true })
    .or(page.getByRole("treeitem", { name, exact: true }))
    .first();
}

/**
 * Picks an industry AND a sub-industry, from the one control that holds both.
 *
 * They were two fields and are one: pressing an industry commits it and cascades a
 * second pane holding the sub-industries mapped to it. So this is what a visitor
 * does — open, press the industry, press the narrower row — and the industry is
 * answered by the first of those rather than beforehand.
 *
 * **The filter is deliberately not used to reach the child.** It would work, and it
 * would test a different thing: filtering narrows both panes, so a spec that only
 * ever filtered would pass with the cascade broken. The cascade is the affordance,
 * so the cascade is what this drives.
 */
export async function chooseSubIndustry(
  page: Page,
  industry: string,
  subIndustry: string,
): Promise<void> {
  await page.getByLabel("Industry").click();
  const panel = selectPanel(page);
  await expect(panel).toBeVisible();

  const parent = page.getByRole("treeitem", { name: industry, exact: true }).first();
  await expect(parent).toHaveAttribute("aria-expanded", "false");
  await parent.click();
  // The pane it opened is `aria-owns`-ed rather than nested, so the parent row's own
  // expanded state is the only place the relationship is asserted.
  await expect(parent).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("treeitem", { name: `All of ${industry}` })).toBeVisible();

  await selectItem(page, subIndustry).click();
  await expect(panel).toBeHidden();
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
export const DRAFT_STORAGE_KEY = "gcc-admin-draft-v15";

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

  /**
   * **Either naming mechanism, because a band may legitimately have no visible
   * heading.** Most bands are named by `aria-labelledby` pointing at their own
   * heading, which is why that was the only case for a long time. The signal strip is
   * not: four figures under a headline that already states the finding do not want a
   * fifth restatement of it above them, so the band carries the name directly in
   * `aria-label` — and it is exactly as much a `region` for it.
   *
   * What must not pass is a band with NEITHER, which is the failure this helper
   * exists for: a `<section>` with no accessible name is invisible to a screen-reader
   * user navigating by region and looks perfect on screen.
   */
  const labelledBy = await section.getAttribute("aria-labelledby");
  if (labelledBy) {
    await expect(page.locator(`#${labelledBy}`)).toHaveText(/\S/);
    return;
  }
  const label = await section.getAttribute("aria-label");
  expect(
    label?.trim(),
    `#${id} must be a named region — it has neither aria-labelledby nor aria-label`,
  ).toBeTruthy();
}

/**
 * A company name that must never appear in a public document.
 *
 * The specs that use it assert the dataset did not serialize to the browser, and a
 * canary only works if its ONLY route into the HTML is that failure. Three
 * properties, and the third is the one that has already bitten:
 *
 *   - distinctive enough that a substring match cannot fire by accident;
 *   - present in the dataset, so it would genuinely travel if the guard broke;
 *   - in neither industry the public specs drive (BFSI, Electrical & Electronics)
 *     **and not the name of a customer logo.**
 *
 * It was "Walmart", which satisfied the first two and quietly stopped satisfying the
 * third. The logo strip's list moved from a client-side module constant into
 * `siteContent.logos`, so the ten marks now cross at the client boundary and sit in
 * the RSC payload of every phase — which is correct and is the point of making them
 * editable, but it put a dataset company name in the document legitimately. The
 * canary tripped on both result screens for a reason that had nothing to do with the
 * dataset.
 *
 * Held here rather than in either spec so the two cannot drift: `0-screen2.spec.ts`
 * had the string typed out a second time, which is how one of them would have been
 * fixed alone.
 */
export const LEAK_CANARY = "ArcelorMittal";
