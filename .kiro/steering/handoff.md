# Handoff — current state

Volatile. Rewritten each session, never appended to. Cap 120 lines. If a line describes the past
rather than the present, delete it.

**Last updated:** 2026-08-27

## Where we are

**Data layer, admin foundation and the test suites are built, verified, and pushed.** Next.js 16 +
TypeScript + Tailwind v4 + shadcn/ui at the repo root, theme generated from `assets/brand/tokens.css`.
All 1834 companies in `data/dataset.json`. Neither public screen exists yet.

Six commands, all green, plus `tsc --noEmit` and `brand_lint.py`:

- `npm test` — 165 Vitest unit tests, under a second.
- `npm run test:browser` — 54 Playwright tests against a real production build, about a minute.
- `npm run data:import` — xlsx → JSON; `-- --dry-run` stops before the write.
- `npm run data:verify` — invariants, then the profile figures in `data/verify-baseline.json`.
- `npm run admin:hash` — mints the admin env values. TTY only.
- `npm run build` — the portability test. Plain Node, no host-specific anything.

**Admin is at `/admin`**, three tabs: Companies, Taxonomy, Publish. Single password plus an optional TOTP
code, rate limited per IP and per process. Edits are a browser draft autosaved to localStorage, with a
banner on every tab. Publish validates the whole dataset, diffs it against what the write will land on,
then commits.

**Live and fully working at `gcc-landscape.vercel.app`**, running the current `main`. Verified against the
deployment rather than assumed: the public page renders, login succeeds, the table serves all 1,834 rows,
and **publishing round-trips to the real repository** — diff, commit on `main`, Vercel rebuild, live. The
second factor is off (`ADMIN_TOTP_SECRET` removed). Nothing is left unexercised: every path is covered by
one of the two suites or by that check.

The two `data: publish from admin` commits in history are that test, reverted — not real data changes.

**Local.** `main` tracks a private repo, the keychain holds a usable credential so pushes need no setup,
and commit identity is set repo-locally.

## Next action

**The Screen 2 metric catalogue, then the screens.** Setup is finished; this is a build session now.

1. Metric catalogue. Needs a pass over `docs/brief.md` to turn the four internal lenses (supply, speed,
   place, cost) into a schema before any form exists. The lens names are a filing system, not UI
   labels. Then the admin forms, reusing the draft-then-publish flow.
2. Screen 1, then Screen 2. Design skills run before markup on each, per `skill-router.md`.
   `src/app/page.tsx` is a scaffold placeholder that Screen 1 replaces wholesale.

Screen 1's data is in place: `matchPeers`, `largestInIndustry`, `nationalScale` and `cityDensity` in
`src/data/peers.ts` cover all four blocks plus the heatmap. Only common functions has no source.

## Blocked / needs the user

1. **Rotate the admin password.** The current one was generated during setup and shared in a chat
   transcript. `npm run admin:hash`, then update `ADMIN_PASSWORD_HASH` in Vercel and redeploy.
2. **Record the `GCC_GITHUB_TOKEN` expiry in a calendar.** When it lapses, publishing starts failing with
   a GitHub 401 that reads like a bug rather than an expiry.
3. **Screen 2 metric values** — hundreds, no spreadsheet behind them. Forms first, then the values.
4. **Function-per-company data** — for the common-functions block. A hardcoded common function set is
   permitted by the brief and is the likely answer.
5. **Hosting details** — which ansr.com page hosts the iframe, and who adds the embed snippet. Allowed
   origins are `ansr.com` and `*.ansr.com` in `next.config.ts`; correct them when known.

## Open decisions, not yet made

- **Whether to switch on `ADMIN_TOTP_SECRET`.** Built, RFC 6238 verified, currently removed. Both
  rate-limit budgets are per-process, so on Vercel's instances it is the only real bound on distributed
  guessing. Only enable it while able to test a code immediately — see the Auth row in `project.md`.
- **Whether the browser suite runs in CI.** Needs a Chromium download and about a minute.
- **Thin peer sets stay as they are.** Electrical & Electronics returns two peers, shortfall three.
  Never padding is the invariant; the count is a baseline figure. Revisit when Screen 1 exists.
- `data/dataset.json` is pretty-printed: 700 KB, 53 KB gzipped. A reviewable line-per-field diff is the
  whole reason there is no database.
- `exceljs` has a moderate `uuid` advisory, reachable only when *writing*. Offline read-only script; pinned.
- No ESLint. `tsc --noEmit`, `brand_lint.py` and the two suites are the checks.
- No web font loaded; Inter comes via the token's fallback stack. Self-host it for visual work.
- Lead capture stays out of scope; the CTA links out to a separate landing page.

## Traps worth remembering

Product and data invariants live in `project.md`; brand and token rules in `design-stack.md`. These are
the ones that only bite while working on the code.

- **`data:verify -- --accept` is for profile drift only.** An INVARIANT FAILURE is a bug in the data
  layer, and `--accept` will not — and must not — clear it.
- **`server-only` throws outside a bundler's server graph**, which includes `tsx`. Anything a script
  imports cannot carry the marker: that is why `src/lib/admin/constants.ts` exists and why
  `password.ts` and `totp.ts` have none. Vitest gets past it by resolving the `react-server` condition.
- **A 401 from `/api/admin/login` with no `remainingAttempts` is a config error, not a wrong password.**
  The server never reached the password check; the reason is in the server log, never the response.
- **`git ls-remote` on an empty repo prints nothing and exits 2.** That is success with no refs, not a
  missing repo. A private repo also 404s to an unauthenticated browser. Check the exit code and stderr
  before concluding a remote does not exist.
- The session cookie is `Secure`, so a Node-side HTTP client will not send it over plain http even on
  localhost — `curl` and Playwright's `page.request` both fail this way while the browser succeeds.
  Issue admin API calls from inside the page.
- **Nothing in the draft provider may depend on `saveState` while also setting it.** That loop is why
  every mutation goes through `applyEdit`, why the autosave effect lists only `[editable, dirty,
  hydrated]`, and why storage availability is a ref. It produced a status line that lied about whether
  work was saved.
- **The baseline only ever moves forward.** `markPublished` advances it before the server prop catches
  up, so an equality check there reads the app's own publish as a conflict.
- A `<section>` with no accessible name is not a `region` landmark. The diff and taxonomy sections use
  `aria-labelledby` so they are reachable and testable by role.
- The whole dataset does reach the admin browser. That does not contradict "never ship the dataset to
  the browser" — that rule is about the public surface. `dataset.ts` stays `server-only`.
- `/admin` is never framed, so it uses real routes, `min-h-dvh` and a sticky header. The public screens
  are iframed and may do none of that.
- Browser specs are numbered and run in that order, one worker. `5-lockout.spec.ts` exhausts the
  in-process rate limiter, so anything after it would be locked out.
