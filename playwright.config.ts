import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

/**
 * Browser tests, against a real production build.
 *
 * These exist to cover what the unit tests structurally cannot: the draft
 * lifecycle. Autosave, restore after a reload, the stale-baseline conflict, the
 * unpublished-changes banner and focus behaviour in the dialogs all depend on
 * real localStorage and a real navigation. Simulating those under jsdom would
 * mostly test the simulation.
 *
 * `next start`, not `next dev`. The session cookie is `Secure` in production and
 * the CSP headers are what ship, so testing the dev server would test a
 * different application. Chromium treats localhost as a secure context, so the
 * cookie works over plain http.
 *
 * Serial, one worker. The suite shares one server process, and that process holds
 * the rate limiter's counters and the cached dataset in memory. Parallel workers
 * would make the order of tests part of the result.
 */

const FIXTURE = path.join(process.cwd(), "tests", "browser", ".tmp", "env.json");

function fixtureEnv(): Record<string, string> {
  if (!existsSync(FIXTURE)) {
    throw new Error(
      "tests/browser/.tmp/env.json is missing. Run `npm run test:browser`, which prepares the " +
        "fixture first, rather than calling playwright directly.",
    );
  }
  return JSON.parse(readFileSync(FIXTURE, "utf8")) as Record<string, string>;
}

const PORT = 3210;

export default defineConfig({
  testDir: "./tests/browser",
  // Numbered so the reading order is the running order: sign in, then edit a
  // draft, then taxonomy, then the function metrics, then publish — which
  // mutates the fixture dataset. The numbers are load-bearing twice over: the
  // `admin` project's pattern is a character class, so a spec numbered outside
  // it lands in no project at all and silently never runs.
  testMatch: /\d+-.*\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: process.env.CI ? "list" : [["list"], ["html", { open: "never" }]],
  timeout: 30_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },

  projects: [
    /**
     * Ordering here is a correctness requirement, not tidiness. The server's rate
     * limiter is in-process, so the spec that deliberately exhausts it locks out
     * everything that runs afterwards — it has to go last, behind a dependency.
     */
    /**
     * The public screens. No session, no dependencies, and first: the specs here
     * read the fixture dataset, and `5-publish` rewrites it. Its own `testMatch`
     * exists because `admin`'s is a character class — a spec numbered outside
     * every project's pattern lands in no project and silently never runs.
     */
    {
      name: "public",
      testMatch: /0-.*\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "unauthenticated",
      testMatch: /1-auth\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    // Signs in once and saves the cookie, so the specs that follow are about the
    // admin rather than about logging in.
    { name: "signin", testMatch: /signin\.setup\.ts/, dependencies: ["unauthenticated"] },
    {
      name: "admin",
      testMatch: /[2345]-.*\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], storageState: "tests/browser/.tmp/session.json" },
      dependencies: ["signin"],
    },
    {
      name: "lockout",
      testMatch: /6-lockout\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["admin"],
    },
  ],

  webServer: {
    command: `npm run build && npx next start -p ${PORT}`,
    url: `http://127.0.0.1:${PORT}/admin/login`,
    reuseExistingServer: false,
    timeout: 180_000,
    stdout: "pipe",
    stderr: "pipe",
    env: fixtureEnv(),
  },
});
