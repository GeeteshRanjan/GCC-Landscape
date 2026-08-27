import { expect, test, type Page } from "@playwright/test";

import { discardEverything, waitForDraftSaved } from "./helpers";

/**
 * The function metric editor.
 *
 * Three things here can only be tested in a browser, and each of them broke
 * something real when the company editor was built:
 *
 *   - A metric edit has to make the draft dirty and survive a reload, through the
 *     same autosave the company table uses. That is the whole reason metrics live
 *     in the existing draft rather than in a second pipeline, so it is the first
 *     thing to check rather than an afterthought.
 *   - Changing a metric's shape while figures are already typed has to keep them.
 *     The alignment itself is unit tested; what a browser adds is that the form's
 *     own re-fit agrees with it, all the way through to a passing publish gate.
 *   - The gated metrics have to be reachable and editable, and say plainly that
 *     the value is withheld server-side rather than hidden with styling.
 *
 * Everything is discarded afterwards; 5-publish.spec.ts owns the writing.
 */

function metricSection(page: Page, heading: string) {
  return page
    .getByRole("region")
    .filter({ has: page.getByRole("heading", { name: heading, exact: true }) });
}

/**
 * Opens a metric's editor by its public title, and by function area where the
 * title is not unique.
 *
 * Six titles now appear on more than one tab — bench strength, graduate output,
 * leadership depth, backfill, first hire, the scale curve — because they are one
 * figure shown in several views. The Edit button's accessible name carries the
 * function area for exactly that reason, and a bare title here would silently open
 * whichever copy happened to come first.
 */
async function openMetric(page: Page, title: string, area?: string): Promise<void> {
  const name = area ? `Edit ${title}, ${area}` : `Edit ${title}`;
  await page.getByRole("button", { name }).first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
}

test.afterEach(async ({ page }) => {
  await discardEverything(page);
});

test("the catalogue is grouped by function, with progress up front", async ({ page }) => {
  await page.goto("/admin/metrics");

  await expect(page.getByRole("heading", { name: "Function metrics", level: 1 })).toBeVisible();
  for (const heading of ["Technology", "Operations", "HR", "Finance"]) {
    await expect(metricSection(page, heading)).toBeVisible();
  }

  // The question on arrival is "where did I get to", so the counts lead.
  const progress = page.getByRole("definition");
  await expect(progress.first()).toBeVisible();
  await expect(page.getByText("Behind the gate").first()).toBeVisible();
});

test("the internal lens groupings are labelled as internal", async ({ page }) => {
  await page.goto("/admin/metrics");

  // Shown here on purpose — admin is internal staff and the filing is what helps
  // them. The copy says so, so nobody carries the labels onto a public screen.
  await expect(metricSection(page, "Technology")).toContainText(
    "not what a visitor sees",
  );
  await expect(page.getByRole("heading", { name: "Talent supply" }).first()).toBeVisible();
});

