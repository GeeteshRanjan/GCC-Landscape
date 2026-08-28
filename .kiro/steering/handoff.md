# Handoff — current state

Volatile. Rewritten each session, never appended to. Cap 120 lines. Present tense only.

**Last updated:** 2026-08-28

## Where we are

**PR #1 is open and awaiting review**, reported mergeable with no conflicts.
`github.com/GeeteshRanjan/GCC-Landscape/pull/1` — `feat/business-type-similarity` → `main`, 44 files.
`main` is still at `4f9c138`; nothing is merged yet.

Two substantive commits, the rest documentation. No count given — every handoff rewrite lands on this
branch, so any number here is stale on arrival; use `git log origin/main..`.

| Commit | What it is |
| --- | --- |
| `f5a9d58` | The scored peer engine, 44 files. Was the uncommitted working tree. |
| `b5a1754` | `SIMILARITY_FLOOR` 0.15 → 0.20, with the re-accepted baseline. |

**The gate is green:** 336 Vitest, 110 Playwright against a real production build, `tsc`,
`brand_lint.py`, `npm run build`, `data:verify`, every invariant holding.

**The floor is now 0.20.** Verified in the shipped engine, not just the sweep: a utilities and
grid-operations visitor gets NationalGrid, Nextracker, LM Wind Power and Aggreko — four real
power-and-grid peers, honestly one short — where 0.15 gave five oil majors. Aerospace gains Moog over
Boeing. Cost is 112 → 147 short sets of 1064. Reasoning sits beside the constant in `similarity.ts`.

**Company-name autocomplete was built and then removed** on ANSR's call; the reasoning is durable and
lives in `project.md`. Nothing partial is left — plain text input, and the form's promise is back to
"Nothing you enter is stored or sent to us." The remote branch is deleted; the commits survive only as
the **local** ref `feat/company-name-autocomplete` (`b4324c4`), so they go when this clone does. That is
the intended outcome.

## Next action

1. **Review and merge PR #1.** It must land `data/dataset.json` and `data/verify-baseline.json`
   together — the baseline carries the new coverage figures, and splitting them breaks `data:verify`
   for whoever pulls next. Squashing is fine; splitting the data files is not.
2. **Then walk the live deployment**, never yet done. Verified by fetching `gcc-landscape.vercel.app`:
   it still has no "Line of business" field, because a branch push builds a *preview*, not production.
   `curl` cannot drive it either — the peer set arrives via a server action — so it needs a browser.
   Pointing Playwright's `public` project at the deployed URL would close that gap permanently.

Ours, not urgent: **self-host Inter** (no web font loads), **the HR tab's short bars**.

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
4. **Three sign-offs from ANSR:** the Screen 2 figures as publishable (nothing flags any as
   provisional, four sets are judgement — `docs/data-audit.md`), `COMMON_FUNCTIONS`, and the business
   types per industry (tables at the end of `docs/business-types.md`, an hour's read not 1834 rows).

## Open decisions, not yet made

- **Whether to relax the industry boundary, and if so only as a fallback.** Prototyped in
  `scripts/proto-industry-tag.ts` (uncommitted); **the obvious form does not work.** Industry as a
  heavily-weighted tag produces **zero** cross-industry peers for six test visitors at any weight, since
  a same-industry same-business company scores near 1.0 while the best outsider caps far below — Nike
  never sees P&G while twenty apparel retailers exist. Weight it high enough to matter and
  within-industry discrimination collapses instead, bringing Amazon and Best Buy back for Nike.
  **The variant worth deciding on** is cross-industry as a *fallback only*, above a 0.40 similarity
  bar: 105 of the 119 short sets lengthen, 14 stay short, and an agribusiness card fills with FMC,
  Corteva, Yara and Nutrien at 0.66 rather than a semiconductor firm at 0.16. Two costs: it breaks the
  invariant "a business type never returns a peer from another industry", and `industryOthers` /
  `sameBusinessType` are industry-scoped, so "and 54 others in Retail" would stop describing the peers
  shown. That second one needs a copy decision before any code.
- **Whether the two analysis scripts are committed or deleted.** `sweep-floor.ts` backs the applied
  floor decision, `proto-industry-tag.ts` the open one above. Both untracked, both currently runnable,
  neither a maintenance tool. If they are kept, they need to stay runnable — see the trap below.
- **Whether anything replaces the Screen 2 sample stamp.** Nothing does; `data:verify` counts the 35
  of 35 metrics stating no provenance.
- **The white-on-orange token.** White on `--ansr-orange` is 3.22:1, a real AA failure, so both screens
  use black on orange (6.52:1) at `public/closing-cta.tsx`. Change the token or keep the override.
- **Whether to switch on `ADMIN_TOTP_SECRET`.** Built and verified, currently removed. Only enable it
  while able to test a code immediately.
- **Whether the browser suite runs in CI** (needs Chromium and a minute; no ESLint either), and that
  **nothing verifies how the screens LOOK** — no visual regression, no a11y audit.

## Traps worth remembering

Invariants are in `project.md`, brand rules in `design-stack.md`. These bite only in the code.

- **`matchPeersByBandLadder` is the equivalence oracle, not dead code.** It proves the scored engine
  returns byte-identical peers where nothing is tagged. Deleting it deletes that guarantee.
- **A check that hardcodes a constant measures the constant, not the thing.** `sweep-floor.ts` asserted
  it reproduced `matchPeers` "at 0.15"; raising the floor made it declare itself UNSOUND and refuse to
  run. It reads `SIMILARITY_FLOOR` now.
- **Pure IDF scores every tag zero when all tagged companies in an industry share one type.** That
  emptied Electrical & Electronics until `businessSimilarity` learned to fall back to unweighted
  overlap. Do not remove that branch.
- **`log(N/f)`, not `log(1 + N/f)`.** The smoothed form kept a universal tag at 0.69, which made all
  of Retail eligible against a footwear brand.
- **Peer-set assertions must be scoped to `#peers`.** Walmart legitimately appears on Nike's result —
  the largest-in-industry panel is supposed to name the biggest retailers.
- **`tsc` covers `scripts/`, but `tsx` does not typecheck.** A script that runs fine still breaks the
  gate under `noUncheckedIndexedAccess`.
- **There is no "SaaS" business type** (the software vocabulary is by domain, not delivery model) and
  **`hqCountry` is `"USA"`**, not `"United States"` — a wrong value silently disables the HQ tiebreak.
- **Per-company keys must be industry-scoped.** "STATS Perform" (Software) and "Stats Perform" (Media)
  differ only in case. The source also hides a non-breaking space in a value — `cleanText` normalises
  it, Python's `.strip()` does not.
- **Tag slugs must never reach the page** — `TAG_PHRASES` in `screen1/copy.ts` maps them to English —
  and the industry-count figure must come from the same population as the peers.
- **`src/app/page.tsx` is `force-dynamic` on purpose** — a prerender bakes the taxonomy in. **The draft
  `STORAGE_KEY` is at v3**; `tests/browser/helpers.ts` owns the copy and moves with it.
- **A browser spec must be numbered inside a project's `testMatch`** — `0-` public, `[2345]-` admin,
  `1-`/`6-` auth and lockout. A `7-` or `9-` spec matches no project and silently never runs.
- **`data:verify -- --accept` is for profile drift only**; an INVARIANT FAILURE is a bug.
- **`server-only` throws outside a bundler's server graph**, including `tsx`. A `<section>` with no
  accessible name is not a `region` landmark — every band names itself.
