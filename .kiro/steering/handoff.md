# Handoff — current state

Volatile. Rewritten each session, never appended to. Cap 120 lines. Present tense only.

**Last updated:** 2026-08-28

## Where we are

**Shipped and verified live.** `main` is `9d5b699`, production is built from it, and the public specs run
in a real browser against `gcc-landscape.vercel.app` — three consecutive clean runs. Repo is `main` only.

A Nike visitor choosing Retail / "Apparel & footwear brand" gets **TJX · H&M · Adidas · GAP · Lululemon
Athletica** — the case the whole change existed for. It used to return Amazon, Walmart, Target, Lowe's
and 7-Eleven.

**The gate is green:** 339 Vitest, 111 Playwright local, 30 against live production, `tsc`,
`brand_lint.py`, `npm run build`, `data:verify` with every invariant holding.

**`SIMILARITY_FLOOR` is 0.20**, chosen by sweep: a utilities and grid visitor now gets NationalGrid,
Nextracker, LM Wind Power and Aggreko, honestly one short, where 0.15 gave five oil majors. Costs 147
short sets of 1064 against 112; reasoning sits beside the constant in `similarity.ts`.

**The browser suite can now run against a deployment** — the gap that let a false copy line ship.
`GCC_TEST_BASE_URL=https://... npm run test:deployed`: **30 pass against live production**, 33 seconds.
Unset, nothing changes. Only the public specs exist in that mode, deliberately: the admin specs publish
and the lockout spec exhausts the rate limiter, so against production they would commit to the client's
dataset and lock the real admin out.

**It has already earned itself twice.** Its second production run caught a focus race 111 local tests
never could: transitions set state then guessed a `requestAnimationFrame` to focus the new `h1`, so when
React committed later the ref was null and the call vanished — silently dropping the only announcement a
screen reader gets for a phase change. Now an effect keyed on the phase, running after commit.

## Next action

Nothing is half-finished; the next move is a choice rather than a continuation.

1. **A stray `Group 149.svg` (7.1 MB) sits untracked in the repo root.** Not referenced anywhere. Brand
   art belongs under `assets/brand/`, adapted rather than dropped in — move or delete it, but do not
   commit it where it is.
2. **Run `test:deployed` after each production deploy.** 33 seconds, and the only check that looks at
   what a visitor actually gets.

Ours, not urgent: **self-host Inter** (no web font loads); **the HR tab's short bars**.

## Blocked / needs the user

1. **Rotate the admin password** — shared in a chat transcript, deployment publicly reachable.
   `npm run admin:hash`, update `ADMIN_PASSWORD_HASH` in Vercel, redeploy. The only item with live
   exposure behind it.
2. **Calendar the `GCC_GITHUB_TOKEN` expiry.** When it lapses, publishing fails with a GitHub 401
   that reads like a bug rather than an expiry.
3. **Two unset env vars, both needing a redeploy** (`NEXT_PUBLIC_*` is inlined at build time):
   `NEXT_PUBLIC_GCC_CTA_URL`, so both screens fall back to `https://www.ansr.com/`, and
   `NEXT_PUBLIC_GCC_FRAME_TARGET_ORIGIN`, so height posts to `*`. Plus the hosting details — which
   ansr.com page carries the iframe, and who adds the snippet.
