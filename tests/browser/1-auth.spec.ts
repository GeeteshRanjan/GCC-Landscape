import { expect, test } from "@playwright/test";

import { TEST_PASSWORD } from "./prepare";

/**
 * The boundary around admin. Runs without a saved session on purpose.
 *
 * Nothing here overlaps the unit tests: those check that a forged token fails
 * verification, these check that a browser holding one actually gets turned away,
 * that the headers ship, and that the public surface gives no sign admin exists.
 */

test.describe("unauthenticated access", () => {
  for (const route of ["/admin", "/admin/taxonomy", "/admin/publish"]) {
    test(`${route} sends you to the login form`, async ({ page }) => {
      await page.goto(route);
      await expect(page).toHaveURL(/\/admin\/login$/);
      await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    });
  }

  test("the API refuses without a session, and does not redirect", async ({ request }) => {
    for (const endpoint of ["/api/admin/diff", "/api/admin/publish"]) {
      const response = await request.post(endpoint, {
        data: { dataset: {} },
        maxRedirects: 0,
      });
      expect(response.status(), endpoint).toBe(401);
      // A redirect to HTML here would hand a probe a page to read.
      expect(response.headers()["content-type"]).toContain("json");
    }
  });

  test("a tampered session cookie is rejected", async ({ page, context }) => {
    await context.addCookies([
      {
        name: "gcc_admin_session",
        // Structurally plausible, signed with nothing.
        value: `${Buffer.from(JSON.stringify({ iat: 1, exp: 9_999_999_999, jti: "x" })).toString("base64url")}.forged`,
        domain: "127.0.0.1",
        path: "/",
      },
    ]);

    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login$/);
  });
});

test.describe("headers", () => {
  test("admin is unframeable and unindexed", async ({ request }) => {
    const response = await request.get("/admin/login");
    const headers = response.headers();

    expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(headers["x-robots-tag"]).toContain("noindex");
  });

  test("the public surface allows only the ansr origins to frame it", async ({ request }) => {
    const csp = (await request.get("/")).headers()["content-security-policy"];

    expect(csp).toContain("frame-ancestors");
    expect(csp).toContain("ansr.com");
    // The public tool is embedded in an ansr.com page, so 'none' here would break it.
    expect(csp).not.toContain("'none'");
  });
});

test.describe("the login form", () => {
  test("gives one message for a wrong password and keeps the field focused", async ({ page }) => {
    await page.goto("/admin/login");

    await page.getByLabel("Password").fill("definitely-the-wrong-password");
    await page.getByRole("button", { name: "Continue" }).click();

    // Scoped to main: Next injects its own empty role="alert" route announcer at
    // the document root, so an unscoped alert query matches two elements.
    const error = page.locator("main").getByRole("alert");
    await expect(error).toBeVisible();
    await expect(error).toContainText("not correct");
    // The field is cleared and refocused, so a retry needs no mouse.
    await expect(page.getByLabel("Password")).toHaveValue("");
    await expect(page.getByLabel("Password")).toBeFocused();
  });

  test("warns as the attempts run down", async ({ page }) => {
    await page.goto("/admin/login");

    await page.getByLabel("Password").fill("wrong-again");
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.locator("main").getByRole("alert")).toContainText(/attempts? left/);
  });

  test("says nothing about the product, the client, or what is behind it", async ({ page }) => {
    await page.goto("/admin/login");
    // Rendered text, not the serialized RSC payload — that carries component
    // names and would make this assertion about build internals.
    const visible = (await page.locator("main").innerText()).toLowerCase();

    for (const leak of ["ansr", "gcc", "company", "dataset", "india", "publish"]) {
      expect(visible, `login page should not mention "${leak}"`).not.toContain(leak);
    }
  });

  test("no code field is shown while the second factor is off", async ({ page }) => {
    await page.goto("/admin/login");
    await expect(page.getByLabel("Authenticator code")).toHaveCount(0);
  });

  test("is reachable and submittable by keyboard alone", async ({ page }) => {
    await page.goto("/admin/login");

    // autoFocus puts the caret in the field already; typing and Enter is the
    // whole interaction.
    await expect(page.getByLabel("Password")).toBeFocused();
    await page.keyboard.type(TEST_PASSWORD);
    await page.keyboard.press("Enter");

    await expect(page.getByRole("heading", { name: "Companies", level: 1 })).toBeVisible();
  });
});

test.describe("the public surface", () => {
  test("gives no hint that an admin exists", async ({ page }) => {
    await page.goto("/");
    const html = (await page.content()).toLowerCase();

    expect(html).not.toContain("/admin");
    expect(html).not.toContain("sign in");
    expect(html).not.toContain("log in");
    await expect(page.getByRole("link", { name: /admin|sign in|log ?in/i })).toHaveCount(0);
  });
});
