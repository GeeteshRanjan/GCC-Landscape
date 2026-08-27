import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";

import type { Dataset } from "../../src/data/schema";
import { waitForDraftSaved } from "./helpers";

/**
 * Publishing, for real, against the fixture copy of the dataset.
 *
 * The assertions that matter are about the diff being trustworthy and the write
 * being gated. A diff that under-reports is worse than no diff at all: it is the
 * only thing standing between an admin and a commit, and it is the screen they
 * are being asked to approve.
 *
 * Runs after the draft and taxonomy specs, because it mutates the fixture file.
 */

const FIXTURE_ENV = path.join(process.cwd(), "tests", "browser", ".tmp", "env.json");

function publishedDataset(): Dataset {
  const { GCC_DATASET_PATH } = JSON.parse(readFileSync(FIXTURE_ENV, "utf8")) as {
    GCC_DATASET_PATH: string;
  };
  return JSON.parse(readFileSync(GCC_DATASET_PATH, "utf8")) as Dataset;
}

async function editEstablishedYear(page: import("@playwright/test").Page, year: string) {
  await page.goto("/admin");
  await page.getByLabel("Search").fill("3M");
  await page.getByRole("button", { name: /^Edit 3M/ }).first().click();
  await page.getByLabel("GCC established").fill(year);
  await page.getByRole("button", { name: "Save to draft" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  // The publish tab is reached by a full load, which drops React state — the
  // draft only survives because it was autosaved.
  await waitForDraftSaved(page);
}

test("says there is nothing to publish when the draft is clean", async ({ page }) => {
  await page.goto("/admin/publish");

  await expect(page.getByText("Nothing to publish")).toBeVisible();
  await expect(page.getByRole("button", { name: "Publish changes" })).toHaveCount(0);
});

test("shows an accurate diff before anything is written", async ({ page }) => {
  const before = publishedDataset();
  const original = before.companies.find((c) => c.id === "3m")?.establishedYear;

  await editEstablishedYear(page, "2013");
  await page.goto("/admin/publish");

  await expect(page.getByRole("heading", { name: /^Edited \(1\)$/ })).toBeVisible();
  const edited = page.getByRole("region").filter({ hasText: "Edited (1)" });
  await expect(edited).toContainText("3M");
  await expect(edited).toContainText("establishedYear");
  // Both sides of the change, so the admin can see what they are replacing.
  await expect(edited).toContainText(String(original));
  await expect(edited).toContainText("2013");

  // And still nothing on disk.
  expect(publishedDataset().companies.find((c) => c.id === "3m")?.establishedYear).toBe(original);
});

test("counts additions, removals and edits separately", async ({ page }) => {
  await editEstablishedYear(page, "2012");

  await page.goto("/admin");
  await page.getByRole("button", { name: "Add a company" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Company name").fill("Diffcheck Industries");
  await dialog.getByLabel("Industry").selectOption({ index: 1 });
  await dialog.getByLabel("Revenue band").selectOption({ index: 1 });
  await dialog.getByLabel("HQ country").selectOption({ index: 1 });
  await dialog.getByLabel("GCC established").fill("2023");
  await dialog.getByLabel("Lower").fill("10");
  await dialog.getByLabel("Upper").fill("60");
  await dialog.getByRole("checkbox").first().check();
  await dialog.getByRole("button", { name: "Add to draft" }).click();
  await waitForDraftSaved(page);

  await page.goto("/admin/publish");
  await expect(page.getByRole("heading", { name: /^Added \(1\)$/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /^Edited \(1\)$/ })).toBeVisible();

  await page.getByRole("button", { name: "Discard all changes" }).click();
});

test("reports a revenue band reorder, and says why it matters", async ({ page }) => {
  await page.goto("/admin/taxonomy");
  const bands = page
    .getByRole("region")
    .filter({ has: page.getByRole("heading", { name: "Revenue bands" }) });
  const labels = await bands.locator("li span.flex-1").allTextContents();
  await bands.getByRole("button", { name: `Move ${labels[1]} up` }).click();
  await waitForDraftSaved(page);

  await page.goto("/admin/publish");

  const taxonomy = page.getByRole("region").filter({ hasText: "Taxonomy" });
  await expect(taxonomy).toContainText("Revenue bands");
  await expect(taxonomy).toContainText("Reordered");
  // The consequence, not just the fact.
  await expect(taxonomy).toContainText("who matches as a peer");

  await page.getByRole("button", { name: "Discard all changes" }).click();
});

test("blocks a publish that would break referential integrity", async ({ page }) => {
  // Forced through the stored draft, because the UI will not build this: the
  // selects only offer taxonomy values and the delete guard refuses in-use ones.
  // That is the point — the server gate has to hold even when the client is
  // bypassed entirely.
  await editEstablishedYear(page, "2014");
  await page.evaluate(() => {
    const key = "gcc-admin-draft-v1";
    const draft = JSON.parse(window.localStorage.getItem(key) as string) as {
      editable: { taxonomy: Record<string, string[]>; companies: Array<Record<string, unknown>> };
    };
    // Point a company at an industry the taxonomy does not offer.
    draft.editable.companies[0]!.industry = "Nonexistent Industry";
    window.localStorage.setItem(key, JSON.stringify(draft));
  });
  await page.goto("/admin/publish");

  await expect(page.getByText("Not published")).toBeVisible();
  await expect(page.locator("main").getByRole("alert").first()).toContainText(/not valid/i);
  await expect(page.getByText(/not in taxonomy\.industries/)).toBeVisible();
  // No publish button offered at all while the draft is invalid.
  await expect(page.getByRole("button", { name: "Publish changes" })).toHaveCount(0);

  // Clear the tampered draft and reload, so the in-memory copy goes with it and
  // nothing leaks into the tests that follow.
  await page.evaluate(() => window.localStorage.removeItem("gcc-admin-draft-v1"));
  await page.goto("/admin/publish");
  await expect(page.getByText("Nothing to publish")).toBeVisible();
});

test("publishes a company edit and a taxonomy addition together", async ({ page }) => {
  const before = publishedDataset();

  await editEstablishedYear(page, "2013");
  await page.goto("/admin/taxonomy");
  const cities = page
    .getByRole("region")
    .filter({ has: page.getByRole("heading", { name: "India cities" }) });
  await cities.getByLabel("New city").fill("Publishtown");
  await cities.getByRole("button", { name: "Add" }).click();
  await waitForDraftSaved(page);

  await page.goto("/admin/publish");
  await expect(page.getByRole("button", { name: "Publish changes" })).toBeEnabled();
  await page.getByRole("button", { name: "Publish changes" }).click();

  await expect(page.getByRole("heading", { name: "Published" })).toBeVisible();
  await expect(page.getByText(/1 edited/)).toBeVisible();

  const after = publishedDataset();
  expect(after.companies.find((c) => c.id === "3m")?.establishedYear).toBe(2013);
  expect(after.taxonomy.cities).toContain("Publishtown");
  // Server-owned metadata: provenance kept, timestamp advanced.
  expect(after.source).toBe(before.source);
  expect(Date.parse(after.generatedAt)).toBeGreaterThan(Date.parse(before.generatedAt));

  // The banner clears, because the draft is now the baseline.
  await expect(page.getByText("You have unpublished changes.")).toHaveCount(0);
  const stored = await page.evaluate(() => window.localStorage.getItem("gcc-admin-draft-v1"));
  expect(stored).toBeNull();
});

test("the published state survives a reload, and the draft does not come back", async ({ page }) => {
  await page.goto("/admin");
  await page.reload();

  await expect(page.getByRole("status").filter({ hasText: "No unpublished changes" })).toBeVisible();
  await page.getByLabel("Search").fill("3M");
  await page.getByRole("button", { name: /^Edit 3M/ }).first().click();
  await expect(page.getByLabel("GCC established")).toHaveValue("2013");
});

test("re-publishing the same state is refused as a no-op", async ({ page }) => {
  await page.goto("/admin/publish");
  await expect(page.getByText("Nothing to publish")).toBeVisible();

  // The server refuses it too, not just the UI — the absent button is not the
  // guard. Issued from inside the page rather than via `page.request`: the session
  // cookie is `Secure`, and Playwright's Node-side request context will not send
  // it over plain http even on localhost, where the browser will.
  const result = await page.evaluate(async (dataset) => {
    const response = await fetch("/api/admin/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dataset }),
    });
    return { status: response.status, body: await response.text() };
  }, publishedDataset());

  expect(result.status).toBe(409);
  expect(result.body).toMatch(/nothing to publish/i);
});

test("never mentions a repository, a commit, or git", async ({ page }) => {
  await editEstablishedYear(page, "2015");
  await page.goto("/admin/publish");
  const text = ((await page.textContent("main")) ?? "").toLowerCase();

  for (const word of ["git", "commit", "repository", "repo", "branch", "sha", "github"]) {
    expect(text, `publish view should not say "${word}"`).not.toContain(word);
  }

  await page.getByRole("button", { name: "Discard all changes" }).click();
});

test("signing out ends the session", async ({ page }) => {
  await page.goto("/admin");
  await page.getByRole("button", { name: "Sign out" }).click();

  await expect(page).toHaveURL(/\/admin\/login$/);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login$/);
});