4. **Three sign-offs from ANSR:** the Screen 2 figures as publishable (nothing flags any as provisional,
   four are judgement — `docs/data-audit.md`), `COMMON_FUNCTIONS`, and the business types per industry
   (tables at the end of `docs/business-types.md`, an hour's read not 1834 rows).

## Open decisions, not yet made

- **Whether to relax the industry boundary, and if so only as a fallback.** Prototyped in
  `scripts/proto-industry-tag.ts` (untracked); **the obvious form does not work.** Industry as a
  heavily-weighted tag gives **zero** cross-industry peers at any weight, since a same-industry
  same-business company scores near 1.0 while the best outsider caps far below — Nike never sees P&G
  while twenty apparel retailers exist. Weight it high enough to matter and within-industry
  discrimination collapses instead, bringing Amazon back for Nike. **The variant worth deciding on** is
  cross-industry as a *fallback only* above a 0.40 bar: 105 of the 119 short sets lengthen, 14 stay
  short, an agribusiness card fills with FMC, Corteva, Yara and Nutrien at 0.66 rather than a
  semiconductor firm at 0.16. It breaks the invariant "a business type never returns a peer from another
  industry", and leaves `industryOthers` / `sameBusinessType` industry-scoped so "and 54 others in
  Retail" stops describing the peers shown — a copy decision before any code.
- **Whether the two analysis scripts are committed or deleted.** Both untracked, both runnable, neither
  a maintenance tool.
- **Whether to disable Vercel preview protection** or mint a bypass token. Production can now be tested
  with `test:deployed`; a *preview* still cannot, so a change is only verifiable on a deployment after it
  is already live. The remaining half of this gap.
- **Whether anything replaces the Screen 2 sample stamp.** Nothing does; `data:verify` counts the 35
  of 35 metrics stating no provenance.
- **The white-on-orange token.** White on `--ansr-orange` is 3.22:1, a real AA failure, so both screens
  use black on orange (6.52:1) at `public/closing-cta.tsx`. Change the token or keep the override.
- **Whether to switch on `ADMIN_TOTP_SECRET`.** Built and verified, currently removed. Only enable it
  while able to test a code immediately.
- **Whether either browser suite runs in CI** (needs Chromium and a minute; no ESLint either), and that
  **nothing verifies how the screens LOOK** — no visual regression, no a11y audit.

## Traps worth remembering

Invariants are in `project.md`, brand rules in `design-stack.md`. These bite only in the code.

- **A guard that is always false makes a test pass while asserting nothing**, and a name counting things
  the assertions do not check is decoration. A test read `hqCountry` off a `PeerCard`, which drops it, so
  `undefined` vs `undefined` ran nothing; "offers exactly the five inputs" had six. Make a regression test
  fail against the old behaviour before keeping it.
- **Visitor-facing copy hardcoded in a component drifts** — the peer lead sat inline in `peer-view.tsx`
  describing the band ladder long after matching went continuous. Sentences belong in `copy.ts`.
- **Never pair `setState` with a `requestAnimationFrame` that reads a ref.** React may commit later; the
  ref is null and the call vanishes. Use an effect keyed on the state.
- **A check that hardcodes a constant measures the constant.** `sweep-floor.ts` asserted it reproduced
  `matchPeers` "at 0.15"; raising the floor made it declare itself UNSOUND and refuse to run. It reads
  `SIMILARITY_FLOOR` now.
- **Pure IDF scores every tag zero when one industry's tagged companies share a type** — that emptied
  Electrical & Electronics until `businessSimilarity` fell back to unweighted overlap; keep the branch.
  Use **`log(N/f)`, not `log(1 + N/f)`**: smoothed kept a universal tag at 0.69, making all of Retail
  eligible against a footwear brand.
- **Peer-set assertions must be scoped to `#peers`** — Walmart legitimately appears on Nike's result.
- **`tsc` covers `scripts/`, but `tsx` does not typecheck** — a script that runs fine still breaks the
  gate under `noUncheckedIndexedAccess`. **`hqCountry` is `"USA"`**, not `"United States"`; a wrong value
  silently disables the HQ tiebreak. There is no "SaaS" business type.
- **Per-company keys must be industry-scoped** — "STATS Perform" (Software) and "Stats Perform" (Media)
  differ only in case. The source also hides a non-breaking space in a value: `cleanText` normalises it,
  Python's `.strip()` does not.
- **Tag slugs must never reach the page** (`TAG_PHRASES` maps them to English) and the industry-count
  figure must come from the same population as the peers. **`page.tsx` is `force-dynamic` on purpose** —
  a prerender bakes the taxonomy in. **The draft `STORAGE_KEY` is at v3**, mirrored in `helpers.ts`.
- **A browser spec must be numbered inside a project's `testMatch`** — `0-` public, `[2345]-` admin,
  `1-`/`6-` auth and lockout; a `7-` spec matches nothing and silently never runs. That same mechanism is
  the safety boundary in deployed mode, where only `0-` exists: **a write-capable spec renumbered `0-`
  would run against production and publish.**