test("entering a figure marks the draft dirty and survives a reload", async ({ page }) => {
  await page.goto("/admin/metrics");
  await openMetric(page, "Bench strength", "Technology");

  await page.getByLabel("Figure").fill("912000");
  await page.getByRole("button", { name: "Save to draft" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();

  await expect(page.getByText("You have unpublished changes.")).toBeVisible();
  // The autosave debounce has to land before a full page load, exactly as it does
  // for a user who reloads mid-session.
  await waitForDraftSaved(page);
  await page.reload();

  await expect(page.getByText("You have unpublished changes.")).toBeVisible();
  await openMetric(page, "Bench strength", "Technology");
  await expect(page.getByLabel("Figure")).toHaveValue("912000");
});

test("a metric edit survives moving between tabs", async ({ page }) => {
  await page.goto("/admin/metrics");
  await openMetric(page, "Bench strength", "Operations");
  await page.getByLabel("Figure").fill("84");
  await page.getByRole("button", { name: "Save to draft" }).click();
  await waitForDraftSaved(page);

  await page.getByRole("link", { name: "Companies" }).click();
  await expect(page.getByRole("heading", { name: "Companies", level: 1 })).toBeVisible();
  await page.getByRole("link", { name: "Metrics" }).click();

  await openMetric(page, "Bench strength", "Operations");
  await expect(page.getByLabel("Figure")).toHaveValue("84");
});

test("editing a figure back to its original clears the unpublished warning", async ({ page }) => {
  await page.goto("/admin/metrics");
  await openMetric(page, "Bench strength", "Technology");
  const original = await page.getByLabel("Figure").inputValue();
  expect(original).not.toBe("");

  await page.getByLabel("Figure").fill("500");
  await page.getByRole("button", { name: "Save to draft" }).click();
  await expect(page.getByText("You have unpublished changes.")).toBeVisible();

  await openMetric(page, "Bench strength", "Technology");
  await page.getByLabel("Figure").fill(original);
  await page.getByRole("button", { name: "Save to draft" }).click();

  // Editing back to the original must clear the flag, not increment a counter.
  await expect(page.getByText("You have unpublished changes.")).toHaveCount(0);
});

test.describe("a breakdown", () => {
  const title = "Technology ecosystem by specialism";

  test("keeps figures already typed when a part is added", async ({ page }) => {
    await page.goto("/admin/metrics");
    await openMetric(page, title);

    await page.getByLabel("Figure 1").fill("120000");
    await page.getByLabel("Figure 2").fill("8000");
    await page.getByRole("button", { name: "Add a part" }).click();

    // The two figures stay with their rows, and the new part arrives empty.
    await expect(page.getByLabel("Figure 1")).toHaveValue("120000");
    await expect(page.getByLabel("Figure 2")).toHaveValue("8000");
    await expect(page.getByLabel("Figure 8")).toHaveValue("");

    await page.getByLabel("Part 8").fill("Stack Overflow");
    await page.getByLabel("Figure 8").fill("40000");
    await page.getByRole("button", { name: "Save to draft" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();

    await openMetric(page, title);
    await expect(page.getByLabel("Part 8")).toHaveValue("Stack Overflow");
    await expect(page.getByLabel("Figure 8")).toHaveValue("40000");
  });

  test("keeps its figures when a part is renamed", async ({ page }) => {
    await page.goto("/admin/metrics");
    await openMetric(page, title);

    await page.getByLabel("Figure 1").fill("77");
    await page.getByLabel("Part 1").fill("GitHub and forks");
    await page.getByRole("button", { name: "Save to draft" }).click();

    await openMetric(page, title);
    await expect(page.getByLabel("Part 1")).toHaveValue("GitHub and forks");
    await expect(page.getByLabel("Figure 1")).toHaveValue("77");
  });

  test("cannot be cut below the two parts the schema requires", async ({ page }) => {
    await page.goto("/admin/metrics");
    // Technical community activity is the two-part metric, already at the floor.
    await openMetric(page, "Technical community activity");

    // Disabled rather than allowed and then rejected at the publish gate.
    await expect(page.getByRole("button", { name: "Remove part 1" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Remove part 2" })).toBeDisabled();

    // Adding one frees them again, so the floor is a floor and not a freeze.
    await page.getByRole("button", { name: "Add a part" }).click();
    await expect(page.getByRole("button", { name: "Remove part 1" })).toBeEnabled();
  });

  test("reports a part-entered metric as such, so it is visibly unfinished", async ({ page }) => {
    await page.goto("/admin/metrics");
    await openMetric(page, title);
    // Emptying one slot is what a real gap looks like: the metric is no longer
    // publishable, and the row has to say so rather than looking finished.
    await page.getByLabel("Figure 1").fill("");
    await page.getByRole("button", { name: "Save to draft" }).click();

    await expect(page.getByText("6 of 7 entered")).toBeVisible();
    // Part-entered is counted apart from complete and from empty.
    await expect(
      page.getByRole("term").filter({ hasText: "Part entered" }),
    ).toBeVisible();
  });
});

test.describe("a comparison grid", () => {
  const title = "Capability compared with other delivery locations";

  test("carries the worked example, and offers an unassessed option per cell", async ({ page }) => {
    await page.goto("/admin/metrics");
    await openMetric(page, title);

    await expect(
      page.getByLabel("Product engineering, India"),
    ).toHaveValue("Very strong");
    await expect(page.getByLabel("Product engineering, Vietnam")).toHaveValue("Moderate");
    // Every cell can be returned to unassessed, so a rating nobody has made is
    // expressible rather than forced into the nearest step.
    await expect(
      page.getByLabel("Product engineering, Vietnam").getByRole("option", { name: "Not assessed" }),
    ).toBeAttached();
  });

  test("states no provenance until somebody types one", async ({ page }) => {
    await page.goto("/admin/metrics");
    await openMetric(page, title);
    // `asOf` is public and renders verbatim beside the figure. It used to default
    // to "Sample, not for publication", which put that caveat on every card; the
    // default is gone, so the field is empty until an admin fills it.
    await expect(page.getByLabel("As of")).toHaveValue("");
  });

  test("rates cells from the metric's own scale, not free text", async ({ page }) => {
    await page.goto("/admin/metrics");
    await openMetric(page, title);

    const cell = page.getByLabel("Cybersecurity, Vietnam");
    await cell.selectOption("Moderate");
    await page.getByRole("button", { name: "Save to draft" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();

    await openMetric(page, title);
    await expect(page.getByLabel("Cybersecurity, Vietnam")).toHaveValue("Moderate");
  });

  test("keeps cells by position when a column is removed", async ({ page }) => {
    await page.goto("/admin/metrics");
    await openMetric(page, title);

    // Remove Vietnam, the fourth column. India's ratings must not shift.
    await page.getByRole("button", { name: "Remove Columns 4" }).click();
    await expect(page.getByLabel("Product engineering, India")).toHaveValue("Very strong");
    await expect(
      page.getByLabel("Product engineering, Philippines"),
    ).toHaveValue("Developing");

    await page.getByRole("button", { name: "Save to draft" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();

    // And the publish gate accepts the result — the re-fit produced a grid whose
    // cells match its axes.
    await waitForDraftSaved(page);
    await page.goto("/admin/publish");
    await expect(page.getByRole("button", { name: "Publish changes" })).toBeEnabled();
    await expect(page.getByText("Not published")).toHaveCount(0);
  });

  test("cannot be cut below the two columns the schema requires", async ({ page }) => {
    await page.goto("/admin/metrics");
    await openMetric(page, title);

    for (const n of [4, 3]) {
      await page.getByRole("button", { name: `Remove Columns ${n}` }).click();
    }
    await expect(page.getByRole("button", { name: "Remove Columns 1" })).toBeDisabled();
  });
});

test.describe("gated metrics", () => {
  const title = "Fully loaded cost by role family and level";

  test("are editable, and say the value is withheld on the server", async ({ page }) => {
    await page.goto("/admin/metrics");
    await openMetric(page, title);

    const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText("Behind the gate");
    await expect(dialog).toContainText("removed on the server");
    // Not a CSS blur over real text: the words say the omission happens
    // server-side, and publicMetric is what performs it.
    await expect(dialog).not.toContainText("blur");
  });

  test("hold their figures in the draft and publish like any other", async ({ page }) => {
    await page.goto("/admin/metrics");
    await openMetric(page, title);

    await page.getByLabel("Engineering, Analyst").fill("62");
    await page.getByRole("button", { name: "Save to draft" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();

    await waitForDraftSaved(page);
    await page.goto("/admin/publish");
    await expect(page.getByRole("button", { name: "Publish changes" })).toBeEnabled();
    await expect(
      page.getByRole("region", { name: /Function metrics/ }),
    ).toContainText("Fully loaded cost");
  });

  test("cannot have their gating switched off from the form", async ({ page }) => {
    await page.goto("/admin/metrics");
    await openMetric(page, title);

    // Which metrics sit behind the gate is an invariant, not a setting. There is
    // no control for it, and the provider re-pins the flag on save regardless.
    await expect(page.getByRole("checkbox", { name: /gate/i })).toHaveCount(0);
    await expect(page.getByLabel(/behind the gate/i)).toHaveCount(0);
  });
});

test("names each copy of a shared metric by its function area", async ({ page }) => {
  await page.goto("/admin/metrics");

  /**
   * The public screen shows one figure on three tabs; admin shows three editable
   * rows. Without the function area in the button's accessible name they would all
   * be called "Edit Bench strength", and an admin correcting the figure would have
   * no way to tell which one they had opened — or that there were three.
   */
  await expect(page.getByRole("button", { name: /^Edit Bench strength/ })).toHaveCount(3);
  for (const area of ["Technology", "Operations", "HR"]) {
    await expect(
      page.getByRole("button", { name: `Edit Bench strength, ${area}` }),
    ).toHaveCount(1);
  }
});

test("an index metric will not save without a stated base", async ({ page }) => {
  await page.goto("/admin/metrics");
  await openMetric(page, "India compared with other delivery locations");

  await page.getByLabel("Index base").fill("");
  await page.getByRole("button", { name: "Save to draft" }).click();

  // An index with no base is unreadable, so the form refuses it where the reason
  // can be given rather than letting the publish gate reject it later.
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByText("An index needs a stated base")).toBeVisible();
});

test("a figure that is not a number is reported rather than silently dropped", async ({ page }) => {
  await page.goto("/admin/metrics");
  await openMetric(page, "Bench strength", "Technology");

  await page.getByLabel("Figure").fill("about a million");
  await page.getByRole("button", { name: "Save to draft" }).click();

  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByText("not a number")).toBeVisible();
});

test("a title is required, because it is the public heading", async ({ page }) => {
  await page.goto("/admin/metrics");
  await openMetric(page, "Bench strength", "Technology");

  await page.getByLabel("Title").fill("   ");
  await page.getByRole("button", { name: "Save to draft" }).click();

  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByText("A title is required")).toBeVisible();
});

test("clearing all figures leaves the definition intact", async ({ page }) => {
  await page.goto("/admin/metrics");
  await openMetric(page, "Capability compared with other delivery locations");
  await page.getByRole("button", { name: "Clear all figures" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();

  await openMetric(page, "Capability compared with other delivery locations");
  await expect(page.getByLabel("Product engineering, India")).toHaveValue("");
  // The rows and columns are the definition, and they stay.
  await expect(page.getByLabel("Columns 1")).toHaveValue("India");
});

test("the dialog traps focus and closes on Escape", async ({ page }) => {
  await page.goto("/admin/metrics");
  await openMetric(page, "Bench strength", "Technology");

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.locator(":focus")).toHaveCount(1);

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(page.getByText("You have unpublished changes.")).toHaveCount(0);
});
