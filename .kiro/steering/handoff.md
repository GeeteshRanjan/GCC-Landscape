# Handoff — current state

Volatile. Rewritten each session, never appended to. Cap 120 lines. Present tense only.

**Last updated:** 2026-08-28

## Where we are

**Business-type similarity matching is built, tested and in the working tree — not committed.**
`main` and `origin/main` are still at `4f9c138`; everything below is uncommitted local work.

The change it makes, measured on the real dataset. A visitor from Nike used to get
**Amazon · Walmart · Target · Lowe's · 7-Eleven** — all Retail, all the right revenue band, none of
them comparable. Choosing "Apparel & footwear brand" they now get
**TJX · H&M · Adidas · GAP · Lululemon Athletica**.

Peer matching is a continuous score rather than a band ladder. The rule, weighting and floor are
durable and live in `project.md`; the vocabulary design, vetting and coverage figures are in
`docs/business-types.md` — the document to hand ANSR.

**Every check green:** **336** Vitest unit tests, **110** Playwright tests against a real production
build, `tsc --noEmit`, `brand_lint.py`, `npm run build`, `data:verify` — with seven new invariants.

**Tagging, as published.** 158 business types over 137 tags, all 24 industries covered, 18 fully
tagged, **1768 / 1834 companies (96%)**. 601 sub-industry mappings plus 568 individually-classified
companies in `scripts/business-type-map.ts`. **66 companies are deliberately untagged and listed as
such** — unidentifiable small firms, plus rows mis-filed at source. Untagged is safe: they still
match at industry level.

**Every assignment was independently vetted.** 93–95% agreement, corrections recorded inline. It
found five real vocabulary gaps, all closed: insurance brokers filed as underwriters, software vendors
filed as banks, contract electronics with no home, ad agencies collapsing into management consulting,
mining-equipment makers carrying `agriculture`.

**Admin has a fifth tab.** `/admin/business-types` edits the catalogue; the companies table shows a
searchable "Line of business" column; the publish panel renders a business-types diff section,
because a tag edit re-scores a whole industry with no company row touched.

## Next action

1. **Review `docs/business-types.md`, then commit and push.** Nothing is half-finished. The commit
   must carry `data/dataset.json` and `data/verify-baseline.json` together — the baseline was
   re-accepted for the seven new coverage figures.
2. **Walk the new input on the live deployment** once pushed. Playwright covers a local production
   build, not that artefact.
3. **Ask ANSR to sanity-check the type list per industry.** The tables at the end of
   `docs/business-types.md` are laid out for it — an hour's read rather than 1834 rows.

Ours and not urgent: **self-host Inter** (no web font loads), **the HR tab's short bars**.

## Blocked / needs the user

1. **Rotate the admin password** — shared in a chat transcript, deployment publicly reachable.
   `npm run admin:hash`, update `ADMIN_PASSWORD_HASH` in Vercel, redeploy. The only item with a live
   exposure behind it.
2. **Calendar the `GCC_GITHUB_TOKEN` expiry.** When it lapses, publishing fails with a GitHub 401
   that reads like a bug rather than an expiry.
3. **The CTA destination.** `NEXT_PUBLIC_GCC_CTA_URL` unset, so both screens fall back to
   `https://www.ansr.com/`. Next inlines `NEXT_PUBLIC_*` at build time — it needs a redeploy.
4. **Hosting details** — which ansr.com page hosts the iframe, who adds the snippet, and
   `NEXT_PUBLIC_GCC_FRAME_TARGET_ORIGIN` (unset, so height posts to `*`).
5. **Confirm the Screen 2 figures are publishable as-is** — nothing on the page flags any as
   provisional, and four sets are judgement rather than supplied data. Named in `docs/data-audit.md`.
6. **Sign off `COMMON_FUNCTIONS`** (eight hardcoded Screen 1 entries) and **two Screen 2 judgement
   calls** — shared supply figures are the national technology workforce; office stock shows both.

## Open decisions, not yet made

