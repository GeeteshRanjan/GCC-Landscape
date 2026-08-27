# Handoff — current state

Volatile. Rewritten each session, never appended to. Cap 120 lines. If a line describes the past
rather than the present, delete it.

**Last updated:** 2026-08-27

## Where we are

**Data layer, admin, the Screen 2 metric catalogue and both test suites are built and verified.**
Next.js 16 + TypeScript + Tailwind v4 + shadcn/ui at the repo root, theme from `assets/brand/tokens.css`.
1834 companies plus 35 function metrics, 32 of them fully populated, in `data/dataset.json`. Neither
public screen exists yet.

Six commands, all green, plus `tsc --noEmit` and `brand_lint.py`:

- `npm test` — 240 Vitest unit tests, under a second.
- `npm run test:browser` — 75 Playwright tests against a real production build, about a minute.
- `npm run data:import` — xlsx → JSON; `-- --dry-run` stops before the write. Preserves the stored
  catalogue unless `-- --reseed-metrics` is passed.
- `npm run data:verify` — invariants, then the profile figures in `data/verify-baseline.json`.
- `npm run admin:hash` — mints the admin env values. TTY only.
- `npm run build` — the portability test. Plain Node, no host-specific anything.

**Admin is at `/admin`**, four tabs: Companies, Taxonomy, **Metrics**, Publish. Single password plus an
optional TOTP code, rate limited per IP and per process. Edits are a browser draft autosaved to
localStorage, with a banner on every tab. Publish validates the whole dataset, diffs it against what
the write will land on, then commits.

**Live at `gcc-landscape.vercel.app`**, deployed from `a3dbdf6`, which is both `HEAD` and
`origin/main` with a clean tree. Verified after deploy: public page 200, admin login 200,
`/admin/metrics` 307 to login when unauthenticated. No publish has been made from admin — the local
store is `fs`, and the browser suite publishes against its own fixture in `tests/browser/.tmp`.

`main` tracks a private repo; the keychain holds a usable credential and commit identity is repo-local.

## Next action

**Screen 1, then Screen 2.** Design skills run before markup on each, per `skill-router.md`.
`src/app/page.tsx` is a scaffold placeholder that Screen 1 replaces wholesale.

Screen 1's data is in place: `matchPeers`, `largestInIndustry`, `nationalScale` and `cityDensity` in
`src/data/peers.ts` cover all four blocks plus the heatmap. Only common functions has no source.

Screen 2 now has real figures behind it — `publicMetricsFor` returns 7 technology, 9 operations, 12 HR
and 6 finance metrics, so the screen can be designed against actual values rather than placeholders.
Consume it through `publicMetricsFor` only; reading `dataset.metrics` bypasses the gate.

## Blocked / needs the user

1. **Rotate the admin password.** The current one was generated during setup and shared in a chat
   transcript. `npm run admin:hash`, then update `ADMIN_PASSWORD_HASH` in Vercel and redeploy.
2. **Record the `GCC_GITHUB_TOKEN` expiry in a calendar.** When it lapses, publishing starts failing
   with a GitHub 401 that reads like a bug rather than an expiry.
3. **Two metrics still need figures.** `hr-fully-loaded-cost` was supplied as absolute amounts per
   role, which cannot be stored — it needs each cell as an index against the same role in the sending
   country. `tech-capability-comparison` needs Vietnam rated on the five capability rows, or the
   column dropped — the brief names Vietnam as a comparator but never rates it. Either is fine; a
   guess is not. `docs/data-audit.md` has the detail on both.
4. **Confirm two judgement calls in the figures.** Technology bench strength is stored as the national
   technology workforce rather than the GCC subset, and Grade A office stock as vacant rather than
   total, because each matches its question — both are arguable. And no metric has an `asOf` date, so
   every figure is currently undated on the public screen.
5. **Function-per-company data** — for the common-functions block. A hardcoded common function set is
   permitted by the brief and is the likely answer.
