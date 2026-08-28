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

/**
 * Point the suite at an already-deployed URL instead of building one locally.
 *
 * ── Why this exists ─────────────────────────────────────────────────────────
 *
 * Every check in this repo ran against a local build, and that gap shipped a
 * bug: the peer section's lead claimed matching was led by revenue band and
 * showed own-market companies first, which stopped being true when matching went
 * continuous. 336 unit tests and 110 browser tests all passed, because none of
 * them looked at a deployment. It was found by hand, on production.
 *
 * ── Why only the public specs ───────────────────────────────────────────────
 *
 * This is a hard safety boundary, not a convenience. The admin specs sign in,
 * edit a draft and PUBLISH — against a real deployment that means attempting a
 * genuine commit to the client's dataset. So in deployed mode the admin,
 * signin, unauthenticated and lockout projects are NOT DEFINED AT ALL, and the
 * file's existing mechanism does the rest: a spec that matches no project's
 * `testMatch` silently never runs. There is no flag that can turn them back on
 * and no ordering mistake that can reach them.
 *
 * The lockout spec is a second reason. It deliberately exhausts the login rate
 * limiter; run against production it would lock the real admin out.
 *
 * ── What it cannot cover ────────────────────────────────────────────────────
 *
 * Read-only assertions about the public screens. That is the whole point — it
 * checks the artefact a visitor gets, which is the thing no other check sees.
 */
const DEPLOYED = process.env.GCC_TEST_BASE_URL?.trim();

if (DEPLOYED && !/^https?:\/\//.test(DEPLOYED)) {
  throw new Error(
    `GCC_TEST_BASE_URL must be an absolute http(s) URL, got "${DEPLOYED}".`,
  );
}

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
  // Deployed runs cross the network and can cold-start a serverless function, so
  // the budgets are looser there. Retries stay at 0 in both modes: a flake against
  // a deployment is information, and a retry would hide it.
  timeout: DEPLOYED ? 60_000 : 30_000,
  expect: { timeout: DEPLOYED ? 20_000 : 10_000 },

  use: {
    baseURL: DEPLOYED ?? `http://127.0.0.1:${PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },

  projects: DEPLOYED
    ? [
        /**
         * The only project in deployed mode. Everything that writes, signs in or
         * exhausts the rate limiter is deliberately absent — see the note above.
         */
        {
          name: "deployed-public",
          testMatch: /0-.*\.spec\.ts/,
          use: { ...devices["Desktop Chrome"] },
        },
      ]
    : [
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

  // No local server in deployed mode, and `fixtureEnv()` is not called — it throws
  // when the fixture is missing, and a deployed run has no reason to have one.
  webServer: DEPLOYED
    ? undefined
    : {
        command: `npm run build && npx next start -p ${PORT}`,
        url: `http://127.0.0.1:${PORT}/admin/login`,
        reuseExistingServer: false,
        timeout: 180_000,
        stdout: "pipe",
        stderr: "pipe",
        env: fixtureEnv(),
      },
});
