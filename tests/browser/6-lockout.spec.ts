import { expect, test } from "@playwright/test";

import { TEST_PASSWORD } from "./prepare";

/**
 * Runs last, and must stay last.
 *
 * The rate limiter's budgets live in the server process, so exhausting them locks
 * out every test that follows — which is why this is its own project with a
 * dependency on the rest. The unit tests cover the arithmetic; what is verified
 * here is that the wiring actually refuses a real request, and that the refusal
 * cannot be walked past by finally supplying the right password.
 */

test.describe.configure({ mode: "serial" });

test("locks out after five wrong passwords, and holds against a correct one", async ({
  request,
}) => {
  const ip = "203.0.113.77";
  const attempt = (password: string) =>
    request.post("/api/admin/login", {
      data: { password },
      headers: { "x-forwarded-for": ip },
    });

  const codes: number[] = [];
  for (let i = 0; i < 6; i += 1) {
    codes.push((await attempt("wrong-password-attempt")).status());
  }

  // Four refusals, then the budget is spent.
  expect(codes.slice(0, 4)).toEqual([401, 401, 401, 401]);
  expect(codes.slice(4)).toEqual([429, 429]);

  const locked = await attempt(TEST_PASSWORD);
  expect(locked.status()).toBe(429);
  expect(await locked.json()).toMatchObject({ lockedOut: true });
  // A Retry-After tells a well-behaved client when to come back.
  expect(locked.headers()["retry-after"]).toBeTruthy();
});

test("a rotated IP header does not buy a fresh budget", async ({ request }) => {
  let allowed = 0;
  let refused = 0;

  for (let i = 1; i <= 30; i += 1) {
    const response = await request.post("/api/admin/login", {
      data: { password: "wrong-password-attempt" },
      headers: { "x-forwarded-for": `192.0.2.${i}` },
    });
    if (response.status() === 429) refused += 1;
    else allowed += 1;
  }

  // The regression guard. `x-forwarded-for` is client-supplied, so without the
  // process-wide budget every one of these thirty would have been served.
  expect(refused).toBeGreaterThan(0);
  expect(allowed).toBeLessThan(30);
});

test("the login form disables itself and explains the wait", async ({ page }) => {
  await page.goto("/admin/login");

  await page.getByLabel("Password").fill("wrong-password-attempt");
  await page.getByRole("button", { name: "Continue" }).click();

  const alert = page.locator("main").getByRole("alert");
  await expect(alert).toContainText(/Too many attempts/);
  await expect(alert).toContainText(/minute/);
  // Nothing to type into and nothing to submit while locked out.
  await expect(page.getByLabel("Password")).toBeDisabled();
  await expect(page.getByRole("button", { name: "Continue" })).toBeDisabled();
});
