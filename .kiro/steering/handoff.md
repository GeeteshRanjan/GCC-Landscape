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
- `npm run data:import` — xlsx → JSON. `-- --dry-run` stops before the write.
- `npm run data:verify` — invariants, then the profile figures in `data/verify-baseline.json`.
- `npm run admin:hash` — mints the admin env values. TTY only; `-- --secret` / `-- --totp` for one.
- `npm run build` — the portability test. Plain Node, no host-specific anything.

**Admin is at `/admin`**, three tabs: Companies, Taxonomy, Publish. Single password plus an optional
TOTP code, rate limited on two budgets — five per IP and twenty per process. Edits are a browser
draft, autosaved to localStorage, with a banner on every tab. Publish validates the whole dataset,
diffs it against what the write will land on, then commits.

**Git works end to end.** `main` is pushed and tracking, the repo is private, and the macOS keychain
holds a usable credential so pushes need no setup. Commit identity is set **repo-locally** to the
GitHub noreply address; the global config is deliberately still unset.

**Local admin works**, verified against a production build — login, the 1,834-row table, and a publish
target of the local file. The passphrase in `.env.local` was generated during setup and shared in a
chat transcript, so rotate it with `npm run admin:hash` before it guards anything real.

**Deployed on Vercel from `main`.** The build traces `data/dataset.json` into all three bundle types —
public page, admin pages, publish route — checked in the `.nft.json` manifests rather than inferred
from the config. **No environment variables are set yet**, so admin refuses every password there until
they are; see the blockers.

**Two paths remain unexercised:** a publish through the GitHub store, and TOTP in a live deployment.
Everything else is covered by one of the two suites.

## Next action

**Screen 2 metric catalogue, then the screens.**

1. Metric catalogue. Needs a pass over `docs/brief.md` to turn the four internal lenses (supply, speed,
   place, cost) into a schema before any form exists. The lens names are a filing system, not UI
   labels. Then the admin forms, reusing the draft-then-publish flow.
2. Screen 1, then Screen 2. Design skills run before markup on each, per `skill-router.md`.
   `src/app/page.tsx` is a scaffold placeholder that Screen 1 replaces wholesale.

Screen 1's data is entirely in place: `matchPeers`, `largestInIndustry`, `nationalScale` and
`cityDensity` in `src/data/peers.ts` cover all four blocks plus the heatmap. Only common functions has
no source.

## Blocked / needs the user

1. **Vercel has no environment variables set.** `ADMIN_PASSWORD_HASH` and `ADMIN_SESSION_SECRET` are
   required before admin works at all — without them login refuses every password and logs the real
   reason server-side, which is indistinguishable from a wrong password to the person typing it. Run
   `npm run admin:hash` and set both. Then, for publishing, `GCC_DATA_STORE=github` with
   `GCC_GITHUB_REPO`, `GCC_GITHUB_BRANCH` and a fine-grained `GCC_GITHUB_TOKEN` carrying
   `contents: read and write`. The keychain credential covers `git push` but the app cannot read it.
   Worth one real publish once it is set, to shake out token scope and branch protection.
2. **Screen 2 metric values** — hundreds, no spreadsheet behind them. Forms first, then the values.
3. **Function-per-company data** — for the common-functions block. A hardcoded common function set is
   permitted by the brief and is the likely answer.
4. **Hosting details** — which ansr.com page hosts the iframe, and who adds the embed snippet. Allowed
   origins are `ansr.com` and `*.ansr.com` in `next.config.ts`; correct them when known.

## Open decisions, not yet made

- **Whether to switch on `ADMIN_TOTP_SECRET`.** Built, verified against the published RFC 6238 test
  vectors, opt-in, currently unset. Both rate-limit budgets are per-process, so a second factor is the
  only thing that bounds a distributed guessing attempt. Recommended before this is reachable publicly.
- **Whether the browser suite runs in CI.** Needs a Chromium download and about a minute.
- **Whether a push actually triggers a Vercel rebuild.** The deployment exists, but the publish design
  depends on a commit rebuilding the app, and nobody has watched that happen end to end.
- **Thin peer sets stay as they are for now.** Electrical & Electronics returns two peers, shortfall
  three. Never padding is the invariant; the count is a baseline figure, so revising it is one
  `--accept`. Revisit when Screen 1 exists.
- `data/dataset.json` is pretty-printed: 700 KB in the repo, 53 KB gzipped. Kept because a reviewable
  line-per-field diff is the whole reason there is no database.
- `exceljs` carries a moderate `uuid` advisory reachable only when *writing*. devDependency, offline
  read-only script. Left pinned.
- No ESLint. `tsc --noEmit`, `brand_lint.py` and the two suites are the checks.
- No web font is loaded. Inter comes through the token's fallback stack; self-host it for visual work.
- Lead capture stays out of scope; the CTA links out to a separate landing page.

## Traps worth remembering

Product and data invariants live in `project.md`; brand and token rules in `design-stack.md`. These are
the ones that only bite while working on the code.

- **`data:verify -- --accept` is for profile drift only.** An INVARIANT FAILURE is a bug in the data
  layer, and `--accept` will not — and must not — clear it.
- **`server-only` throws outside a bundler's server graph**, which includes `tsx`. Anything a script
  imports cannot carry the marker: that is why `src/lib/admin/constants.ts` exists and why
  `password.ts` and `totp.ts` have none. Vitest gets past it by resolving the `react-server` condition.
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
