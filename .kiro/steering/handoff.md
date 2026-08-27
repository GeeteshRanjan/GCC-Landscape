# Handoff — current state

Volatile. Rewritten each session, never appended to. Cap 120 lines. Present tense only.

**Last updated:** 2026-08-28

## Where we are

**Both public screens are built, and STILL NOT COMMITTED.** The Peer View and Function View exist only
in the working tree — `src/components/screen1|screen2|public/`, `src/data/screen1|screen2|geo.ts`,
`src/app/actions.ts`, `public/`, `.tastemaker/` and four specs are untracked; `page.tsx`, `globals.css`,
`playwright.config.ts`, `.env.example`, both files in `data/`, the steering files, the catalogue, the
schema and four test files are unstaged. One `git checkout` loses five sessions of work — commit before
anything else. Next.js 16, TypeScript, Tailwind v4, shadcn/ui, tokens from `assets/brand/tokens.css`.

Every check green: **309** Vitest unit tests, **101** Playwright tests against a real production build,
`tsc --noEmit`, `brand_lint.py`, `npm run build` (the plain-Node test), and `data:verify` — clean, with
"metrics a visitor would receive" reading **9 / 9 / 11 / 6**.

**One route, three phases.** `src/app/page.tsx` serves everything and
`src/components/public/tool.tsx` owns the state: ask → Peer View → Function View. Not routes — the tool
is iframed and cannot own the URL bar — so there are no deep links, the back button does not step back a
phase, and each phase carries its own way back. Focus moves to the new `h1` on every transition.

**The catalogue carries ANSR's reviewed figures**, 35 metrics, every slot filled. The tabs are four
views of one national picture rather than four datasets — the rule and its invariant are in
`project.md`, the figures and their provenance in `docs/data-audit.md`.

## Next action

**Commit everything, then push.** The tool is feature-complete against `docs/brief.md` as revised, and
`origin/main` is two commits behind `HEAD`, so the live site is still admin-only and has neither the
public screens nor the current figures. After that, the blocked list below plus these two, neither urgent:

- **Self-host Inter.** No web font is loaded, so a visitor sees the token's fallback stack.
- **The HR tab's short salary-growth bars.** Percent bars scale to 100 by rule, so 7.5% draws as a
  sliver. The honest fix, if ANSR dislikes it, is a different mark — not a different scale.

## Blocked / needs the user

1. **Rotate the admin password** — the current one was shared in a chat transcript.
   `npm run admin:hash`, then update `ADMIN_PASSWORD_HASH` in Vercel and redeploy.
2. **Calendar the `GCC_GITHUB_TOKEN` expiry.** When it lapses, publishing fails with a GitHub 401
   that reads like a bug rather than an expiry.
3. **The CTA destination.** Both screens' closes link to `NEXT_PUBLIC_GCC_CTA_URL`, falling back to
   `https://www.ansr.com/`. Next inlines `NEXT_PUBLIC_*` at build time: it needs a redeploy.
4. **Hosting details** — which ansr.com page hosts the iframe, who adds the embed snippet, and
   the origin for `NEXT_PUBLIC_GCC_FRAME_TARGET_ORIGIN`. The parent must listen for the
   `gcc-landscape:height` message; the snippet is in the header comment of `use-frame-height.ts`.
5. **Confirm the figures are publishable as-is**, because **nothing on the page says any of them is
   provisional any more**. Four sets are still filled from judgement rather than supplied data, named in
   `docs/data-audit.md`: Vietnam's column in the capability grid, the cells in `hr-fully-loaded-cost`,
   the depth row for Pune and tier 2 in `fin-cost-vs-ecosystem-depth`, and the three non-technology rows
   of `fin-india-vs-hubs`.
6. **Sign off the common-function list** — eight hardcoded entries in `COMMON_FUNCTIONS`
   (`src/data/screen1.ts`). The brief permits the hardcode; the wording and order are ANSR's call.
