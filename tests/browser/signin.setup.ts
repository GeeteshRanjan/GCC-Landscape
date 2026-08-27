import { expect, test as setup } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";

import { TEST_PASSWORD } from "./prepare";

/**
 * Signs in once and saves the session cookie for the specs that follow, so they
 * are about the admin rather than about logging in. The login flow itself is
 * covered by 1-auth.spec.ts.
 */
const SESSION_FILE = path.join(process.cwd(), "tests", "browser", ".tmp", "session.json");

setup("sign in and save the session", async ({ page, context }) => {
  await page.goto("/admin/login");

  await page.getByLabel("Password").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Continue" }).click();

  // Landing on the companies table is the proof the session took.
  await expect(page.getByRole("heading", { name: "Companies", level: 1 })).toBeVisible();

  await context.storageState({ path: SESSION_FILE });

  // The cookie must be httpOnly, or a script on the page could read it. Asserted
  // here because this is the only place a real Set-Cookie is observed.
  const saved = JSON.parse(readFileSync(SESSION_FILE, "utf8")) as {
    cookies: Array<{ name: string; httpOnly: boolean; sameSite: string }>;
  };
  const session = saved.cookies.find((cookie) => cookie.name === "gcc_admin_session");
  expect(session, "the session cookie should have been set").toBeDefined();
  expect(session?.httpOnly).toBe(true);
  expect(session?.sameSite).toBe("Strict");
});