6. **Hosting details** — which ansr.com page hosts the iframe, and who adds the embed snippet. Allowed
   origins are `ansr.com` and `*.ansr.com` in `next.config.ts`; correct them when known.

## Open decisions, not yet made

- **Whether to switch on `ADMIN_TOTP_SECRET`.** Built, RFC 6238 verified, currently removed. Both
  rate-limit budgets are per-process, so on Vercel's instances it is the only real bound on distributed
  guessing. Only enable it while able to test a code immediately — see `project.md`.
- **Whether `fin-tier-cost-spread` gets per-city columns.** The brief wants a scatterplot across city
  names; the seed holds the tier-1/tier-2 headline, which is the part that carries the point.
- **Whether the browser suite runs in CI.** Needs a Chromium download and about a minute.
- **Thin peer sets stay as they are.** Electrical & Electronics returns two peers, shortfall three.
  Never padding is the invariant. Revisit when Screen 1 exists.
- No ESLint. `tsc --noEmit`, `brand_lint.py` and the two suites are the checks.
- No web font loaded; Inter comes via the token's fallback stack. Self-host it before visual work.

## Traps worth remembering

Product and data invariants live in `project.md`; brand and token rules in `design-stack.md`. These are
the ones that only bite while working on the code.

- **Never read `dataset.metrics` from a public screen.** `publicMetricsFor` / `publicMetric` is the
  gate, and its gated branch has no field a number could travel in. Picking fields in JSX instead loses
  that, and the leak would be invisible in review.
- **`data:verify -- --accept` is for profile drift only.** An INVARIANT FAILURE is a bug in the data
  layer, and `--accept` will not — and must not — clear it. Entering metric values *is* drift.
- **The draft's `STORAGE_KEY` must be bumped when the editable shape changes**, and it is versioned for
  exactly that. A restored draft missing a key fails the publish gate with a schema error the admin
  cannot fix from the UI. `tests/browser/helpers.ts` owns `DRAFT_STORAGE_KEY` so the bump is one edit.
- **Nothing metrics-related may enter the autosave effect's dep list or read `saveState`.** Every
  metric mutator reads from `current` inside the updater for that reason.
- **A new browser spec must be numbered inside the `admin` project's character class**, `[2345]-`
  today. A `7-something.spec.ts` matches no project and silently never runs.
- **`server-only` throws outside a bundler's server graph**, which includes `tsx`. That is why
  `src/lib/admin/constants.ts` exists, and why `src/data/metrics.ts` and `metric-catalogue.ts` use
  relative imports rather than the `@/` alias — `scripts/` imports them.
- **A base64url signature's last character carries padding bits**, so flipping it can decode to the
  same bytes and be a no-op. A test that forges a bad signature must change a character that is not
  the last one, or it passes on luck.
- **A 401 from `/api/admin/login` with no `remainingAttempts` is a config error, not a wrong password.**
  The server never reached the password check; the reason is in the server log.
- **`git ls-remote` on an empty repo prints nothing and exits 2.** Success with no refs, not a missing
  repo. Check the exit code and stderr before concluding a remote does not exist.
- The session cookie is `Secure`, so a Node-side HTTP client will not send it over plain http even on
  localhost — `curl` and Playwright's `page.request` both fail this way. Issue admin API calls from
  inside the page.
- **The baseline only ever moves forward.** `markPublished` advances it before the server prop catches
  up, so an equality check there reads the app's own publish as a conflict.
- A `<section>` with no accessible name is not a `region` landmark. The diff, taxonomy and metric
  sections use `aria-labelledby` so they are reachable and testable by role.
- The whole dataset does reach the admin browser, gated metric values included. That does not
  contradict the gate — admin is authenticated; the omission happens on the way out.
- `/admin` is never framed, so it uses real routes, `min-h-dvh` and a sticky header. The public screens
  are iframed and may do none of that.