7. **Confirm two judgement calls visible on Screen 2.** The shared supply figures are the national
   technology workforce, not a per-function subset, and the tech, operations and HR tabs each say so in
   a provenance line. Grade A office stock shows total and vacant rather than picking one.

## Open decisions, not yet made

- **Whether anything replaces the sample stamp.** Removing it was ANSR's call, but it was the mechanism
  that made a not-yet-final figure arrive labelled. Nothing replaces it; `data:verify` counts metrics
  stating no provenance (35 of 35), so the milestone is in the script rather than on the page.
- **The white-on-orange token.** White on `--ansr-orange` measures **3.22:1** — a real AA failure — so
  both screens use **black on orange (6.52:1)** at the one call site each, `public/closing-cta.tsx`.
  Either change `--ansr-action-text` or keep overriding there.
- **Whether to switch on `ADMIN_TOTP_SECRET`.** Built and verified, currently removed. Only enable it
  while able to test a code immediately — see `project.md`.
- **Whether the browser suite runs in CI.** Needs Chromium and a minute. No ESLint either.
- **Nothing verifies how the screens LOOK.** No visual regression testing and no automated
  accessibility audit; the motif placements and "the held placeholder reads as sealed rather than
  loading" are judgements made from screenshots. The specs check names, roles and cardinality.

## Traps worth remembering

Invariants are in `project.md`, brand rules in `design-stack.md`, the visual decisions and their
reasoning in `.tastemaker/style-lock.md`. These bite only in the code.

- **Never read `dataset.metrics` from a public screen.** `publicMetricsFor` is the gate; `screen2.ts`
  imports it rather than the raw array on purpose.
- **A substring test for a leaked label passes by luck.** "Human resources" is a gated grid row, a
  graduate-output discipline AND an open grid row, so asserting on it fails while the gate works.
  `screen2.test.ts` checks the held metric's KEYS and spot-checks "Senior manager" only.
- **A shared metric is one definition, several rows.** Editing the figure on one tab in admin and not
  the others trips the `data:verify` invariant — fix the data, not the check. Admin's Edit button names
  the function area for the same reason, and `openMetric` in `4-metrics.spec.ts` takes it.
- **Never use a gap in the catalogue as a test fixture.** Build a synthetic metric for a rule, and
  treat a count as the snapshot it is.
- **`asOf` is public and free text, not a date**, rendered verbatim, and unset on every seeded metric.
  **`atLeast` belongs to the definition** and is not admin-editable — the metric editor preserves it by
  spreading the original, so do not rebuild that object field by field.
- **`src/app/page.tsx` is `force-dynamic` on purpose** — a prerender bakes the taxonomy into the
  build and defeats `dataset.ts`'s mtime cache.
- **A new browser spec must be numbered inside a project's `testMatch`** — `0-` public, `[2345]-` admin,
  `1-`/`6-` auth and lockout. A `7-` spec matches no project and never runs.
- **`0-screen1.spec.ts` and `0-screen2.spec.ts` run before `5-publish.spec.ts` mutates the fixture.**
- **A grid inside a card needs `grid-cols-1` and `min-w-0`**, or the table's `min-w-md` propagates
  out and the document scrolls sideways at 320px.
- **Do not focus a field by querying `[aria-invalid="true"]` after `setErrors`** — state has not
  flushed; `input-panel.tsx` holds refs, and `tool.tsx` focuses in a rAF for the same reason.
- **`data:verify -- --accept` is for profile drift only**; an INVARIANT FAILURE is a bug.
- **Bump the draft's `STORAGE_KEY` when the editable SHAPE changes**; `helpers.ts` owns the key. A new
  optional field is not a shape change — a reseed moves `generatedAt`, so an existing draft surfaces as
  the stale-baseline conflict it is.
- **`server-only` throws outside a bundler's server graph**, including `tsx` — hence
  `src/lib/admin/constants.ts`. `src/data/screen2.ts` is deliberately NOT `server-only`.
- A `<section>` with no accessible name is not a `region` landmark; every band names itself.