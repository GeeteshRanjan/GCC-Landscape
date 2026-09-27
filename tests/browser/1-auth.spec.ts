import { expect, test } from "@playwright/test";

import { TEST_FRAME_ANCESTOR, TEST_PASSWORD } from "./prepare";

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

/** The source list of one CSP directive, or null if the policy does not declare it. */
function directive(csp: string | undefined, name: string): string[] | null {
  for (const part of (csp ?? "").split(";")) {
    const [key, ...sources] = part.trim().split(/\s+/);
    if (key === name) return sources;
  }
  return null;
}

/**
 * The suite is built with `GCC_FRAME_ANCESTORS_EXTRA` set to `TEST_FRAME_ANCESTOR`
 * (see `prepare.ts`), so both tests below run with an extra origin CONFIGURED — which
 * is the state in which admin leaking a framing origin would actually be possible.
 * The parser's refusals are unit-tested in `tests/unit/frame-ancestors.test.ts`.
 */
test.describe("headers", () => {
  test("admin is unframeable and unindexed, even with an extra origin configured", async ({
    request,
  }) => {
    for (const route of ["/admin/login", "/admin"]) {
      const response = await request.get(route, { maxRedirects: 0 });
      const headers = response.headers();
      const csp = headers["content-security-policy"];

      expect(directive(csp, "frame-ancestors"), route).toEqual(["'none'"]);
      expect(csp, route).not.toContain(TEST_FRAME_ANCESTOR);
      expect(headers["x-robots-tag"], route).toContain("noindex");
    }
  });

  test("the public surface is framed by ansr.com plus the configured extras, and nobody else", async ({
    request,
  }) => {
    const csp = (await request.get("/")).headers()["content-security-policy"];

    // Exact, so a widened policy fails here rather than shipping. The public tool is
    // embedded in an ansr.com page, so dropping ansr.com (or 'none') would break it.
    expect(directive(csp, "frame-ancestors")).toEqual([
      "'self'",
      "https://ansr.com",
      "https://*.ansr.com",
      TEST_FRAME_ANCESTOR,
    ]);
    // The extra origin is appended to frame-ancestors and to nothing else.
    expect(csp?.split(TEST_FRAME_ANCESTOR)).toHaveLength(2);
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