- **Whether `SIMILARITY_FLOOR` (0.15) is set right.** The one number trading peer-set quality against
  length. It currently shortens **112 of 1064** industry × business-type × band combinations below
  five peers, and `data:verify` tracks that figure so the effect is measured rather than guessed.
- **Whether to relax the industry boundary.** P&G is arguably a better Nike peer than Lowe's. The tag
  architecture makes it small — drop the hard filter, make industry a heavily-weighted tag — but it
  contradicts a stated invariant and risks "why am I compared to a soap company".
- **Company-name autocomplete** pre-filling industry, band and line of business. A convenience on top
  of the dropdown, not a substitute; most visitors are not in the 1834.
- **Whether anything replaces the Screen 2 sample stamp.** Nothing does; `data:verify` counts the 35
  of 35 metrics stating no provenance.
- **The white-on-orange token.** White on `--ansr-orange` is 3.22:1, a real AA failure, so both
  screens use black on orange (6.52:1) at `public/closing-cta.tsx`. Change the token or keep the
  override.
- **Whether to switch on `ADMIN_TOTP_SECRET`.** Built and verified, currently removed. Only enable it
  while able to test a code immediately.
- **Whether the browser suite runs in CI** (needs Chromium and a minute; no ESLint either), and that
  **nothing verifies how the screens LOOK** — no visual regression, no automated accessibility audit.

## Traps worth remembering

Invariants are in `project.md`, brand rules in `design-stack.md`, visual decisions in
`.tastemaker/style-lock.md`. These bite only in the code.

- **`matchPeersByBandLadder` is the equivalence oracle, not dead code.** It proves the scored engine
  returns byte-identical peers where nothing is tagged. Deleting it deletes that guarantee.
- **The floor applies to `businessSimilarity` alone, never the combined score.** A perfect band match
  is worth 0.3 and would drag business-irrelevant companies over the line.
- **Pure IDF scores every tag zero when all tagged companies in an industry share one type.** That
  emptied Electrical & Electronics until `businessSimilarity` learned to fall back to unweighted
  overlap. Do not remove that branch.
- **`log(N/f)`, not `log(1 + N/f)`.** The smoothed form kept a universal tag at 0.69, which let a
  grocery chain clear the floor against a footwear brand and made all of Retail eligible.
- **Per-company keys must be industry-scoped.** "STATS Perform" (Software) and "Stats Perform"
  (Media) are different companies differing only in case.
- **The source contains a non-breaking space inside a value** (`Healthcare\u00a0Enterprise
  Management`). `cleanText` normalises it; Python's `.strip()` does not.
- **The industry-count figure must come from the same population as the peers.** Counting the exact
  business type gave Nike "one other" directly above five named peers.
- **`getByRole("checkbox").first()` in the admin editor used to select a CITY**, which is how those
  specs satisfied the one-city rule by accident. Name the group.
- **Tag slugs must never reach the page.** `TAG_PHRASES` in `screen1/copy.ts` maps them to English and
  drops anything unmapped; `0-business-type.spec.ts` asserts no slug leaks.
- **Never read `dataset.metrics` from a public screen.** `publicMetricsFor` is the gate.
- **A shared metric is one definition, several rows.** Editing one tab and not the others trips a
  `data:verify` invariant — fix the data, not the check.
- **`src/app/page.tsx` is `force-dynamic` on purpose** — a prerender bakes the taxonomy in.
- **A browser spec must be numbered inside a project's `testMatch`** — `0-` public, `[2345]-` admin,
  `1-`/`6-` auth and lockout. A `7-` spec matches no project and silently never runs.
- **The draft `STORAGE_KEY` is at v3**; `tests/browser/helpers.ts` owns the copy and moves with it.
- **`data:verify -- --accept` is for profile drift only**; an INVARIANT FAILURE is a bug.
- **`server-only` throws outside a bundler's server graph**, including `tsx`. A `<section>` with no
  accessible name is not a `region` landmark; every band names itself.
